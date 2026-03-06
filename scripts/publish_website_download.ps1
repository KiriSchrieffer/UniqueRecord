param(
    [string]$WebsiteRoot = ".\website",
    [string]$InstallerPath = "",
    [switch]$NoCopyInstaller,
    [string]$Version = "1.0.0"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$resolvedWebsiteRoot = (Resolve-Path $WebsiteRoot).Path
$downloadsDir = Join-Path $resolvedWebsiteRoot "downloads"
if (-not (Test-Path $downloadsDir)) {
    New-Item -ItemType Directory -Path $downloadsDir | Out-Null
}

if ([string]::IsNullOrWhiteSpace($InstallerPath)) {
    $latestInstaller = Get-ChildItem ".\dist_installer" -File -Filter "UniqueRecord_Setup_*.exe" `
        | Sort-Object LastWriteTime -Descending `
        | Select-Object -First 1
    if (-not $latestInstaller) {
        throw "No installer found in dist_installer."
    }
    $installerFile = $latestInstaller
} else {
    if (-not (Test-Path $InstallerPath)) {
        throw "InstallerPath does not exist: $InstallerPath"
    }
    $installerFile = Get-Item $InstallerPath
}

$targetInstallerName = $installerFile.Name
$targetInstallerPath = Join-Path $downloadsDir $targetInstallerName

if (-not $NoCopyInstaller) {
    Copy-Item $installerFile.FullName $targetInstallerPath -Force
} elseif (-not (Test-Path $targetInstallerPath)) {
    throw "Installer file does not exist in website downloads: $targetInstallerPath"
}

$hash = (Get-FileHash $targetInstallerPath -Algorithm SHA256).Hash.ToLower()
$fileInfo = Get-Item $targetInstallerPath

$manifest = [ordered]@{
    version = $Version
    file_name = $targetInstallerName
    url = "/downloads/$targetInstallerName"
    size_bytes = $fileInfo.Length
    sha256 = $hash
    published_at = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz")
    notes = @(
        "Built-in Windows native recorder runtime (ready after install)",
        "Automatic match detection and recording for League of Legends",
        "Configurable recordings folder and recording history management"
    )
}

$manifestPath = Join-Path $downloadsDir "latest.json"
$manifest | ConvertTo-Json -Depth 4 | Set-Content $manifestPath -Encoding UTF8

Write-Host "Published website download metadata."
Write-Host "Installer: $targetInstallerPath"
Write-Host "Manifest:  $manifestPath"
