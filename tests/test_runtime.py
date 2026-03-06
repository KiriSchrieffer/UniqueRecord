from __future__ import annotations

import pathlib
import shutil
import sys
import unittest
import uuid

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from unique_record.detector import StaticSignalProvider
from unique_record.recorder import InMemoryRecordingController, WindowsNativeRecordingController
from unique_record.runtime import UniqueRecordLoop, build_runtime


class RuntimeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.config_path = pathlib.Path(__file__).resolve().parents[1] / "configs" / "game_adapters.template.json"

    def test_build_runtime_uses_windows_native_by_default(self) -> None:
        runtime = build_runtime(config_path=self.config_path)
        self.assertIsInstance(runtime.recorder, WindowsNativeRecordingController)
        self.assertEqual(runtime.poll_interval_ms, 500)
        self.assertEqual(
            runtime.recorder._recordings_output_dir.name,  # noqa: SLF001
            "recordings",
        )
        self.assertTrue(runtime.recorder._recording_profile)  # noqa: SLF001
        self.assertIsNotNone(runtime.session_index_path)
        self.assertEqual(runtime.session_index_path.name, "recording_index.jsonl")

    def test_build_runtime_passes_recorder_options(self) -> None:
        temp_root = pathlib.Path(__file__).resolve().parent / "_tmp" / f"runtime_case_{uuid.uuid4().hex}"
        output_dir = temp_root / "captured"
        try:
            runtime = build_runtime(
                config_path=self.config_path,
                recorder_options={
                    "recording_profile": {"resolution": "1280x720"},
                    "recordings_output_dir": output_dir,
                },
            )
            recorder = runtime.recorder
            self.assertIsInstance(recorder, WindowsNativeRecordingController)
            self.assertEqual(recorder._recording_profile.get("resolution"), "1280x720")  # noqa: SLF001
            self.assertEqual(recorder._recordings_output_dir, output_dir.resolve())  # noqa: SLF001
        finally:
            shutil.rmtree(temp_root, ignore_errors=True)

    def test_loop_runs_detector_orchestrator_recorder_chain(self) -> None:
        provider = StaticSignalProvider(
            values={"S1": "InProgress", "S2": True, "S3": True, "S4": True}
        )
        recorder = InMemoryRecordingController()
        runtime = build_runtime(
            config_path=self.config_path,
            signal_provider=provider,
            recorder=recorder,
        )

        ticks = [1000, 4500, 5000, 10500]

        def now_ms() -> int:
            return ticks.pop(0)

        loop = UniqueRecordLoop(
            orchestrator=runtime.orchestrator,
            poll_interval_ms=runtime.poll_interval_ms,
            now_ms_fn=now_ms,
            sleep_fn=lambda _: None,
        )

        def on_events(events):
            if any(e.action == "start_recording" for e in events):
                provider.update_values({"S1": "EndOfGame"})

        loop.run(max_ticks=4, on_events=on_events)

        self.assertEqual(len(recorder.commands), 2)
        self.assertEqual(recorder.commands[0].action, "start_recording")
        self.assertEqual(recorder.commands[1].action, "stop_recording")
        self.assertEqual(recorder.commands[1].reason_code, "normal_end")


if __name__ == "__main__":
    unittest.main()
