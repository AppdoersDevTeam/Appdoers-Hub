#!/usr/bin/env bash
set -euo pipefail

echo "Appdoers Hub — laptop token setup"
echo "Requires Node.js 18+."
echo ""
echo "1. Hub -> My Account -> Cursor setup -> Generate token"
echo "2. This script will save APPDOERS_HUB_URL and APPDOERS_CURSOR_TOKEN to ~/.appdoers/hub.env"
echo ""

HUB_URL_DEFAULT="https://hub.appdoers.co.nz"
read -r -p "Hub URL [$HUB_URL_DEFAULT]: " HUB_URL
HUB_URL="${HUB_URL:-$HUB_URL_DEFAULT}"
HUB_URL="${HUB_URL%/}"

read -r -p "Paste your Cursor token: " TOKEN
if [[ -z "$TOKEN" ]]; then
  echo "Token is required."
  exit 1
fi

mkdir -p "$HOME/.appdoers"
cat > "$HOME/.appdoers/hub.env" <<EOF
APPDOERS_HUB_URL=$HUB_URL
APPDOERS_CURSOR_TOKEN=$TOKEN
EOF
chmod 600 "$HOME/.appdoers/hub.env"

echo ""
echo "Saved to $HOME/.appdoers/hub.env"
echo "Open your project in Cursor and start a new Agent chat."
