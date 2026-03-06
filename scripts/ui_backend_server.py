from __future__ import annotations

import argparse
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from unique_record.http_ui_server import (
    DEFAULT_WEB_ROOT,
    UiBackendHttpOptions,
    UiBackendHttpServer,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="UniqueRecord local UI bridge API server.")
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="HTTP listen host.",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8765,
        help="HTTP listen port.",
    )
    parser.add_argument(
        "--config",
        default="configs/game_adapters.template.json",
        help="Runtime config path.",
    )
    parser.add_argument(
        "--app-root",
        default="",
        help="Optional app root directory.",
    )
    parser.add_argument(
        "--autostart",
        action="store_true",
        help="Start detector loop immediately.",
    )
    parser.add_argument(
        "--web-root",
        default=str(DEFAULT_WEB_ROOT),
        help="Static frontend directory (build output). Empty string disables static hosting.",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    app_root = pathlib.Path(args.app_root).resolve() if args.app_root else None
    web_root = pathlib.Path(args.web_root).resolve() if args.web_root else None

    server = UiBackendHttpServer(
        UiBackendHttpOptions(
            host=args.host,
            port=args.port,
            config_path=args.config,
            app_root=app_root,
            autostart=args.autostart,
            web_root=web_root,
        )
    )
    print(server.startup_payload())
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.shutdown()
        print({"status": "stopped"})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
