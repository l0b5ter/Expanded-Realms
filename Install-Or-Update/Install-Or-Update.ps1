# Install-Or-Update.ps1
# Run via the .bat launcher below for easy double-click.

$ErrorActionPreference = "Stop"

# =========================
# CONFIG
# =========================
$RepoOwner = "l0b5ter"
$RepoName  = "Expanded-Realms"

$AssetName = "Expansion9.zip"     # asset in GitHub Release
$DlcFolderName = "Expansion9"     # folder inside the zip AND desired folder in Assets\DLC
$VersionFileName = "ERversion.json"

# Civ 5 detection
$GameFolderName = "Sid Meier's Civilization V"
$GameExeName    = "CivilizationV.exe"

Write-Host "=== Expanded Realms DLC Installer / Updater ===`n"

# -------------------------
# Helpers: Steam/Civ5 path
# -------------------------
function Get-SteamPath {
  $candidates = @(
    "${env:ProgramFiles(x86)}\Steam",
    "${env:ProgramFiles}\Steam"
  )
  foreach ($p in $candidates) {
    if (Test-Path $p) { return $p }
  }
  throw "Steam folder not found in Program Files. If Steam is installed elsewhere, edit Get-SteamPath()."
}

function Get-SteamLibraryPaths($steamPath) {
  $paths = New-Object System.Collections.Generic.List[string]
  $paths.Add($steamPath)

  $vdf = Join-Path $steamPath "steamapps\libraryfolders.vdf"
  if (-not (Test-Path $vdf)) { return $paths | Select-Object -Unique }

  $txt = Get-Content -Raw $vdf
  $matches = [regex]::Matches($txt, '"path"\s*"([^"]+)"')
  foreach ($m in $matches) {
    $paths.Add(($m.Groups[1].Value -replace '\\\\','\'))
  }

  return $paths | Select-Object -Unique
}

function Find-Civ5GameDir {
  $steam = Get-SteamPath
  $libs  = Get-SteamLibraryPaths $steam

  foreach ($lib in $libs) {
    $candidate = Join-Path $lib "steamapps\common\$GameFolderName"
    if (Test-Path (Join-Path $candidate $GameExeName)) {
      return $candidate
    }
  }
  throw "Could not find Civ 5 install folder. Make sure Civ 5 is installed via Steam."
}

# -------------------------
# Helpers: GitHub latest release
# -------------------------
function Get-LatestRelease {
  $api = "https://api.github.com/repos/$RepoOwner/$RepoName/releases/latest"
  $headers = @{
    "User-Agent" = "$RepoOwner-$RepoName-DLC-Installer"
    "Accept"     = "application/vnd.github+json"
  }
  return Invoke-RestMethod -Uri $api -Headers $headers -Method Get
}

function Get-ReleaseAssetUrl($release, $assetName) {
  $a = $release.assets | Where-Object { $_.name -eq $assetName } | Select-Object -First 1
  if (-not $a) {
    $names = ($release.assets | ForEach-Object { $_.name }) -join ", "
    throw "Asset '$assetName' not found in latest release. Assets present: $names"
  }
  return $a.browser_download_url
}

# -------------------------
# Helpers: parse ERversion.json (strict JSON)
# -------------------------
function Get-ErVersionFromFile($path) {
  if (-not (Test-Path $path)) { return $null }

  try {
    $obj = Get-Content -Raw $path | ConvertFrom-Json
    if ($null -ne $obj.version -and ($obj.version.ToString().Trim().Length -gt 0)) {
      return $obj.version.ToString().Trim()
    }
    return $null
  } catch {
    return $null
  }
}

# -------------------------
# Warn if Civ5 is running
# -------------------------
$running = tasklist /FI "IMAGENAME eq $GameExeName" 2>$null | Select-String $GameExeName -Quiet
if ($running) {
  Write-Host "[WARN] Civilization V appears to be running. Please close it before installing/updating.`n"
}

# -------------------------
# Main
# -------------------------
$gameDir = Find-Civ5GameDir
Write-Host "Found Civ 5 folder:`n  $gameDir`n"

$dlcRoot = Join-Path $gameDir "Assets\DLC"
if (-not (Test-Path $dlcRoot)) { throw "Missing Assets\DLC folder: $dlcRoot" }

$dlcDest = Join-Path $dlcRoot $DlcFolderName
$erVersionPath = Join-Path $dlcDest $VersionFileName

$installedVer = Get-ErVersionFromFile $erVersionPath
if ($installedVer) {
  Write-Host "Installed DLC version (from $VersionFileName): $installedVer"
} elseif (Test-Path $dlcDest) {
  Write-Host "Installed DLC folder exists, but couldn't read version from $VersionFileName."
} else {
  Write-Host "DLC not currently installed."
}

$release = Get-LatestRelease
$latestTag = ($release.tag_name).Trim()
Write-Host "Latest GitHub release tag: $latestTag"

if ($installedVer -and ($installedVer -eq $latestTag)) {
  Write-Host "`nAlready up to date. Nothing to do."
  exit 0
}

# Download latest zip
$url = Get-ReleaseAssetUrl $release $AssetName
Write-Host "`nDownloading latest package:`n  $url"

$tempDir = Join-Path $env:TEMP ("Civ5_" + $RepoName + "_Install")
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

$zipPath = Join-Path $tempDir $AssetName
Invoke-WebRequest -Uri $url -OutFile $zipPath
Write-Host "Download complete."

# Safety check BEFORE deleting: ensure zip contains Expansion9/ERversion.json
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $expected = ($DlcFolderName.TrimEnd('/') + "/" + $VersionFileName)
  $found = $false
  foreach ($e in $zip.Entries) {
    if ($e.FullName.Replace('\','/') -eq $expected) { $found = $true; break }
  }
  if (-not $found) {
    throw "Downloaded zip does not contain '$expected'. Aborting so we don't delete an existing install."
  }
} finally {
  $zip.Dispose()
}

# Delete old DLC folder (update behavior)
if (Test-Path $dlcDest) {
  Write-Host "`nRemoving old DLC folder:`n  $dlcDest"
  Remove-Item $dlcDest -Recurse -Force
}

# Extract zip to Assets\DLC
Write-Host "`nExtracting to:`n  $dlcRoot"
[System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $dlcRoot)

# Post-check
$newVer = Get-ErVersionFromFile (Join-Path (Join-Path $dlcRoot $DlcFolderName) $VersionFileName)
if ($newVer) {
  Write-Host "`nInstalled DLC version after update: $newVer"
  if ($newVer -ne $latestTag) {
    Write-Host "[WARN] Version mismatch: ERversion.json says '$newVer' but latest release tag is '$latestTag'."
    Write-Host "       (Keep ERversion.json and the GitHub tag in sync for clean updates.)"
  }
} else {
  Write-Host "`n[WARN] Could not read $VersionFileName after extraction. Check your zip contents."
}

Write-Host "`n[DONE] Installation/update complete."
Write-Host "Launch Civ 5 normally (no Mods menu needed)."

# Cleanup
try { Remove-Item $tempDir -Recurse -Force } catch {}
