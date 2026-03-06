# UniqueRecord Detector 接口定义（LoL / schema v2）

## 1. 目标
- 将 `configs/game_adapters.template.json` 中的 LoL 规则转换为可执行检测逻辑。
- 输出稳定、可审计的会话事件：`start_recording`、`stop_recording`、`state_changed`、`manual_override`。

## 2. 配置依赖
- 配置来源：`configs/game_adapters.template.json`
- 关键字段：
1. `global.poll_interval_ms`
2. `games[].signals`
3. `games[].rules.start_rules`
4. `games[].rules.stop_rules`
5. `games[].rules.recovery`
6. `games[].rules.guards`
7. `games[].rules.state_machine`
8. `games[].event_codes`

## 3. 领域模型
```text
SignalId = "S1" | "S2" | "S3" | "S4"

State = "idle" | "pre_match" | "in_match" | "post_match"

Action =
  "start_recording" |
  "stop_recording" |
  "none"
```

```text
DetectorSnapshot
- ts_unix_ms: int64
- signals: map<SignalId, any>                // 例如 S1="InProgress", S2=true
- unavailable_signals: set<SignalId>         // 拉取失败/暂不可用
- state: State
- session_id: string | null
```

```text
DetectorEvent
- ts_unix_ms: int64
- type: "state_changed" | "recording_action" | "diagnostic"
- action: Action
- from_state: State | null
- to_state: State | null
- reason_code: string | null                 // normal_end/process_exit_stop/abnormal_end/...
- matched_rule_id: string | null
- details: map<string, any>
```

## 4. Detector 对外接口（语言无关）
```text
interface IDetectorEngine {
  loadConfig(config): void
  start(): void
  stop(): void

  // 每次轮询执行一次，返回 0..N 个事件
  tick(now_unix_ms: int64): List<DetectorEvent>

  // 手动控制优先级最高
  manualStart(reason: string): List<DetectorEvent>
  manualStop(reason: string): List<DetectorEvent>

  getSnapshot(): DetectorSnapshot
}
```

## 5. 内部子接口（建议拆分）
```text
interface ISignalProvider {
  readS1GameflowPhase(): Result<string>      // LCU phase
  readS2GameProcessRunning(): Result<bool>
  readS3GameWindowVisible(): Result<bool>
  readS4ClientProcessRunning(): Result<bool>
}

interface IRuleEvaluator {
  evaluateStartRules(snapshot, now_unix_ms): RuleMatch | null
  evaluateStopRules(snapshot, now_unix_ms): RuleMatch | null
}

interface IStateMachine {
  transit(snapshot, matches, now_unix_ms): List<DetectorEvent>
}
```

## 6. 规则执行约束
1. `priority` 越小优先级越高。
2. `hold_seconds`：条件需连续满足达到时长才算命中。
3. `requires_unavailable_signals`：仅当列出的信号在当前快照为不可用时才允许该规则触发（用于兜底规则）。
4. `manualStart/manualStop` 永远覆盖自动决策，并写入 `manual_override`。
5. `start_event_cooldown_seconds` 内忽略重复 `start_recording`。
6. `min_clip_seconds` 未满足时打 `short_session`，是否删除由上层策略决定（当前为 `keep_and_mark`）。

## 7. 会话与恢复
1. `in_match` 状态下若 `S2` 从 `true` 变为 `false`，开启 `grace_period_seconds` 计时。
2. 在 `grace_period_seconds` 内恢复 `S2=true`，会话继续，不触发停止。
3. 超时仍未恢复，触发 `stop_recording`，`reason_code=abnormal_end`。

## 8. 最小日志字段（建议）
```text
detector_ts, state, matched_rule_id, action, reason_code,
S1, S2, S3, S4, unavailable_signals, session_id, latency_ms
```

## 9. 验收用例（最小集）
1. `S1=InProgress & S2=true` 连续 3s -> 启动录制。
2. `S1` 不可用且 `S2=true & S3=true` 连续 8s -> 启动录制（兜底）。
3. `S1=EndOfGame` 连续 5s -> 停止录制。
4. `S2=false` 连续 10s -> 停止录制并标记 `process_exit_stop`。
5. `in_match` 中 `S2` 掉线 30s 后恢复 -> 不停止。
6. `in_match` 中 `S2` 掉线超过 90s -> 停止并标记 `abnormal_end`。

