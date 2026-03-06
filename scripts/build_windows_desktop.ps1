param(
    [string]$PythonExe = "python",
    [switch]$SkipFrontendBuild,
    [switch]$SkipCaptureHostBuild
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [scriptblock]$Action
    )

    Write-Host "==> $Name"
    & $Action
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE"
    }
}

if (-not $SkipFrontendBuild) {
    Push-Location "design/figma/fluent_v1"
    try {
        Invoke-Step -Name "npm install" -Action { npm install }
        Invoke-Step -Name "npm run build" -Action { npm run build }
    } finally {
        Pop-Location
    }
}

if (-not $SkipCaptureHostBuild) {
    Invoke-Step -Name "build capture host (self-contained)" -Action {
        & powershell -ExecutionPolicy Bypass -File ".\scripts\build_windows_capture_host.ps1"
    }
}

Invoke-Step -Name "prepare runtime package" -Action {
    $runtimeSourceRoot = Join-Path $ProjectRoot "runtime"
    $captureSourceRoot = Join-Path $runtimeSourceRoot "windows_capture"
    if (-not (Test-Path (Join-Path $captureSourceRoot "UniqueRecord.CaptureHost.exe"))) {
        throw "Missing capture host executable: runtime/windows_capture/UniqueRecord.CaptureHost.exe"
    }

    $runtimeStageRoot = Join-Path $ProjectRoot "build/runtime_package"
    $runtimeStageDir = Join-Path $runtimeStageRoot "runtime"
    $captureStageRoot = Join-Path $runtimeStageDir "windows_capture"

    if (Test-Path $runtimeStageRoot) {
        Remove-Item $runtimeStageRoot -Recurse -Force
    }

    New-Item -ItemType Directory -Path $runtimeStageDir | Out-Null
    New-Item -ItemType Directory -Path $captureStageRoot | Out-Null

    $runtimeReadme = Join-Path $runtimeSourceRoot "README.md"
    if (Test-Path $runtimeReadme) {
        Copy-Item $runtimeReadme $runtimeStageDir -Force
    }

    Get-ChildItem $captureSourceRoot -Force `
        | Where-Object { $_.Name -ne "host" } `
        | Copy-Item -Destination $captureStageRoot -Recurse -Force

    $removeLocales = @("cs", "de", "es", "fr", "it", "ja", "ko", "pl", "pt-BR", "ru", "tr")
    foreach ($locale in $removeLocales) {
        $localeDir = Join-Path $captureStageRoot $locale
        if (Test-Path $localeDir) {
            Remove-Item $localeDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    Get-ChildItem $captureStageRoot -Recurse -File -Filter "*.pdb" -ErrorAction SilentlyContinue `
        | Remove-Item -Force -ErrorAction SilentlyContinue

    $screenRecorderXml = Join-Path $captureStageRoot "ScreenRecorderLib.xml"
    if (Test-Path $screenRecorderXml) {
        Remove-Item $screenRecorderXml -Force -ErrorAction SilentlyContinue
    }
}

Invoke-Step -Name "pip install desktop deps" -Action {
    & $PythonExe -m pip install -r requirements-desktop.txt
}

Invoke-Step -Name "generate app icon (Logo I)" -Action {
    & $PythonExe scripts/generate_logo_i_icon.py
}

$PyInstallerWorkPath = "build/pyinstaller_$((Get-Date).ToString('yyyyMMdd_HHmmss'))"
$RuntimeAddDataSpec = (Join-Path $ProjectRoot "build/runtime_package/runtime") + ";runtime"

Invoke-Step -Name "pyinstaller" -Action {
    & $PythonExe -m PyInstaller `
        --noconfirm `
        --clean `
        --workpath "$PyInstallerWorkPath" `
        --name "UniqueRecord" `
        --windowed `
        --icon "assets/branding/unique_record_logo_i.ico" `
        --add-data "src;src" `
        --add-data "configs;configs" `
        --add-data "$RuntimeAddDataSpec" `
        --add-data "design/figma/fluent_v1/dist;design/figma/fluent_v1/dist" `
        --hidden-import "webview.platforms.edgechromium" `
        scripts/run_desktop_app.py
}

Write-Host ""
Write-Host "Build completed."
Write-Host "Executable: dist/UniqueRecord/UniqueRecord.exe"
