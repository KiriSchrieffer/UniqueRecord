param(
    [string]$Configuration = "Release",
    [string]$RuntimeId = "win-x64",
    [switch]$FrameworkDependent
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$ProjectPath = Join-Path $ProjectRoot "runtime\windows_capture\host\UniqueRecord.CaptureHost\UniqueRecord.CaptureHost.csproj"
$OutputDir = Join-Path $ProjectRoot "runtime\windows_capture"
$SelfContainedValue = if ($FrameworkDependent) { "false" } else { "true" }

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    throw ".NET SDK is required. Install it from https://aka.ms/dotnet-download"
}

$sdkList = dotnet --list-sdks
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace(($sdkList -join ""))) {
    throw ".NET SDK not found. Install SDK 8.0+ from https://aka.ms/dotnet-download"
}

if (-not (Test-Path $ProjectPath)) {
    throw "Capture host project not found: $ProjectPath"
}

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$preserve = @("README.md", "UniqueRecord.CaptureHost.cmd", "UniqueRecord.CaptureHost.ps1")
Get-ChildItem -Path $OutputDir -Directory -Force `
    | Where-Object { $_.Name -ne "host" } `
    | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $OutputDir -File -Force `
    | Where-Object { $preserve -notcontains $_.Name } `
    | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "==> dotnet publish capture host"
dotnet publish $ProjectPath `
    -c $Configuration `
    -r $RuntimeId `
    --self-contained $SelfContainedValue `
    -o $OutputDir

if ($LASTEXITCODE -ne 0) {
    throw "dotnet publish failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "Capture host build completed."
Write-Host "Self-contained: $SelfContainedValue"
Write-Host "Output: runtime/windows_capture/UniqueRecord.CaptureHost.exe"
