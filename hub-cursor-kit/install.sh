#!/usr/bin/env bash
set -euo pipefail

TARGET_PROJECT="${1:-$(pwd)}"
TARGET_PROJECT="$(cd "$TARGET_PROJECT" && pwd)"
KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TOOLS_DIR="$TARGET_PROJECT/tools"
RULES_DIR="$TARGET_PROJECT/.cursor/rules"
GITIGNORE_PATH="$TARGET_PROJECT/.gitignore"

echo "Installing Hub Cursor Kit into: $TARGET_PROJECT"

mkdir -p "$TOOLS_DIR" "$RULES_DIR"

cp "$KIT_DIR/hub-workflow-cli.mjs" "$TOOLS_DIR/hub-workflow-cli.mjs"
cp "$KIT_DIR/hub-ticket-time.mjs" "$TOOLS_DIR/hub-ticket-time.mjs"

for rule in hub-session-start.mdc hub-workflow-enforcement.mdc hub-agent-behavior.mdc hub-project-map.mdc; do
  cp "$KIT_DIR/$rule" "$RULES_DIR/$rule"
  echo "  Installed rule: $rule"
done

for line in .hub-session.json .hub-ticket-time.json; do
  if [[ -f "$GITIGNORE_PATH" ]]; then
    if ! grep -qxF "$line" "$GITIGNORE_PATH"; then
      echo "$line" >> "$GITIGNORE_PATH"
      echo "  Added to .gitignore: $line"
    fi
  else
    printf '%s\n' "$line" > "$GITIGNORE_PATH"
    echo "  Created .gitignore with Hub session files"
    break
  fi
done

ENV_PATH="$TARGET_PROJECT/.env.local"
if [[ ! -f "$ENV_PATH" ]]; then
  cat > "$ENV_PATH" <<'EOF'
APPDOERS_HUB_URL=https://appdoers-hub-two.vercel.app
APPDOERS_CURSOR_TOKEN=your_token_here
EOF
  echo "  Created .env.local template — add your APPDOERS_CURSOR_TOKEN"
else
  echo "  .env.local already exists — skipped"
fi

echo ""
echo "Running verify-setup..."
if (cd "$TARGET_PROJECT" && node "$TOOLS_DIR/hub-workflow-cli.mjs" verify-setup); then
  echo ""
  echo "Install complete. Hub Cursor Kit is ready."
else
  echo ""
  echo "Install complete, but verify-setup failed. Set APPDOERS_CURSOR_TOKEN and run:"
  echo "  node tools/hub-workflow-cli.mjs verify-setup"
fi

echo ""
echo "Next steps:"
echo "  1. Create a Cursor API token in Hub Settings (one per team member)"
echo "  2. Set APPDOERS_CURSOR_TOKEN in .env.local or parent .env.hub"
echo "  3. Open a new Cursor agent chat — it will ask for client, project, and team member"
