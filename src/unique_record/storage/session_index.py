from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable


@dataclass(slots=True)
class _ActiveSession:
    game_id: str
    started_at_ms: int
    start_reason_code: str | None
    start_metadata: dict[str, Any] = field(default_factory=dict)


class RecordingSessionIndexStore:
    """
    Persists completed recording sessions as JSON Lines.

    One session is appended on stop. Start events are tracked in memory until
    the matching stop arrives.
    """

    def __init__(
        self,
        *,
        index_path: str | Path,
        recordings_output_dir: str | Path | None = None,
        match_metadata_resolver: Callable[..., dict[str, Any] | None] | None = None,
    ) -> None:
        self._index_path = Path(index_path)
        self._recordings_output_dir = (
            Path(recordings_output_dir).resolve() if recordings_output_dir is not None else None
        )
        self._match_metadata_resolver = match_metadata_resolver
        self._active_sessions: dict[str, _ActiveSession] = {}

    @property
    def index_path(self) -> Path:
        return self._index_path

    def record_start(
        self,
        *,
        game_id: str,
        ts_unix_ms: int,
        session_id: str | None,
        reason_code: str | None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        if not session_id:
            return
        self._active_sessions[session_id] = _ActiveSession(
            game_id=game_id,
            started_at_ms=ts_unix_ms,
            start_reason_code=reason_code,
            start_metadata=dict(metadata or {}),
        )

    def record_stop(
        self,
        *,
        game_id: str,
        ts_unix_ms: int,
        session_id: str | None,
        reason_code: str | None,
        metadata: dict[str, Any] | None = None,
        recorder_result: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        session_key = session_id or f"unknown-{ts_unix_ms}"
        stop_metadata = dict(metadata or {})
        active = self._active_sessions.pop(session_key, None)

        start_ts = active.started_at_ms if active is not None else None
        duration_ms = ts_unix_ms - start_ts if isinstance(start_ts, int) else None
        start_reason = active.start_reason_code if active is not None else None
        output_path = _extract_output_path(
            recorder_result=recorder_result or {},
            stop_metadata=stop_metadata,
            start_metadata=active.start_metadata if active is not None else {},
        )
        match_metadata = _extract_match_metadata_payload(
            recorder_result=recorder_result or {},
            stop_metadata=stop_metadata,
            start_metadata=active.start_metadata if active is not None else {},
        )
        if match_metadata is None and self._match_metadata_resolver is not None:
            try:
                resolved = self._match_metadata_resolver(
                    game_id=active.game_id if active is not None else game_id,
                    ts_unix_ms=ts_unix_ms,
                    session_id=session_key,
                    stop_metadata=stop_metadata,
                    start_metadata=active.start_metadata if active is not None else {},
                )
            except Exception:
                resolved = None
            if isinstance(resolved, dict) and resolved:
                match_metadata = resolved

        record: dict[str, Any] = {
            "session_id": session_key,
            "game_id": active.game_id if active is not None else game_id,
            "start_ts_unix_ms": start_ts,
            "end_ts_unix_ms": ts_unix_ms,
            "duration_ms": duration_ms,
            "start_reason_code": start_reason,
            "stop_reason_code": reason_code,
            "status": _map_status(reason_code),
            "output_path": output_path,
            "recordings_output_dir": (
                str(self._recordings_output_dir) if self._recordings_output_dir is not None else None
            ),
        }
        if match_metadata is not None:
            record["match_metadata"] = _normalize_match_metadata(match_metadata)
        self._append_json_line(record)
        return record

    def _append_json_line(self, payload: dict[str, Any]) -> None:
        self._index_path.parent.mkdir(parents=True, exist_ok=True)
        with self._index_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(payload, ensure_ascii=False))
            handle.write("\n")

    def read_records(
        self,
        *,
        limit: int | None = None,
        reverse: bool = False,
    ) -> list[dict[str, Any]]:
        return read_session_records(
            index_path=self._index_path,
            limit=limit,
            reverse=reverse,
        )

    def read_last_record(self) -> dict[str, Any] | None:
        return read_last_session_record(self._index_path)


def read_session_records(
    *,
    index_path: str | Path,
    limit: int | None = None,
    reverse: bool = False,
) -> list[dict[str, Any]]:
    path = Path(index_path)
    if not path.exists():
        return []

    records: list[dict[str, Any]] = []
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict):
            records.append(payload)

    if reverse:
        records = list(reversed(records))
    if isinstance(limit, int) and limit > 0:
        return records[:limit]
    return records


