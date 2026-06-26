# Hub Cursor Kit — drop into any client project

Portable files for Cursor agents to create Hub tickets, follow workflow stages, and **auto-log active task time** (idle gaps excluded).

## Quick install (recommended)

From the **target project root** (the repo where Cursor will work):

```powershell
# Option A — run the installer from this kit (after cloning/copying the kit folder)
powershell -ExecutionPolicy Bypass -File "path\to\hub-cursor-kit\install.ps1"

# Option B — from Appdoers CRM repo, install into another project
powershell -ExecutionPolicy Bypass -File "..\Appdoers CRM\hub-cursor-kit\install.ps1" -TargetProject "C:\path\to\your-project"
```

The installer copies CLI + rules and updates `.gitignore`.

## Manual copy

```
your-project/
  tools/
    hub-workflow-cli.mjs      <- from this kit
    hub-ticket-time.mjs       <- from this kit (required)
  .cursor/rules/
    hub-session-start.mdc     <- from this kit
    hub-workflow-enforcement.mdc
  .env.local                  <- create locally (do not commit)
  .gitignore                  <- add lines below if missing
```

Add to `.gitignore`:

```
.hub-session.json
.hub-ticket-time.json
```

## .env.local (required, not committed)

```env
APPDOERS_HUB_URL=https://appdoers-hub-two.vercel.app
APPDOERS_CURSOR_TOKEN=your_token_here
```

Create a token in Hub: `POST /api/cursor/tokens` with body `{ "name": "Your Machine" }`.

## Session workflow (every coding session)

```bash
node tools/hub-workflow-cli.mjs show-session
node tools/hub-workflow-cli.mjs list-clients
node tools/hub-workflow-cli.mjs list-projects --client-id "<client-uuid>"
node tools/hub-workflow-cli.mjs set-session --client-id "<client-uuid>" --project-id "<project-uuid>"
node tools/hub-workflow-cli.mjs create-ticket --title "Your task title" --note "Created from Cursor"
```

The agent should **ask you** which client and project before `set-session`.

`.hub-session.json` stores the active client/project. `.hub-ticket-time.json` tracks active work time per ticket (both gitignored).

## Automatic time tracking

| When | What happens |
|------|----------------|
| `claim-ticket` or `move-ticket --stage developer` | Timer starts |
| Ticket commands (`note`, `get-ticket`, etc.) | Timer ticks |
| Gap **> 5 minutes** between CLI touches | Idle — not counted |
| End of each user request | `flush-ticket-time --ticket-id "<uuid>"` |
| `move-ticket --stage qa/reviewer/done` | Auto-flushes time to Hub |

```bash
node tools/hub-workflow-cli.mjs show-ticket-time --ticket-id "<uuid>"
node tools/hub-workflow-cli.mjs flush-ticket-time --ticket-id "<uuid>" --note "Completed feature X"
```

**Do not** manually pass `hours` or `time_spent` to the API — the CLI calculates active time.

## Smoke test

```bash
node tools/hub-workflow-cli.mjs list-clients
node tools/hub-workflow-cli.mjs list-projects
node tools/hub-workflow-cli.mjs help
```

## Kit contents

| File | Install target |
|------|----------------|
| `hub-workflow-cli.mjs` | `tools/hub-workflow-cli.mjs` |
| `hub-ticket-time.mjs` | `tools/hub-ticket-time.mjs` |
| `hub-session-start.mdc` | `.cursor/rules/hub-session-start.mdc` |
| `hub-workflow-enforcement.mdc` | `.cursor/rules/hub-workflow-enforcement.mdc` |
| `install.ps1` | run once per project |

Full API docs: `docs/cursor-workflow-api.md` in Appdoers CRM.
