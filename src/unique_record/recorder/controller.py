from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

RecorderAction = Literal["start_recording", "stop_recording"]


@dataclass(slots=True)
class RecorderCommand:
    ts_unix_ms: int
    action: RecorderAction
    session_id: str | None
    reason_code: str | None
    metadata: dict[str, Any] = field(default_factory=dict)


class RecordingController(Protocol):
    """Minimal controller interface to bridge detector output to recorder backend."""

    def start_recording(
        self,
        *,
        ts_unix_ms: int,
        session_id: str | None,
        reason_code: str | None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        """Handle recording start request."""

    def stop_recording(
        self,
        *,
        ts_unix_ms: int,
        session_id: str | None,
        reason_code: str | None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        """Handle recording stop request."""


class InMemoryRecordingController:
    """
    Development stub for recorder control.
    Captures start/stop commands for tests and local integration checks.
    """

    def __init__(self) -> None:
        self.commands: list[RecorderCommand] = []
        self.active_session_id: str | None = None

    def start_recording(
        self,
        *,
        ts_unix_ms: int,
        session_id: str | None,
        reason_code: str | None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        self.active_session_id = session_id or self.active_session_id
        self.commands.append(
            RecorderCommand(
                ts_unix_ms=ts_unix_ms,
                action="start_recording",
                session_id=session_id,
                reason_code=reason_code,
                metadata=metadata or {},
            )
        )
        return None

    def stop_recording(
        self,
        *,
        ts_unix_ms: int,
        session_id: str | None,
        reason_code: str | None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        self.commands.append(
            RecorderCommand(
                ts_unix_ms=ts_unix_ms,
                action="stop_recording",
                session_id=session_id,
                reason_code=reason_code,
                metadata=metadata or {},
            )
        )
        self.active_session_id = None
        return None
