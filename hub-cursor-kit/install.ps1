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
Copy-Item (Join-Path $KitDir 'hub-session-start.mdc') (Join-Path $rulesDir 'hub-session-start.mdc') -Force
Copy-Item (Join-Path $KitDir 'hub-workflow-enforcement.mdc') (Join-Path $rulesDir 'hub-workflow-enforcement.mdc') -Force

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
Write-Host 'Done. Next steps:'
Write-Host '  1. Set APPDOERS_CURSOR_TOKEN in .env.local'
Write-Host '  2. node tools/hub-workflow-cli.mjs list-clients'
Write-Host '  3. node tools/hub-workflow-cli.mjs set-session --client-id <uuid> --project-id <uuid>'
