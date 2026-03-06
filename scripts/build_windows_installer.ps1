param(
    [string]$PythonExe = "python",
    [switch]$SkipDesktopBuild,
    [switch]$SkipFrontendBuild,
    [string]$InnoCompilerPath = ""
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

function Resolve-IsccPath {
    param(
        [string]$PreferredPath
    )

    if ($PreferredPath -and (Test-Path -LiteralPath $PreferredPath)) {
        return (Resolve-Path -LiteralPath $PreferredPath).Path
    }

    $cmd = Get-Command iscc.exe -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) {
        return $cmd.Source
    }

    $candidates = @(
        "$env:ProgramFiles(x86)\Inno Setup 6\ISCC.exe",
        "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
        "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
    )
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }
    return $null
}

if (-not $SkipDesktopBuild) {
    Invoke-Step -Name "build desktop package" -Action {
        if ($SkipFrontendBuild) {
            & powershell -ExecutionPolicy Bypass -File ".\scripts\build_windows_desktop.ps1" -PythonExe $PythonExe -SkipFrontendBuild
        } else {
            & powershell -ExecutionPolicy Bypass -File ".\scripts\build_windows_desktop.ps1" -PythonExe $PythonExe
        }
    }
}

if (-not (Test-Path -LiteralPath ".\dist\UniqueRecord\UniqueRecord.exe")) {
    throw "Desktop build output missing: dist/UniqueRecord/UniqueRecord.exe"
}

$isccPath = Resolve-IsccPath -PreferredPath $InnoCompilerPath
if (-not $isccPath) {
    throw "Inno Setup compiler not found. Install Inno Setup 6 or pass -InnoCompilerPath."
}

Invoke-Step -Name "compile installer" -Action {
    & $isccPath ".\installer\UniqueRecord.iss"
}

Write-Host ""
Write-Host "Installer build completed."
Write-Host "Output directory: dist_installer"
