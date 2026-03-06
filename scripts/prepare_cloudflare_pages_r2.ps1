param(
    [string]$WebsiteRoot = ".\website",
    [string]$InstallerPath = "",
    [string]$Version = "1.0.0",
    [string]$PagesOutputRoot = ".\build\cloudflare_pages_upload",
    [string]$R2OutputRoot = ".\build\cloudflare_r2_upload",
    [string]$R2ObjectPrefix = "downloads",
    [string]$R2PublicBaseUrl = "https://download.uniquerecord.com"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Resolve-OrCreatePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PathValue
    )
    if (Test-Path -LiteralPath $PathValue) {
        return (Resolve-Path -LiteralPath $PathValue).Path
    }
    New-Item -ItemType Directory -Path $PathValue -Force | Out-Null
    return (Resolve-Path -LiteralPath $PathValue).Path
}

function Resolve-InstallerFile {
    param(
        [string]$PathValue
    )
    if (-not [string]::IsNullOrWhiteSpace($PathValue)) {
        if (-not (Test-Path -LiteralPath $PathValue)) {
            throw "InstallerPath does not exist: $PathValue"
        }
        return Get-Item -LiteralPath $PathValue
    }

    $latestInstaller = Get-ChildItem ".\dist_installer" -File -Filter "UniqueRecord_Setup_*.exe" `
        | Sort-Object LastWriteTime -Descending `
        | Select-Object -First 1
    if (-not $latestInstaller) {
        throw "No installer found in dist_installer."
    }
    return $latestInstaller
}

function Write-Utf8NoBom {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$Content
    )
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

$resolvedWebsiteRoot = (Resolve-Path -LiteralPath $WebsiteRoot).Path
$resolvedPagesOutputRoot = Resolve-OrCreatePath -PathValue $PagesOutputRoot
$resolvedR2OutputRoot = Resolve-OrCreatePath -PathValue $R2OutputRoot
$installerFile = Resolve-InstallerFile -PathValue $InstallerPath

$normalizedPrefix = $R2ObjectPrefix.Trim().Trim("/").Trim("\")
if ([string]::IsNullOrWhiteSpace($normalizedPrefix)) {
    throw "R2ObjectPrefix must not be empty."
}

$normalizedPublicBase = $R2PublicBaseUrl.Trim().TrimEnd("/")
if ([string]::IsNullOrWhiteSpace($normalizedPublicBase)) {
    throw "R2PublicBaseUrl must not be empty."
}

$pagesRoot = Join-Path $resolvedPagesOutputRoot "website"
$r2Root = Join-Path $resolvedR2OutputRoot $normalizedPrefix
$pagesDownloadsDir = Join-Path $pagesRoot "downloads"

if (Test-Path -LiteralPath $pagesRoot) {
    Remove-Item -LiteralPath $pagesRoot -Recurse -Force
}
if (Test-Path -LiteralPath $r2Root) {
    Remove-Item -LiteralPath $r2Root -Recurse -Force
}

New-Item -ItemType Directory -Path $pagesRoot -Force | Out-Null
New-Item -ItemType Directory -Path $r2Root -Force | Out-Null

# Copy website while excluding installer binaries from downloads.
Get-ChildItem -LiteralPath $resolvedWebsiteRoot -Force | ForEach-Object {
    $srcItem = $_
    $targetPath = Join-Path $pagesRoot $srcItem.Name
    if ($srcItem.PSIsContainer) {
        if ($srcItem.Name -ieq "downloads") {
            New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
            Get-ChildItem -LiteralPath $srcItem.FullName -File -Force -ErrorAction SilentlyContinue | ForEach-Object {
                if ($_.Extension -ieq ".exe") {
                    return
                }
                Copy-Item -LiteralPath $_.FullName -Destination $targetPath -Force
            }
        } else {
            Copy-Item -LiteralPath $srcItem.FullName -Destination $pagesRoot -Recurse -Force
        }
    } else {
        Copy-Item -LiteralPath $srcItem.FullName -Destination $targetPath -Force
    }
}

New-Item -ItemType Directory -Path $pagesDownloadsDir -Force | Out-Null

$r2InstallerPath = Join-Path $r2Root $installerFile.Name
Copy-Item -LiteralPath $installerFile.FullName -Destination $r2InstallerPath -Force

$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $r2InstallerPath).Hash.ToLower()
$fileInfo = Get-Item -LiteralPath $r2InstallerPath
$installerUrl = "$normalizedPublicBase/$normalizedPrefix/$($installerFile.Name)"

$manifest = [ordered]@{
    version = $Version
    file_name = $installerFile.Name
    url = $installerUrl
    size_bytes = $fileInfo.Length
    sha256 = $hash
    published_at = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz")
    notes = @(
        "Built-in Windows native recorder runtime (ready after install)",
        "Automatic match detection and recording for League of Legends",
        "Configurable recordings folder and recording history management"
    )
}

$manifestJson = $manifest | ConvertTo-Json -Depth 4

$pagesManifestPath = Join-Path $pagesDownloadsDir "latest.json"
$r2ManifestPath = Join-Path $r2Root "latest.json"

Write-Utf8NoBom -Path $pagesManifestPath -Content $manifestJson
Write-Utf8NoBom -Path $r2ManifestPath -Content $manifestJson

# Keep repository website folder upload-safe for Cloudflare Pages manual upload.
$websiteDownloadsDir = Join-Path $resolvedWebsiteRoot "downloads"
New-Item -ItemType Directory -Path $websiteDownloadsDir -Force | Out-Null
Write-Utf8NoBom -Path (Join-Path $websiteDownloadsDir "latest.json") -Content $manifestJson
Get-ChildItem -LiteralPath $websiteDownloadsDir -File -Filter "*.exe" -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        Remove-Item -LiteralPath $_.FullName -Force
    } catch {
        Write-Warning "Failed to remove local website installer copy: $($_.FullName) | $($_.Exception.Message)"
    }
}

Write-Host "Prepared Cloudflare release artifacts."
Write-Host "Pages upload root: $pagesRoot"
Write-Host "R2 upload root:    $r2Root"
Write-Host "Installer file:    $r2InstallerPath"
Write-Host "Manifest (Pages):  $pagesManifestPath"
Write-Host "Manifest (R2):     $r2ManifestPath"
Write-Host "Public URL:        $installerUrl"
