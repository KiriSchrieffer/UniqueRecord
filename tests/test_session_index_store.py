from __future__ import annotations

import json
import pathlib
import shutil
import sys
import unittest
import uuid

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from unique_record.storage import (
    RecordingSessionIndexStore,
    read_last_session_record,
    read_session_records,
)


class RecordingSessionIndexStoreTest(unittest.TestCase):
    def _new_temp_case_dir(self) -> pathlib.Path:
        base = pathlib.Path(__file__).resolve().parent / "_tmp"
        base.mkdir(parents=True, exist_ok=True)
        case_dir = base / f"case_{uuid.uuid4().hex}"
        case_dir.mkdir(parents=True, exist_ok=False)
        self.addCleanup(lambda: shutil.rmtree(case_dir, ignore_errors=True))
        return case_dir

    def test_record_start_then_stop_appends_completed_session(self) -> None:
        temp_dir = self._new_temp_case_dir()
        index_path = temp_dir / "recordings" / "recording_index.jsonl"
        output_dir = temp_dir / "recordings"
        store = RecordingSessionIndexStore(
            index_path=index_path,
            recordings_output_dir=output_dir,
        )

        store.record_start(
            game_id="league_of_legends",
            ts_unix_ms=1000,
            session_id="session-1",
            reason_code="start_by_gameflow",
            metadata={},
        )
        store.record_stop(
            game_id="league_of_legends",
            ts_unix_ms=6500,
            session_id="session-1",
            reason_code="normal_end",
            metadata={"duration_sec": 5.5},
            recorder_result={"output_path": "E:/UniqueRecord/recordings/test.mp4"},
        )

        self.assertTrue(index_path.exists())
        lines = index_path.read_text(encoding="utf-8").strip().splitlines()
        self.assertEqual(len(lines), 1)
        record = json.loads(lines[0])
        self.assertEqual(record["session_id"], "session-1")
        self.assertEqual(record["game_id"], "league_of_legends")
        self.assertEqual(record["start_ts_unix_ms"], 1000)
        self.assertEqual(record["end_ts_unix_ms"], 6500)
        self.assertEqual(record["duration_ms"], 5500)
        self.assertEqual(record["stop_reason_code"], "normal_end")
        self.assertEqual(record["status"], "completed")
        self.assertEqual(record["output_path"], "E:/UniqueRecord/recordings/test.mp4")

    def test_record_stop_without_start_still_appends_session(self) -> None:
        temp_dir = self._new_temp_case_dir()
        index_path = temp_dir / "recordings" / "recording_index.jsonl"
        store = RecordingSessionIndexStore(index_path=index_path)

        store.record_stop(
            game_id="league_of_legends",
            ts_unix_ms=2000,
            session_id="session-x",
            reason_code="abnormal_end",
            metadata={},
            recorder_result=None,
        )

        record = json.loads(index_path.read_text(encoding="utf-8").strip())
        self.assertEqual(record["session_id"], "session-x")
        self.assertIsNone(record["start_ts_unix_ms"])
        self.assertEqual(record["status"], "abnormal_end")

    def test_read_helpers_support_reverse_and_last(self) -> None:
        temp_dir = self._new_temp_case_dir()
        index_path = temp_dir / "recordings" / "recording_index.jsonl"
        store = RecordingSessionIndexStore(index_path=index_path)

        store.record_stop(
            game_id="league_of_legends",
            ts_unix_ms=1000,
            session_id="session-1",
            reason_code="normal_end",
            metadata={},
            recorder_result=None,
        )
        store.record_stop(
            game_id="league_of_legends",
            ts_unix_ms=2000,
            session_id="session-2",
            reason_code="abnormal_end",
            metadata={},
            recorder_result=None,
        )

        latest = read_last_session_record(index_path)
        self.assertIsNotNone(latest)
        self.assertEqual(latest["session_id"], "session-2")

        records = read_session_records(index_path=index_path, reverse=True, limit=1)
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["session_id"], "session-2")

    def test_read_session_records_skips_invalid_json_line(self) -> None:
        temp_dir = self._new_temp_case_dir()
        index_path = temp_dir / "recordings" / "recording_index.jsonl"
        index_path.parent.mkdir(parents=True, exist_ok=True)
        index_path.write_text(
            "\n".join(
                [
                    '{"session_id":"session-1","status":"completed"}',
                    "not-json",
                    '{"session_id":"session-2","status":"abnormal_end"}',
                ]
            ),
            encoding="utf-8",
        )

        records = read_session_records(index_path=index_path)
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0]["session_id"], "session-1")
        self.assertEqual(records[1]["session_id"], "session-2")


if __name__ == "__main__":
    unittest.main()
