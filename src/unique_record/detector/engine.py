from __future__ import annotations

import json
import time
import uuid
from pathlib import Path
from typing import Any

from .rule_evaluator import RuleEvaluator
from .signal_provider import SignalProvider
from .state_machine import DetectorStateMachine
from .types import DetectorEvent, DetectorSnapshot, State


class DetectorEngine:
    """Rule-driven detector engine for game session lifecycle events."""

    def __init__(
        self,
        signal_provider: SignalProvider,
        game_id: str = "league_of_legends",
    ) -> None:
        self._signal_provider = signal_provider
        self._game_id = game_id

        self._state: State = "idle"
        self._session_id: str | None = None
        self._recording_started_at_ms: int | None = None
        self._last_start_event_ms: int | None = None
        self._post_match_entered_at_ms: int | None = None
        self._s2_drop_started_at_ms: int | None = None
        self._rule_hold_started_at_ms: dict[str, int | None] = {}

        self._signals_cfg: dict[str, Any] = {}
        self._rules_cfg: dict[str, Any] = {}
        self._event_codes: dict[str, str] = {}
        self._global_cfg: dict[str, Any] = {}

        self._rule_evaluator: RuleEvaluator | None = None
        self._state_machine: DetectorStateMachine | None = None
        self._last_snapshot: DetectorSnapshot | None = None
        self._config_loaded = False
        self._running = True

    def load_config_file(self, config_path: str | Path) -> None:
        data = json.loads(Path(config_path).read_text(encoding="utf-8"))
        self.load_config(data)

    def load_config(self, config: dict[str, Any]) -> None:
        schema_version = int(config.get("schema_version", 0))
        if schema_version < 2:
            raise ValueError("schema_version >= 2 is required")

        games = config.get("games", [])
        game_cfg = next(
            (game for game in games if game.get("id") == self._game_id),
            None,
        )
        if game_cfg is None:
            raise ValueError(f"game config not found: {self._game_id}")

        self._global_cfg = config.get("global", {})
        self._signals_cfg = game_cfg.get("signals", {})
        self._rules_cfg = game_cfg.get("rules", {})
        self._event_codes = game_cfg.get("event_codes", {})
        self._rule_hold_started_at_ms = {}

        self._rule_evaluator = RuleEvaluator(self._rules_cfg, self._rule_hold_started_at_ms)
        post_match_cooldown_seconds = self._extract_post_match_cooldown_seconds(self._rules_cfg)
        self._state_machine = DetectorStateMachine(
            post_match_cooldown_seconds=post_match_cooldown_seconds
        )
        self._running = bool(game_cfg.get("enabled", True))
        self._config_loaded = True

    def start(self) -> None:
        self._running = True

    def stop(self) -> None:
        self._running = False

    def manual_start(self, reason: str = "manual_override", now_ms: int | None = None) -> list[DetectorEvent]:
        self._ensure_config_loaded()
        timestamp = now_ms or self._now_ms()
        events: list[DetectorEvent] = []

        if self._state == "in_match":
            return events

        events.extend(
            self._start_recording(
                now_ms=timestamp,
                matched_rule_id="manual_override",
                reason_code=self._event_code("manual_override"),
                bypass_cooldown=True,
            )
        )
        old_state = self._state
        self._state = "in_match"
        events.append(
            self._emit_state_changed(
                now_ms=timestamp,
                from_state=old_state,
                to_state="in_match",
                matched_rule_id="manual_override",
                reason_code=reason,
            )
        )
        return events

    def manual_stop(self, reason: str = "manual_override", now_ms: int | None = None) -> list[DetectorEvent]:
        self._ensure_config_loaded()
        timestamp = now_ms or self._now_ms()
        events: list[DetectorEvent] = []

        if self._state != "in_match":
            return events

        events.extend(
            self._stop_recording(
                now_ms=timestamp,
                reason_code=self._event_code("manual_override"),
                matched_rule_id="manual_override",
            )
        )
        old_state = self._state
        self._state = "post_match"
        self._post_match_entered_at_ms = timestamp
        events.append(
            self._emit_state_changed(
                now_ms=timestamp,
                from_state=old_state,
                to_state="post_match",
                matched_rule_id="manual_override",
                reason_code=reason,
            )
        )
        return events

    def tick(self, now_ms: int | None = None) -> list[DetectorEvent]:
        self._ensure_config_loaded()
        if not self._running:
            return []

        timestamp = now_ms or self._now_ms()
        snapshot = self._collect_snapshot(timestamp)
        events: list[DetectorEvent] = []

        context_next_state = self._state_machine.context_transition(self._state, snapshot)  # type: ignore[union-attr]
        if context_next_state is not None:
            old_state = self._state
            self._state = context_next_state
            events.append(
                self._emit_state_changed(
                    now_ms=timestamp,
                    from_state=old_state,
                    to_state=context_next_state,
                    matched_rule_id="context_ready",
                )
            )

        if self._state == "pre_match":
            match = self._rule_evaluator.match_rule_group(  # type: ignore[union-attr]
                group_name="start_rules",
                snapshot=snapshot,
                now_ms=timestamp,
            )
            if match is not None and self._can_start(timestamp):
                events.extend(
                    self._start_recording(
                        now_ms=timestamp,
                        matched_rule_id=match.rule_id,
                        reason_code=match.reason_code,
                    )
                )
                old_state = self._state
                self._state = "in_match"
                events.append(
                    self._emit_state_changed(
                        now_ms=timestamp,
                        from_state=old_state,
                        to_state="in_match",
                        matched_rule_id=match.rule_id,
                    )
                )

        if self._state == "in_match":
            recovery_events = self._handle_recovery(snapshot=snapshot, now_ms=timestamp)
            events.extend(recovery_events)
            if self._state != "in_match":
                self._last_snapshot = self._build_snapshot(
                    now_ms=timestamp,
                    signals=snapshot.signals,
                    unavailable_signals=snapshot.unavailable_signals,
                )
                return events

            match = self._rule_evaluator.match_rule_group(  # type: ignore[union-attr]
                group_name="stop_rules",
                snapshot=snapshot,
                now_ms=timestamp,
            )
            if match is not None:
                events.extend(
                    self._stop_recording(
                        now_ms=timestamp,
                        reason_code=match.reason_code or self._event_code("normal_end"),
                        matched_rule_id=match.rule_id,
                    )
                )
                old_state = self._state
                self._state = "post_match"
                self._post_match_entered_at_ms = timestamp
                events.append(
                    self._emit_state_changed(
                        now_ms=timestamp,
                        from_state=old_state,
                        to_state="post_match",
                        matched_rule_id=match.rule_id,
                        reason_code=match.reason_code,
                    )
                )

        if self._state == "post_match" and self._state_machine.should_exit_post_match(  # type: ignore[union-attr]
            post_match_entered_at_ms=self._post_match_entered_at_ms,
            now_ms=timestamp,
        ):
            old_state = self._state
            self._state = "idle"
            self._session_id = None
            self._post_match_entered_at_ms = None
            events.append(
                self._emit_state_changed(
                    now_ms=timestamp,
                    from_state=old_state,
                    to_state="idle",
                    matched_rule_id="post_match_cooldown",
                )
            )

        self._last_snapshot = self._build_snapshot(
            now_ms=timestamp,
            signals=snapshot.signals,
            unavailable_signals=snapshot.unavailable_signals,
        )
        return events

    def get_snapshot(self) -> DetectorSnapshot:
        if self._last_snapshot is not None:
            return self._last_snapshot
        return DetectorSnapshot(
            ts_unix_ms=self._now_ms(),
            signals={},
            unavailable_signals=set(),
            state=self._state,
            session_id=self._session_id,
        )

    def _collect_snapshot(self, now_ms: int) -> DetectorSnapshot:
        signals: dict[str, Any] = {}
        unavailable: set[str] = set()
        for signal_id, signal_def in self._signals_cfg.items():
            value, available = self._signal_provider.read_signal(signal_id, signal_def)
            signals[signal_id] = value
            if not available:
                unavailable.add(signal_id)

        return DetectorSnapshot(
            ts_unix_ms=now_ms,
            signals=signals,
            unavailable_signals=unavailable,
            state=self._state,
            session_id=self._session_id,
        )

    def _handle_recovery(self, snapshot: DetectorSnapshot, now_ms: int) -> list[DetectorEvent]:
        events: list[DetectorEvent] = []
        s2_running = snapshot.signals.get("S2") is True

        if s2_running:
            self._s2_drop_started_at_ms = None
            return events

        if self._s2_drop_started_at_ms is None:
            self._s2_drop_started_at_ms = now_ms
            return events

        grace_seconds = int(
            self._rules_cfg.get("recovery", {}).get("grace_period_seconds", 90)
        )
        if now_ms - self._s2_drop_started_at_ms < grace_seconds * 1000:
            return events

        events.extend(
            self._stop_recording(
                now_ms=now_ms,
                reason_code=self._event_code("abnormal_end"),
                matched_rule_id="recovery_timeout",
            )
        )
        old_state = self._state
        self._state = "post_match"
        self._post_match_entered_at_ms = now_ms
        events.append(
            self._emit_state_changed(
                now_ms=now_ms,
                from_state=old_state,
                to_state="post_match",
                matched_rule_id="recovery_timeout",
                reason_code=self._event_code("abnormal_end"),
            )
        )
        return events

    def _start_recording(
        self,
        now_ms: int,
        matched_rule_id: str,
        reason_code: str | None,
        bypass_cooldown: bool = False,
    ) -> list[DetectorEvent]:
        if not bypass_cooldown and not self._can_start(now_ms):
            return []

        self._session_id = uuid.uuid4().hex
        self._recording_started_at_ms = now_ms
        self._last_start_event_ms = now_ms
        return [
            DetectorEvent(
                ts_unix_ms=now_ms,
                type="recording_action",
                action="start_recording",
                reason_code=reason_code,
                matched_rule_id=matched_rule_id,
                details={"session_id": self._session_id},
            )
        ]

    def _stop_recording(
        self,
        now_ms: int,
        reason_code: str | None,
        matched_rule_id: str,
    ) -> list[DetectorEvent]:
        events: list[DetectorEvent] = []
        duration_sec: float | None = None
        if self._recording_started_at_ms is not None:
            duration_sec = (now_ms - self._recording_started_at_ms) / 1000.0

        events.append(
            DetectorEvent(
                ts_unix_ms=now_ms,
                type="recording_action",
                action="stop_recording",
                reason_code=reason_code,
                matched_rule_id=matched_rule_id,
                details={
                    "session_id": self._session_id,
                    "duration_sec": duration_sec,
                },
            )
        )

        min_clip_seconds = int(self._rules_cfg.get("guards", {}).get("min_clip_seconds", 60))
        if duration_sec is not None and duration_sec < min_clip_seconds:
            events.append(
                DetectorEvent(
                    ts_unix_ms=now_ms,
                    type="diagnostic",
                    action="none",
                    reason_code=self._event_code("short_session"),
                    matched_rule_id=matched_rule_id,
                    details={
                        "duration_sec": duration_sec,
                        "min_clip_seconds": min_clip_seconds,
                    },
                )
            )

        self._recording_started_at_ms = None
        self._s2_drop_started_at_ms = None
        return events

    def _can_start(self, now_ms: int) -> bool:
        if self._last_start_event_ms is None:
            return True
        cooldown_seconds = int(
            self._rules_cfg.get("guards", {}).get("start_event_cooldown_seconds", 20)
        )
        return now_ms - self._last_start_event_ms >= cooldown_seconds * 1000

    def _build_snapshot(
        self,
        now_ms: int,
        signals: dict[str, Any],
        unavailable_signals: set[str],
    ) -> DetectorSnapshot:
        return DetectorSnapshot(
            ts_unix_ms=now_ms,
            signals=signals,
            unavailable_signals=unavailable_signals,
            state=self._state,
            session_id=self._session_id,
        )

    def _emit_state_changed(
        self,
        now_ms: int,
        from_state: State,
        to_state: State,
        matched_rule_id: str,
        reason_code: str | None = None,
    ) -> DetectorEvent:
        return DetectorEvent(
            ts_unix_ms=now_ms,
            type="state_changed",
            action="none",
            from_state=from_state,
            to_state=to_state,
            reason_code=reason_code,
            matched_rule_id=matched_rule_id,
            details={"session_id": self._session_id},
        )

    def _event_code(self, key: str) -> str:
        return str(self._event_codes.get(key, key))

    @staticmethod
    def _extract_post_match_cooldown_seconds(rules_cfg: dict[str, Any]) -> int:
        transitions = rules_cfg.get("state_machine", {}).get("transitions", [])
        for transition in transitions:
            if transition.get("from") == "post_match" and transition.get("to") == "idle":
                return int(transition.get("hold_seconds", 20))
        return 20

    def _ensure_config_loaded(self) -> None:
        if not self._config_loaded:
            raise RuntimeError("config is not loaded")

    @staticmethod
    def _now_ms() -> int:
        return int(time.time() * 1000)
