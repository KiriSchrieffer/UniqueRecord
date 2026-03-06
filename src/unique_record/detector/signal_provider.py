from __future__ import annotations

import base64
import ctypes
import csv
import json
import os
import ssl
import subprocess
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol


def _normalize_name(value: str) -> str:
    normalized = value.strip().lower()
    if normalized.endswith(".exe"):
        normalized = normalized[:-4]
    return normalized


@dataclass(slots=True)
class _LcuConnection:
    port: int
    password: str
    protocol: str


class SignalProvider(Protocol):
    """Reads raw signal values from the host environment."""

    def read_signal(self, signal_id: str, signal_def: dict[str, Any]) -> tuple[Any, bool]:
        """Return `(value, is_available)` for the given signal."""


class StaticSignalProvider:
    """
    In-memory provider for early development and tests.
    Values can be updated between ticks to simulate runtime changes.
    """

    def __init__(
        self,
        values: dict[str, Any] | None = None,
        unavailable_signals: set[str] | None = None,
    ) -> None:
        self._values: dict[str, Any] = values or {}
        self._unavailable: set[str] = unavailable_signals or set()

    def update_values(self, values: dict[str, Any]) -> None:
        self._values.update(values)

    def set_unavailable(self, signal_ids: set[str]) -> None:
        self._unavailable = set(signal_ids)

    def read_signal(self, signal_id: str, signal_def: dict[str, Any]) -> tuple[Any, bool]:
        if signal_id in self._unavailable:
            return None, False
        return self._values.get(signal_id), True


