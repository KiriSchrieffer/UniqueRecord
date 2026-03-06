from __future__ import annotations

import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from unique_record.detector import DetectorEngine, StaticSignalProvider


class DetectorEngineTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        root = pathlib.Path(__file__).resolve().parents[1]
        config_path = root / "configs" / "game_adapters.template.json"
        cls.config = json.loads(config_path.read_text(encoding="utf-8"))

    def _new_engine(
        self,
        values: dict[str, object],
        unavailable_signals: set[str] | None = None,
    ) -> tuple[DetectorEngine, StaticSignalProvider]:
        provider = StaticSignalProvider(values=values, unavailable_signals=unavailable_signals)
        engine = DetectorEngine(provider)
        engine.load_config(self.config)
        return engine, provider

    def test_start_and_stop_by_gameflow(self) -> None:
        engine, provider = self._new_engine(
            values={"S1": "InProgress", "S2": True, "S3": True, "S4": True}
        )

        events = []
        events.extend(engine.tick(now_ms=1000))
        events.extend(engine.tick(now_ms=4500))
        provider.update_values({"S1": "EndOfGame"})
        events.extend(engine.tick(now_ms=5000))
        events.extend(engine.tick(now_ms=10500))

        start_events = [e for e in events if e.action == "start_recording"]
        stop_events = [e for e in events if e.action == "stop_recording"]

        self.assertEqual(len(start_events), 1)
        self.assertEqual(start_events[0].matched_rule_id, "start_by_gameflow")
        self.assertEqual(len(stop_events), 1)
        self.assertEqual(stop_events[0].reason_code, "normal_end")
        self.assertEqual(stop_events[0].matched_rule_id, "stop_by_gameflow")

    def test_fallback_start_when_s1_unavailable(self) -> None:
        engine, _ = self._new_engine(
            values={"S2": True, "S3": True, "S4": True},
            unavailable_signals={"S1"},
        )

        events = []
        events.extend(engine.tick(now_ms=1000))
        events.extend(engine.tick(now_ms=9000))

        start_events = [e for e in events if e.action == "start_recording"]
        self.assertEqual(len(start_events), 1)
        self.assertEqual(
            start_events[0].matched_rule_id,
            "start_by_process_window_fallback",
        )

    def test_recovery_timeout_emits_abnormal_end(self) -> None:
        engine, provider = self._new_engine(
            values={"S1": "InProgress", "S2": True, "S3": True, "S4": True}
        )

        events = []
        events.extend(engine.tick(now_ms=1000))
        events.extend(engine.tick(now_ms=4500))

        provider.update_values({"S1": "InProgress", "S2": False})
        events.extend(engine.tick(now_ms=5000))
        events.extend(engine.tick(now_ms=96001))

        stop_events = [
            e
            for e in events
            if e.type == "recording_action" and e.action == "stop_recording"
        ]
        self.assertEqual(len(stop_events), 1)
        self.assertEqual(stop_events[0].reason_code, "abnormal_end")
        self.assertEqual(stop_events[0].matched_rule_id, "recovery_timeout")

    def test_manual_override_start_and_stop(self) -> None:
        engine, _ = self._new_engine(
            values={"S1": "None", "S2": False, "S3": False, "S4": False}
        )

        start_events = engine.manual_start(now_ms=1000)
        stop_events = engine.manual_stop(now_ms=2000)

        self.assertTrue(any(e.action == "start_recording" for e in start_events))
        self.assertTrue(any(e.action == "stop_recording" for e in stop_events))
        self.assertTrue(
            any(
                e.reason_code == "manual_override"
                for e in stop_events
                if e.type == "recording_action"
            )
        )


if __name__ == "__main__":
    unittest.main()

