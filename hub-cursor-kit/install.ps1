param(
  [string]$TargetProject = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
$KitDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TargetProject = (Resolve-Path $TargetProject).Path

$toolsDir = Join-Path $TargetProject 'tools'
$rulesDir = Join-Path $TargetProject '.cursor\rules'
$gitignorePath = Join-Path $TargetProject '.gitignore'

Write-Host "Installing Hub Cursor Kit into: $TargetProject"

New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
New-Item -ItemType Directory -Force -Path $rulesDir | Out-Null

Copy-Item (Join-Path $KitDir 'hub-workflow-cli.mjs') (Join-Path $toolsDir 'hub-workflow-cli.mjs') -Force
Copy-Item (Join-Path $KitDir 'hub-ticket-time.mjs') (Join-Path $toolsDir 'hub-ticket-time.mjs') -Force

$ruleFiles = @(
  'hub-session-start.mdc',
  'hub-workflow-enforcement.mdc',
  'hub-agent-behavior.mdc',
  'hub-project-map.mdc'
)
foreach ($rule in $ruleFiles) {
  Copy-Item (Join-Path $KitDir $rule) (Join-Path $rulesDir $rule) -Force
  Write-Host "  Installed rule: $rule"
}

$gitignoreLines = @('.hub-session.json', '.hub-ticket-time.json')
if (Test-Path $gitignorePath) {
  $gitignore = Get-Content $gitignorePath -Raw
  foreach ($line in $gitignoreLines) {
    if ($gitignore -notmatch [regex]::Escape($line)) {
      Add-Content -Path $gitignorePath -Value $line
      Write-Host "  Added to .gitignore: $line"
    }
  }
} else {
  Set-Content -Path $gitignorePath -Value ($gitignoreLines -join "`n")
  Write-Host '  Created .gitignore with Hub session files'
}

$envPath = Join-Path $TargetProject '.env.local'
if (-not (Test-Path $envPath)) {
  @(
    'APPDOERS_HUB_URL=https://appdoers-hub-two.vercel.app',
    'APPDOERS_CURSOR_TOKEN=your_token_here'
  ) | Set-Content -Path $envPath
  Write-Host '  Created .env.local template — add your APPDOERS_CURSOR_TOKEN'
} else {
  Write-Host '  .env.local already exists — skipped'
}

Write-Host ''
Write-Host 'Running verify-setup...'
Push-Location $TargetProject
try {
  node (Join-Path $toolsDir 'hub-workflow-cli.mjs') verify-setup
  if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host 'Install complete, but verify-setup failed. Set APPDOERS_CURSOR_TOKEN in .env.local (or parent .env.hub) and run:'
    Write-Host "  node tools/hub-workflow-cli.mjs verify-setup"
  } else {
    Write-Host ''
    Write-Host 'Install complete. Hub Cursor Kit is ready.'
  }
} catch {
  Write-Host ''
  Write-Host 'Install complete. Run verify-setup after setting your token:'
  Write-Host "  node tools/hub-workflow-cli.mjs verify-setup"
} finally {
  Pop-Location
}

Write-Host ''
Write-Host 'Next steps:'
Write-Host '  1. Hub → My Account → Cursor setup → Generate token'
Write-Host '  2. Copy .env block into Appdoers Work\.env.hub (or run tools\setup-hub-workflow.ps1)'
Write-Host '  3. Open a new Cursor agent chat — it will ask for client, project, and team member'
