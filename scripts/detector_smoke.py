from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from unique_record.detector import DetectorEngine, StaticSignalProvider


def main() -> None:
    config_path = pathlib.Path(__file__).resolve().parents[1] / "configs" / "game_adapters.template.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))

    provider = StaticSignalProvider(
        values={
            "S1": "InProgress",
            "S2": True,
            "S3": True,
            "S4": True,
        }
    )

    engine = DetectorEngine(signal_provider=provider)
    engine.load_config(config)

    timeline_ms = [1000, 4500, 5000, 10500]
    provider_updates = {
        5000: {"S1": "EndOfGame"},
    }

    all_events = []
    for ts in timeline_ms:
        update = provider_updates.get(ts)
        if update:
            provider.update_values(update)
        all_events.extend(engine.tick(now_ms=ts))

    for event in all_events:
        print(
            {
                "ts": event.ts_unix_ms,
                "type": event.type,
                "action": event.action,
                "from_state": event.from_state,
                "to_state": event.to_state,
                "reason_code": event.reason_code,
                "matched_rule_id": event.matched_rule_id,
                "details": event.details,
            }
        )


if __name__ == "__main__":
    main()

