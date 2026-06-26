param(
  [string]$TargetProject = (Get-Location).Path,
  [string]$KitDir = ''
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$GitHubBase = 'https://raw.githubusercontent.com/AppdoersDevTeam/Appdoers-Hub/master/hub-cursor-kit'
$KitFileNames = @(
  'hub-workflow-cli.mjs',
  'hub-ticket-time.mjs',
  'hub-session-start.mdc',
  'hub-workflow-enforcement.mdc',
  'hub-agent-behavior.mdc',
  'hub-project-map.mdc'
)

function Test-HubKitDir([string]$Path) {
  if (-not $Path -or -not (Test-Path $Path)) { return $false }
  return (Test-Path (Join-Path $Path 'hub-workflow-cli.mjs')) -and
    (Test-Path (Join-Path $Path 'hub-ticket-time.mjs'))
}

function Find-LocalHubKitDir {
  param([string]$StartDir)

  if ($env:APPDOERS_HUB_KIT_DIR -and (Test-HubKitDir $env:APPDOERS_HUB_KIT_DIR)) {
    return (Resolve-Path $env:APPDOERS_HUB_KIT_DIR).Path
  }

  $scriptKitDir = $ScriptDir
  if (Test-HubKitDir $scriptKitDir) {
    return (Resolve-Path $scriptKitDir).Path
  }

  $current = (Resolve-Path $StartDir).Path
  while ($true) {
    $candidates = @(
      (Join-Path $current 'Appdoers CRM\hub-cursor-kit'),
      (Join-Path $current 'hub-cursor-kit')
    )
    foreach ($candidate in $candidates) {
      if (Test-HubKitDir $candidate) {
        return (Resolve-Path $candidate).Path
      }
    }
    $parent = Split-Path -Parent $current
    if (-not $parent -or $parent -eq $current) { break }
    $current = $parent
  }

  return $null
}

function Download-HubKit([string]$Destination) {
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  foreach ($file in $KitFileNames) {
    $url = "$GitHubBase/$file"
    $out = Join-Path $Destination $file
    Write-Host "  Downloading $file"
    Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
  }
}

$TargetProject = (Resolve-Path $TargetProject).Path
$resolvedKitDir = if ($KitDir) { $KitDir } else { Find-LocalHubKitDir -StartDir $TargetProject }

if (-not (Test-HubKitDir $resolvedKitDir)) {
  $resolvedKitDir = Join-Path $env:TEMP 'appdoers-hub-kit'
  Write-Host ('Local kit not found - downloading from GitHub to ' + $resolvedKitDir)
  Download-HubKit -Destination $resolvedKitDir
} else {
  $resolvedKitDir = (Resolve-Path $resolvedKitDir).Path
  Write-Host "Using kit from: $resolvedKitDir"
}

$toolsDir = Join-Path $TargetProject 'tools'
$rulesDir = Join-Path $TargetProject '.cursor\rules'
$gitignorePath = Join-Path $TargetProject '.gitignore'

Write-Host "Installing Hub Cursor Kit into: $TargetProject"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js 18+ is required.'
}

New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
New-Item -ItemType Directory -Force -Path $rulesDir | Out-Null

Copy-Item (Join-Path $resolvedKitDir 'hub-workflow-cli.mjs') (Join-Path $toolsDir 'hub-workflow-cli.mjs') -Force
Copy-Item (Join-Path $resolvedKitDir 'hub-ticket-time.mjs') (Join-Path $toolsDir 'hub-ticket-time.mjs') -Force

$ruleFiles = @(
  'hub-session-start.mdc',
  'hub-workflow-enforcement.mdc',
  'hub-agent-behavior.mdc',
  'hub-project-map.mdc'
)
foreach ($rule in $ruleFiles) {
  Copy-Item (Join-Path $resolvedKitDir $rule) (Join-Path $rulesDir $rule) -Force
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

Write-Host ''
Write-Host 'Running verify-setup...'
Push-Location $TargetProject
try {
  node (Join-Path $toolsDir 'hub-workflow-cli.mjs') verify-setup
  if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host 'Project files installed, but laptop token is missing or invalid.'
    Write-Host 'Run laptop setup once:'
    Write-Host '  powershell -ExecutionPolicy Bypass -File "Appdoers CRM\hub-cursor-kit\setup-my-cursor-token.ps1"'
    Write-Host 'Or download:'
    $setupUrl = $GitHubBase + '/setup-my-cursor-token.ps1'
    Write-Host ('  irm ' + $setupUrl + ' -OutFile $env:TEMP\setup-token.ps1; & $env:TEMP\setup-token.ps1')
    exit 1
  }
  Write-Host ''
  Write-Host 'Hub Cursor Kit ready. Open this folder in Cursor and start an agent chat.'
} finally {
  Pop-Location
}
