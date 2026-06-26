# Hub Cursor Kit

Drop-in Hub workflow for any Cursor project: auto-create tickets, follow PM → Developer → QA → Reviewer stages, and log active work time.

**Agents use the CLI only** — never call Hub HTTP endpoints directly.

## Quick install

From the **target project root**:

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File "path\to\hub-cursor-kit\install.ps1" -TargetProject "C:\path\to\your-project"
```

```bash
# macOS / Linux
bash path/to/hub-cursor-kit/install.sh /path/to/your-project
```

Or from this repo into another project:

```powershell
powershell -ExecutionPolicy Bypass -File "Appdoers CRM\hub-cursor-kit\install.ps1" -TargetProject "C:\path\to\your-project"
```

## One-time token setup (human only)

Each team member needs their own token so time logs to the correct person.

1. Sign into Appdoers Hub
2. Go to **Settings → Cursor API tokens** (or create via Hub UI)
3. Create a token named after your machine (e.g. "Sara Laptop Cursor")
4. Copy the token once and add to `.env.local` in the project (or shared parent `.env.hub`):

```env
APPDOERS_HUB_URL=https://appdoers-hub-two.vercel.app
APPDOERS_CURSOR_TOKEN=apd_your_token_here
```

5. Verify:

```bash
node tools/hub-workflow-cli.mjs verify-setup
```

For monorepo-wide setup, use `tools/setup-hub-workflow.ps1` at the workspace root (creates `.env.hub`).

## Session flow (every new agent chat)

Before any ticket or code edit, Cursor will:

1. Run `whoami` — show who the token belongs to
2. Confirm or select **client**, **project**, and **team member**
3. Save session to `.hub-session.json` (gitignored)

```
Agent: Authenticated as Sara (token: Sara Laptop).
       Which client? → Which project? → Confirm working as Sara?
       → Session saved.
```

If the user is a different person than the token owner, they must update `APPDOERS_CURSOR_TOKEN`.

## What gets installed

| File | Target |
|------|--------|
| `hub-workflow-cli.mjs` | `tools/` |
| `hub-ticket-time.mjs` | `tools/` |
| `hub-session-start.mdc` | `.cursor/rules/` |
| `hub-workflow-enforcement.mdc` | `.cursor/rules/` |
| `hub-agent-behavior.mdc` | `.cursor/rules/` |
| `hub-project-map.mdc` | `.cursor/rules/` |

Also adds to `.gitignore`: `.hub-session.json`, `.hub-ticket-time.json`

## CLI commands

| Command | Purpose |
|---------|---------|
| `whoami` | Show token owner (team member) |
| `verify-setup` | Smoke test env + token |
| `list-clients` / `list-projects` | Pick client and project |
| `set-session` | Save client, project, team member |
| `show-session` / `clear-session` | View or reset session |
| `create-ticket` | Create ticket (uses session project) |
| `claim-ticket` | Claim and start timer (uses session assignee) |
| `move-ticket` | Change workflow stage |
| `note` | Add progress note |
| `flush-ticket-time` | Log active time at end of request |

Run `node tools/hub-workflow-cli.mjs help` for full usage.

## Automatic time tracking

| When | What happens |
|------|----------------|
| `claim-ticket` or `move-ticket --stage developer` | Timer starts |
| Ticket commands (`note`, `get-ticket`, etc.) | Timer ticks |
| Gap **> 5 minutes** between CLI touches | Idle — not counted |
| End of each user request | `flush-ticket-time --ticket-id "<uuid>"` |
| `move-ticket --stage qa/reviewer/done` | Auto-flushes time to Hub |

Never manually pass hours — the CLI calculates active time.

## Agent workflow stages

PM → Designer → Developer → QA → Reviewer → Done

See `.cursor/rules/hub-agent-behavior.mdc` for stage responsibilities.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Missing APPDOERS_HUB_URL or APPDOERS_CURSOR_TOKEN` | Add vars to `.env.local` or parent `.env.hub` |
| `Invalid API token` | Create a new token in Hub Settings |
| `Team member does not match token owner` | Use your own token, or run `set-session` without wrong `--team-user-id` |
| Agent skips session prompt | Ensure `.cursor/rules/hub-session-start.mdc` is installed |

## Maintaining the kit

After editing files in `hub-cursor-kit/`, sync to this repo and workspace:

```powershell
powershell -ExecutionPolicy Bypass -File "hub-cursor-kit\sync-kit.ps1"
```

## Internal reference

Maintainer-only HTTP API docs: `docs/internal/cursor-workflow-api.md` (not for agents).
