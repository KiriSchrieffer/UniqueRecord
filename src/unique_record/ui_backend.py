from __future__ import annotations

import json
import os
import subprocess
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .detector import DetectorEvent
from .runtime import RuntimeComponents, UniqueRecordLoop, build_runtime
from .storage import read_session_records


@dataclass(slots=True)
class RuntimeBridgeOptions:
    config_path: str | Path
    app_root: str | Path | None = None
    game_id: str = "league_of_legends"
    recorder_options: dict[str, Any] | None = None


class RuntimeBridgeService:
    """
    UI bridge service for controlling UniqueRecord runtime and exposing state.
    """

    def __init__(self, options: RuntimeBridgeOptions) -> None:
        self._options = options
        self._config_path = Path(options.config_path).resolve()
        self._app_root = Path(options.app_root).resolve() if options.app_root is not None else None
        self._runtime: RuntimeComponents = self._build_runtime_components()
        self._loop = UniqueRecordLoop(
            orchestrator=self._runtime.orchestrator,
            poll_interval_ms=self._runtime.poll_interval_ms,
        )
        self._lock = threading.RLock()
        self._loop_thread: threading.Thread | None = None
        self._loop_running = False
        self._recent_events: list[dict[str, Any]] = []
        self._active_recording_started_at_ms: int | None = None

    @property
    def runtime(self) -> RuntimeComponents:
        return self._runtime

    def start_service(self) -> None:
        with self._lock:
            if self._loop_running:
                return
            self._loop_running = True
            self._loop_thread = threading.Thread(
                target=self._run_loop_forever,
                name="unique-record-loop",
                daemon=True,
            )
            self._loop_thread.start()

    def stop_service(self) -> None:
        thread: threading.Thread | None
        with self._lock:
            if not self._loop_running:
                self._shutdown_recorder()
                return
            self._loop.stop()
            thread = self._loop_thread
        if thread is not None:
            thread.join(timeout=3)
        self._shutdown_recorder()

    def manual_start(self) -> list[dict[str, Any]]:
        events = self._runtime.orchestrator.manual_start(now_ms=self._now_ms())
        self._capture_events(events)
        return [_event_to_dict(event) for event in events]

    def manual_stop(self) -> list[dict[str, Any]]:
        events = self._runtime.orchestrator.manual_stop(now_ms=self._now_ms())
        self._capture_events(events)
        return [_event_to_dict(event) for event in events]

    def status(self) -> dict[str, Any]:
        with self._lock:
            snapshot = self._runtime.detector.get_snapshot()
            now_ms = self._now_ms()
            recording_duration_seconds: int | None = None
            if self._active_recording_started_at_ms is not None:
                recording_duration_seconds = max(
                    0, (now_ms - self._active_recording_started_at_ms) // 1000
                )

            return {
                "service_running": self._loop_running,
                "ui_status": _map_detector_state_to_ui_status(snapshot.state),
                "detector_state": snapshot.state,
                "session_id": snapshot.session_id,
                "recorder_backend": getattr(self._runtime.recorder, "backend_mode", "unknown"),
                "native_host_path": _stringify_path_attr(self._runtime.recorder, "native_host_path"),
                "poll_interval_ms": self._runtime.poll_interval_ms,
                "signals": dict(snapshot.signals),
                "unavailable_signals": sorted(snapshot.unavailable_signals),
                "recording_duration_seconds": recording_duration_seconds,
                "session_index_path": (
                    str(self._runtime.session_index_path)
                    if self._runtime.session_index_path is not None
                    else None
                ),
                "recent_events": list(self._recent_events),
            }

    def list_sessions(self, *, limit: int = 20) -> list[dict[str, Any]]:
        index_path = self._runtime.session_index_path
        if index_path is None:
            return []
        rows = read_session_records(
            index_path=index_path,
            reverse=True,
            limit=max(1, limit),
        )
        return [_enrich_session_row(row) for row in rows]

    def resolve_session_output_path(self, *, session_id: str) -> Path:
        normalized_session_id = session_id.strip()
        if not normalized_session_id:
            raise ValueError("session_id is required")

        index_path = self._runtime.session_index_path
        if index_path is None:
            raise FileNotFoundError("session index path is unavailable")

        records = read_session_records(index_path=index_path, reverse=False, limit=None)
        matched_record: dict[str, Any] | None = None
        for record in reversed(records):
            row_session_id = record.get("session_id")
            if isinstance(row_session_id, str) and row_session_id == normalized_session_id:
                matched_record = record
                break

        if matched_record is None:
            raise FileNotFoundError(f"session not found: {normalized_session_id}")

        output_path_raw = matched_record.get("output_path")
        if not isinstance(output_path_raw, str) or not output_path_raw.strip():
            raise FileNotFoundError(f"session has no output file: {normalized_session_id}")

        output_path = _resolve_local_path(output_path_raw.strip())
        if not output_path.exists() or not output_path.is_file():
            raise FileNotFoundError(f"output file not found: {output_path}")
        return output_path

    def read_settings(self) -> dict[str, Any]:
        config = self._runtime.config
        global_cfg = config.get("global", {}) if isinstance(config.get("global"), dict) else {}
        ui_cfg = global_cfg.get("ui") if isinstance(global_cfg.get("ui"), dict) else {}
        ui_language = ui_cfg.get("language")
        if not isinstance(ui_language, str):
            ui_language = "zh-CN"
        try:
            ui_language = _normalize_ui_language(ui_language)
        except ValueError:
            ui_language = "zh-CN"
        game_cfg = _get_game_cfg(config=config, game_id=self._options.game_id)
        profile = game_cfg.get("recording_profile", {}) if isinstance(game_cfg, dict) else {}
        detection_cfg = (
            global_cfg.get("ui_detection")
            if isinstance(global_cfg.get("ui_detection"), dict)
            else {}
        )
        poll_interval_ms = global_cfg.get("poll_interval_ms")
        poll_interval_seconds = max(
            1,
            int(_parse_int_with_default(poll_interval_ms, default=self._runtime.poll_interval_ms) / 1000),
        )
        recordings_output_dir = global_cfg.get("recordings_output_dir") or global_cfg.get("recordings_dir")
        resolved_output_dir = self.resolve_recordings_output_dir()
        return {
            "global": {
                "poll_interval_ms": global_cfg.get("poll_interval_ms"),
                "recordings_output_dir": recordings_output_dir,
                "recordings_output_dir_resolved": (
                    str(resolved_output_dir) if resolved_output_dir is not None else None
                ),
                "recordings_index_path": global_cfg.get("recordings_index_path"),
            },
            "ui": {
                "language": ui_language,
            },
            "recording_profile": {
                "resolution": profile.get("resolution"),
                "fps": profile.get("fps"),
                "video_bitrate_kbps": profile.get("video_bitrate_kbps"),
                "audio_bitrate_kbps": profile.get("audio_bitrate_kbps"),
                "container": profile.get("container"),
                "encoder": profile.get("encoder"),
                "audio_codec": profile.get("audio_codec"),
                "hardware_encoding_enabled": profile.get("hardware_encoding_enabled"),
                "audio_input_device": profile.get("audio_input_device"),
                "audio_input_enabled": profile.get("audio_input_enabled"),
                "audio_output_enabled": profile.get("audio_output_enabled"),
            },
            "detection": {
                "auto_detect_enabled": bool(game_cfg.get("enabled", True)),
                "detection_interval_seconds": poll_interval_seconds,
                "control_host": (
                    detection_cfg.get("control_host")
                    if isinstance(detection_cfg.get("control_host"), str)
                    and detection_cfg.get("control_host").strip()
                    else "127.0.0.1"
                ),
                "control_port": _parse_int_with_default(
                    detection_cfg.get("control_port"),
                    default=8765,
                ),
                "control_token": (
                    detection_cfg.get("control_token")
                    if isinstance(detection_cfg.get("control_token"), str)
                    else ""
                ),
                "host_auto_start": _parse_bool_with_default(
                    detection_cfg.get("host_auto_start"),
                    default=True,
                ),
                "host_keep_alive": _parse_bool_with_default(
                    detection_cfg.get("host_keep_alive"),
                    default=True,
                ),
                "host_keep_alive_interval_seconds": _parse_int_with_default(
                    detection_cfg.get("host_keep_alive_interval_seconds"),
                    default=30,
                ),
            },
        }

    def list_audio_devices(self) -> dict[str, Any]:
        host_path = _resolve_native_host_path(self._runtime.recorder)
        if host_path is None:
            return {
                "supported": False,
                "input_devices": [],
                "output_devices": [],
                "error": "native capture host path is unavailable",
            }
        if not host_path.exists():
            return {
                "supported": False,
                "input_devices": [],
                "output_devices": [],
                "error": f"native capture host not found: {host_path}",
            }

        command = _build_audio_devices_command(host_path)
        try:
            completed = _run_hidden_process(
                command=command,
                cwd=host_path.parent,
                timeout_seconds=8.0,
            )
        except subprocess.TimeoutExpired:
            return {
                "supported": False,
                "input_devices": [],
                "output_devices": [],
                "error": "audio device query timed out",
            }
        except Exception as exc:
            return {
                "supported": False,
                "input_devices": [],
                "output_devices": [],
                "error": str(exc),
            }
        if completed.returncode != 0:
            message = completed.stderr.strip() or completed.stdout.strip() or "failed to query audio devices"
            return {
                "supported": False,
                "input_devices": [],
                "output_devices": [],
                "error": message,
            }

        try:
            payload = _parse_json_object_from_output(completed.stdout)
        except ValueError as exc:
            return {
                "supported": False,
                "input_devices": [],
                "output_devices": [],
                "error": str(exc),
            }
        if payload.get("status") != "audio_devices":
            return {
                "supported": False,
                "input_devices": [],
                "output_devices": [],
                "error": "capture host did not return audio device payload",
            }
        return {
            "supported": bool(payload.get("supported", True)),
            "input_devices": _normalize_audio_devices(payload.get("input_devices")),
            "output_devices": _normalize_audio_devices(payload.get("output_devices")),
        }

    def update_recording_settings(self, payload: dict[str, Any]) -> dict[str, Any]:
        settings = _normalize_recording_settings_payload(payload)
        with self._lock:
            was_running = self._loop_running

        if was_running:
            self.stop_service()

        try:
            config = _load_config_dict(self._config_path)
            _apply_recording_settings_update(
                config=config,
                game_id=self._options.game_id,
                settings=settings,
            )
            self._write_config(config)
            self._reload_runtime()
        except Exception:
            # Best-effort rollback to latest on-disk config if update failed mid-flight.
            self._reload_runtime()
            raise
        finally:
            if was_running:
                self.start_service()

        return self.read_settings()

    def update_detection_settings(self, payload: dict[str, Any]) -> dict[str, Any]:
        settings = _normalize_detection_settings_payload(payload)
        with self._lock:
            was_running = self._loop_running

        if was_running:
            self.stop_service()

        try:
            config = _load_config_dict(self._config_path)
            _apply_detection_settings_update(
                config=config,
                game_id=self._options.game_id,
                settings=settings,
            )
            self._write_config(config)
            self._reload_runtime()
        except Exception:
            self._reload_runtime()
            raise
        finally:
            if was_running:
                self.start_service()

        return self.read_settings()

    def delete_sessions(
        self,
        *,
        session_ids: list[str],
        delete_files: bool = False,
    ) -> dict[str, Any]:
        normalized_ids = [item.strip() for item in session_ids if isinstance(item, str) and item.strip()]
        unique_ids = sorted(set(normalized_ids))
        if not unique_ids:
            raise ValueError("session_ids must be a non-empty string list")

        index_path = self._runtime.session_index_path
        if index_path is None:
            raise FileNotFoundError("session index path is unavailable")

        records = read_session_records(index_path=index_path, reverse=False, limit=None)
        delete_set = set(unique_ids)
        kept_records: list[dict[str, Any]] = []
        removed_records: list[dict[str, Any]] = []

        for record in records:
            session_id = record.get("session_id")
            if isinstance(session_id, str) and session_id in delete_set:
                removed_records.append(record)
                continue
            kept_records.append(record)

        if not removed_records:
            return {
                "deleted_sessions": [],
                "deleted_count": 0,
                "removed_file_count": 0,
                "missing_file_count": 0,
                "file_delete_errors": [],
                "remaining_count": len(kept_records),
            }

        _write_session_records(index_path=index_path, records=kept_records)

        removed_file_count = 0
        missing_file_count = 0
        file_delete_errors: list[str] = []
        if delete_files:
            for record in removed_records:
                output_path_raw = record.get("output_path")
                if not isinstance(output_path_raw, str) or not output_path_raw.strip():
                    continue
                output_path = _resolve_local_path(output_path_raw.strip())
                try:
                    if output_path.exists() and output_path.is_file():
                        output_path.unlink()
                        removed_file_count += 1
                    else:
                        missing_file_count += 1
                except OSError as exc:
                    file_delete_errors.append(f"{output_path}: {exc}")

        return {
            "deleted_sessions": [
                record["session_id"]
                for record in removed_records
                if isinstance(record.get("session_id"), str)
            ],
            "deleted_count": len(removed_records),
            "removed_file_count": removed_file_count,
            "missing_file_count": missing_file_count,
            "file_delete_errors": file_delete_errors,
            "remaining_count": len(kept_records),
        }

    def resolve_recordings_output_dir(self) -> Path | None:
        settings = self._runtime.config.get("global", {})
        if isinstance(settings, dict):
            raw = settings.get("recordings_output_dir") or settings.get("recordings_dir")
            if isinstance(raw, str) and raw.strip():
                value = Path(raw)
                if value.is_absolute():
                    return value.resolve()
                # Relative path follows runtime app root behavior.
                config_root = self._config_path.parent.parent
                return (config_root / value).resolve()

        # Fallback to session index directory when output dir is not explicitly configured.
        index_path = self._runtime.session_index_path
        if index_path is not None:
            return index_path.parent.resolve()
        return None

    def open_in_explorer(
        self,
        *,
        target_path: str,
        reveal_in_folder: bool = False,
    ) -> dict[str, Any]:
        if not target_path.strip():
            raise ValueError("path is required")
        target = _resolve_local_path(target_path)

        if not target.exists():
            raise FileNotFoundError(f"path not found: {target}")

        if reveal_in_folder and target.is_file():
            if os.name == "nt":
                subprocess.Popen(
                    ["explorer", f"/select,{str(target)}"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
                return {"target": str(target), "action": "reveal_file"}
            folder = target.parent
            _open_path(folder)
            return {"target": str(folder), "action": "open_folder"}

        _open_path(target)
        return {
            "target": str(target),
            "action": "open_file" if target.is_file() else "open_folder",
        }

    def open_recordings_dir(self, *, path_override: str | None = None) -> dict[str, Any]:
        if path_override is not None and path_override.strip():
            return self.open_in_explorer(target_path=path_override, reveal_in_folder=False)
        recordings_dir = self.resolve_recordings_output_dir()
        if recordings_dir is None:
            raise FileNotFoundError("recordings output directory is not configured")
        return self.open_in_explorer(target_path=str(recordings_dir), reveal_in_folder=False)

    def select_directory(self, *, initial_path: str | None = None) -> dict[str, Any]:
        selected = _select_directory_windows(initial_path=initial_path)
        if selected is None:
            return {
                "selected": False,
                "path": None,
            }
        return {
            "selected": True,
            "path": selected,
        }

    def _run_loop_forever(self) -> None:
        try:
            self._loop.run(max_ticks=0, on_events=self._capture_events)
        finally:
            with self._lock:
                self._loop_running = False
                self._loop_thread = None

    def _capture_events(self, events: list[DetectorEvent]) -> None:
        if not events:
            return
        with self._lock:
            for event in events:
                event_dict = _event_to_dict(event)
                self._recent_events.append(event_dict)
                if len(self._recent_events) > 100:
                    self._recent_events = self._recent_events[-100:]

                if event.type != "recording_action":
                    continue
                if event.action == "start_recording":
                    self._active_recording_started_at_ms = event.ts_unix_ms
                elif event.action == "stop_recording":
                    self._active_recording_started_at_ms = None

    def _shutdown_recorder(self) -> None:
        shutdown = getattr(self._runtime.recorder, "shutdown", None)
        if callable(shutdown):
            shutdown()

    def _build_runtime_components(self) -> RuntimeComponents:
        return build_runtime(
            config_path=self._config_path,
            app_root=self._app_root,
            game_id=self._options.game_id,
            recorder_options=self._options.recorder_options,
        )

    def _reload_runtime(self) -> None:
        with self._lock:
            self._shutdown_recorder()
            self._runtime = self._build_runtime_components()
            self._loop = UniqueRecordLoop(
                orchestrator=self._runtime.orchestrator,
                poll_interval_ms=self._runtime.poll_interval_ms,
            )
            self._active_recording_started_at_ms = None

    def _write_config(self, config: dict[str, Any]) -> None:
        serialized = json.dumps(config, ensure_ascii=False, indent=2)
        self._config_path.write_text(serialized + "\n", encoding="utf-8")

    @staticmethod
    def _now_ms() -> int:
        return int(time.time() * 1000)


def _map_detector_state_to_ui_status(state: str) -> str:
    if state == "in_match":
        return "recording"
    if state in {"pre_match", "post_match"}:
        return "detecting"
    return "idle"


def _event_to_dict(event: DetectorEvent) -> dict[str, Any]:
    return {
        "ts": event.ts_unix_ms,
        "type": event.type,
        "action": event.action,
        "from_state": event.from_state,
        "to_state": event.to_state,
        "reason_code": event.reason_code,
        "matched_rule_id": event.matched_rule_id,
        "details": dict(event.details),
    }


def _enrich_session_row(row: dict[str, Any]) -> dict[str, Any]:
    output_path = row.get("output_path")
    size_bytes: int | None = None
    if isinstance(output_path, str) and output_path:
        path = Path(output_path)
        if path.exists() and path.is_file():
            try:
                size_bytes = int(path.stat().st_size)
            except OSError:
                size_bytes = None

    enriched = dict(row)
    enriched["file_size_bytes"] = size_bytes
    return enriched


def _get_game_cfg(*, config: dict[str, Any], game_id: str) -> dict[str, Any]:
    games = config.get("games", [])
    if not isinstance(games, list):
        return {}
    for game in games:
        if isinstance(game, dict) and game.get("id") == game_id:
            return game
    return {}


def _load_config_dict(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # pragma: no cover - defensive guard
        raise ValueError(f"failed to read config: {path}") from exc
    if not isinstance(payload, dict):
        raise ValueError("config root must be a JSON object")
    return payload


def _apply_recording_settings_update(
    *,
    config: dict[str, Any],
    game_id: str,
    settings: dict[str, Any],
) -> None:
    global_cfg = config.get("global")
    if not isinstance(global_cfg, dict):
        global_cfg = {}
        config["global"] = global_cfg

    game_cfg = _get_game_cfg(config=config, game_id=game_id)
    if not game_cfg:
        raise ValueError(f"game config not found: {game_id}")

    profile = game_cfg.get("recording_profile")
    if not isinstance(profile, dict):
        profile = {}
        game_cfg["recording_profile"] = profile

    output_dir = settings.get("recordings_output_dir")
    if output_dir is not None:
        global_cfg["recordings_output_dir"] = output_dir

    ui_cfg = global_cfg.get("ui")
    if not isinstance(ui_cfg, dict):
        ui_cfg = {}
        global_cfg["ui"] = ui_cfg
    ui_language = settings.get("ui_language")
    if ui_language is not None:
        ui_cfg["language"] = ui_language

    for key in (
        "resolution",
        "fps",
        "video_bitrate_kbps",
        "audio_bitrate_kbps",
        "container",
        "encoder",
        "audio_codec",
        "hardware_encoding_enabled",
        "audio_input_device",
        "audio_input_enabled",
        "audio_output_enabled",
    ):
        value = settings.get(key)
        if value is not None:
            profile[key] = value


def _apply_detection_settings_update(
    *,
    config: dict[str, Any],
    game_id: str,
    settings: dict[str, Any],
) -> None:
    global_cfg = config.get("global")
    if not isinstance(global_cfg, dict):
        global_cfg = {}
        config["global"] = global_cfg

    game_cfg = _get_game_cfg(config=config, game_id=game_id)
    if not game_cfg:
        raise ValueError(f"game config not found: {game_id}")

    ui_detection = global_cfg.get("ui_detection")
    if not isinstance(ui_detection, dict):
        ui_detection = {}
        global_cfg["ui_detection"] = ui_detection

    auto_detect_enabled = settings.get("auto_detect_enabled")
    if auto_detect_enabled is not None:
        game_cfg["enabled"] = bool(auto_detect_enabled)

    detection_interval_seconds = settings.get("detection_interval_seconds")
    if detection_interval_seconds is not None:
        global_cfg["poll_interval_ms"] = int(detection_interval_seconds) * 1000

    for key in (
        "control_host",
        "control_port",
        "control_token",
        "host_auto_start",
        "host_keep_alive",
        "host_keep_alive_interval_seconds",
    ):
        value = settings.get(key)
        if value is not None:
            ui_detection[key] = value


def _normalize_recording_settings_payload(payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("payload must be an object")

    normalized: dict[str, Any] = {}

    save_path_raw = payload.get("savePath", payload.get("save_path"))
    if save_path_raw is not None:
        if not isinstance(save_path_raw, str) or not save_path_raw.strip():
            raise ValueError("savePath must be a non-empty string")
        normalized["recordings_output_dir"] = str(Path(save_path_raw.strip()).resolve())

    ui_language_raw = payload.get("uiLanguage", payload.get("ui_language"))
    if ui_language_raw is not None:
        normalized["ui_language"] = _normalize_ui_language(ui_language_raw)

    resolution_raw = payload.get("resolution")
    if resolution_raw is not None:
        normalized["resolution"] = _normalize_resolution(resolution_raw)

    fps_raw = payload.get("fps")
    if fps_raw is not None:
        normalized["fps"] = _parse_int_range(
            fps_raw,
            field_name="fps",
            minimum=15,
            maximum=240,
        )

    video_bitrate_raw = payload.get("videoBitrateKbps", payload.get("video_bitrate_kbps"))
    if video_bitrate_raw is not None:
        normalized["video_bitrate_kbps"] = _parse_int_range(
            video_bitrate_raw,
            field_name="videoBitrateKbps",
            minimum=1000,
            maximum=100000,
        )

    audio_bitrate_raw = payload.get("audioBitrateKbps", payload.get("audio_bitrate_kbps"))
    if audio_bitrate_raw is not None:
        normalized["audio_bitrate_kbps"] = _parse_int_range(
            audio_bitrate_raw,
            field_name="audioBitrateKbps",
            minimum=64,
            maximum=512,
        )

    container_raw = payload.get("container")
    if container_raw is not None:
        normalized["container"] = _normalize_choice(
            container_raw,
            field_name="container",
            allowed={"mp4", "avi"},
        )

    encoder_raw = payload.get("encoder")
    if encoder_raw is not None:
        normalized["encoder"] = _normalize_choice(
            encoder_raw,
            field_name="encoder",
            allowed={"auto", "x264", "nvenc", "qsv", "amf"},
        )

    audio_codec_raw = payload.get("audioCodec", payload.get("audio_codec"))
    if audio_codec_raw is not None:
        normalized["audio_codec"] = _normalize_choice(
            audio_codec_raw,
            field_name="audioCodec",
            allowed={"aac"},
        )

    if "audioInputDevice" in payload or "audio_input_device" in payload:
        audio_input_device_raw = payload.get("audioInputDevice", payload.get("audio_input_device"))
        normalized["audio_input_device"] = _normalize_audio_input_device_setting(audio_input_device_raw)

    audio_input_enabled_raw = payload.get("audioInputEnabled", payload.get("audio_input_enabled"))
    if audio_input_enabled_raw is not None:
        normalized["audio_input_enabled"] = _parse_bool_like(
            audio_input_enabled_raw,
            field_name="audioInputEnabled",
        )

    audio_output_enabled_raw = payload.get("audioOutputEnabled", payload.get("audio_output_enabled"))
    if audio_output_enabled_raw is not None:
        normalized["audio_output_enabled"] = _parse_bool_like(
            audio_output_enabled_raw,
            field_name="audioOutputEnabled",
        )

    hardware_raw = payload.get(
        "hardwareEncodingEnabled",
        payload.get("hardware_encoding_enabled", payload.get("hardwareAccel")),
    )
    if hardware_raw is not None:
        normalized["hardware_encoding_enabled"] = _parse_bool_like(
            hardware_raw,
            field_name="hardwareEncodingEnabled",
        )

    if not normalized:
        raise ValueError("no supported recording settings were provided")

    return normalized


def _normalize_detection_settings_payload(payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("payload must be an object")

    normalized: dict[str, Any] = {}

    auto_detect_raw = payload.get("autoDetect", payload.get("auto_detect_enabled"))
    if auto_detect_raw is not None:
        normalized["auto_detect_enabled"] = _parse_bool_like(
            auto_detect_raw,
            field_name="autoDetect",
        )

    detection_interval_raw = payload.get(
        "detectionInterval",
        payload.get("detectionIntervalSeconds", payload.get("detection_interval_seconds")),
    )
    if detection_interval_raw is not None:
        normalized["detection_interval_seconds"] = _parse_int_range(
            detection_interval_raw,
            field_name="detectionInterval",
            minimum=1,
            maximum=60,
        )

    control_host_raw = payload.get("controlHost", payload.get("control_host"))
    if control_host_raw is not None:
        if not isinstance(control_host_raw, str) or not control_host_raw.strip():
            raise ValueError("controlHost must be a non-empty string")
        normalized["control_host"] = control_host_raw.strip()

    control_port_raw = payload.get("controlPort", payload.get("control_port"))
    if control_port_raw is not None:
        normalized["control_port"] = _parse_int_range(
            control_port_raw,
            field_name="controlPort",
            minimum=1,
            maximum=65535,
        )

    control_token_raw = payload.get("controlToken", payload.get("control_token"))
    if control_token_raw is not None:
        if not isinstance(control_token_raw, str):
            raise ValueError("controlToken must be a string")
        normalized["control_token"] = control_token_raw

    host_auto_start_raw = payload.get("hostAutoStart", payload.get("host_auto_start"))
    if host_auto_start_raw is not None:
        normalized["host_auto_start"] = _parse_bool_like(
            host_auto_start_raw,
            field_name="hostAutoStart",
        )

    host_keep_alive_raw = payload.get("hostKeepAlive", payload.get("host_keep_alive"))
    if host_keep_alive_raw is not None:
        normalized["host_keep_alive"] = _parse_bool_like(
            host_keep_alive_raw,
            field_name="hostKeepAlive",
        )

    keep_alive_interval_raw = payload.get(
        "keepAliveInterval",
        payload.get("hostKeepAliveIntervalSeconds", payload.get("host_keep_alive_interval_seconds")),
    )
    if keep_alive_interval_raw is not None:
        normalized["host_keep_alive_interval_seconds"] = _parse_int_range(
            keep_alive_interval_raw,
            field_name="keepAliveInterval",
            minimum=5,
            maximum=600,
        )

    if not normalized:
        raise ValueError("no supported detection settings were provided")

    return normalized


def _normalize_resolution(value: Any) -> str:
    if not isinstance(value, str):
        raise ValueError("resolution must be a string like 1920x1080")
    text = value.strip().lower()
    if "x" not in text:
        raise ValueError("resolution must be in WxH format")
    left, right = text.split("x", 1)
    width = _parse_int_range(left, field_name="resolution.width", minimum=320, maximum=7680)
    height = _parse_int_range(right, field_name="resolution.height", minimum=240, maximum=4320)
    return f"{width}x{height}"


def _parse_int_range(value: Any, *, field_name: str, minimum: int, maximum: int) -> int:
    try:
        parsed = int(str(value).strip())
    except Exception as exc:
        raise ValueError(f"{field_name} must be an integer") from exc
    if parsed < minimum or parsed > maximum:
        raise ValueError(f"{field_name} must be between {minimum} and {maximum}")
    return parsed


def _normalize_choice(value: Any, *, field_name: str, allowed: set[str]) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field_name} must be a non-empty string")
    normalized = value.strip().lower()
    if normalized not in allowed:
        allowed_list = ", ".join(sorted(allowed))
        raise ValueError(f"{field_name} must be one of: {allowed_list}")
    return normalized


def _parse_bool_like(value: Any, *, field_name: str) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes", "on"}:
            return True
        if normalized in {"0", "false", "no", "off"}:
            return False
    raise ValueError(f"{field_name} must be a boolean")


def _normalize_audio_input_device_setting(value: Any) -> str:
    if value is None:
        return "__default__"
    if not isinstance(value, str):
        raise ValueError("audioInputDevice must be a string or null")
    normalized = value.strip()
    if not normalized:
        return "__default__"
    return normalized


def _normalize_ui_language(value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("uiLanguage must be a non-empty string")
    normalized = value.strip().lower()
    if normalized in {"zh", "zh-cn", "zh_cn", "chinese"}:
        return "zh-CN"
    if normalized in {"en", "en-us", "en_us", "english"}:
        return "en-US"
    raise ValueError("uiLanguage must be zh-CN or en-US")


def _parse_int_with_default(value: Any, *, default: int) -> int:
    try:
        return int(value)
    except Exception:
        return int(default)


def _parse_bool_with_default(value: Any, *, default: bool) -> bool:
    try:
        return _parse_bool_like(value, field_name="value")
    except ValueError:
        return bool(default)


def _write_session_records(*, index_path: Path, records: list[dict[str, Any]]) -> None:
    index_path.parent.mkdir(parents=True, exist_ok=True)
    with index_path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False))
            handle.write("\n")


def _resolve_local_path(raw_path: str) -> Path:
    value = Path(raw_path).expanduser()
    if value.is_absolute():
        return value.resolve()
    return (Path.cwd() / value).resolve()


def _resolve_native_host_path(recorder: Any) -> Path | None:
    value = getattr(recorder, "native_host_path", None)
    if value is None:
        return None
    try:
        return Path(value).resolve()
    except Exception:
        return None


def _build_audio_devices_command(host_path: Path) -> list[str]:
    suffix = host_path.suffix.lower()
    if suffix == ".ps1":
        return [
            "powershell",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(host_path),
            "--list-audio-devices",
        ]
    return [str(host_path), "--list-audio-devices"]


def _run_hidden_process(
    *,
    command: list[str],
    cwd: Path | None,
    timeout_seconds: float,
) -> subprocess.CompletedProcess[str]:
    startupinfo = None
    creationflags = 0
    if os.name == "nt":
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        startupinfo.wShowWindow = 0
        creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    return subprocess.run(
        command,
        cwd=str(cwd) if cwd is not None else None,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="ignore",
        check=False,
        timeout=max(1.0, timeout_seconds),
        startupinfo=startupinfo,
        creationflags=creationflags,
    )


def _parse_json_object_from_output(raw_stdout: str) -> dict[str, Any]:
    for line in reversed(raw_stdout.splitlines()):
        candidate = line.strip()
        if not candidate or not candidate.startswith("{"):
            continue
        try:
            parsed = json.loads(candidate)
        except ValueError:
            continue
        if isinstance(parsed, dict):
            return parsed
    raise ValueError("no JSON object found in host output")


def _normalize_audio_devices(raw_devices: Any) -> list[dict[str, str]]:
    if not isinstance(raw_devices, list):
        return []
    seen: set[str] = set()
    result: list[dict[str, str]] = []
    for item in raw_devices:
        if not isinstance(item, dict):
            continue
        device_name = item.get("device_name")
        friendly_name = item.get("friendly_name")
        identifier = device_name if isinstance(device_name, str) and device_name.strip() else None
        label = friendly_name if isinstance(friendly_name, str) and friendly_name.strip() else None
        if identifier is None and isinstance(label, str):
            identifier = label
        if identifier is None:
            continue
        if identifier in seen:
            continue
        seen.add(identifier)
        result.append({"id": identifier, "label": label or identifier})
    return result


def _open_path(target: Path) -> None:
    if os.name == "nt":
        os.startfile(str(target))  # type: ignore[attr-defined]
        return

    command = ["xdg-open", str(target)]
    if os.uname().sysname.lower() == "darwin":  # type: ignore[attr-defined]
        command = ["open", str(target)]
    subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def _select_directory_windows(*, initial_path: str | None = None) -> str | None:
    if os.name != "nt":
        raise RuntimeError("directory picker is only supported on Windows")
    script = (
        "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; "
        "Add-Type -AssemblyName System.Windows.Forms | Out-Null; "
        "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog; "
        "$dialog.Description = 'Select recording directory'; "
        "$dialog.ShowNewFolderButton = $true; "
        "$seed = $env:UR_INITIAL_DIR; "
        "if ($seed -and (Test-Path -LiteralPath $seed)) { $dialog.SelectedPath = $seed }; "
        "$result = $dialog.ShowDialog(); "
        "if ($result -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.SelectedPath }"
    )
    env = os.environ.copy()
    if isinstance(initial_path, str) and initial_path.strip():
        env["UR_INITIAL_DIR"] = initial_path.strip()
    else:
        env.pop("UR_INITIAL_DIR", None)
    startupinfo = subprocess.STARTUPINFO()
    startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    startupinfo.wShowWindow = 0
    completed = subprocess.run(
        ["powershell", "-NoProfile", "-STA", "-Command", script],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="ignore",
        check=False,
        env=env,
        startupinfo=startupinfo,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    if completed.returncode != 0:
        message = completed.stderr.strip() or "failed to open directory picker"
        raise RuntimeError(message)
    selected = completed.stdout.strip()
    if not selected:
        return None
    return str(Path(selected).resolve())


def _stringify_path_attr(instance: Any, attr_name: str) -> str | None:
    value = getattr(instance, attr_name, None)
    if value is None:
        return None
    try:
        return str(Path(value).resolve())
    except Exception:
        return str(value)