class LeagueSignalProvider:
    """
    Windows-oriented signal provider for League of Legends.

    S1: LCU gameflow phase
    S2: game process running
    S3: game window visible
    S4: client process running
    """

    def __init__(
        self,
        lcu_lockfile_path: str | Path | None = None,
        process_cache_ttl_seconds: float = 0.5,
    ) -> None:
        self._lockfile_path_override = (
            Path(lcu_lockfile_path) if lcu_lockfile_path is not None else None
        )
        self._process_cache_ttl_seconds = process_cache_ttl_seconds
        self._process_cache: set[str] = set()
        self._process_cache_updated_at: float = 0.0
        self._ssl_context = ssl._create_unverified_context()

    def read_signal(self, signal_id: str, signal_def: dict[str, Any]) -> tuple[Any, bool]:
        if signal_id == "S1":
            return self._read_lcu_gameflow_phase()
        if signal_id in {"S2", "S4"}:
            names = signal_def.get("process_names", [])
            if not isinstance(names, list):
                return None, False
            return self._read_process_running(names)
        if signal_id == "S3":
            patterns = signal_def.get("title_patterns", [])
            if not isinstance(patterns, list):
                return None, False
            return self._read_window_visible(patterns)
        return None, False

    def _read_lcu_gameflow_phase(self) -> tuple[Any, bool]:
        payload, available = self._request_lcu_json(
            route="/lol-gameflow/v1/gameflow-phase",
            timeout_seconds=0.8,
        )
        if not available:
            return None, False
        return payload, True

    def fetch_latest_match_metadata(self) -> dict[str, Any] | None:
        current_summoner: dict[str, Any] | None = None
        payload, available = self._request_lcu_json(
            route="/lol-summoner/v1/current-summoner",
            timeout_seconds=0.8,
        )
        if available and isinstance(payload, dict):
            current_summoner = payload

        candidates: list[dict[str, Any]] = []
        for route in (
            "/lol-end-of-game/v1/eog-stats-block",
            "/lol-match-history/v1/products/lol/current-summoner/matches?begIndex=0&endIndex=1",
            "/lol-match-history/v1/products/lol/current-summoner/matches",
        ):
            payload, available = self._request_lcu_json(route=route, timeout_seconds=1.0)
            if not available:
                continue
            match_metadata = _extract_match_metadata_from_payload(
                payload=payload,
                source=route,
                current_summoner=current_summoner,
            )
            if match_metadata is None:
                continue
            candidates.append(match_metadata)

        if not candidates:
            return None
        candidates.sort(key=lambda item: len(item.get("participants") or []), reverse=True)
        return candidates[0]

    def _request_lcu_json(
        self,
        *,
        route: str,
        timeout_seconds: float,
    ) -> tuple[Any, bool]:
        connection = self._read_lcu_connection()
        if connection is None:
            return None, False

        request_url = f"{connection.protocol}://127.0.0.1:{connection.port}{route}"
        credentials = base64.b64encode(f"riot:{connection.password}".encode("utf-8")).decode(
            "ascii"
        )
        request = urllib.request.Request(request_url)
        request.add_header("Authorization", f"Basic {credentials}")

        try:
            with urllib.request.urlopen(
                request,
                context=self._ssl_context,
                timeout=max(0.5, timeout_seconds),
            ) as response:
                payload = response.read().decode("utf-8")
            return json.loads(payload), True
        except (TimeoutError, urllib.error.URLError, ValueError, OSError):
            return None, False

    def _read_lcu_connection(self) -> _LcuConnection | None:
        lockfile_path = self._resolve_lockfile_path()
        if lockfile_path is None:
            return None

        try:
            raw = lockfile_path.read_text(encoding="utf-8").strip()
        except OSError:
            return None

        # Expected lockfile format:
        # LeagueClientUx:<pid>:<port>:<password>:<protocol>
        parts = raw.split(":")
        if len(parts) != 5:
            return None

        try:
            port = int(parts[2])
        except ValueError:
            return None

        return _LcuConnection(port=port, password=parts[3], protocol=parts[4])

    def _resolve_lockfile_path(self) -> Path | None:
        if self._lockfile_path_override is not None:
            return self._lockfile_path_override if self._lockfile_path_override.exists() else None

        for candidate in self._candidate_lockfile_paths():
            if candidate.exists():
                return candidate
        return None

    @staticmethod
    def _candidate_lockfile_paths() -> list[Path]:
        candidates = [
            Path(r"C:\Riot Games\League of Legends\lockfile"),
            Path(r"C:\Program Files\Riot Games\League of Legends\lockfile"),
            Path(r"C:\Program Files (x86)\Riot Games\League of Legends\lockfile"),
        ]
        return candidates

    def _read_process_running(self, process_names: list[str]) -> tuple[bool, bool]:
        processes, available = self._get_running_processes()
        if not available:
            return False, False

        targets = {_normalize_name(name) for name in process_names}
        running = any(name in processes for name in targets)
        return running, True

    def _get_running_processes(self) -> tuple[set[str], bool]:
        now = time.monotonic()
        if now - self._process_cache_updated_at < self._process_cache_ttl_seconds:
            return set(self._process_cache), True

        names = self._enumerate_running_processes_windows()
        if names is not None:
            self._process_cache = names
            self._process_cache_updated_at = now
            return set(self._process_cache), True

        names = self._enumerate_running_processes_powershell()
        if names is not None:
            self._process_cache = names
            self._process_cache_updated_at = now
            return set(self._process_cache), True

        try:
            completed = _run_hidden_subprocess(
                ["tasklist", "/FO", "CSV", "/NH"],
                timeout_seconds=1.5,
            )
        except (OSError, subprocess.SubprocessError):
            return set(), False

        parsed = csv.reader(completed.stdout.splitlines())
        names: set[str] = set()
        for row in parsed:
            if not row:
                continue
            image_name = row[0].strip().strip('"')
            if image_name:
                names.add(_normalize_name(image_name))

        self._process_cache = names
        self._process_cache_updated_at = now
        return set(self._process_cache), True

    @staticmethod
    def _enumerate_running_processes_powershell() -> set[str] | None:
        try:
            completed = _run_hidden_subprocess(
                [
                    "powershell",
                    "-NoProfile",
                    "-Command",
                    "Get-Process | Select-Object -ExpandProperty ProcessName",
                ],
                timeout_seconds=1.5,
            )
        except (OSError, subprocess.SubprocessError):
            return None

        names: set[str] = set()
        for line in completed.stdout.splitlines():
            process_name = line.strip().strip('"')
            if process_name:
                names.add(_normalize_name(process_name))
        return names

    @staticmethod
    def _enumerate_running_processes_windows() -> set[str] | None:
        try:
            kernel32 = ctypes.windll.kernel32
            wintypes = ctypes.wintypes
        except AttributeError:
            return None

        TH32CS_SNAPPROCESS = 0x00000002
        INVALID_HANDLE_VALUE = ctypes.c_void_p(-1).value

        class PROCESSENTRY32W(ctypes.Structure):
            _fields_ = [
                ("dwSize", wintypes.DWORD),
                ("cntUsage", wintypes.DWORD),
                ("th32ProcessID", wintypes.DWORD),
                ("th32DefaultHeapID", ctypes.c_size_t),
                ("th32ModuleID", wintypes.DWORD),
                ("cntThreads", wintypes.DWORD),
                ("th32ParentProcessID", wintypes.DWORD),
                ("pcPriClassBase", ctypes.c_long),
                ("dwFlags", wintypes.DWORD),
                ("szExeFile", wintypes.WCHAR * 260),
            ]

        snapshot = kernel32.CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
        if snapshot == INVALID_HANDLE_VALUE:
            return None

        try:
            entry = PROCESSENTRY32W()
            entry.dwSize = ctypes.sizeof(PROCESSENTRY32W)

            names: set[str] = set()
            if not kernel32.Process32FirstW(snapshot, ctypes.byref(entry)):
                return names

            while True:
                name = entry.szExeFile.strip()
                if name:
                    names.add(_normalize_name(name))
                if not kernel32.Process32NextW(snapshot, ctypes.byref(entry)):
                    break
            return names
        finally:
            kernel32.CloseHandle(snapshot)

    def _read_window_visible(self, title_patterns: list[str]) -> tuple[bool, bool]:
        try:
            titles = self._enumerate_visible_window_titles()
        except (AttributeError, OSError):
            return False, False

        patterns = [pattern.lower() for pattern in title_patterns if pattern]
        if not patterns:
            return False, True

        for title in titles:
            lowered = title.lower()
            if any(pattern in lowered for pattern in patterns):
                return True, True
        return False, True

    @staticmethod
    def _enumerate_visible_window_titles() -> list[str]:
        import ctypes
        from ctypes import wintypes

        user32 = ctypes.windll.user32
        titles: list[str] = []

        enum_windows_proc = ctypes.WINFUNCTYPE(
            wintypes.BOOL,
            wintypes.HWND,
            wintypes.LPARAM,
        )

        def callback(hwnd: int, lparam: int) -> bool:
            if not user32.IsWindowVisible(hwnd):
                return True
            length = user32.GetWindowTextLengthW(hwnd)
            if length <= 0:
                return True
            buffer = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buffer, length + 1)
            title = buffer.value.strip()
            if title:
                titles.append(title)
            return True

        if not user32.EnumWindows(enum_windows_proc(callback), 0):
            raise OSError("EnumWindows failed")
        return titles


