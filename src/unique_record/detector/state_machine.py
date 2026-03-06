from __future__ import annotations

from .types import DetectorSnapshot, State


class DetectorStateMachine:
    """State transition helpers that are independent from rule matching."""

    def __init__(self, post_match_cooldown_seconds: int = 20) -> None:
        self._post_match_cooldown_seconds = post_match_cooldown_seconds

    def context_transition(self, current_state: State, snapshot: DetectorSnapshot) -> State | None:
        if current_state != "idle":
            return None
        s3 = snapshot.signals.get("S3") is True
        s4 = snapshot.signals.get("S4") is True
        if s3 or s4:
            return "pre_match"
        return None

    def should_exit_post_match(self, post_match_entered_at_ms: int | None, now_ms: int) -> bool:
        if post_match_entered_at_ms is None:
            return False
        cooldown_ms = self._post_match_cooldown_seconds * 1000
        return now_ms - post_match_entered_at_ms >= cooldown_ms

