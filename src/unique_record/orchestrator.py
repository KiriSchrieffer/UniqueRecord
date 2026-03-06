from __future__ import annotations

from typing import Any

from .detector import DetectorEngine, DetectorEvent
from .recorder import RecordingController
from .storage import RecordingSessionIndexStore


class DetectionOrchestrator:
    """
    Bridges detector events to recorder controller commands.
    """

    def __init__(
        self,
        *,
        detector: DetectorEngine,
        recorder: RecordingController,
        game_id: str = "league_of_legends",
        session_index_store: RecordingSessionIndexStore | None = None,
    ) -> None:
        self._detector = detector
        self._recorder = recorder
        self._game_id = game_id
        self._session_index_store = session_index_store

    def process_tick(self, now_ms: int | None = None) -> list[DetectorEvent]:
        events = self._detector.tick(now_ms=now_ms)
        self._dispatch_recording_actions(events)
        return events

    def manual_start(self, now_ms: int | None = None) -> list[DetectorEvent]:
        events = self._detector.manual_start(now_ms=now_ms)
        self._dispatch_recording_actions(events)
        return events

    def manual_stop(self, now_ms: int | None = None) -> list[DetectorEvent]:
        events = self._detector.manual_stop(now_ms=now_ms)
        self._dispatch_recording_actions(events)
        return events

    def _dispatch_recording_actions(self, events: list[DetectorEvent]) -> None:
        for event in events:
            if event.type != "recording_action":
                continue
            if event.action == "start_recording":
                self._recorder.start_recording(
                    ts_unix_ms=event.ts_unix_ms,
                    session_id=_extract_session_id(event.details),
                    reason_code=event.reason_code,
                    metadata=dict(event.details),
                )
                if self._session_index_store is not None:
                    self._session_index_store.record_start(
                        game_id=self._game_id,
                        ts_unix_ms=event.ts_unix_ms,
                        session_id=_extract_session_id(event.details),
                        reason_code=event.reason_code,
                        metadata=dict(event.details),
                    )
            elif event.action == "stop_recording":
                recorder_result = self._recorder.stop_recording(
                    ts_unix_ms=event.ts_unix_ms,
                    session_id=_extract_session_id(event.details),
                    reason_code=event.reason_code,
                    metadata=dict(event.details),
                )
                if self._session_index_store is not None:
                    self._session_index_store.record_stop(
                        game_id=self._game_id,
                        ts_unix_ms=event.ts_unix_ms,
                        session_id=_extract_session_id(event.details),
                        reason_code=event.reason_code,
                        metadata=dict(event.details),
                        recorder_result=recorder_result,
                    )


def _extract_session_id(details: dict[str, Any]) -> str | None:
    value = details.get("session_id")
    if isinstance(value, str) and value:
        return value
    return None
