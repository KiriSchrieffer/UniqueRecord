# UniqueRecord

UniqueRecord 是一个 Windows 桌面录制软件项目，当前阶段聚焦于《英雄联盟》对局的自动识别与自动录制：检测到一局游戏开始后自动开始录制，对局结束后自动停止，并将视频保存到用户配置的目录中。

[English README](README.md)

## 安装方式

请通过官网下载安装包进行安装：

- 官网：`https://uniquerecord.com`
- 下载页：`https://uniquerecord.com/download`

推荐安装流程：

1. 打开下载页。
2. 下载最新的 Windows 安装器。
3. 运行安装器并选择安装路径。
4. 安装完成后启动 UniqueRecord。

## 当前范围

- Windows 桌面程序，内置本地 UI
- 英雄联盟对局自动检测
- 对局开始/结束时自动开始与停止录制
- 本地视频管理与播放器
- 中英文界面切换
- Windows 安装包分发

## AI 发展方向

UniqueRecord 后续不只是录制工具，而是会与 AI 深度结合，围绕每条录像做智能后期处理。

规划中的 AI 功能包括：

- 自动提取每条录像中的精彩片段
- 智能识别人声并转写为文字
- 支持通过文字搜索快速定位录像中的具体位置
- 智能组合多个视频片段生成集锦
- 为录像建立可搜索、可复用的语义索引

长期目标是让每条录像都不只是一个视频文件，而是一份可检索、可编辑、可再创作的智能内容资产。

## 技术结构

- Python 后端与桌面运行逻辑：`src/unique_record`
- React + Vite 前端：`design/figma/fluent_v1`
- Windows 原生录制 Host：`runtime/windows_capture/host/UniqueRecord.CaptureHost`
- 安装器脚本：`installer`
- 官网与下载页：`website`

## 开发

环境要求：

- Windows 10/11
- Python 3.12+
- Node.js 18+
- .NET SDK 10
- Inno Setup 6

本地开发启动：

```powershell
cd .\design\figma\fluent_v1
npm install
npm run build
cd ..\..\..
python -m pip install -r .\requirements-desktop.txt
python .\scripts\run_desktop_app.py
```

打包桌面程序：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build_windows_desktop.ps1
```

打包安装器：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build_windows_installer.ps1
```
