from __future__ import annotations

import json
import mimetypes
import os
import pathlib
import threading
import time
from dataclasses import dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Callable
from urllib.parse import parse_qs, unquote, urlparse

from .app_update import AppUpdateService
from .auth_local import LocalAuthService
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
    "GET /api/auth/status",
    "POST /api/auth/register",
    "POST /api/auth/login",
    "POST /api/auth/logout",
    "POST /api/auth/google/start",
    "GET /api/auth/google/callback?state=<state>&code=<code>",
    "GET /api/update/status",
    "POST /api/update/download",
    "POST /api/update/apply",
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
    resource_root: str | pathlib.Path | None = None
    release_manifest_url: str = "https://download.uniquerecord.com/downloads/latest.json"


class UiBackendHttpServer:
    """
    Combined runtime bridge + HTTP API server for desktop/local UI.
    """

    def __init__(self, options: UiBackendHttpOptions) -> None:
        self._options = options
        app_root = pathlib.Path(options.app_root).resolve() if options.app_root else None
        resource_root = pathlib.Path(options.resource_root).resolve() if options.resource_root else PROJECT_ROOT
        data_root = app_root or PROJECT_ROOT
        self._service = RuntimeBridgeService(
            RuntimeBridgeOptions(
                config_path=options.config_path,
                app_root=app_root,
                game_id=options.game_id,
                recorder_options=options.recorder_options,
            )
        )
        global_cfg = self._service.runtime.config.get("global", {})
        if not isinstance(global_cfg, dict):
            global_cfg = {}
        auth_cfg = global_cfg.get("auth", {})
        if not isinstance(auth_cfg, dict):
            auth_cfg = {}
        google_cfg = auth_cfg.get("google", {})
        if not isinstance(google_cfg, dict):
            google_cfg = {}
        google_client_id = str(google_cfg.get("client_id") or os.environ.get("UR_GOOGLE_CLIENT_ID") or "").strip()
        google_client_secret = str(
            google_cfg.get("client_secret") or os.environ.get("UR_GOOGLE_CLIENT_SECRET") or ""
        ).strip()

        updates_cfg = global_cfg.get("updates", {})
        if not isinstance(updates_cfg, dict):
            updates_cfg = {}
        release_manifest_url = (
            str(updates_cfg.get("release_manifest_url") or options.release_manifest_url).strip()
            or options.release_manifest_url
        )

        self._auth_service = LocalAuthService(
            data_root=data_root,
            oauth_host=options.host,
            oauth_port=options.port,
            google_client_id=google_client_id,
            google_client_secret=google_client_secret,
        )
        self._update_service = AppUpdateService(
            data_root=data_root,
            manifest_url=release_manifest_url,
            build_info_path=(resource_root / "build" / "build_info.json"),
        )
        self._web_root = _resolve_optional_dir(options.web_root)
        handler_cls = _build_handler(
            service=self._service,
            auth_service=self._auth_service,
            update_service=self._update_service,
            web_root=self._web_root,
            request_process_exit=self._request_process_exit,
        )
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

    def _request_process_exit(self, *, delay_seconds: float = 1.2) -> None:
        def _exit_later() -> None:
            time.sleep(max(0.2, delay_seconds))
            os._exit(0)

        threading.Thread(target=_exit_later, name="unique-record-updater-exit", daemon=True).start()


