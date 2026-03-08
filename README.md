# UniqueRecord

UniqueRecord is a Windows desktop recorder built for game sessions. The current product scope focuses on automatically detecting and recording League of Legends matches, then saving completed videos to the user's configured library.

[中文说明 / Chinese README](README.zh-CN.md)

## Install

Install UniqueRecord from the official website:

- Website: `https://uniquerecord.com`
- Download page: `https://uniquerecord.com/download`

The recommended installation flow is:

1. Open the download page.
2. Download the latest Windows installer.
3. Run the installer and choose an install path.
4. Launch UniqueRecord from the installed application.

## Current Scope

- Windows desktop application with embedded local UI
- Automatic League of Legends match detection
- Automatic recording start/stop around a match
- Local video management and playback
- Chinese and English UI support
- Windows installer distribution

## AI Direction

UniqueRecord is planned to evolve into an AI-native recording platform, not just a recorder.

Future AI capabilities will include:

- automatic highlight extraction from each recording
- speech-to-text focused on human voice in recordings
- text search to jump directly to matching moments in a video
- intelligent multi-clip montage generation
- semantic indexing for faster review and reuse of recorded content

The long-term goal is for every recording to become structured, searchable, and editable through AI-assisted workflows.

## Tech Stack

- Python backend and desktop runtime in `src/unique_record`
- React + Vite frontend in `design/figma/fluent_v1`
- Native Windows capture host in `runtime/windows_capture/host/UniqueRecord.CaptureHost`
- Inno Setup installer scripts in `installer`
- Website and download page in `website`

## Development

Requirements:

- Windows 10/11
- Python 3.12+
- Node.js 18+
- .NET SDK 10
- Inno Setup 6

Local development:

```powershell
cd .\design\figma\fluent_v1
npm install
npm run build
cd ..\..\..
python -m pip install -r .\requirements-desktop.txt
python .\scripts\run_desktop_app.py
```

Build desktop package:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build_windows_desktop.ps1
```

Build installer:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build_windows_installer.ps1
```
