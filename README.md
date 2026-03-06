# UniqueRecord

UniqueRecord 是一个 Windows 桌面录制软件项目，当前主要面向《英雄联盟》自动录制场景：检测到对局开始自动录制，对局结束自动停止并保存视频。

## 当前能力

- Windows 桌面程序（`pywebview` + 内嵌前端）
- 对局状态检测与自动录制流程
- 本地视频管理（历史、筛选、删除、内置播放器）
- 中英文界面切换
- Windows 安装器打包（Inno Setup）

## 技术结构

- 后端与业务逻辑：Python（`src/unique_record`）
- 桌面入口：`scripts/run_desktop_app.py`
- 前端 UI：React + Vite（`design/figma/fluent_v1`）
- 录制 Host：C#/.NET（`runtime/windows_capture/host/UniqueRecord.CaptureHost`）

## 开发环境要求

- Windows 10/11
- Python 3.12+
- Node.js 18+
- .NET SDK 10（用于构建 CaptureHost）
- Inno Setup 6（用于生成安装器）

## 本地开发启动

1. 安装前端依赖并构建：

```powershell
cd .\design\figma\fluent_v1
npm install
npm run build
cd ..\..\..
```

2. 安装 Python 依赖：

```powershell
python -m pip install -r .\requirements-desktop.txt
```

3. 启动桌面程序（开发模式）：

```powershell
python .\scripts\run_desktop_app.py
```

## 打包

1. 打包桌面程序（生成 `dist/UniqueRecord/UniqueRecord.exe`）：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build_windows_desktop.ps1
```

2. 打包安装器（生成到 `dist_installer`）：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build_windows_installer.ps1
```

## 主要目录

- `src/unique_record`：核心业务代码（检测、录制、会话索引、HTTP API）
- `design/figma/fluent_v1`：主 UI 工程
- `runtime/windows_capture/host/UniqueRecord.CaptureHost`：原生录制 Host 源码
- `scripts`：构建、运行、发布辅助脚本
- `installer`：Inno Setup 脚本
- `website`：官网静态页面与下载页
- `docs`：项目设计与开发文档