def _extract_match_metadata_from_payload(
    *,
    payload: Any,
    source: str,
    current_summoner: dict[str, Any] | None,
) -> dict[str, Any] | None:
    participants = _collect_participants(payload)
    if len(participants) < 2:
        return None

    player_summary = _select_local_player_summary(
        participants=participants,
        current_summoner=current_summoner,
    )
    return {
        "source": source,
        "game_id": _find_first_match_value(payload, ("gameId", "game_id", "id")),
        "queue_id": _find_first_match_value(payload, ("queueId", "queue_id")),
        "game_mode": _find_first_match_value(payload, ("gameMode", "game_mode", "mode")),
        "duration_seconds": _normalize_optional_int(
            _find_first_match_value(
                payload,
                ("gameLength", "game_length", "duration", "gameDuration", "game_duration"),
            )
        ),
        "player_summary": player_summary,
        "participants": participants,
    }


def _collect_participants(payload: Any) -> list[dict[str, Any]]:
    participants: list[dict[str, Any]] = []

    def walk(node: Any, depth: int = 0) -> None:
        if depth > 8:
            return
        if isinstance(node, dict):
            parsed = _parse_participant(node)
            if parsed is not None:
                participants.append(parsed)
            for value in node.values():
                if isinstance(value, (dict, list)):
                    walk(value, depth + 1)
            return
        if isinstance(node, list):
            for item in node[:80]:
                if isinstance(item, (dict, list)):
                    walk(item, depth + 1)

    walk(payload)
    return _deduplicate_participants(participants)


