param(
  [string]$HubUrl = "https://appdoers-hub-two.vercel.app",
  [string]$CursorToken = ""
)

$ErrorActionPreference = "Stop"

$KitDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CrmRoot = Split-Path -Parent $KitDir
$cliPath = Join-Path $CrmRoot "tools\hub-workflow-cli.mjs"
$envDir = Join-Path $env:USERPROFILE ".appdoers"
$envFile = Join-Path $envDir "hub.env"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is required. Install Node.js 18+ and run again."
}

if (-not (Test-Path $cliPath)) {
  throw "Hub CLI not found at $cliPath — run hub-cursor-kit\install.ps1 first."
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

Push-Location $CrmRoot
try {
  Write-Host ""
  Write-Host "Running smoke test: node tools/hub-workflow-cli.mjs verify-setup"
  node $cliPath verify-setup
  if ($LASTEXITCODE -ne 0) {
    throw "Hub smoke test failed. Check APPDOERS_HUB_URL and APPDOERS_CURSOR_TOKEN."
  }
  Write-Host ""
  Write-Host "Setup complete. Open a project in Cursor and start an agent chat."
} finally {
  Pop-Location
}
