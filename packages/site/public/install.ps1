# midnite installer — Windows (x64)
#
#   irm https://midnite-app.vercel.app/install.ps1 | iex
#
# Downloads the latest NSIS installer and runs it silently, then launches the
# app. Equivalent to install.sh on macOS/Linux: one command, no manual
# double-click through Explorer required to get the app running.
#
# The installer is unsigned (see packages/desktop/electron-builder.yml), so a
# browser-downloaded copy carries Windows' "Mark of the Web" (an NTFS
# alternate-data-stream flag) and can trigger a SmartScreen "Windows protected
# your PC" prompt on first run — the exact same problem macOS's Gatekeeper
# quarantine causes for a browser-downloaded .dmg. `Unblock-File` strips that
# flag right after download, which is the direct Windows analogue of the
# `xattr -dr com.apple.quarantine` step in install.sh.
#
# Options (environment variables):
#   $env:MIDNITE_VERSION = "0.5.0"   install a specific version instead of latest
#   $env:MIDNITE_NO_OPEN = "1"       don't launch the app after installing

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'  # Invoke-WebRequest's own progress bar is slow over `irm | iex`

$Repo = 'bilo-io/midnite-app'

function Fail($Message) {
    Write-Host "error: $Message" -ForegroundColor Red
    exit 1
}

# Resolve the version via the GitHub API — a plain JSON response with a
# `tag_name` field, rather than following the releases/latest redirect (what
# install.sh does with curl): Invoke-WebRequest's redirect/exception handling
# differs enough between Windows PowerShell 5.1 and PowerShell 7 that the API
# route is the more portable choice here.
if ($env:MIDNITE_VERSION) {
    $Version = $env:MIDNITE_VERSION.TrimStart('v')
} else {
    try {
        $Release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -UseBasicParsing
    } catch {
        Fail "could not reach github.com to resolve the latest release: $_"
    }
    $Version = ([string]$Release.tag_name).TrimStart('v')
    if (-not $Version) { Fail "could not determine the latest version from the GitHub API response." }
}

$Asset = "midnite-$Version-x64.exe"
$Url = "https://github.com/$Repo/releases/download/v$Version/$Asset"
$Installer = Join-Path $env:TEMP $Asset

Write-Host "Downloading midnite v$Version ..."
try {
    Invoke-WebRequest -Uri $Url -OutFile $Installer -UseBasicParsing
} catch {
    Fail "download failed: $Url"
}

# Strip the Mark-of-the-Web before running it — see header comment.
Unblock-File -Path $Installer -ErrorAction SilentlyContinue

Write-Host "Installing ..."
# Unsigned one-click NSIS installer: /S runs it fully silently (no UI to click
# through) and installs per-user under %LOCALAPPDATA%\Programs\midnite — no
# admin elevation needed.
$Proc = Start-Process -FilePath $Installer -ArgumentList '/S' -Wait -PassThru
if ($Proc.ExitCode -ne 0) {
    Fail "installer exited with code $($Proc.ExitCode)"
}
Remove-Item -Path $Installer -ErrorAction SilentlyContinue

$InstallDir = Join-Path $env:LOCALAPPDATA 'Programs\midnite'
$Exe = Join-Path $InstallDir 'midnite.exe'

Write-Host ""
Write-Host "midnite v$Version installed." -ForegroundColor Green
if (Test-Path $Exe) {
    if (-not $env:MIDNITE_NO_OPEN) {
        Start-Process -FilePath $Exe
    } else {
        Write-Host "Launch it with: $Exe"
    }
} else {
    Write-Host "Installed, but couldn't find $Exe to launch it automatically — open midnite from the Start menu."
}
