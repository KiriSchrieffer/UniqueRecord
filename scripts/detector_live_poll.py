from __future__ import annotations

import argparse
import json
import pathlib
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from unique_record.detector import DetectorEngine, LeagueSignalProvider


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Live detector poll for League of Legends")
    parser.add_argument(
        "--config",
        default="configs/game_adapters.template.json",
        help="Path to adapter config JSON.",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=0.5,
        help="Polling interval in seconds.",
    )
    parser.add_argument(
        "--ticks",
        type=int,
        default=0,
        help="Max ticks to run; 0 means unlimited.",
    )
    parser.add_argument(
        "--lockfile",
        default="",
        help="Optional explicit League lockfile path.",
    )
    return parser


def main() -> None:
    args = build_arg_parser().parse_args()
    config_path = pathlib.Path(args.config).resolve()
    config = json.loads(config_path.read_text(encoding="utf-8"))

    provider = LeagueSignalProvider(lcu_lockfile_path=args.lockfile or None)
    engine = DetectorEngine(provider)
    engine.load_config(config)

    tick_count = 0
    print(f"live poll started | interval={args.interval}s | config={config_path}")
    print("press Ctrl+C to stop")

    try:
        while True:
            now_ms = int(time.time() * 1000)
            events = engine.tick(now_ms=now_ms)
            snapshot = engine.get_snapshot()

            print(
                {
                    "ts": snapshot.ts_unix_ms,
                    "state": snapshot.state,
                    "session_id": snapshot.session_id,
                    "signals": snapshot.signals,
                    "unavailable_signals": sorted(snapshot.unavailable_signals),
                }
            )
            for event in events:
                print(
                    {
                        "event": event.type,
                        "action": event.action,
                        "from_state": event.from_state,
                        "to_state": event.to_state,
                        "reason_code": event.reason_code,
                        "matched_rule_id": event.matched_rule_id,
                        "details": event.details,
                    }
                )

            tick_count += 1
            if args.ticks > 0 and tick_count >= args.ticks:
                break
            time.sleep(args.interval)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()

