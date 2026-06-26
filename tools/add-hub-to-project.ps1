param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectPath
)

$ErrorActionPreference = 'Stop'

$installer = Join-Path $PSScriptRoot '..\hub-cursor-kit\install-project.ps1'

if (-not (Test-Path $installer)) {
  throw "Installer not found at $installer"
}

& $installer -TargetProject $ProjectPath
exit $LASTEXITCODE
