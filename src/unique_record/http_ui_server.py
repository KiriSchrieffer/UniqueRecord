from __future__ import annotations

import json
import mimetypes
import pathlib
import threading
from dataclasses import dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

from .ui_backend import RuntimeBridgeOptions, RuntimeBridgeService

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[2]
DEFAULT_CONFIG_PATH = PROJECT_ROOT / "configs" / "game_adapters.template.json"
DEFAULT_WEB_ROOT = PROJECT_ROOT / "design" / "figma" / "fluent_v1" / "dist"
DEFAULT_API_ROUTES = [
    "GET /api/status",
    "GET /api/history?limit=20",
    "GET /api/settings",
    "GET /api/audio/devices",
    "GET /api/media/session?sessionId=<id>",
    "POST /api/settings/recording",
    "POST /api/settings/detection",
    "POST /api/history/delete",
    "POST /api/service/start",
    "POST /api/service/stop",
    "POST /api/recording/start",
    "POST /api/recording/stop",
    "POST /api/fs/open-path",
    "POST /api/fs/open-recordings-dir",
    "POST /api/fs/select-directory",
]


@dataclass(slots=True)
class UiBackendHttpOptions:
    host: str = "127.0.0.1"
    port: int = 8765
    config_path: str | pathlib.Path = DEFAULT_CONFIG_PATH
    app_root: str | pathlib.Path | None = None
    game_id: str = "league_of_legends"
    autostart: bool = False
    web_root: str | pathlib.Path | None = DEFAULT_WEB_ROOT
    recorder_options: dict[str, Any] | None = None


class UiBackendHttpServer:
    """
    Combined runtime bridge + HTTP API server for desktop/local UI.
    """

    def __init__(self, options: UiBackendHttpOptions) -> None:
        self._options = options
        app_root = pathlib.Path(options.app_root).resolve() if options.app_root else None
        self._service = RuntimeBridgeService(
            RuntimeBridgeOptions(
                config_path=options.config_path,
                app_root=app_root,
                game_id=options.game_id,
                recorder_options=options.recorder_options,
            )
        )
        self._web_root = _resolve_optional_dir(options.web_root)
        handler_cls = _build_handler(service=self._service, web_root=self._web_root)
        self._server = ThreadingHTTPServer((options.host, options.port), handler_cls)
        self._autostart_applied = False
        self._background_thread: threading.Thread | None = None
        self._lock = threading.RLock()

    @property
    def service(self) -> RuntimeBridgeService:
        return self._service

    @property
    def web_root(self) -> pathlib.Path | None:
        return self._web_root

    def startup_payload(self) -> dict[str, Any]:
        return {
            "status": "started",
            "host": self._options.host,
            "port": self._options.port,
            "autostart": self._options.autostart,
            "routes": list(DEFAULT_API_ROUTES),
            "web_root": str(self._web_root) if self._web_root is not None else None,
            "ui_url": (
                f"http://{self._options.host}:{self._options.port}/"
                if self._web_root is not None
                else None
            ),
        }

    def serve_forever(self, *, poll_interval: float = 0.5) -> None:
        self._ensure_autostart()
        self._server.serve_forever(poll_interval=poll_interval)

    def start_background(self, *, poll_interval: float = 0.5) -> None:
        with self._lock:
            if self._background_thread is not None and self._background_thread.is_alive():
                return
            self._ensure_autostart()
            self._background_thread = threading.Thread(
                target=self._server.serve_forever,
                kwargs={"poll_interval": poll_interval},
                name="unique-record-http-server",
                daemon=True,
            )
            self._background_thread.start()

    def shutdown(self) -> None:
        with self._lock:
            thread = self._background_thread
            self._background_thread = None

        try:
            self._server.shutdown()
        except Exception:
            pass

        if thread is not None:
            thread.join(timeout=3)

        try:
            self._server.server_close()
        finally:
            self._service.stop_service()

    def _ensure_autostart(self) -> None:
        with self._lock:
            if self._autostart_applied:
                return
            self._autostart_applied = True
            if self._options.autostart:
                self._service.start_service()


