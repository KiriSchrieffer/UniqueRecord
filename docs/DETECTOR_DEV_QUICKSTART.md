# Detector 开发快速运行

## 1. 运行单元测试
```powershell
python -m unittest discover -s tests -p "test_*.py" -v
```

## 2. 运行静态信号冒烟（不依赖真实 LoL）
```powershell
python scripts/detector_smoke.py
```

若要验证“Detector -> Recorder 调度链路”：
```powershell
python scripts/orchestrator_smoke.py
```

## 3. 运行真实轮询（读取本机 LoL 信号）
```powershell
python scripts/detector_live_poll.py --interval 0.5
```

可选参数：
- `--ticks 20`：只跑固定次数。
- `--lockfile "C:\Riot Games\League of Legends\lockfile"`：显式指定 lockfile。
- `--config "configs/game_adapters.template.json"`：指定配置文件。

## 4. 期望观察
- LoL 在对局中时，`S1` 应接近 `InProgress`，`S2` 应为 `true`。
- 结束对局后，`S1` 应进入 `WaitingForStats` 或 `EndOfGame`。
- 触发时可看到 `recording_action: start_recording/stop_recording` 事件。
- 运行后会生成会话索引：`recordings/recording_index.jsonl`（每局一行 JSON）。

## 5. Windows 原生录制约束
- 当前录制后端已切换为 Windows 原生方案（占位实现），不再依赖 `runtime/obs`。
- 现阶段可用于验证 Detector/Orchestrator/Recorder 调度链路。
- 真正的视频采集与编码能力将在后续阶段接入 Windows 原生捕获管线。

可快速检查是否已放置原生捕获宿主：
```powershell
python scripts/check_windows_native_runtime.py
```

若你已安装 .NET SDK，可构建宿主到默认路径：
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build_windows_capture_host.ps1
```

## 6. 启动主循环
正常模式：
```powershell
python scripts/run_unique_record.py
```

开发联调模式（仅验证事件链路）：
```powershell
python scripts/run_unique_record.py --dry-run --ticks 20
```

无需开启 LoL 的单局模拟：
```powershell
python scripts/run_unique_record.py --dry-run --simulate-match --ticks 30
```

常用参数：
- `--print-last-session`（主循环结束后打印会话索引最后一条记录）
- `--recorder-backend auto|placeholder|process`（录制后端模式）
- `--native-host "<path-to-capture-host>"`（指定原生捕获宿主路径）

启动日志会输出：
- `session_index_path`：当前会话索引文件路径。

开发环境提示：
- 当前默认录制器为 Windows 原生占位实现，不依赖 OBS WebSocket。
- 会话索引能力保持可用，便于后续接入真实 Windows 录制管线后做回归验证。

## 7. 查看会话索引
查看最近 20 条（倒序）：
```powershell
python scripts/session_index_view.py
```

只看最后一条：
```powershell
python scripts/session_index_view.py --last --pretty
```

按状态过滤（例如仅完成局）：
```powershell
python scripts/session_index_view.py --status completed --limit 10
```
