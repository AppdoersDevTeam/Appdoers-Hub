# One-time Cursor + Hub setup for any laptop.
# Does not require Appdoers CRM (or this kit) on disk.
# Get your token from Hub -> My Account -> Cursor setup, then run this script.

param(
  [string]$HubUrl = "https://hub.appdoers.co.nz",
  [string]$CursorToken = ""
)

$ErrorActionPreference = "Stop"

$GitHubBase = "https://raw.githubusercontent.com/AppdoersDevTeam/Appdoers-Hub/master/hub-cursor-kit"
$envDir = Join-Path $env:USERPROFILE ".appdoers"
$envFile = Join-Path $envDir "hub.env"
$scriptDir = $PSScriptRoot

function Test-HubCliPair([string]$CliPath) {
  if (-not $CliPath -or -not (Test-Path $CliPath)) { return $false }
  $dir = Split-Path -Parent $CliPath
  return (Test-Path (Join-Path $dir "hub-ticket-time.mjs"))
}

function Find-OrDownloadHubCli {
  $candidates = @(
    (Join-Path $scriptDir "hub-workflow-cli.mjs"),
    (Join-Path (Get-Location).Path "tools\hub-workflow-cli.mjs")
  )

  $current = (Get-Location).Path
  while ($true) {
    $candidates += @(
      (Join-Path $current "tools\hub-workflow-cli.mjs"),
      (Join-Path $current "Appdoers CRM\tools\hub-workflow-cli.mjs"),
      (Join-Path $current "hub-cursor-kit\hub-workflow-cli.mjs")
    )
    $parent = Split-Path -Parent $current
    if (-not $parent -or $parent -eq $current) { break }
    $current = $parent
  }

  foreach ($cli in $candidates) {
    if (Test-HubCliPair $cli) {
      return (Resolve-Path $cli).Path
    }
  }

  $downloadDir = Join-Path $env:TEMP "appdoers-hub-kit"
  New-Item -ItemType Directory -Force -Path $downloadDir | Out-Null
  Write-Host "Downloading Hub CLI from GitHub..."
  Invoke-WebRequest -Uri "$GitHubBase/hub-workflow-cli.mjs" -OutFile (Join-Path $downloadDir "hub-workflow-cli.mjs") -UseBasicParsing
  Invoke-WebRequest -Uri "$GitHubBase/hub-ticket-time.mjs" -OutFile (Join-Path $downloadDir "hub-ticket-time.mjs") -UseBasicParsing
  return (Join-Path $downloadDir "hub-workflow-cli.mjs")
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is required. Install Node.js 18+ from https://nodejs.org and run again."
}

if (-not $CursorToken) {
  Write-Host ""
  Write-Host "Paste your token from Hub -> My Account -> Cursor setup"
  Write-Host ""
  $secureToken = Read-Host "Enter APPDOERS_CURSOR_TOKEN" -AsSecureString
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
  try {
    $CursorToken = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

if (-not $CursorToken) {
  throw "APPDOERS_CURSOR_TOKEN is required."
}

New-Item -ItemType Directory -Force -Path $envDir | Out-Null

$envContent = @(
  "APPDOERS_HUB_URL=$HubUrl"
  "APPDOERS_CURSOR_TOKEN=$CursorToken"
) -join [Environment]::NewLine

Set-Content -Path $envFile -Value $envContent -Encoding UTF8

Write-Host ""
Write-Host "Saved to your laptop only:"
Write-Host "  $envFile"
Write-Host ""
Write-Host "You never need to change this again on this computer."

$cliPath = Find-OrDownloadHubCli
Write-Host ""
Write-Host "Running smoke test: node hub-workflow-cli.mjs verify-setup"
node $cliPath verify-setup
if ($LASTEXITCODE -ne 0) {
  throw "Hub smoke test failed. Check APPDOERS_HUB_URL and APPDOERS_CURSOR_TOKEN."
}

Write-Host ""
Write-Host "Laptop Hub setup complete."
Write-Host "Next: open the project folder in Cursor and run the project install one-liner if tools\hub-workflow-cli.mjs is missing."
