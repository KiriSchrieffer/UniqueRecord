from __future__ import annotations

import pathlib
import shutil
import sys
import unittest
import uuid

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from unique_record.recorder import (
    WindowsNativeRecordingController,
    WindowsNativeRuntimeMissingError,
)


class _FakeProcess:
    def __init__(self, command: list[str]) -> None:
        self.command = command
        self.exit_code: int | None = None
        self.terminated = False

    def poll(self) -> int | None:
        return self.exit_code

    def wait(self, timeout: float | None = None) -> int:
        output_path = pathlib.Path(self.command[self.command.index("--output") + 1])
        output_path.parent.mkdir(parents=True, exist_ok=True)
        if not output_path.exists():
            output_path.write_bytes(b"native-capture-dummy")
        self.exit_code = 0
        return self.exit_code

    def terminate(self) -> None:
        self.terminated = True
        self.exit_code = 0

    def kill(self) -> None:
        self.exit_code = -9


class WindowsNativeRecordingControllerTest(unittest.TestCase):
    def _make_case_root(self) -> pathlib.Path:
        root = (
            pathlib.Path(__file__).resolve().parent
            / "_tmp"
            / f"windows_native_case_{uuid.uuid4().hex}"
        )
        root.mkdir(parents=True, exist_ok=True)
        self.addCleanup(lambda: shutil.rmtree(root, ignore_errors=True))
        return root

    def test_auto_mode_falls_back_to_placeholder_when_host_missing(self) -> None:
        app_root = self._make_case_root()
        controller = WindowsNativeRecordingController(
            app_root=app_root,
            backend_mode="auto",
        )
        self.assertEqual(controller.backend_mode, "placeholder")
        controller.start_recording(
            ts_unix_ms=1000,
            session_id="s1",
            reason_code="manual_override",
            metadata={"game_id": "league_of_legends"},
        )
        result = controller.stop_recording(
            ts_unix_ms=2000,
            session_id="s1",
            reason_code="normal_end",
            metadata={},
        )
        self.assertIsNone(result)
        self.assertEqual(controller.commands[0].metadata.get("backend"), "windows_native_placeholder")

    def test_process_mode_raises_when_host_missing(self) -> None:
        app_root = self._make_case_root()
        with self.assertRaises(WindowsNativeRuntimeMissingError):
            WindowsNativeRecordingController(
                app_root=app_root,
                backend_mode="process",
            )

    def test_process_mode_launches_host_and_returns_output_path(self) -> None:
        app_root = self._make_case_root()
        host_path = app_root / "runtime" / "windows_capture" / "UniqueRecord.CaptureHost.cmd"
        host_path.parent.mkdir(parents=True, exist_ok=True)
        host_path.write_text("@echo off\r\n", encoding="utf-8")

        launches: list[tuple[list[str], dict[str, object], _FakeProcess]] = []

        def popen_factory(command, **kwargs):  # noqa: ANN001
            process = _FakeProcess(command)
            launches.append((command, kwargs, process))
            return process

        controller = WindowsNativeRecordingController(
            app_root=app_root,
            backend_mode="process",
            native_host_path=host_path,
            recording_profile={
                "container": "mp4",
                "fps": 120,
                "resolution": "2560x1440",
                "video_bitrate_kbps": 16000,
                "audio_bitrate_kbps": 192,
                "encoder": "nvenc",
                "audio_codec": "aac",
                "audio_input_device": "Microphone (USB Audio Device)",
                "audio_input_enabled": True,
                "audio_output_enabled": True,
                "hardware_encoding_enabled": True,
            },
            stop_signal_root_dir=app_root / "runtime_state" / "native_capture",
            popen_factory=popen_factory,
        )
        controller.start_recording(
            ts_unix_ms=1700000000000,
            session_id="session-a",
            reason_code="manual_override",
            metadata={"game_id": "league_of_legends", "window_title": "League of Legends"},
        )
        self.assertEqual(len(launches), 1)
        command, launch_kwargs, _ = launches[0]
        self.assertEqual(launch_kwargs.get("cwd"), str(host_path.parent))
        self.assertIn("stdout", launch_kwargs)
        self.assertIn("stderr", launch_kwargs)
        self.assertIn("--output", command)
        self.assertIn("--stop-signal", command)
        self.assertIn("--window-title", command)
        self.assertIn("--container", command)
        self.assertEqual(command[command.index("--container") + 1], "mp4")
        self.assertIn("--fps", command)
        self.assertEqual(command[command.index("--fps") + 1], "120")
        self.assertIn("--width", command)
        self.assertEqual(command[command.index("--width") + 1], "2560")
        self.assertIn("--height", command)
        self.assertEqual(command[command.index("--height") + 1], "1440")
        self.assertIn("--video-bitrate-kbps", command)
        self.assertEqual(command[command.index("--video-bitrate-kbps") + 1], "16000")
        self.assertIn("--audio-bitrate-kbps", command)
        self.assertEqual(command[command.index("--audio-bitrate-kbps") + 1], "192")
        self.assertIn("--encoder", command)
        self.assertEqual(command[command.index("--encoder") + 1], "nvenc")
        self.assertIn("--audio-codec", command)
        self.assertEqual(command[command.index("--audio-codec") + 1], "aac")
        self.assertIn("--audio-input-device", command)
        self.assertEqual(
            command[command.index("--audio-input-device") + 1],
            "Microphone (USB Audio Device)",
        )
        self.assertIn("--audio-input-enabled", command)
        self.assertEqual(command[command.index("--audio-input-enabled") + 1], "true")
        self.assertIn("--audio-output-enabled", command)
        self.assertEqual(command[command.index("--audio-output-enabled") + 1], "true")
        self.assertIn("--hardware-encoding-enabled", command)
        self.assertEqual(command[command.index("--hardware-encoding-enabled") + 1], "true")

        stop_signal_path = pathlib.Path(command[command.index("--stop-signal") + 1])
        self.assertFalse(stop_signal_path.exists())
        self.assertNotIn(str(app_root / "recordings"), str(stop_signal_path))

        result = controller.stop_recording(
            ts_unix_ms=1700000005000,
            session_id="session-a",
            reason_code="normal_end",
            metadata={},
        )
        self.assertIsNotNone(result)
        assert result is not None
        self.assertTrue(stop_signal_path.exists())
        self.assertTrue(pathlib.Path(result["output_path"]).exists())
        self.assertTrue(result["output_path_exists"])


if __name__ == "__main__":
    unittest.main()