def _parse_participant(raw: dict[str, Any]) -> dict[str, Any] | None:
    stats = raw.get("stats") if isinstance(raw.get("stats"), dict) else {}

    champion = _first_non_empty_str(
        raw,
        keys=("championName", "champion_name", "champion", "championDisplayName"),
    )
    champion_id = _first_int(raw, keys=("championId", "champion_id", "championID"))
    if champion is None and champion_id is not None:
        champion = f"Champion #{champion_id}"

    kills = _first_int_any((raw, stats), keys=("kills", "numKills", "CHAMPIONS_KILLED"))
    deaths = _first_int_any((raw, stats), keys=("deaths", "numDeaths", "NUM_DEATHS"))
    assists = _first_int_any((raw, stats), keys=("assists", "numAssists", "ASSISTS"))

    summoner_name = _first_non_empty_str(
        raw,
        keys=(
            "summonerName",
            "summoner_name",
            "riotIdGameName",
            "gameName",
            "displayName",
        ),
    )
    puuid = _first_non_empty_str(raw, keys=("puuid", "playerPuuid", "participantPuuid"))
    items = _extract_items(raw=raw, stats=stats)
    runes = _extract_runes(raw=raw, stats=stats)
    result = _extract_result(raw=raw, stats=stats)
    team = _extract_team(raw)
    is_local_player = _extract_bool(raw, keys=("isLocalPlayer", "isLocal", "isPlayer", "isSelf"))

    has_core_data = (
        champion is not None
        or summoner_name is not None
        or kills is not None
        or deaths is not None
        or assists is not None
        or len(items) > 0
        or len(runes) > 0
    )
    if not has_core_data:
        return None

    return {
        "is_local_player": is_local_player,
        "team": team,
        "summoner_name": summoner_name,
        "puuid": puuid,
        "champion": champion,
        "kills": kills,
        "deaths": deaths,
        "assists": assists,
        "result": result,
        "items": items,
        "runes": runes,
    }