def read_last_session_record(index_path: str | Path) -> dict[str, Any] | None:
    records = read_session_records(index_path=index_path, limit=1, reverse=True)
    if not records:
        return None
    return records[0]


def _extract_output_path(
    *,
    recorder_result: dict[str, Any],
    stop_metadata: dict[str, Any],
    start_metadata: dict[str, Any],
) -> str | None:
    for source in (recorder_result, stop_metadata, start_metadata):
        value = source.get("output_path")
        if isinstance(value, str) and value:
            return value
        value = source.get("outputPath")
        if isinstance(value, str) and value:
            return value
    return None


def _extract_match_metadata_payload(
    *,
    recorder_result: dict[str, Any],
    stop_metadata: dict[str, Any],
    start_metadata: dict[str, Any],
) -> dict[str, Any] | None:
    for source in (recorder_result, stop_metadata, start_metadata):
        value = source.get("match_metadata")
        if isinstance(value, dict) and value:
            return value
        value = source.get("matchMetadata")
        if isinstance(value, dict) and value:
            return value
        value = source.get("lol_match")
        if isinstance(value, dict) and value:
            return value
    return None


def _normalize_match_metadata(payload: dict[str, Any]) -> dict[str, Any]:
    player_summary = payload.get("player_summary")
    if not isinstance(player_summary, dict):
        player_summary = payload.get("playerSummary")
    participants = payload.get("participants")
    if not isinstance(participants, list):
        participants = []

    normalized_participants = []
    for row in participants:
        if isinstance(row, dict):
            normalized_participants.append(_normalize_participant_row(row))

    normalized_player = (
        _normalize_participant_row(player_summary)
        if isinstance(player_summary, dict)
        else None
    )
    if normalized_player is None and normalized_participants:
        normalized_player = normalized_participants[0]

    return {
        "source": _normalize_optional_string(payload.get("source")),
        "game_id": payload.get("game_id", payload.get("gameId")),
        "queue_id": _normalize_optional_int(payload.get("queue_id", payload.get("queueId"))),
        "game_mode": _normalize_optional_string(payload.get("game_mode", payload.get("gameMode"))),
        "duration_seconds": _normalize_optional_int(
            payload.get("duration_seconds", payload.get("durationSeconds"))
        ),
        "player_summary": normalized_player,
        "participants": normalized_participants,
    }


def _normalize_participant_row(payload: dict[str, Any]) -> dict[str, Any]:
    items_raw = payload.get("items")
    runes_raw = payload.get("runes")
    items = _normalize_string_list(items_raw if isinstance(items_raw, list) else [])
    runes = _normalize_string_list(runes_raw if isinstance(runes_raw, list) else [])
    return {
        "is_local_player": bool(payload.get("is_local_player", payload.get("isLocalPlayer", False))),
        "team": _normalize_optional_string(payload.get("team")),
        "summoner_name": _normalize_optional_string(
            payload.get("summoner_name", payload.get("summonerName"))
        ),
        "puuid": _normalize_optional_string(payload.get("puuid")),
        "champion": _normalize_optional_string(payload.get("champion")),
        "kills": _normalize_optional_int(payload.get("kills")),
        "deaths": _normalize_optional_int(payload.get("deaths")),
        "assists": _normalize_optional_int(payload.get("assists")),
        "result": _normalize_optional_string(payload.get("result")),
        "items": items,
        "runes": runes,
    }


def _normalize_string_list(values: list[Any]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        if not isinstance(value, str):
            continue
        text = value.strip()
        if not text:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(text)
    return result


def _normalize_optional_string(value: Any) -> str | None:
    if isinstance(value, str):
        text = value.strip()
        return text or None
    return None


def _normalize_optional_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            return int(float(text))
        except ValueError:
            return None
    return None


def _map_status(reason_code: str | None) -> str:
    mapping = {
        "normal_end": "completed",
        "manual_override": "manual_stop",
        "process_exit_stop": "process_exit_stop",
        "abnormal_end": "abnormal_end",
    }
    if reason_code is None:
        return "stopped"
    return mapping.get(reason_code, "stopped")
