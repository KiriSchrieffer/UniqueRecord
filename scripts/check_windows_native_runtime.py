from __future__ import annotations

import argparse
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from unique_record.recorder import WindowsNativeRecordingController


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Check Windows native recorder runtime.")
    parser.add_argument(
        "--app-root",
        default="",
        help="Optional app root directory.",
    )
    parser.add_argument(
        "--require-process",
        action="store_true",
        help="Return non-zero if process backend is unavailable.",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    app_root = pathlib.Path(args.app_root).resolve() if args.app_root else None

    controller = WindowsNativeRecordingController(
        app_root=app_root,
        backend_mode="auto",
    )
    host_path = controller.native_host_path
    payload = {
        "backend_mode": controller.backend_mode,
        "native_host_path": str(host_path),
        "native_host_exists": host_path.exists(),
    }
    print(payload)

    if args.require_process and controller.backend_mode != "process":
        print(
            {
                "status": "error",
                "error": "windows_native_capture_host_missing",
                "hint": f"Expected capture host at: {host_path}",
            }
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
