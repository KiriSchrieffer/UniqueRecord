# UniqueRecord 项目前期计划（2026-03-02）

## 1. 项目目标
- 自动识别“开局”并开始录制。
- 自动识别“结算/结束”并停止录制。
- 录制文件稳定保存到用户指定路径。

## 2. V1 范围与边界
### 范围内
- 平台：Windows（单平台优先）。
- 适配游戏：仅 `League of Legends`（英雄联盟）。
- 录制：1080p60 优先，支持硬件编码（NVENC/AMF/QSV）与软件编码兜底。
- 控制：自动录制 + 手动强制开始/停止。
- 输出：本地 MP4，支持命名规则和保存目录配置。

### 范围外（V1 不做）
- 云上传与分享。
- 自动剪辑与高光识别。
- 多平台（macOS/Linux）与手游。

## 3. 核心用户流程
1. 首次启动：配置保存路径、视频质量、音频来源。
2. 后台运行：监听目标游戏进程、窗口与会话状态。
3. 识别开局：进入录制状态并生成任务 ID。
4. 识别结束：停止录制、封装输出、写入索引。
5. 失败恢复：异常退出时自动收尾，确保文件可播放。

## 4. 技术方案（Windows 优先）
### 4.1 模块划分
- `Detector`：游戏会话识别（通用 + 游戏适配器）。
- `Recorder`：画面采集、音频混合、编码与封装。
- `Orchestrator`：状态机、任务调度、异常恢复。
- `Storage`：路径权限检查、空间检查、命名与归档。
- `Config/UI`：全局设置、按游戏配置、日志与诊断页。

### 4.2 会话识别策略
- 通用信号：进程出现/退出、窗口切前台、分辨率切换、输入活跃度。
- 游戏适配信号：日志文件、窗口文本、可公开状态接口（若合法且稳定）。
- 置信度机制：多信号加权，阈值触发开始/结束，带防抖时间窗。
- 状态机：`idle -> pre_match -> in_match -> post_match -> idle`。

### 4.3 录制引擎建议
- 捕获：Windows Graphics Capture（原生方案）。
- 交付方式：应用内置原生录制能力，不依赖 OBS。
- 控制方式：进程内录制会话控制 `StartRecord/StopRecord`。
- 编码：优先硬件编码，自动回退软件编码。
- 可靠性：分段写入 + 最终合并，防止崩溃导致全文件损坏。

### 4.4 LoL 会话识别规则（V1）
#### 信号清单（按优先级）
- `S1-LCU游戏流阶段`（高优先级）：读取 LoL Client 本地游戏流状态（如 `InProgress`、`WaitingForStats`、`EndOfGame`）。
- `S2-对局进程`（高优先级）：`League of Legends.exe` 是否运行。
- `S3-游戏窗口`（中优先级）：窗口标题包含 `League of Legends` 且窗口可见。
- `S4-客户端进程`（辅助）：`LeagueClientUx.exe` 是否运行，仅用于上下文，不单独触发录制。

#### 开局触发条件（开始录制）
1. 主触发：
- `S1 == InProgress` 且 `S2 == true` 持续 `>= 3s`，立即开始录制。
2. 兜底触发（当 `S1` 暂不可用）：
- `S2 == true` 且 `S3 == true` 持续 `>= 8s`，开始录制。
3. 防抖与保护：
- 进入录制后 `20s` 内忽略重复开始事件。
- 最短录像时长门槛 `60s`，低于门槛标记为 `short_session`（是否删除由配置决定）。

#### 结算触发条件（停止录制）
1. 主触发：
- `S1 in {WaitingForStats, EndOfGame}` 持续 `>= 5s`，停止录制。
2. 兜底触发：
- `S2 == false` 持续 `>= 10s`，停止录制并标记 `process_exit_stop`。
3. 异常恢复：
- 若录制中出现 `S2` 短暂消失（崩溃/重连），进入 `grace_period=90s`。
- 若 `90s` 内 `S2` 恢复，则继续同一会话；超时则停止并标记 `abnormal_end`。

