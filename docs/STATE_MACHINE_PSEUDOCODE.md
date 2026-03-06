# UniqueRecord 状态机伪代码（LoL / schema v2）

## 1. 状态定义
- `idle`
- `pre_match`
- `in_match`
- `post_match`

## 2. 运行上下文
```text
ctx.state = "idle"
ctx.session_id = null
ctx.recording_started_at_ms = null
ctx.last_start_event_ms = null
ctx.post_match_entered_at_ms = null
ctx.s2_drop_started_at_ms = null

ctx.rule_hold_started_ms[rule_id] = timestamp_or_null
ctx.unavailable_signals = set()
```

## 3. 主循环（每 poll_interval_ms 执行）
```pseudo
function tick(now_ms):
  snapshot = collect_signals(now_ms)
  events = []

  if has_manual_override():
    events += apply_manual_override(now_ms)
    return events

  apply_state_transition_by_context(snapshot, now_ms, events)

  if ctx.state == "pre_match":
    match = match_rule_group("start_rules", snapshot, now_ms)
    if match != null and can_start_by_guard(now_ms):
      events += start_recording(match, now_ms)
      ctx.state = "in_match"
      events += emit_state_changed("pre_match", "in_match", match.id, now_ms)
      return events

  if ctx.state == "in_match":
    if snapshot.S2 == false:
      handle_s2_drop_for_recovery(now_ms, events)
    else:
      ctx.s2_drop_started_at_ms = null

    match = match_rule_group("stop_rules", snapshot, now_ms)
    if match != null:
      events += stop_recording(match.reason_code, match.id, now_ms)
      ctx.state = "post_match"
      ctx.post_match_entered_at_ms = now_ms
      events += emit_state_changed("in_match", "post_match", match.id, now_ms)
      return events

  if ctx.state == "post_match":
    if now_ms - ctx.post_match_entered_at_ms >= 20s:
      old = ctx.state
      ctx.state = "idle"
      ctx.session_id = null
      ctx.post_match_entered_at_ms = null
      events += emit_state_changed(old, "idle", "post_match_cooldown", now_ms)
      return events

  return events
```

## 4. 信号采集
```pseudo
function collect_signals(now_ms):
  snapshot.ts = now_ms
  snapshot.S1 = try_read_lcu_gameflow_phase()
  snapshot.S2 = try_read_process("League of Legends.exe")
  snapshot.S3 = try_read_window_visible("League of Legends")
  snapshot.S4 = try_read_process("LeagueClientUx.exe")

  snapshot.unavailable_signals = all_failed_signal_ids()
  snapshot.state = ctx.state
  snapshot.session_id = ctx.session_id
  return snapshot
```

## 5. 规则命中（含 hold_seconds）
```pseudo
function match_rule_group(group_name, snapshot, now_ms):
  rules = config.rules[group_name] sorted by priority asc
  for rule in rules:
    if not check_unavailable_signal_constraint(rule, snapshot.unavailable_signals):
      reset_rule_hold(rule.id)
      continue

    if check_all_conditions(rule.all_conditions, snapshot):
      if ctx.rule_hold_started_ms[rule.id] is null:
        ctx.rule_hold_started_ms[rule.id] = now_ms
      held_ms = now_ms - ctx.rule_hold_started_ms[rule.id]
      if held_ms >= rule.hold_seconds * 1000:
        clear_other_rule_holds_in_group(group_name, keep=rule.id)
        return rule
    else:
      reset_rule_hold(rule.id)

  return null
```

## 6. 防抖与最小时长
```pseudo
function can_start_by_guard(now_ms):
  if ctx.last_start_event_ms is null:
    return true
  return (now_ms - ctx.last_start_event_ms) >= 20s

function start_recording(match, now_ms):
  ctx.session_id = new_session_id()
  ctx.recording_started_at_ms = now_ms
  ctx.last_start_event_ms = now_ms
  return [emit_action("start_recording", null, match.id, now_ms)]

function stop_recording(reason_code, rule_id, now_ms):
  duration_sec = (now_ms - ctx.recording_started_at_ms) / 1000
  events = [emit_action("stop_recording", reason_code, rule_id, now_ms)]
  if duration_sec < 60:
    events += [emit_diagnostic("short_session", rule_id, now_ms)]
  ctx.recording_started_at_ms = null
  return events
```

## 7. 异常恢复（S2 掉线）
```pseudo
function handle_s2_drop_for_recovery(now_ms, events):
  if ctx.s2_drop_started_at_ms is null:
    ctx.s2_drop_started_at_ms = now_ms
    return

  dropped_ms = now_ms - ctx.s2_drop_started_at_ms
  if dropped_ms >= 90s:
    events += stop_recording("abnormal_end", "recovery_timeout", now_ms)
    ctx.state = "post_match"
    ctx.post_match_entered_at_ms = now_ms
    events += emit_state_changed("in_match", "post_match", "recovery_timeout", now_ms)
```

## 8. 初始状态过渡
```pseudo
function apply_state_transition_by_context(snapshot, now_ms, events):
  if ctx.state == "idle":
    if snapshot.S4 == true or snapshot.S3 == true:
      old = ctx.state
      ctx.state = "pre_match"
      events += emit_state_changed(old, "pre_match", "context_ready", now_ms)
```

## 9. 手动覆盖
```pseudo
function apply_manual_override(now_ms):
  if manual_command == "start":
    if ctx.state != "in_match":
      ev = start_recording(match="manual_override", now_ms)
      old = ctx.state
      ctx.state = "in_match"
      return ev + emit_state_changed(old, "in_match", "manual_override", now_ms)

  if manual_command == "stop":
    if ctx.state == "in_match":
      ev = stop_recording("manual_override", "manual_override", now_ms)
      old = ctx.state
      ctx.state = "post_match"
      ctx.post_match_entered_at_ms = now_ms
      return ev + emit_state_changed(old, "post_match", "manual_override", now_ms)

  return []
```