def _build_handler(
    *,
    service: RuntimeBridgeService,
    auth_service: LocalAuthService,
    update_service: AppUpdateService,
    web_root: pathlib.Path | None,
    request_process_exit: Callable[..., None],
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

            if path == "/api/auth/status":
                self._send_json(HTTPStatus.OK, auth_service.status())
                return

            if path == "/api/update/status":
                self._send_json(HTTPStatus.OK, update_service.status())
                return

            if path == "/api/auth/google/callback":
                state = str(query.get("state", [""])[0] or "")
                code = str(query.get("code", [""])[0] or "")
                error = str(query.get("error", [""])[0] or "")
                if error:
                    self._send_html(
                        HTTPStatus.BAD_REQUEST,
                        _build_oauth_result_html(
                            title="Google Login Failed",
                            message=f"Google returned an error: {error}",
                            success=False,
                        ),
                    )
                    return
                try:
                    auth_service.complete_google_login(state=state, code=code)
                except ValueError as exc:
                    self._send_html(
                        HTTPStatus.BAD_REQUEST,
                        _build_oauth_result_html(
                            title="Google Login Failed",
                            message=str(exc),
                            success=False,
                        ),
                    )
                    return
                self._send_html(
                    HTTPStatus.OK,
                    _build_oauth_result_html(
                        title="Google Login Successful",
                        message="You can close this browser tab and return to UniqueRecord.",
                        success=True,
                    ),
                )
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

            if path == "/api/auth/register":
                email = payload.get("email")
                password = payload.get("password")
                display_name = payload.get("displayName", payload.get("display_name", ""))
                if not isinstance(email, str) or not isinstance(password, str):
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": "email and password are required"})
                    return
                if not isinstance(display_name, str):
                    display_name = ""
                try:
                    result = auth_service.register_email(
                        email=email,
                        password=password,
                        display_name=display_name,
                    )
                except ValueError as exc:
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                    return
                self._send_json(HTTPStatus.OK, {"ok": True, **result})
                return

            if path == "/api/auth/login":
                email = payload.get("email")
                password = payload.get("password")
                if not isinstance(email, str) or not isinstance(password, str):
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": "email and password are required"})
                    return
                try:
                    result = auth_service.login_email(email=email, password=password)
                except ValueError as exc:
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                    return
                self._send_json(HTTPStatus.OK, {"ok": True, **result})
                return

            if path == "/api/auth/logout":
                self._send_json(HTTPStatus.OK, {"ok": True, **auth_service.logout()})
                return

            if path == "/api/auth/google/start":
                try:
                    result = auth_service.start_google_login()
                except ValueError as exc:
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                    return
                self._send_json(HTTPStatus.OK, {"ok": True, **result})
                return

            if path == "/api/update/download":
                try:
                    result = update_service.download_latest_installer()
                except RuntimeError as exc:
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                    return
                self._send_json(HTTPStatus.OK, {"ok": True, **result, "status": update_service.status()})
                return

            if path == "/api/update/apply":
                installer_path = payload.get("installerPath")
                if installer_path is not None and not isinstance(installer_path, str):
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": "installerPath must be a string"})
                    return
                try:
                    result = update_service.apply_installer(installer_path=installer_path)
                except RuntimeError as exc:
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                    return
                request_process_exit(delay_seconds=1.2)
                self._send_json(HTTPStatus.OK, {"ok": True, **result, "will_exit": True})
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

        def _send_html(self, status: HTTPStatus, html: str) -> None:
            body = html.encode("utf-8")
            self.send_response(status)
            self._send_cors_headers()
            self.send_header("Content-Type", "text/html; charset=utf-8")
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


def _build_oauth_result_html(*, title: str, message: str, success: bool) -> str:
    border = "#0f6cbd" if success else "#d13438"
    background = "#f3f9fd" if success else "#fef3f2"
    safe_title = title.replace("<", "&lt;").replace(">", "&gt;")
    safe_message = message.replace("<", "&lt;").replace(">", "&gt;")
    return f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>{safe_title}</title>
    <style>
      body {{ font-family: Segoe UI, Arial, sans-serif; background: #f7f8fa; margin: 0; padding: 36px; }}
      .card {{ max-width: 680px; margin: 0 auto; background: {background}; border: 1px solid {border}; border-radius: 12px; padding: 20px; }}
      h1 {{ margin: 0 0 12px 0; font-size: 20px; color: #202123; }}
      p {{ margin: 0; color: #3b3d40; line-height: 1.5; }}
    </style>
  </head>
  <body>
    <div class="card">
      <h1>{safe_title}</h1>
      <p>{safe_message}</p>
    </div>
  </body>
</html>"""
