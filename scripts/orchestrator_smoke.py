from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from unique_record.detector import DetectorEngine, StaticSignalProvider
from unique_record.orchestrator import DetectionOrchestrator
from unique_record.recorder import InMemoryRecordingController


def main() -> None:
    root = pathlib.Path(__file__).resolve().parents[1]
    config_path = root / "configs" / "game_adapters.template.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))

    provider = StaticSignalProvider(
        values={"S1": "InProgress", "S2": True, "S3": True, "S4": True}
    )
    detector = DetectorEngine(provider)
    detector.load_config(config)
    recorder = InMemoryRecordingController()
    orchestrator = DetectionOrchestrator(detector=detector, recorder=recorder)

    orchestrator.process_tick(now_ms=1000)
    orchestrator.process_tick(now_ms=4500)
    provider.update_values({"S1": "EndOfGame"})
    orchestrator.process_tick(now_ms=5000)
    orchestrator.process_tick(now_ms=10500)

    for command in recorder.commands:
        print(
            {
                "ts": command.ts_unix_ms,
                "action": command.action,
                "session_id": command.session_id,
                "reason_code": command.reason_code,
                "metadata": command.metadata,
            }
        )


if __name__ == "__main__":
    main()

