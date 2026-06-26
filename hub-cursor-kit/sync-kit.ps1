param()

$ErrorActionPreference = 'Stop'
$KitDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CrmRoot = Split-Path -Parent $KitDir
$WorkspaceRoot = Split-Path -Parent $CrmRoot

$targets = @(
  @{ Tools = Join-Path $CrmRoot 'tools'; Rules = Join-Path $CrmRoot '.cursor\rules' },
  @{ Tools = Join-Path $WorkspaceRoot 'tools'; Rules = Join-Path $WorkspaceRoot '.cursor\rules' }
)

Write-Host "Syncing hub-cursor-kit from: $KitDir"

foreach ($target in $targets) {
  New-Item -ItemType Directory -Force -Path $target.Tools | Out-Null
  New-Item -ItemType Directory -Force -Path $target.Rules | Out-Null

  Copy-Item (Join-Path $KitDir 'hub-workflow-cli.mjs') (Join-Path $target.Tools 'hub-workflow-cli.mjs') -Force
  Copy-Item (Join-Path $KitDir 'hub-ticket-time.mjs') (Join-Path $target.Tools 'hub-ticket-time.mjs') -Force

  foreach ($rule in @('hub-session-start.mdc', 'hub-workflow-enforcement.mdc', 'hub-agent-behavior.mdc', 'hub-project-map.mdc')) {
    Copy-Item (Join-Path $KitDir $rule) (Join-Path $target.Rules $rule) -Force
  }

  Write-Host "  Synced to $($target.Tools)"
}

Write-Host 'Done. hub-cursor-kit is canonical; tools/ and .cursor/rules/ updated.'
