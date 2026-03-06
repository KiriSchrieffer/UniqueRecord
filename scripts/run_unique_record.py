from __future__ import annotations

import argparse
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from unique_record.detector import StaticSignalProvider
from unique_record.recorder import InMemoryRecordingController
from unique_record.runtime import UniqueRecordLoop, build_runtime
from unique_record.storage import read_last_session_record


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run UniqueRecord runtime loop.")
    parser.add_argument(
        "--config",
        default="configs/game_adapters.template.json",
        help="Path to runtime config.",
    )
    parser.add_argument(
        "--ticks",
        type=int,
        default=0,
        help="Run fixed tick count. 0 means run forever.",
    )
    parser.add_argument(
        "--app-root",
        default="",
        help="Optional app root directory.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Use in-memory recorder for validation.",
    )
    parser.add_argument(
        "--simulate-match",
        action="store_true",
        help="Use static simulated signals to emulate one LoL match lifecycle.",
    )
    parser.add_argument(
        "--recorder-backend",
        choices=["auto", "placeholder", "process"],
        default="auto",
        help="Windows native recorder backend mode.",
    )
    parser.add_argument(
        "--native-host",
        default="",
        help="Optional native capture host path (exe/cmd/ps1).",
    )
    parser.add_argument(
        "--print-last-session",
        action="store_true",
        help="Print latest session index record when loop stops.",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()

    recorder = InMemoryRecordingController() if args.dry_run else None
    signal_provider = None
    if args.simulate_match:
        signal_provider = StaticSignalProvider(
            values={"S1": "InProgress", "S2": True, "S3": True, "S4": True}
        )
    app_root = pathlib.Path(args.app_root).resolve() if args.app_root else None
    recorder_options = {
        "backend_mode": args.recorder_backend,
    }
    if args.native_host:
        recorder_options["native_host_path"] = args.native_host

    runtime = build_runtime(
        config_path=args.config,
        app_root=app_root,
        signal_provider=signal_provider,
        recorder=recorder,
        recorder_options=None if args.dry_run else recorder_options,
    )

    loop = UniqueRecordLoop(
        orchestrator=runtime.orchestrator,
        poll_interval_ms=runtime.poll_interval_ms,
    )

    print(
        {
            "status": "started",
            "poll_interval_ms": runtime.poll_interval_ms,
            "ticks": args.ticks,
            "dry_run": args.dry_run,
            "simulate_match": args.simulate_match,
            "recorder_backend": getattr(runtime.recorder, "backend_mode", "in_memory"),
            "native_host_path": str(getattr(runtime.recorder, "native_host_path", "")) or None,
            "session_index_path": (
                str(runtime.session_index_path) if runtime.session_index_path is not None else None
            ),
        }
    )
    try:
        seen_start_event = False

        def on_events(events) -> None:
            nonlocal seen_start_event
            if args.simulate_match and isinstance(signal_provider, StaticSignalProvider):
                if not seen_start_event and any(e.action == "start_recording" for e in events):
                    seen_start_event = True
                    signal_provider.update_values({"S1": "EndOfGame"})
            for event in events:
                print(_event_to_dict(event))

        loop.run(
            max_ticks=args.ticks,
            on_events=on_events,
        )
    except KeyboardInterrupt:
        pass
    finally:
        loop.stop()

    if args.dry_run and isinstance(runtime.recorder, InMemoryRecordingController):
        print(
            {
                "status": "stopped",
                "recorder_commands": [
                    {
                        "ts": cmd.ts_unix_ms,
                        "action": cmd.action,
                        "session_id": cmd.session_id,
                        "reason_code": cmd.reason_code,
                        "metadata": cmd.metadata,
                    }
                    for cmd in runtime.recorder.commands
                ],
            }
        )
    else:
        print({"status": "stopped"})
    if args.print_last_session and runtime.session_index_path is not None:
        last_session = read_last_session_record(runtime.session_index_path)
        print(
            {
                "session_index_path": str(runtime.session_index_path),
                "last_session": last_session,
            }
        )
    return 0


def _event_to_dict(event) -> dict:
    return {
        "ts": event.ts_unix_ms,
        "type": event.type,
        "action": event.action,
        "from_state": event.from_state,
        "to_state": event.to_state,
        "reason_code": event.reason_code,
        "matched_rule_id": event.matched_rule_id,
        "details": event.details,
    }


if __name__ == "__main__":
    raise SystemExit(main())
