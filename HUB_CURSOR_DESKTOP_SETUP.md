# Hub + Cursor Desktop Setup

**Deprecated.** Use **[hub-cursor-kit/README.md](./hub-cursor-kit/README.md)** for setup on any project.

For monorepo-wide token setup, see **[HUB_CURSOR_SETUP.md](../HUB_CURSOR_SETUP.md)** at the workspace root.

## Quick reference

```powershell
# Install kit into this or another project
powershell -ExecutionPolicy Bypass -File "hub-cursor-kit\install.ps1" -TargetProject "."

# Verify token and Hub connection
node tools/hub-workflow-cli.mjs verify-setup

# Session (agent runs this at start of each chat)
node tools/hub-workflow-cli.mjs whoami
node tools/hub-workflow-cli.mjs set-session --client-id "<uuid>" --project-id "<uuid>" --team-user-id "<uuid>" --team-member-name "Your Name"
```