def _build_handler(
    *,
    service: RuntimeBridgeService,
    web_root: pathlib.Path | None,
) -> type[BaseHTTPRequestHandler]:
    class ApiHandler(BaseHTTPRequestHandler):
        def do_OPTIONS(self) -> None:  # noqa: N802
            self.send_response(HTTPStatus.NO_CONTENT)
            self._send_cors_headers()
            self.end_headers()

        def do_GET(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            path = parsed.path
            query = parse_qs(parsed.query)

            if path == "/api/status":
                self._send_json(HTTPStatus.OK, service.status())
                return

            if path == "/api/history":
                limit = _parse_positive_int(query.get("limit", ["20"])[0], default=20)
                self._send_json(HTTPStatus.OK, {"items": service.list_sessions(limit=limit)})
                return

            if path == "/api/settings":
                self._send_json(HTTPStatus.OK, service.read_settings())
                return

            if path == "/api/audio/devices":
                self._send_json(HTTPStatus.OK, service.list_audio_devices())
                return

            if path == "/api/media/session":
                raw_session_id = query.get("sessionId", [""])[0]
                session_id = str(raw_session_id) if raw_session_id is not None else ""
                try:
                    media_path = service.resolve_session_output_path(session_id=session_id)
                except ValueError as exc:
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                    return
                except FileNotFoundError as exc:
                    self._send_json(HTTPStatus.NOT_FOUND, {"error": str(exc)})
                    return
                self._send_media_file(media_path)
                return

            if web_root is not None and self._serve_static(path):
                return

            self._send_json(HTTPStatus.NOT_FOUND, {"error": f"route not found: {path}"})

        def do_POST(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            path = parsed.path

            payload = self._read_json_body()

            if path == "/api/service/start":
                service.start_service()
                self._send_json(HTTPStatus.OK, {"ok": True, "status": service.status()})
                return

            if path == "/api/service/stop":
                service.stop_service()
                self._send_json(HTTPStatus.OK, {"ok": True, "status": service.status()})
                return

            if path == "/api/recording/start":
                events = service.manual_start()
                self._send_json(
                    HTTPStatus.OK,
                    {"ok": True, "events": events, "status": service.status()},
                )
                return

            if path == "/api/recording/stop":
                events = service.manual_stop()
                self._send_json(
                    HTTPStatus.OK,
                    {"ok": True, "events": events, "status": service.status()},
                )
                return

            if path == "/api/settings/recording":
                try:
                    settings = service.update_recording_settings(payload)
                except (RuntimeError, ValueError) as exc:
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                    return
                self._send_json(
                    HTTPStatus.OK,
                    {
                        "ok": True,
                        "settings": settings,
                        "status": service.status(),
                    },
                )
                return

            if path == "/api/settings/detection":
                try:
                    settings = service.update_detection_settings(payload)
                except (RuntimeError, ValueError) as exc:
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                    return
                self._send_json(
                    HTTPStatus.OK,
                    {
                        "ok": True,
                        "settings": settings,
                        "status": service.status(),
                    },
                )
                return

            if path == "/api/history/delete":
                session_ids = payload.get("sessionIds")
                if not isinstance(session_ids, list):
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": "sessionIds must be a list"})
                    return
                delete_files = bool(payload.get("deleteFiles"))
                try:
                    result = service.delete_sessions(
                        session_ids=session_ids,
                        delete_files=delete_files,
                    )
                except (RuntimeError, ValueError, FileNotFoundError) as exc:
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                    return
                self._send_json(HTTPStatus.OK, {"ok": True, **result})
                return

            if path == "/api/fs/open-path":
                path_value = payload.get("path")
                if not isinstance(path_value, str) or not path_value.strip():
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": "path is required"})
                    return
                reveal_in_folder = bool(payload.get("revealInFolder"))
                try:
                    result = service.open_in_explorer(
                        target_path=path_value,
                        reveal_in_folder=reveal_in_folder,
                    )
                except (FileNotFoundError, ValueError) as exc:
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                    return
                self._send_json(HTTPStatus.OK, {"ok": True, **result})
                return

            if path == "/api/fs/open-recordings-dir":
                path_override = payload.get("path")
                if not isinstance(path_override, str):
                    path_override = None
                try:
                    result = service.open_recordings_dir(path_override=path_override)
                except (FileNotFoundError, ValueError) as exc:
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                    return
                self._send_json(HTTPStatus.OK, {"ok": True, **result})
                return

            if path == "/api/fs/select-directory":
                initial_path = payload.get("initialPath")
                if not isinstance(initial_path, str):
                    initial_path = None
                try:
                    result = service.select_directory(initial_path=initial_path)
                except (RuntimeError, ValueError) as exc:
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                    return
                self._send_json(HTTPStatus.OK, {"ok": True, **result})
                return

            self._send_json(HTTPStatus.NOT_FOUND, {"error": f"route not found: {path}"})

        def log_message(self, format: str, *args: Any) -> None:
            _ = (format, args)

        def _send_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _send_cors_headers(self) -> None:
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

        def _read_json_body(self) -> dict[str, Any]:
            content_length = int(self.headers.get("Content-Length", "0") or "0")
            if content_length <= 0:
                return {}
            raw = self.rfile.read(content_length)
            if not raw:
                return {}
            try:
                payload = json.loads(raw.decode("utf-8"))
            except (ValueError, UnicodeDecodeError):
                return {}
            if isinstance(payload, dict):
                return payload
            return {}

        def _serve_static(self, route_path: str) -> bool:
            if web_root is None:
                return False
            if route_path.startswith("/api/"):
                return False

            request_path = unquote(route_path)
            if request_path in ("", "/"):
                candidate = web_root / "index.html"
            else:
                relative = request_path.lstrip("/")
                candidate = (web_root / relative).resolve()
                if not _is_subpath(candidate, web_root):
                    self._send_json(HTTPStatus.FORBIDDEN, {"error": "invalid static path"})
                    return True
                if candidate.is_dir():
                    candidate = candidate / "index.html"

            if not candidate.exists() or not candidate.is_file():
                fallback = web_root / "index.html"
                if fallback.exists():
                    self._send_file(HTTPStatus.OK, fallback, content_type="text/html; charset=utf-8")
                    return True
                return False

            self._send_file(HTTPStatus.OK, candidate)
            return True

        def _send_file(
            self,
            status: HTTPStatus,
            file_path: pathlib.Path,
            *,
            content_type: str | None = None,
        ) -> None:
            body = file_path.read_bytes()
            if content_type is None:
                guessed, _ = mimetypes.guess_type(str(file_path))
                content_type = guessed or "application/octet-stream"
                if content_type.startswith("text/"):
                    content_type = f"{content_type}; charset=utf-8"
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _send_media_file(self, file_path: pathlib.Path) -> None:
            total_size = int(file_path.stat().st_size)
            content_type, _ = mimetypes.guess_type(str(file_path))
            if not content_type:
                content_type = "application/octet-stream"

            byte_range = _parse_http_byte_range(
                raw_header=self.headers.get("Range"),
                total_size=total_size,
            )
            if byte_range is None:
                status = HTTPStatus.OK
                start = 0
                end = total_size - 1
            else:
                if byte_range == "invalid":
                    self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                    self._send_cors_headers()
                    self.send_header("Accept-Ranges", "bytes")
                    self.send_header("Content-Range", f"bytes */{total_size}")
                    self.end_headers()
                    return
                status = HTTPStatus.PARTIAL_CONTENT
                start, end = byte_range

            content_length = max(0, end - start + 1)
            self.send_response(status)
            self._send_cors_headers()
            self.send_header("Content-Type", content_type)
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(content_length))
            if status == HTTPStatus.PARTIAL_CONTENT:
                self.send_header("Content-Range", f"bytes {start}-{end}/{total_size}")
            self.end_headers()

            with file_path.open("rb") as handle:
                if start > 0:
                    handle.seek(start)
                remaining = content_length
                while remaining > 0:
                    chunk = handle.read(min(64 * 1024, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)

    return ApiHandler


def _resolve_optional_dir(path_value: str | pathlib.Path | None) -> pathlib.Path | None:
    if path_value is None:
        return None
    resolved = pathlib.Path(path_value).resolve()
    if resolved.is_dir():
        return resolved
    return None


def _is_subpath(candidate: pathlib.Path, root: pathlib.Path) -> bool:
    try:
        candidate.relative_to(root.resolve())
    except ValueError:
        return False
    return True


def _parse_positive_int(raw: str, *, default: int) -> int:
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return default
    if value <= 0:
        return default
    return value


def _parse_http_byte_range(
    *,
    raw_header: str | None,
    total_size: int,
) -> tuple[int, int] | str | None:
    if raw_header is None or not raw_header.strip():
        return None
    if total_size <= 0:
        return "invalid"

    text = raw_header.strip()
    if not text.lower().startswith("bytes="):
        return "invalid"

    value = text.split("=", 1)[1].strip()
    if "," in value:
        return "invalid"
    if "-" not in value:
        return "invalid"

    left, right = value.split("-", 1)
    left = left.strip()
    right = right.strip()
    try:
        if left == "":
            # Suffix range: bytes=-N
            suffix_length = int(right)
            if suffix_length <= 0:
                return "invalid"
            if suffix_length >= total_size:
                return (0, total_size - 1)
            start = total_size - suffix_length
            return (start, total_size - 1)

        start = int(left)
        if start < 0 or start >= total_size:
            return "invalid"

        if right == "":
            return (start, total_size - 1)

        end = int(right)
        if end < start:
            return "invalid"
        if end >= total_size:
            end = total_size - 1
        return (start, end)
    except ValueError:
        return "invalid"
