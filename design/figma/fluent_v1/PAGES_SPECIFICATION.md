# UniqueRecord 页面功能规格说明

## 页面索引

1. [欢迎与首次配置](#1-欢迎与首次配置-welcome)
2. [主控制台 Dashboard](#2-主控制台-dashboard)
3. [录制历史](#3-录制历史-history)
4. [设置-录制](#4-设置-录制-settingsrecording)
5. [设置-检测与OBS](#5-设置-检测与obs-settingsdetection)
6. [诊断中心](#6-诊断中心-diagnostics)
7. [悬浮迷你控制面板](#7-悬浮迷你控制面板-minipanel)

---

## 1. 欢迎与首次配置 (Welcome)

**路径**: `/`

### 功能说明
首次启动应用时的引导流程，帮助用户完成初始配置。

### 流程步骤

#### 步骤 1: 欢迎
- 产品介绍和主要功能说明
- 功能清单展示
- "开始配置" 按钮

#### 步骤 2: 选择保存目录
- 保存路径输入框
- 磁盘空间提示
- 建议保留空间说明

#### 步骤 3: 配置录制参数
- 画质设置下拉框（1080p60 推荐）
- 音频质量下拉框（320kbps 推荐）
- 开机自动启动开关

#### 步骤 4: 完成设置
- 配置摘要展示
- 确认并进入主界面

### 数据结构

```typescript
interface WelcomeConfig {
  savePath: string;           // 保存目录
  quality: string;            // 画质 (1080p60, 720p30, etc.)
  audioQuality: string;       // 音频质量 (high, medium, low)
  autoStart: boolean;         // 开机启动
}
```

### 交互特性
- 步骤进度指示器（带完成状态）
- 可返回上一步修改
- 可跳过直接进入
- 配置验证提示

---

## 2. 主控制台 (Dashboard)

**路径**: `/dashboard`

### 功能说明
应用的核心控制中心，显示当前状态、控制录制、查看统计数据。

### 主要区域

#### 状态卡片
- **待机中 (Idle)**:
  - 灰色图标
  - 提示启动游戏
  
- **检测中 (Detecting)**:
  - 蓝色图标
  - 显示已检测到游戏
  - 等待进入对局
  
- **录制中 (Recording)**:
  - 橙红色图标
  - 实时显示录制时长
  - 显示文件大小
  - "停止录制" 按钮

#### 统计卡片 (4个)
1. **今日录制**: 局数
2. **本周录制**: 局数
3. **总时长**: 小时
4. **磁盘占用**: GB

#### 最近一局
- 游戏模式、日期时间
- 时长和文件大小
- 状态徽章
- 快速操作按钮（播放、打开文件夹）

### 数据结构

```typescript
type AppStatus = 'idle' | 'detecting' | 'recording';

interface DashboardStats {
  todayCount: number;      // 今日录制数
  weekCount: number;       // 本周录制数
  totalDuration: string;   // 总时长（小时）
  diskUsage: string;       // 磁盘占用（GB）
}

interface LastSession {
  date: string;           // 日期
  time: string;           // 时间
  duration: string;       // 时长
  size: string;           // 文件大小
  gameMode: string;       // 游戏模式
  path: string;           // 文件路径
}
```

### 交互特性
- 实时状态更新
- 录制计时器（每秒更新）
- 跳转到迷你面板
- 快速访问最近录制

---

## 3. 录制历史 (History)

**路径**: `/history`

### 功能说明
查看所有录制记录，支持筛选、搜索和管理。

### 主要功能

#### 筛选栏
- 搜索输入框（支持文件名、日期搜索）
- 状态筛选下拉框（全部/已保存/录制中/异常）
- 高级筛选按钮

#### 统计摘要（4个卡片）
1. 总录制数
2. 成功保存数（绿色）
3. 异常结束数（红色）
4. 总文件大小

#### 数据表格
**列定义**:
- 开始时间
- 结束时间
- 时长
- 游戏模式
- 状态（徽章）
- 文件大小
- 操作（播放、打开文件夹、删除）

#### 空态
- 插图 + 提示文案
- "查看使用指南" 按钮

#### 批量操作
- 导出列表
- 批量删除

### 数据结构

```typescript
type RecordStatus = 'success' | 'recording' | 'error';

interface RecordSession {
  id: string;
  startTime: string;        // 开始时间 (YYYY-MM-DD HH:mm:ss)
  endTime: string;          // 结束时间
  duration: string;         // 时长 (HH:mm:ss)
  status: RecordStatus;     // 状态
  gameMode: string;         // 游戏模式
  filePath: string;         // 文件路径
  fileSize: string;         // 文件大小
}
```

### 交互特性
- 实时搜索过滤
- 状态筛选切换
- Hover 高亮行
- 空态/正常态切换
- 批量操作确认

---

## 4. 设置-录制 (SettingsRecording)

**路径**: `/settings/recording`

### 功能说明
配置录制视频的画质、编码和存储参数。

### 配置区域

#### 1. 存储设置
- 保存目录输入框
- 磁盘空间提示（可用空间显示）

#### 2. 视频质量
- **分辨率**: 1920×1080 (推荐) / 2560×1440 / 1280×720 / 3840×2160
- **帧率**: 60 FPS (推荐) / 30 FPS / 120 FPS
- **视频码率**: 8000 Kbps (推荐) / 6000 / 10000 / 12000
- **容器格式**: MP4 (推荐) / MKV / FLV

#### 3. 编码器设置
- **视频编码器**: 
  - x264 (CPU) - 推荐
  - NVENC (NVIDIA GPU)
  - QuickSync (Intel GPU)
  - AMF (AMD GPU)
- **硬件加速**: 开关

#### 4. 音频设置
- **音频编码器**: AAC (推荐) / MP3
- **音频码率**: 320 Kbps (推荐) / 192 / 128

#### 5. 高级选项
- **自动分割录制文件**: 开关
- **分割大小**: 5000 MB（当启用时显示）

### 数据结构

```typescript
interface RecordingSettings {
  savePath: string;
  resolution: string;       // '1920x1080', '2560x1440', etc.
  fps: string;              // '60', '30', '120'
  bitrate: string;          // '8000', '6000', etc. (Kbps)
  container: string;        // 'mp4', 'mkv', 'flv'
  encoder: string;          // 'x264', 'nvenc', 'qsv', 'amf'
  audioCodec: string;       // 'aac', 'mp3'
  audioBitrate: string;     // '320', '192', '128' (Kbps)
  hardwareAccel: boolean;
  autoSplit: boolean;
  splitSize: string;        // MB
}
```

### 交互特性
- 修改后显示"保存更改"和"重置"按钮
- 配置预估信息（存储空间、CPU占用）
- 推荐配置标记
- 编码器说明提示

---

## 5. 设置-检测与OBS (SettingsDetection)

**路径**: `/settings/detection`

### 功能说明
配置游戏检测和 OBS Runtime 连接参数。

### 主要区域

#### 1. 游戏检测状态
- **检测到游戏**:
  - 成功图标（绿色）
  - 进程信息（LeagueClient.exe, PID）
  - 安装路径和版本
  - "运行中" 徽章
  
- **未检测到游戏**:
  - 空状态图标
  - "未运行" 徽章

#### 2. 检测设置
- **自动检测游戏**: 开关
- **检测间隔**: 2-5 秒（建议）

#### 3. OBS Runtime 状态
- **已连接**:
  - 成功图标（绿色）
  - 连接地址和端口
  - OBS 版本、运行时长、内存占用
  - "已连接" 徽章
  
- **未连接**:
  - 错误图标（红色）
  - "未连接" 徽章

#### 4. WebSocket 连接参数
- **主机地址**: localhost
- **端口**: 4455
- **密码**: 可选

#### 5. OBS 行为设置
- **自动启动 OBS Runtime**: 开关
- **启用 OBS 保活机制**: 开关
- **保活检测间隔**: 30 秒

### 数据结构

```typescript
interface DetectionSettings {
  autoDetect: boolean;
  detectionInterval: string;     // 秒
  obsWebsocketHost: string;
  obsWebsocketPort: string;
  obsWebsocketPassword: string;
  obsAutoStart: boolean;
  obsKeepAlive: boolean;
  keepAliveInterval: string;     // 秒
}

interface GameStatus {
  detected: boolean;
  processId?: number;
  installPath?: string;
  version?: string;
}

interface OBSStatus {
  connected: boolean;
  version?: string;
  uptime?: string;
  memory?: string;
}
```

### 交互特性
- 实时状态更新
- "测试连接" 按钮
- 配置验证
- 状态卡片实时刷新

---

## 6. 诊断中心 (Diagnostics)

**路径**: `/diagnostics`

### 功能说明
系统健康检查、错误日志查看和问题诊断。

### 主要区域

#### 1. 系统健康状态（5项检查）
每项包含:
- 检查项名称
- 状态图标（成功/错误/警告）
- 状态徽章
- 详细信息

**检查项**:
1. **OBS Runtime 状态**
   - 运行正常 / 未运行
   - 版本和内存占用
   
2. **WebSocket 连接**
   - 已连接 / 未连接
   - 连接地址和延迟
   
3. **游戏客户端检测**
   - 已检测到 / 未检测到
   - 进程信息
   
4. **存储空间检查**
   - 充足 / 不足
   - 剩余空间
   
5. **编码器可用性**
   - 可用 / 不可用
   - 可用编码器列表

#### 2. 最近错误
- **有错误时**:
  - 错误码（E001, W002 等）
  - 时间戳
  - 错误信息
  - 解决方案
  
- **无错误时**:
  - 成功图标
  - "系统运行良好" 提示

#### 3. 实时日志
- 时间戳
- 日志级别（INFO/WARNING/ERROR）
- 日志消息
- 颜色编码（灰/黄/红）

#### 4. 操作按钮
- **运行诊断**: 执行完整系统检查
- **导出诊断报告**: 导出所有诊断数据
- **复制日志**: 复制日志到剪贴板
- **打开日志文件夹**: 查看日志文件

### 数据结构

```typescript
type DiagnosticStatus = 'success' | 'error' | 'idle';

interface DiagnosticCheck {
  name: string;
  status: DiagnosticStatus;
  message: string;
  detail?: string;
}

interface ErrorRecord {
  code: string;           // E001, W002, etc.
  time: string;
  message: string;
  solution: string;
}

type LogLevel = 'info' | 'warning' | 'error';

interface LogEntry {
  timestamp: string;      // HH:mm:ss
  level: LogLevel;
  message: string;
}
```

### 交互特性
- "运行诊断" 加载状态
- 实时日志自动滚动
- 错误高亮显示
- 导出功能

---

## 7. 悬浮迷你控制面板 (MiniPanel)

**路径**: `/mini-panel`

### 功能说明
轻量级悬浮窗口，用于游戏中快速查看状态和控制录制。

### 特性

#### 标题栏
- 拖动手柄（可拖动整个窗口）
- 应用名称
- 最大化按钮
- 关闭按钮

#### 状态显示

**录制中**:
- "录制中" 红色徽章
- 大字体计时器 (HH:MM:SS)
- 文件大小显示
- 帧率显示
- "停止录制" 按钮

**检测中**:
- "检测中" 蓝色徽章
- 眼睛图标
- "等待游戏开始" 提示
- 游戏客户端状态

**待机中**:
- "待机中" 灰色徽章
- "启动游戏后自动检测" 提示

#### 快速统计
- 今日录制局数

### 数据结构

```typescript
type PanelStatus = 'idle' | 'detecting' | 'recording';

interface MiniPanelState {
  status: PanelStatus;
  recordingTime: number;     // 秒
  fileSize: string;          // GB
  fps: number;
  todayCount: number;
}
```

### 交互特性
- 拖拽移动位置
- 双击最大化（回到主界面）
- 实时状态更新
- 计时器动画
- 半透明背景

---

## 状态流转图

```
应用启动
    ↓
[Idle] 待机中
    ↓ (检测到游戏客户端)
[Detecting] 检测中
    ↓ (进入对局)
[Recording] 录制中
    ↓ (游戏结束 / 手动停止)
[Detecting] 检测中 → 保存文件
    ↓
循环...
```

---

## 错误码规范

### 系统错误 (E001-E099)
- **E001**: WebSocket 连接中断
- **E002**: OBS Runtime 启动失败
- **E003**: 编码器初始化失败

### 录制错误 (E100-E199)
- **E100**: 录制启动失败
- **E101**: 录制中断
- **E102**: 文件保存失败

### 检测错误 (E200-E299)
- **E200**: 游戏进程检测失败
- **E201**: API 连接超时

### 警告 (W001-W999)
- **W001**: 磁盘空间不足
- **W002**: 录制异常结束
- **W003**: 编码性能不足

---

## 文案规范

### 状态描述
- **Idle**: "待机中" / "未检测到游戏"
- **Detecting**: "检测中" / "等待进入对局"
- **Recording**: "录制中" / "正在录制"
- **Success**: "已保存" / "录制成功"
- **Error**: "错误" / "异常结束"

### 按钮文案
- 主要操作: "保存" / "开始录制" / "停止录制"
- 次要操作: "取消" / "返回" / "跳过"
- 危险操作: "删除" / "清空" / "重置"

### 提示信息
- 成功: "保存成功" / "配置已更新"
- 错误: "保存失败" / "连接超时"
- 警告: "磁盘空间不足" / "建议重启"
- 信息: "请稍候..." / "正在加载"

---

## 数据持久化

### LocalStorage 存储
```typescript
// 用户配置
localStorage.setItem('uniquerecord_config', JSON.stringify(config));

// 录制历史（最近50条）
localStorage.setItem('uniquerecord_history', JSON.stringify(sessions));

// 统计数据
localStorage.setItem('uniquerecord_stats', JSON.stringify(stats));
```

### 文件系统
- 录制视频: `{savePath}/{YYYY-MM-DD_HHmmss}.mp4`
- 日志文件: `{appData}/UniqueRecord/logs/`
- 配置文件: `{appData}/UniqueRecord/config.json`

---

## API 接口（假定）

### OBS WebSocket
```typescript
// 开始录制
ws.send({ requestType: 'StartRecord' });

// 停止录制
ws.send({ requestType: 'StopRecord' });

// 获取状态
ws.send({ requestType: 'GetRecordStatus' });
```

### 游戏检测
```typescript
// 检测游戏进程
getGameProcess(): GameProcess | null

// 监听游戏状态
onGameStateChange(callback: (state: GameState) => void)
```

---

**规格说明版本**: v1.0.0  
**最后更新**: 2026-03-02

完整的页面功能规格说明，涵盖所有7个主要页面的数据结构、交互逻辑和状态管理。
