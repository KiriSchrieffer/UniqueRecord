# Windows Desktop Build

This project can be packaged into a Windows desktop executable (`.exe`) with embedded UI and runtime API.

## Prerequisites

- Windows 10/11
- Python 3.11+ (same as project runtime)
- Node.js 20+ and npm
- No external OBS runtime is required
- Optional: .NET SDK 8.0+ (if you want to build `UniqueRecord.CaptureHost.exe`)

## One-command build

From project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build_windows_desktop.ps1
```

Build output:

- `dist/UniqueRecord/UniqueRecord.exe`

## Build script options

- Skip frontend build if `dist` is already prepared:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build_windows_desktop.ps1 -SkipFrontendBuild
```

- Choose Python executable:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build_windows_desktop.ps1 -PythonExe "py -3.12"
```

## Notes

- The desktop app entry is `scripts/run_desktop_app.py`.
- The packaged app hosts API routes locally and opens a native window via WebView.
- Windows native capture host skeleton source is under `runtime/windows_capture/host/`.
