param(
  [string]$TargetProject = (Get-Location).Path,
  [string]$KitDir = ''
)

$ErrorActionPreference = 'Stop'
$Installer = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'install-project.ps1'
& $Installer -TargetProject $TargetProject -KitDir $KitDir
exit $LASTEXITCODE
