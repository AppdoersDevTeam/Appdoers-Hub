#!/usr/bin/env bash
set -euo pipefail

TARGET_PROJECT="${1:-$(pwd)}"
KIT_DIR="${APPDOERS_HUB_KIT_DIR:-}"
GITHUB_BASE="https://raw.githubusercontent.com/AppdoersDevTeam/Appdoers-Hub/master/hub-cursor-kit"

KIT_FILES=(
  hub-workflow-cli.mjs
  hub-ticket-time.mjs
  hub-session-start.mdc
  hub-workflow-enforcement.mdc
  hub-agent-behavior.mdc
  hub-project-map.mdc
)

RULE_FILES=(
  hub-session-start.mdc
  hub-workflow-enforcement.mdc
  hub-agent-behavior.mdc
  hub-project-map.mdc
)

is_kit_dir() {
  [[ -f "$1/hub-workflow-cli.mjs" && -f "$1/hub-ticket-time.mjs" ]]
}

find_local_kit() {
  if [[ -n "$KIT_DIR" ]] && is_kit_dir "$KIT_DIR"; then
    echo "$(cd "$KIT_DIR" && pwd)"
    return 0
  fi

  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if is_kit_dir "$script_dir"; then
    echo "$script_dir"
    return 0
  fi

  local current
  current="$(cd "$TARGET_PROJECT" && pwd)"
  while true; do
    for candidate in "$current/Appdoers CRM/hub-cursor-kit" "$current/hub-cursor-kit"; do
      if is_kit_dir "$candidate"; then
        echo "$(cd "$candidate" && pwd)"
        return 0
      fi
    done
    local parent
    parent="$(dirname "$current")"
    if [[ "$parent" == "$current" ]]; then
      break
    fi
    current="$parent"
  done

  return 1
}

download_kit() {
  local dest="$1"
  mkdir -p "$dest"
  for file in "${KIT_FILES[@]}"; do
    echo "  Downloading $file"
    curl -fsSL "$GITHUB_BASE/$file" -o "$dest/$file"
  done
}

TARGET_PROJECT="$(cd "$TARGET_PROJECT" && pwd)"

if resolved_kit="$(find_local_kit)"; then
  echo "Using kit from: $resolved_kit"
else
  resolved_kit="${TMPDIR:-/tmp}/appdoers-hub-kit"
  echo "Local kit not found — downloading from GitHub to $resolved_kit"
  download_kit "$resolved_kit"
fi

TOOLS_DIR="$TARGET_PROJECT/tools"
RULES_DIR="$TARGET_PROJECT/.cursor/rules"
GITIGNORE_PATH="$TARGET_PROJECT/.gitignore"

echo "Installing Hub Cursor Kit into: $TARGET_PROJECT"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18+ is required." >&2
  exit 1
fi

mkdir -p "$TOOLS_DIR" "$RULES_DIR"

cp "$resolved_kit/hub-workflow-cli.mjs" "$TOOLS_DIR/hub-workflow-cli.mjs"
cp "$resolved_kit/hub-ticket-time.mjs" "$TOOLS_DIR/hub-ticket-time.mjs"

for rule in "${RULE_FILES[@]}"; do
  cp "$resolved_kit/$rule" "$RULES_DIR/$rule"
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

echo ""
echo "Running verify-setup..."
if (cd "$TARGET_PROJECT" && node "$TOOLS_DIR/hub-workflow-cli.mjs" verify-setup); then
  echo ""
  echo "Hub Cursor Kit ready. Open this folder in Cursor and start an agent chat."
else
  echo ""
  echo "Project files installed, but laptop token is missing or invalid."
  echo "Run laptop setup once:"
  echo "  bash hub-cursor-kit/setup-my-cursor-token.ps1  # or use setup-hub-workflow.ps1 from kit"
  exit 1
fi
