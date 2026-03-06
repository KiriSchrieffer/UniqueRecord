from __future__ import annotations

from typing import Any

from .types import DetectorSnapshot, RuleMatch


class RuleEvaluator:
    """Evaluates start/stop rule groups with priority and hold-time semantics."""

    def __init__(
        self,
        rules_config: dict[str, Any],
        hold_started_at_ms: dict[str, int | None],
    ) -> None:
        self._rules_config = rules_config
        self._hold_started_at_ms = hold_started_at_ms

    def match_rule_group(
        self,
        group_name: str,
        snapshot: DetectorSnapshot,
        now_ms: int,
    ) -> RuleMatch | None:
        rules = sorted(
            self._rules_config.get(group_name, []),
            key=lambda item: int(item.get("priority", 9999)),
        )

        for rule in rules:
            rule_id = str(rule.get("id", ""))
            if not rule_id:
                continue

            if not self._check_unavailable_constraint(rule, snapshot.unavailable_signals):
                self._hold_started_at_ms[rule_id] = None
                continue

            conditions = rule.get("all_conditions", [])
            if self._check_conditions(conditions, snapshot.signals):
                started_at = self._hold_started_at_ms.get(rule_id)
                if started_at is None:
                    self._hold_started_at_ms[rule_id] = now_ms
                    started_at = now_ms

                hold_ms = int(rule.get("hold_seconds", 0)) * 1000
                if now_ms - started_at >= hold_ms:
                    self._clear_other_holds_in_group(rules, keep_rule_id=rule_id)
                    return RuleMatch(
                        rule_id=rule_id,
                        action=str(rule.get("action", "none")),
                        reason_code=rule.get("reason_code"),
                    )
            else:
                self._hold_started_at_ms[rule_id] = None

        return None

    def _check_unavailable_constraint(
        self,
        rule: dict[str, Any],
        unavailable_signals: set[str],
    ) -> bool:
        required_unavailable = rule.get("requires_unavailable_signals", [])
        if not required_unavailable:
            return True
        return all(signal_id in unavailable_signals for signal_id in required_unavailable)

    def _check_conditions(
        self,
        conditions: list[dict[str, Any]],
        signals: dict[str, Any],
    ) -> bool:
        for condition in conditions:
            signal_id = str(condition.get("signal"))
            operator = str(condition.get("operator"))
            expected_value = condition.get("value")
            actual_value = signals.get(signal_id)
            if not self._evaluate_condition(actual_value, operator, expected_value):
                return False
        return True

    @staticmethod
    def _evaluate_condition(actual_value: Any, operator: str, expected_value: Any) -> bool:
        if operator == "eq":
            return actual_value == expected_value
        if operator == "in":
            if not isinstance(expected_value, list):
                return False
            return actual_value in expected_value
        return False

    def _clear_other_holds_in_group(
        self,
        rules: list[dict[str, Any]],
        keep_rule_id: str,
    ) -> None:
        for rule in rules:
            rule_id = str(rule.get("id", ""))
            if rule_id and rule_id != keep_rule_id:
                self._hold_started_at_ms[rule_id] = None

