from __future__ import annotations

import datetime as dt
import os
import subprocess
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from .controller import RecorderCommand


class WindowsNativeRuntimeMissingError(RuntimeError):
    """Raised when process backend is requested but capture host is missing."""


@dataclass(slots=True)
class _ActiveProcessSession:
    session_id: str
    output_path: Path
    stop_signal_path: Path
    process: Any
    started_at_ms: int


class WindowsNativeRecordingController:
    """
    Windows-native recorder controller.

    Supports:
    - placeholder mode: records start/stop commands only.
    - process mode: controls an external native capture host process.
    - auto mode: process if host exists, else placeholder.
    """

    def __init__(
        self,
        *,
        app_root: Path | None = None,
        recording_profile: dict[str, Any] | None = None,
        recordings_output_dir: str | Path | None = None,
        backend_mode: str = "auto",
        native_host_path: str | Path | None = None,
        filename_template: str = "{game}_{start_ts}_{session_id}.{ext}",
        stop_signal_root_dir: str | Path | None = None,
        process_stop_timeout_seconds: float = 8.0,
        popen_factory: Callable[..., Any] = subprocess.Popen,
        now_seconds_fn: Callable[[], float] = time.time,
    ) -> None:
        root = app_root or Path(__file__).resolve().parents[3]
        self._app_root = Path(root).resolve()
        self._recording_profile = dict(recording_profile or {})
        if recordings_output_dir is None:
            output_dir = self._app_root / "recordings"
        else:
            output_dir = Path(recordings_output_dir)
            if not output_dir.is_absolute():
                output_dir = self._app_root / output_dir
        self._recordings_output_dir = output_dir.resolve()
        self._recordings_output_dir.mkdir(parents=True, exist_ok=True)

        self._filename_template = filename_template
        self._stop_signal_root_dir = self._resolve_stop_signal_root_dir(stop_signal_root_dir)
        self._process_stop_timeout_seconds = max(1.0, float(process_stop_timeout_seconds))
        self._popen_factory = popen_factory
        self._now_seconds_fn = now_seconds_fn
        self._container = _normalize_container(self._recording_profile.get("container", "mp4"))
        self._host_path = self._resolve_host_path(native_host_path)
        self._backend_mode = self._resolve_backend_mode(backend_mode, self._host_path)

        self.commands: list[RecorderCommand] = []
        self.active_session_id: str | None = None
        self._is_recording = False
        self._active_session: _ActiveProcessSession | None = None

    @property
    def backend_mode(self) -> str:
        return self._backend_mode

    @property
    def native_host_path(self) -> Path:
        return self._host_path

    def start_recording(
        self,
        *,
        ts_unix_ms: int,
        session_id: str | None,
        reason_code: str | None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        self._is_recording = True
        self.active_session_id = session_id or self.active_session_id
        payload = dict(metadata or {})
        payload.setdefault("backend", f"windows_native_{self._backend_mode}")
        self.commands.append(
            RecorderCommand(
                ts_unix_ms=ts_unix_ms,
                action="start_recording",
                session_id=session_id,
                reason_code=reason_code,
                metadata=payload,
            )
        )
        if self._backend_mode == "process":
            self._start_process_session(
                ts_unix_ms=ts_unix_ms,
                session_id=session_id,
                metadata=payload,
            )
        return None

    def stop_recording(
        self,
        *,
        ts_unix_ms: int,
        session_id: str | None,
        reason_code: str | None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        payload = dict(metadata or {})
        payload.setdefault("backend", f"windows_native_{self._backend_mode}")
        self.commands.append(
            RecorderCommand(
                ts_unix_ms=ts_unix_ms,
                action="stop_recording",
                session_id=session_id,
                reason_code=reason_code,
                metadata=payload,
            )
        )
        self._is_recording = False
        self.active_session_id = None
        if self._backend_mode == "process":
            return self._stop_process_session()
        return None

    def shutdown(self) -> None:
        if self._backend_mode == "process":
            self._terminate_active_process()
        self._is_recording = False
        self.active_session_id = None

    def _resolve_host_path(self, native_host_path: str | Path | None) -> Path:
        if native_host_path is not None:
            path = Path(native_host_path)
            if not path.is_absolute():
                path = self._app_root / path
            return path.resolve()

        candidates = [
            self._app_root / "runtime" / "windows_capture" / "UniqueRecord.CaptureHost.exe",
            self._app_root / "runtime" / "windows_capture" / "UniqueRecord.CaptureHost.cmd",
            self._app_root / "runtime" / "windows_capture" / "UniqueRecord.CaptureHost.ps1",
        ]
        for candidate in candidates:
            if candidate.exists():
                return candidate.resolve()
        return candidates[0].resolve()

    def _resolve_stop_signal_root_dir(self, stop_signal_root_dir: str | Path | None) -> Path:
        if stop_signal_root_dir is None:
            path = Path(tempfile.gettempdir()) / "UniqueRecord" / "native_capture"
        else:
            path = Path(stop_signal_root_dir)
            if not path.is_absolute():
                path = self._app_root / path
        return path.resolve()

    def _resolve_backend_mode(self, backend_mode: str, host_path: Path) -> str:
        mode = backend_mode.strip().lower()
        if mode not in {"auto", "placeholder", "process"}:
            raise ValueError(f"unsupported backend_mode: {backend_mode!r}")

        if mode == "auto":
            return "process" if host_path.exists() else "placeholder"
        if mode == "process" and not host_path.exists():
            raise WindowsNativeRuntimeMissingError(
                "Windows native capture host not found. "
                f"Expected: {host_path}"
            )
        return mode

    def _start_process_session(
        self,
        *,
        ts_unix_ms: int,
        session_id: str | None,
        metadata: dict[str, Any],
    ) -> None:
        # Prevent duplicate launches if state machine emits repeated start attempts.
        if self._active_session is not None and self._is_process_alive(self._active_session.process):
            return

        resolved_session_id = _sanitize_segment(session_id or f"session_{ts_unix_ms}")
        output_path = self._build_output_path(
            ts_unix_ms=ts_unix_ms,
            session_id=resolved_session_id,
            metadata=metadata,
        )
        stop_signal_path = self._build_stop_signal_path(resolved_session_id)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        stop_signal_path.parent.mkdir(parents=True, exist_ok=True)
        if stop_signal_path.exists():
            stop_signal_path.unlink(missing_ok=True)

        command = self._build_host_command(
            output_path=output_path,
            stop_signal_path=stop_signal_path,
            session_id=resolved_session_id,
            ts_unix_ms=ts_unix_ms,
            metadata=metadata,
        )
        popen_kwargs: dict[str, Any] = {
            "cwd": str(self._host_path.parent),
            "stdout": subprocess.DEVNULL,
            "stderr": subprocess.DEVNULL,
        }
        if os.name == "nt":
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startupinfo.wShowWindow = 0
            popen_kwargs["startupinfo"] = startupinfo
            popen_kwargs["creationflags"] = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        process = self._popen_factory(
            command,
            **popen_kwargs,
        )
        self._active_session = _ActiveProcessSession(
            session_id=resolved_session_id,
            output_path=output_path,
            stop_signal_path=stop_signal_path,
            process=process,
            started_at_ms=ts_unix_ms,
        )

    def _stop_process_session(self) -> dict[str, Any] | None:
        session = self._active_session
        if session is None:
            return None
        process = session.process
        if self._is_process_alive(process):
            session.stop_signal_path.write_text("stop\n", encoding="utf-8")
            wait = getattr(process, "wait", None)
            if callable(wait):
                try:
                    wait(timeout=self._process_stop_timeout_seconds)
                except Exception:
                    self._terminate_process(process)

        output_exists = session.output_path.exists()
        self._active_session = None
        return {
            "output_path": str(session.output_path.resolve()),
            "output_path_exists": output_exists,
        }

    def _terminate_active_process(self) -> None:
        session = self._active_session
        if session is None:
            return
        self._terminate_process(session.process)
        self._active_session = None

    @staticmethod
    def _is_process_alive(process: Any) -> bool:
        poll = getattr(process, "poll", None)
        if callable(poll):
            return poll() is None
        return True

    @staticmethod
    def _terminate_process(process: Any) -> None:
        terminate = getattr(process, "terminate", None)
        wait = getattr(process, "wait", None)
        kill = getattr(process, "kill", None)
        try:
            if callable(terminate):
                terminate()
            if callable(wait):
                wait(timeout=3)
        except Exception:
            if callable(kill):
                kill()

    def _build_output_path(
        self,
        *,
        ts_unix_ms: int,
        session_id: str,
        metadata: dict[str, Any],
    ) -> Path:
        game_id = _sanitize_segment(str(metadata.get("game_id") or "league_of_legends"))
        start_ts = dt.datetime.fromtimestamp(ts_unix_ms / 1000.0).strftime("%Y%m%d_%H%M%S")
        ext = _sanitize_segment(self._container)
        try:
            filename = self._filename_template.format(
                game=game_id,
                start_ts=start_ts,
                session_id=session_id,
                ext=ext,
            )
        except Exception:
            filename = f"{game_id}_{start_ts}_{session_id}.{ext}"
        filename = _sanitize_filename(filename, fallback=f"{game_id}_{start_ts}.{ext}")
        return (self._recordings_output_dir / filename).resolve()

    def _build_stop_signal_path(self, session_id: str) -> Path:
        return (self._stop_signal_root_dir / f"{session_id}.stop").resolve()

    def _build_host_command(
        self,
        *,
        output_path: Path,
        stop_signal_path: Path,
        session_id: str,
        ts_unix_ms: int,
        metadata: dict[str, Any],
    ) -> list[str]:
        command: list[str]
        suffix = self._host_path.suffix.lower()
        if suffix == ".ps1":
            command = [
                "powershell",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(self._host_path),
            ]
        else:
            command = [str(self._host_path)]

        command.extend(
            [
                "--output",
                str(output_path),
                "--stop-signal",
                str(stop_signal_path),
                "--session-id",
                session_id,
                "--container",
                self._container,
                "--start-ts-ms",
                str(ts_unix_ms),
            ]
        )

        fps = _parse_int(self._recording_profile.get("fps"), default=60)
        if fps > 0:
            command.extend(["--fps", str(fps)])
        width, height = _parse_resolution(self._recording_profile.get("resolution"))
        if width > 0 and height > 0:
            command.extend(["--width", str(width), "--height", str(height)])
        video_bitrate_kbps = _parse_int(self._recording_profile.get("video_bitrate_kbps"), default=0)
        if video_bitrate_kbps > 0:
            command.extend(["--video-bitrate-kbps", str(video_bitrate_kbps)])
        audio_bitrate_kbps = _parse_int(self._recording_profile.get("audio_bitrate_kbps"), default=0)
        if audio_bitrate_kbps > 0:
            command.extend(["--audio-bitrate-kbps", str(audio_bitrate_kbps)])
        encoder = _normalize_encoder(self._recording_profile.get("encoder"))
        if encoder is not None:
            command.extend(["--encoder", encoder])
        audio_codec = _normalize_audio_codec(self._recording_profile.get("audio_codec"))
        if audio_codec is not None:
            command.extend(["--audio-codec", audio_codec])
        audio_input_device = _normalize_audio_input_device(
            self._recording_profile.get("audio_input_device")
        )
        if audio_input_device is not None:
            command.extend(["--audio-input-device", audio_input_device])
        audio_input_enabled = _parse_optional_bool(self._recording_profile.get("audio_input_enabled"))
        if audio_input_enabled is not None:
            command.extend(["--audio-input-enabled", "true" if audio_input_enabled else "false"])
        audio_output_enabled = _parse_optional_bool(self._recording_profile.get("audio_output_enabled"))
        if audio_output_enabled is not None:
            command.extend(["--audio-output-enabled", "true" if audio_output_enabled else "false"])
        hardware_encoding_enabled = _parse_optional_bool(
            self._recording_profile.get("hardware_encoding_enabled")
        )
        if hardware_encoding_enabled is not None:
            command.extend(
                [
                    "--hardware-encoding-enabled",
                    "true" if hardware_encoding_enabled else "false",
                ]
            )

        for key in ("window_title", "window_class", "display_id"):
            value = metadata.get(key)
            if isinstance(value, str) and value.strip():
                command.extend([f"--{key.replace('_', '-')}", value.strip()])
        return command


def _normalize_container(value: Any) -> str:
    supported = {"mp4", "avi"}
    if isinstance(value, str):
        normalized = value.strip().lower().lstrip(".")
        if normalized in supported:
            return normalized
    return "mp4"


def _parse_resolution(value: Any) -> tuple[int, int]:
    if not isinstance(value, str):
        return (0, 0)
    try:
        left, right = value.lower().split("x", 1)
        width = int(left.strip())
        height = int(right.strip())
        if width > 0 and height > 0:
            return (width, height)
    except Exception:
        return (0, 0)
    return (0, 0)


def _parse_int(value: Any, *, default: int) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _normalize_encoder(value: Any) -> str | None:
    supported = {"auto", "x264", "nvenc", "qsv", "amf"}
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in supported:
            return normalized
    return None


def _normalize_audio_codec(value: Any) -> str | None:
    supported = {"aac"}
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in supported:
            return normalized
    return None


def _normalize_audio_input_device(value: Any) -> str | None:
    if isinstance(value, str):
        normalized = value.strip()
        if not normalized:
            return None
        if normalized.lower() == "__default__":
            return "__default__"
        return normalized
    return None


def _parse_optional_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes", "on"}:
            return True
        if normalized in {"0", "false", "no", "off"}:
            return False
    if isinstance(value, (int, float)):
        return bool(value)
    return None


def _sanitize_segment(value: str) -> str:
    text = value.strip()
    if not text:
        return "unknown"
    chars = []
    for ch in text:
        if ch.isalnum() or ch in {"-", "_"}:
            chars.append(ch)
        else:
            chars.append("_")
    return "".join(chars).strip("_") or "unknown"


def _sanitize_filename(value: str, *, fallback: str) -> str:
    reserved = {'<', '>', ':', '"', '/', '\\', '|', '?', '*'}
    text = value.strip()
    if not text:
        text = fallback
    cleaned = "".join("_" if ch in reserved else ch for ch in text)
    cleaned = cleaned.strip().strip(".")
    if not cleaned:
        return fallback
    return cleaned
