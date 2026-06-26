# One-time Cursor + Hub setup for your laptop.
# Get your token from Hub -> My Account -> Cursor setup, then run this script.

param(
  [string]$HubUrl = "https://appdoers-hub-two.vercel.app",
  [string]$CursorToken = ""
)

$KitDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $KitDir "setup-hub-workflow.ps1") -HubUrl $HubUrl -CursorToken $CursorToken