#### 状态机触发约束（防误触发）
- `idle -> pre_match`：检测到 `S4` 或 LoL 相关窗口，进入预备态，不录制。
- `pre_match -> in_match`：仅当满足“开局触发条件”才开始录制。
- `in_match -> post_match`：仅当满足“结算触发条件”才停止录制。
- `post_match -> idle`：冷却 `20s` 后回到 `idle`，避免结算界面导致二次触发。
- 任何状态下手动“强制开始/停止”优先级最高，并记录 `manual_override` 事件。

#### 配置映射（已落地）
- 配置文件：`configs/game_adapters.template.json`（`schema_version = 2`）。
- `signals.S1~S4` 对应本节信号定义。
- `rules.start_rules` / `rules.stop_rules` 对应开局/结算规则。
- `rules.recovery.grace_period_seconds` 对应异常恢复窗口（`90s`）。
- `rules.guards.start_event_cooldown_seconds`、`rules.guards.min_clip_seconds` 对应防抖与最短时长。
- `rules.state_machine.transitions` 对应状态机转换约束。
- `event_codes` 统一事件码：`manual_override`、`normal_end`、`process_exit_stop`、`abnormal_end`、`short_session`。

## 5. 当前适配游戏范围
- League of Legends（英雄联盟）

## 6. 数据与配置准备
- 每个游戏一份适配配置：进程名、窗口特征、开局信号、结束信号、超时策略。
- 统一事件日志：`detector`, `recorder`, `storage`, `error_code`, `duration_ms`。
- 录制索引文件：记录游戏名、开始时间、结束时间、文件路径、状态。

## 7. 里程碑（建议）
### M0（2026-03-02 ~ 2026-03-08）
- 完成 PRD、技术选型、模块边界与错误码规范。
- 输出 1 个“手动录制”PoC（验证采集 + 编码 + 保存链路）。

### M1（2026-03-09 ~ 2026-03-22）
- 通用 Detector + 状态机完成。
- 接入 League of Legends 适配器并跑通“自动开/停录制”。

### M2（2026-03-23 ~ 2026-04-05）
- 深化 League of Legends 识别准确率，完善日志和异常恢复。
- 完成设置页和录制目录管理。

### M3（2026-04-06 ~ 2026-04-19）
- 稳定性优化（误触发率、漏触发率、CPU/GPU 占用）。
- 回归测试与打包发布（内测版）。

## 8. 验收指标（V1）
- 自动开始成功率 >= 95%（目标游戏样本局）。
- 自动结束成功率 >= 98%。
- 误触发率 <= 1%（非对局场景）。
- 录像文件可播放率 >= 99.5%。
- 常驻资源占用：CPU < 5%（空闲监听状态，参考机型）。

## 9. 关键风险与应对
- 游戏更新导致信号失效：适配规则版本化 + 远程配置更新机制（V1 可先本地更新包）。
- 反作弊与权限限制：只使用合规的进程/窗口/公开信息，不做侵入式注入。
- 高负载掉帧：硬件编码优先，支持动态降码率。
- 异常中断损坏文件：分段写入 + 崩溃恢复流程。

## 10. 当前周执行清单（立即可做）
- 确定技术栈（语言/UI/捕获方案/编码方案）。
- 固定目标游戏为 League of Legends，并确认可用检测信号来源。
- 建立 `adapters` 配置模板与错误码清单。
- 打通 `Detector -> Orchestrator -> Windows Native Recorder` 主循环运行链路。
- 完成 Windows 原生录制管线联调（捕获/编码/封装）。
- 输出 PoC 验证脚本（手动开始/停止、保存路径校验、断电恢复模拟）。

## 11. 当前实现进展（已完成）
- 已移除 OBS 相关运行时与代码依赖，统一转向 Windows 原生录制方案。
- 已保留 Detector/Orchestrator/Recorder 调度链路，可用于后续接入原生捕获实现。
- 已支持按配置写入录制目录（`global.recordings_output_dir`）。
- 已落地会话索引文件：`recordings/recording_index.jsonl`，记录每局开始/结束时间、时长、状态、输出路径（若可获取）。
