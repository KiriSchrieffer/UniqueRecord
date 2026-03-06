from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

State = Literal["idle", "pre_match", "in_match", "post_match"]
EventType = Literal["state_changed", "recording_action", "diagnostic"]


@dataclass(slots=True)
class DetectorSnapshot:
    ts_unix_ms: int
    signals: dict[str, Any]
    unavailable_signals: set[str]
    state: State
    session_id: str | None


@dataclass(slots=True)
class DetectorEvent:
    ts_unix_ms: int
    type: EventType
    action: str = "none"
    from_state: State | None = None
    to_state: State | None = None
    reason_code: str | None = None
    matched_rule_id: str | None = None
    details: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class RuleMatch:
    rule_id: str
    action: str
    reason_code: str | None = None

