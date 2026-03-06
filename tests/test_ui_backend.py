from __future__ import annotations

import json
import pathlib
import shutil
import subprocess
import sys
import unittest
import uuid
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from unique_record.ui_backend import RuntimeBridgeOptions, RuntimeBridgeService


class RuntimeBridgeServiceSettingsTest(unittest.TestCase):
    def _make_case_root(self) -> pathlib.Path:
        root = pathlib.Path(__file__).resolve().parent / "_tmp" / f"ui_backend_case_{uuid.uuid4().hex}"
        root.mkdir(parents=True, exist_ok=True)
        self.addCleanup(lambda: shutil.rmtree(root, ignore_errors=True))
        return root

    def _write_config_copy(self, case_root: pathlib.Path) -> pathlib.Path:
        template = pathlib.Path(__file__).resolve().parents[1] / "configs" / "game_adapters.template.json"
        config_path = case_root / "configs" / "game_adapters.template.json"
        config_path.parent.mkdir(parents=True, exist_ok=True)
        config_path.write_text(template.read_text(encoding="utf-8"), encoding="utf-8")
        return config_path

    def test_update_recording_settings_persists_and_applies(self) -> None:
        case_root = self._make_case_root()
        config_path = self._write_config_copy(case_root)
        service = RuntimeBridgeService(
            RuntimeBridgeOptions(
                config_path=config_path,
                app_root=case_root,
                recorder_options={"backend_mode": "placeholder"},
            )
        )
        self.addCleanup(service.stop_service)

        expected_output_dir = (case_root / "clips").resolve()
        updated = service.update_recording_settings(
            {
                "savePath": str(expected_output_dir),
                "resolution": "2560x1440",
                "fps": 120,
                "videoBitrateKbps": 16000,
                "audioBitrateKbps": 160,
                "container": "mp4",
                "encoder": "x264",
                "audioCodec": "aac",
                "audioInputDevice": "Microphone (USB Audio Device)",
                "audioInputEnabled": True,
                "audioOutputEnabled": True,
                "hardwareEncodingEnabled": False,
            }
        )

        self.assertEqual(updated["global"]["recordings_output_dir"], str(expected_output_dir))
        self.assertEqual(updated["recording_profile"]["resolution"], "2560x1440")
        self.assertEqual(updated["recording_profile"]["fps"], 120)
        self.assertEqual(updated["recording_profile"]["video_bitrate_kbps"], 16000)
        self.assertEqual(updated["recording_profile"]["audio_bitrate_kbps"], 160)
        self.assertEqual(updated["recording_profile"]["container"], "mp4")
        self.assertEqual(updated["recording_profile"]["encoder"], "x264")
        self.assertEqual(updated["recording_profile"]["audio_codec"], "aac")
        self.assertEqual(
            updated["recording_profile"]["audio_input_device"],
            "Microphone (USB Audio Device)",
        )
        self.assertTrue(updated["recording_profile"]["audio_input_enabled"])
        self.assertTrue(updated["recording_profile"]["audio_output_enabled"])
        self.assertFalse(updated["recording_profile"]["hardware_encoding_enabled"])

        reloaded = json.loads(config_path.read_text(encoding="utf-8"))
        profile = reloaded["games"][0]["recording_profile"]
        self.assertEqual(reloaded["global"]["recordings_output_dir"], str(expected_output_dir))
        self.assertEqual(profile["resolution"], "2560x1440")
        self.assertEqual(profile["fps"], 120)
        self.assertEqual(profile["video_bitrate_kbps"], 16000)
        self.assertEqual(profile["audio_bitrate_kbps"], 160)
        self.assertEqual(profile["container"], "mp4")
        self.assertEqual(profile["encoder"], "x264")
        self.assertEqual(profile["audio_codec"], "aac")
        self.assertEqual(profile["audio_input_device"], "Microphone (USB Audio Device)")
        self.assertTrue(profile["audio_input_enabled"])
        self.assertTrue(profile["audio_output_enabled"])
        self.assertFalse(profile["hardware_encoding_enabled"])

    def test_update_recording_settings_rejects_unsupported_audio_codec(self) -> None:
        case_root = self._make_case_root()
        config_path = self._write_config_copy(case_root)
        service = RuntimeBridgeService(
            RuntimeBridgeOptions(
                config_path=config_path,
                app_root=case_root,
                recorder_options={"backend_mode": "placeholder"},
            )
        )
        self.addCleanup(service.stop_service)

        with self.assertRaises(ValueError):
            service.update_recording_settings({"audioCodec": "mp3"})

    def test_update_detection_settings_persists_and_applies(self) -> None:
        case_root = self._make_case_root()
        config_path = self._write_config_copy(case_root)
        service = RuntimeBridgeService(
            RuntimeBridgeOptions(
                config_path=config_path,
                app_root=case_root,
                recorder_options={"backend_mode": "placeholder"},
            )
        )
        self.addCleanup(service.stop_service)

        updated = service.update_detection_settings(
            {
                "autoDetect": False,
                "detectionInterval": 3,
                "controlHost": "127.0.0.1",
                "controlPort": 8877,
                "controlToken": "secret",
                "hostAutoStart": True,
                "hostKeepAlive": False,
                "keepAliveInterval": 45,
            }
        )

        detection = updated["detection"]
        self.assertFalse(detection["auto_detect_enabled"])
        self.assertEqual(detection["detection_interval_seconds"], 3)
        self.assertEqual(detection["control_host"], "127.0.0.1")
        self.assertEqual(detection["control_port"], 8877)
        self.assertEqual(detection["control_token"], "secret")
        self.assertTrue(detection["host_auto_start"])
        self.assertFalse(detection["host_keep_alive"])
        self.assertEqual(detection["host_keep_alive_interval_seconds"], 45)

        reloaded = json.loads(config_path.read_text(encoding="utf-8"))
        self.assertEqual(reloaded["global"]["poll_interval_ms"], 3000)
        self.assertFalse(reloaded["games"][0]["enabled"])
        ui_detection = reloaded["global"]["ui_detection"]
        self.assertEqual(ui_detection["control_host"], "127.0.0.1")
        self.assertEqual(ui_detection["control_port"], 8877)
        self.assertEqual(ui_detection["control_token"], "secret")
        self.assertTrue(ui_detection["host_auto_start"])
        self.assertFalse(ui_detection["host_keep_alive"])
        self.assertEqual(ui_detection["host_keep_alive_interval_seconds"], 45)

    def test_delete_sessions_removes_index_rows_and_files(self) -> None:
        case_root = self._make_case_root()
        config_path = self._write_config_copy(case_root)
        recordings_dir = case_root / "recordings"
        recordings_dir.mkdir(parents=True, exist_ok=True)
        clip1 = recordings_dir / "clip_a.mp4"
        clip1.write_bytes(b"clip-a")
        clip2 = recordings_dir / "clip_b.mp4"
        clip2.write_bytes(b"clip-b")
        index_path = recordings_dir / "recording_index.jsonl"
        index_path.write_text(
            "\n".join(
                [
                    json.dumps(
                        {
                            "session_id": "session-a",
                            "output_path": str(clip1),
                            "status": "completed",
                        }
                    ),
                    json.dumps(
                        {
                            "session_id": "session-b",
                            "output_path": str(clip2),
                            "status": "completed",
                        }
                    ),
                ]
            )
            + "\n",
            encoding="utf-8",
        )

        service = RuntimeBridgeService(
            RuntimeBridgeOptions(
                config_path=config_path,
                app_root=case_root,
                recorder_options={"backend_mode": "placeholder"},
            )
        )
        self.addCleanup(service.stop_service)

        result = service.delete_sessions(session_ids=["session-a"], delete_files=True)
        self.assertEqual(result["deleted_count"], 1)
        self.assertTrue(clip2.exists())
        if clip1.exists():
            self.assertGreaterEqual(len(result["file_delete_errors"]), 1)
        else:
            self.assertEqual(result["removed_file_count"], 1)

        remaining_rows = [row["session_id"] for row in service.list_sessions(limit=20)]
        self.assertEqual(remaining_rows, ["session-b"])

    def test_list_audio_devices_reads_host_payload(self) -> None:
        case_root = self._make_case_root()
        config_path = self._write_config_copy(case_root)
        host_path = case_root / "runtime" / "windows_capture" / "UniqueRecord.CaptureHost.exe"
        host_path.parent.mkdir(parents=True, exist_ok=True)
        host_path.write_bytes(b"")

        service = RuntimeBridgeService(
            RuntimeBridgeOptions(
                config_path=config_path,
                app_root=case_root,
                recorder_options={"backend_mode": "placeholder"},
            )
        )
        self.addCleanup(service.stop_service)

        fake_output = json.dumps(
            {
                "status": "audio_devices",
                "supported": True,
                "input_devices": [
                    {
                        "device_name": "Microphone (USB Audio Device)",
                        "friendly_name": "USB Mic",
                    }
                ],
                "output_devices": [
                    {
                        "device_name": "Speakers (Realtek)",
                        "friendly_name": "Realtek Speakers",
                    }
                ],
            }
        )
        completed = subprocess.CompletedProcess(
            args=[str(host_path), "--list-audio-devices"],
            returncode=0,
            stdout=fake_output,
            stderr="",
        )
        with mock.patch("unique_record.ui_backend._run_hidden_process", return_value=completed):
            payload = service.list_audio_devices()

        self.assertTrue(payload["supported"])
        self.assertEqual(payload["input_devices"][0]["id"], "Microphone (USB Audio Device)")
        self.assertEqual(payload["output_devices"][0]["id"], "Speakers (Realtek)")


if __name__ == "__main__":
    unittest.main()
