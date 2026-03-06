from __future__ import annotations

import json
import pathlib
import shutil
import sys
import unittest
import uuid

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from unique_record.detector import DetectorEngine, StaticSignalProvider
from unique_record.orchestrator import DetectionOrchestrator
from unique_record.recorder import InMemoryRecordingController
from unique_record.storage import RecordingSessionIndexStore


class DetectionOrchestratorTest(unittest.TestCase):
    def _new_temp_case_dir(self) -> pathlib.Path:
        base = pathlib.Path(__file__).resolve().parent / "_tmp"
        base.mkdir(parents=True, exist_ok=True)
        case_dir = base / f"case_{uuid.uuid4().hex}"
        case_dir.mkdir(parents=True, exist_ok=False)
        self.addCleanup(lambda: shutil.rmtree(case_dir, ignore_errors=True))
        return case_dir

    @classmethod
    def setUpClass(cls) -> None:
        root = pathlib.Path(__file__).resolve().parents[1]
        config_path = root / "configs" / "game_adapters.template.json"
        cls.config = json.loads(config_path.read_text(encoding="utf-8"))

    def test_dispatch_start_and_stop_to_recorder(self) -> None:
        provider = StaticSignalProvider(
            values={"S1": "InProgress", "S2": True, "S3": True, "S4": True}
        )
        detector = DetectorEngine(provider)
        detector.load_config(self.config)
        recorder = InMemoryRecordingController()
        orchestrator = DetectionOrchestrator(detector=detector, recorder=recorder)

        orchestrator.process_tick(now_ms=1000)
        orchestrator.process_tick(now_ms=4500)
        provider.update_values({"S1": "EndOfGame"})
        orchestrator.process_tick(now_ms=5000)
        orchestrator.process_tick(now_ms=10500)

        self.assertEqual(len(recorder.commands), 2)
        self.assertEqual(recorder.commands[0].action, "start_recording")
        self.assertEqual(recorder.commands[1].action, "stop_recording")
        self.assertEqual(recorder.commands[1].reason_code, "normal_end")
        self.assertEqual(
            recorder.commands[0].session_id,
            recorder.commands[1].session_id,
        )

    def test_manual_override_dispatches_to_recorder(self) -> None:
        provider = StaticSignalProvider(
            values={"S1": "None", "S2": False, "S3": False, "S4": False}
        )
        detector = DetectorEngine(provider)
        detector.load_config(self.config)
        recorder = InMemoryRecordingController()
        orchestrator = DetectionOrchestrator(detector=detector, recorder=recorder)

        orchestrator.manual_start(now_ms=1000)
        orchestrator.manual_stop(now_ms=2000)

        self.assertEqual(len(recorder.commands), 2)
        self.assertEqual(recorder.commands[0].action, "start_recording")
        self.assertEqual(recorder.commands[1].action, "stop_recording")
        self.assertEqual(recorder.commands[1].reason_code, "manual_override")

    def test_writes_recording_index_on_completed_session(self) -> None:
        provider = StaticSignalProvider(
            values={"S1": "InProgress", "S2": True, "S3": True, "S4": True}
        )
        detector = DetectorEngine(provider)
        detector.load_config(self.config)
        recorder = InMemoryRecordingController()
        temp_dir = self._new_temp_case_dir()
        index_path = temp_dir / "recordings" / "recording_index.jsonl"
        store = RecordingSessionIndexStore(index_path=index_path, recordings_output_dir=temp_dir / "recordings")
        orchestrator = DetectionOrchestrator(
            detector=detector,
            recorder=recorder,
            session_index_store=store,
        )

        orchestrator.process_tick(now_ms=1000)
        orchestrator.process_tick(now_ms=4500)
        provider.update_values({"S1": "EndOfGame"})
        orchestrator.process_tick(now_ms=5000)
        orchestrator.process_tick(now_ms=10500)

        lines = index_path.read_text(encoding="utf-8").strip().splitlines()
        self.assertEqual(len(lines), 1)
        row = json.loads(lines[0])
        self.assertEqual(row["game_id"], "league_of_legends")
        self.assertEqual(row["status"], "completed")
        self.assertEqual(row["duration_ms"], 6000)


if __name__ == "__main__":
    unittest.main()
