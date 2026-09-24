# Back-compat wrapper. Laptop setup lives in setup-my-cursor-token.ps1
# and works without Appdoers CRM on disk.

param(
  [string]$HubUrl = "https://hub.appdoers.co.nz",
  [string]$CursorToken = ""
)

$ErrorActionPreference = "Stop"

$setupScript = Join-Path $PSScriptRoot "setup-my-cursor-token.ps1"
if (Test-Path $setupScript) {
  & $setupScript -HubUrl $HubUrl -CursorToken $CursorToken
  exit $LASTEXITCODE
}

$remote = "https://raw.githubusercontent.com/AppdoersDevTeam/Appdoers-Hub/master/hub-cursor-kit/setup-my-cursor-token.ps1"
$local = Join-Path $env:TEMP "setup-token.ps1"
Write-Host "Local token setup script not found - downloading from GitHub..."
Invoke-WebRequest -Uri $remote -OutFile $local -UseBasicParsing
& $local -HubUrl $HubUrl -CursorToken $CursorToken
exit $LASTEXITCODE
