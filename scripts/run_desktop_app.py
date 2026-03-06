from __future__ import annotations

import argparse
import pathlib
import sys

def _find_resource_root() -> pathlib.Path:
    candidates: list[pathlib.Path] = []

    meipass = getattr(sys, "_MEIPASS", None)
    if meipass:
        candidates.append(pathlib.Path(str(meipass)).resolve())

    if getattr(sys, "frozen", False):
        exe_dir = pathlib.Path(sys.executable).resolve().parent
        candidates.append((exe_dir / "_internal").resolve())
        candidates.append(exe_dir.resolve())

    script_root = pathlib.Path(__file__).resolve().parents[1]
    candidates.append(script_root)
    candidates.append(pathlib.Path.cwd().resolve())

    seen: set[pathlib.Path] = set()
    for candidate in candidates:
        if candidate in seen:
            continue
        seen.add(candidate)
        if (candidate / "src" / "unique_record").is_dir():
            return candidate
    return script_root


RESOURCE_ROOT = _find_resource_root()
sys.path.insert(0, str(RESOURCE_ROOT / "src"))

from unique_record.http_ui_server import UiBackendHttpOptions, UiBackendHttpServer


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run UniqueRecord as a Windows desktop app.")
    parser.add_argument("--host", default="127.0.0.1", help="Embedded local HTTP host.")
    parser.add_argument("--port", type=int, default=8765, help="Embedded local HTTP port.")
    parser.add_argument(
        "--config",
        default="",
        help="Runtime config path. Defaults to <resource_root>/configs/game_adapters.template.json.",
    )
    parser.add_argument(
        "--app-root",
        default="",
        help="Application root. Defaults to project root (dev) or executable directory (frozen).",
    )
    parser.add_argument(
        "--web-root",
        default="",
        help="Frontend static root. Defaults to <resource_root>/design/figma/fluent_v1/dist.",
    )
    parser.add_argument(
        "--native-host",
        default="",
        help=(
            "Native capture host path. "
            "Defaults to <resource_root>/runtime/windows_capture/UniqueRecord.CaptureHost.exe."
        ),
    )
    parser.add_argument(
        "--start-page",
        default="/dashboard",
        help="Initial page route path. Example: /dashboard",
    )
    parser.add_argument("--width", type=int, default=1360, help="Window width.")
    parser.add_argument("--height", type=int, default=900, help="Window height.")
    parser.add_argument("--title", default="UniqueRecord", help="Window title.")
    parser.add_argument("--debug", action="store_true", help="Enable WebView debug mode.")
    parser.add_argument("--no-autostart", action="store_true", help="Do not auto-start runtime loop.")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    app_root = pathlib.Path(args.app_root).resolve() if args.app_root else _default_app_root()
    config_path = pathlib.Path(args.config).resolve() if args.config else _default_config_path()
    web_root = pathlib.Path(args.web_root).resolve() if args.web_root else _default_web_root()
    native_host_path = (
        pathlib.Path(args.native_host).resolve() if args.native_host else _default_native_host_path()
    )

    if not web_root.is_dir():
        print(
            {
                "status": "error",
                "error": "frontend_build_missing",
                "hint": f"Missing frontend build directory: {web_root}",
            }
        )
        return 1
    if not _is_vite_dist_directory(web_root):
        print(
            {
                "status": "error",
                "error": "frontend_build_invalid",
                "hint": (
                    "Expected a Vite build output directory (dist). "
                    f"Current web_root is not a compiled build: {web_root}"
                ),
            }
        )
        return 1

    start_page = args.start_page if args.start_page.startswith("/") else f"/{args.start_page}"
    ui_url = f"http://{args.host}:{args.port}{start_page}"

    server = UiBackendHttpServer(
        UiBackendHttpOptions(
            host=args.host,
            port=args.port,
            config_path=config_path,
            app_root=app_root,
            autostart=not args.no_autostart,
            web_root=web_root,
            recorder_options={
                "native_host_path": native_host_path,
            },
        )
    )
    print(server.startup_payload())
    print({"status": "desktop_ui_loading", "url": ui_url})

    try:
        server.start_background()
        webview = _import_webview()
        webview.create_window(
            args.title,
            url=ui_url,
            width=max(960, args.width),
            height=max(640, args.height),
            min_size=(960, 640),
        )
        webview.start(debug=args.debug)
    except Exception as exc:
        print({"status": "error", "error": str(exc)})
        return 1
    finally:
        server.shutdown()
        print({"status": "stopped"})

    return 0


def _default_app_root() -> pathlib.Path:
    if getattr(sys, "frozen", False):
        return pathlib.Path(sys.executable).resolve().parent
    return RESOURCE_ROOT


def _default_config_path() -> pathlib.Path:
    return (RESOURCE_ROOT / "configs" / "game_adapters.template.json").resolve()


def _default_web_root() -> pathlib.Path:
    return (RESOURCE_ROOT / "design" / "figma" / "fluent_v1" / "dist").resolve()


def _default_native_host_path() -> pathlib.Path:
    candidates = [
        RESOURCE_ROOT / "runtime" / "windows_capture" / "UniqueRecord.CaptureHost.exe",
        RESOURCE_ROOT / "runtime" / "windows_capture" / "UniqueRecord.CaptureHost.cmd",
        RESOURCE_ROOT / "runtime" / "windows_capture" / "UniqueRecord.CaptureHost.ps1",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()
    return candidates[0].resolve()


def _import_webview():
    try:
        import webview  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "pywebview is required. Install desktop dependencies first: "
            "python -m pip install -r requirements-desktop.txt"
        ) from exc
    return webview


def _is_vite_dist_directory(web_root: pathlib.Path) -> bool:
    index_path = web_root / "index.html"
    if not index_path.exists():
        return False
    try:
        content = index_path.read_text(encoding="utf-8")
    except OSError:
        return False
    if "/src/main.tsx" in content or 'src="/src/main.tsx"' in content:
        return False
    assets_dir = web_root / "assets"
    return assets_dir.is_dir()


if __name__ == "__main__":
    raise SystemExit(main())