def _deduplicate_participants(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    result: list[dict[str, Any]] = []
    for row in rows:
        key = "|".join(
            [
                str(row.get("summoner_name") or ""),
                str(row.get("puuid") or ""),
                str(row.get("champion") or ""),
                str(row.get("kills") if row.get("kills") is not None else ""),
                str(row.get("deaths") if row.get("deaths") is not None else ""),
                str(row.get("assists") if row.get("assists") is not None else ""),
            ]
        )
        if key in seen:
            continue
        seen.add(key)
        result.append(row)
    return result[:10]


def _select_local_player_summary(
    *,
    participants: list[dict[str, Any]],
    current_summoner: dict[str, Any] | None,
) -> dict[str, Any] | None:
    if not participants:
        return None
    for row in participants:
        if row.get("is_local_player") is True:
            return row

    current_puuid = (
        _first_non_empty_str(
            current_summoner or {},
            keys=("puuid", "playerPuuid"),
        )
        if current_summoner
        else None
    )
    if current_puuid:
        normalized = current_puuid.strip().lower()
        for row in participants:
            candidate = row.get("puuid")
            if isinstance(candidate, str) and candidate.strip().lower() == normalized:
                return row

    candidate_names = []
    if current_summoner:
        for key in ("displayName", "gameName", "summonerName"):
            value = current_summoner.get(key)
            if isinstance(value, str) and value.strip():
                candidate_names.append(value.strip().lower())
    if candidate_names:
        for row in participants:
            summoner_name = row.get("summoner_name")
            if isinstance(summoner_name, str) and summoner_name.strip().lower() in candidate_names:
                return row

    return participants[0]


def _extract_items(*, raw: dict[str, Any], stats: dict[str, Any]) -> list[str]:
    values: list[str] = []
    for key in ("item0", "item1", "item2", "item3", "item4", "item5", "item6"):
        value = stats.get(key)
        normalized = _normalize_item_value(value)
        if normalized:
            values.append(normalized)

    for source in (raw, stats):
        for key in ("items", "itemIds", "item_ids"):
            raw_list = source.get(key)
            if not isinstance(raw_list, list):
                continue
            for item in raw_list[:12]:
                normalized = _normalize_item_value(item)
                if normalized:
                    values.append(normalized)
    return _deduplicate_strings(values)[:8]


def _extract_runes(*, raw: dict[str, Any], stats: dict[str, Any]) -> list[str]:
    values: list[str] = []
    for source in (raw, stats):
        for key in ("runes", "perks", "perkIds", "perk_ids"):
            raw_value = source.get(key)
            if isinstance(raw_value, list):
                for item in raw_value[:12]:
                    normalized = _normalize_rune_value(item)
                    if normalized:
                        values.append(normalized)
            elif isinstance(raw_value, dict):
                for nested_key in ("perkIds", "selectedPerkIds", "styles", "subStyle"):
                    nested_value = raw_value.get(nested_key)
                    if isinstance(nested_value, list):
                        for item in nested_value[:12]:
                            normalized = _normalize_rune_value(item)
                            if normalized:
                                values.append(normalized)
                    else:
                        normalized = _normalize_rune_value(nested_value)
                        if normalized:
                            values.append(normalized)
            else:
                normalized = _normalize_rune_value(raw_value)
                if normalized:
                    values.append(normalized)
    return _deduplicate_strings(values)[:8]


def _extract_result(*, raw: dict[str, Any], stats: dict[str, Any]) -> str | None:
    value = _first_bool_any((raw, stats), keys=("win", "won", "isWinner", "victory"))
    if value is True:
        return "Win"
    if value is False:
        return "Lose"

    text = _first_non_empty_str_any((raw, stats), keys=("result", "gameResult", "outcome"))
    if text is None:
        return None
    normalized = text.strip().lower()
    if normalized in {"win", "victory", "won"}:
        return "Win"
    if normalized in {"lose", "loss", "defeat"}:
        return "Lose"
    return text.strip()


def _extract_team(raw: dict[str, Any]) -> str | None:
    value = raw.get("team")
    if isinstance(value, str) and value.strip():
        return value.strip()

    team_id = _first_int(raw, keys=("teamId", "team_id"))
    if team_id == 100:
        return "Blue"
    if team_id == 200:
        return "Red"
    if team_id is None:
        return None
    return f"Team {team_id}"


def _find_first_match_value(payload: Any, keys: tuple[str, ...]) -> Any:
    queue: list[Any] = [payload]
    depth = 0
    while queue and depth < 7:
        next_queue: list[Any] = []
        for node in queue[:120]:
            if isinstance(node, dict):
                for key in keys:
                    if key in node:
                        value = node.get(key)
                        if value is not None:
                            return value
                for value in node.values():
                    if isinstance(value, (dict, list)):
                        next_queue.append(value)
            elif isinstance(node, list):
                for item in node[:80]:
                    if isinstance(item, (dict, list)):
                        next_queue.append(item)
        queue = next_queue
        depth += 1
    return None


def _first_non_empty_str(raw: dict[str, Any], *, keys: tuple[str, ...]) -> str | None:
    for key in keys:
        value = raw.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _first_non_empty_str_any(
    sources: tuple[dict[str, Any], ...],
    *,
    keys: tuple[str, ...],
) -> str | None:
    for source in sources:
        value = _first_non_empty_str(source, keys=keys)
        if value is not None:
            return value
    return None


def _first_int(raw: dict[str, Any], *, keys: tuple[str, ...]) -> int | None:
    for key in keys:
        value = raw.get(key)
        parsed = _normalize_optional_int(value)
        if parsed is not None:
            return parsed
    return None


def _first_int_any(
    sources: tuple[dict[str, Any], ...],
    *,
    keys: tuple[str, ...],
) -> int | None:
    for source in sources:
        value = _first_int(source, keys=keys)
        if value is not None:
            return value
    return None


def _first_bool_any(
    sources: tuple[dict[str, Any], ...],
    *,
    keys: tuple[str, ...],
) -> bool | None:
    for source in sources:
        value = _extract_bool(source, keys=keys)
        if value is not None:
            return value
    return None


def _extract_bool(raw: dict[str, Any], *, keys: tuple[str, ...]) -> bool | None:
    for key in keys:
        value = raw.get(key)
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return bool(value)
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "win", "won"}:
                return True
            if normalized in {"0", "false", "no", "lose", "loss", "defeat"}:
                return False
    return None


def _normalize_optional_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str) and value.strip():
        try:
            return int(float(value.strip()))
        except ValueError:
            return None
    return None


def _normalize_item_value(value: Any) -> str | None:
    if isinstance(value, dict):
        for key in ("name", "itemName", "displayName"):
            text = value.get(key)
            if isinstance(text, str) and text.strip():
                return text.strip()
        item_id = _normalize_optional_int(
            value.get("id")
            if "id" in value
            else value.get("itemId", value.get("item_id"))
        )
        if item_id is not None and item_id > 0:
            return f"Item #{item_id}"
        return None

    if isinstance(value, str) and value.strip():
        normalized = value.strip()
        parsed = _normalize_optional_int(normalized)
        if parsed is not None and parsed > 0:
            return f"Item #{parsed}"
        return normalized

    parsed = _normalize_optional_int(value)
    if parsed is None or parsed <= 0:
        return None
    return f"Item #{parsed}"


def _normalize_rune_value(value: Any) -> str | None:
    if isinstance(value, dict):
        for key in ("name", "displayName", "runeName"):
            text = value.get(key)
            if isinstance(text, str) and text.strip():
                return text.strip()
        rune_id = _normalize_optional_int(
            value.get("id")
            if "id" in value
            else value.get("perkId", value.get("runeId"))
        )
        if rune_id is not None and rune_id > 0:
            return f"Rune #{rune_id}"
        return None

    if isinstance(value, str) and value.strip():
        normalized = value.strip()
        parsed = _normalize_optional_int(normalized)
        if parsed is not None and parsed > 0:
            return f"Rune #{parsed}"
        return normalized

    parsed = _normalize_optional_int(value)
    if parsed is None or parsed <= 0:
        return None
    return f"Rune #{parsed}"


def _deduplicate_strings(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        key = value.strip()
        if not key:
            continue
        lowered = key.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        result.append(key)
    return result


def _run_hidden_subprocess(
    command: list[str],
    *,
    timeout_seconds: float,
) -> subprocess.CompletedProcess[str]:
    kwargs: dict[str, Any] = {
        "capture_output": True,
        "text": True,
        "check": True,
        "timeout": max(0.5, timeout_seconds),
    }
    if os.name == "nt":
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        startupinfo.wShowWindow = 0
        kwargs["startupinfo"] = startupinfo
        kwargs["creationflags"] = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    return subprocess.run(command, **kwargs)
