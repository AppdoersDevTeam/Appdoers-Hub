# Hub Cursor Kit

Drop-in Hub workflow for any Cursor project: auto-create tickets, follow PM → Developer → QA → Reviewer stages, and log active work time.

**Team PDF:** [`Cursor-Team-Setup.pdf`](Cursor-Team-Setup.pdf) · **Team guide:** [`TEAM_CURSOR_SETUP.md`](TEAM_CURSOR_SETUP.md)

**Agents use the CLI only** — never call Hub HTTP endpoints directly.

## Team setup (each laptop, once)

1. Hub → **My Account** → **Cursor setup** → Generate token
2. From your `Appdoers Work` folder:

```powershell
powershell -ExecutionPolicy Bypass -File "Appdoers CRM\hub-cursor-kit\setup-my-cursor-token.ps1"
```

3. Paste token — saved to `%USERPROFILE%\.appdoers\hub.env` on **your laptop only**
4. Never edit again. Same repo + shared Cursor Pro login is fine.

## Quick install (per project folder)

```powershell
powershell -ExecutionPolicy Bypass -File "Appdoers CRM\hub-cursor-kit\install.ps1" -TargetProject "C:\path\to\your-project"
```

## Session flow (every new agent chat)

1. `whoami` — confirm your identity
2. Pick **client** and **project**
3. Agent creates tickets and logs time automatically

## What gets installed

| File | Target |
|------|--------|
| `hub-workflow-cli.mjs` | `tools/` |
| `hub-ticket-time.mjs` | `tools/` |
| Four `.cursor/rules/*.mdc` files | `.cursor/rules/` |

Token file: `%USERPROFILE%\.appdoers\hub.env` (not in git)

## CLI commands

| Command | Purpose |
|---------|---------|
| `whoami` | Show token owner |
| `verify-setup` | Smoke test |
| `set-session` | Save client, project, team member |
| `create-ticket` / `claim-ticket` / `move-ticket` | Workflow |
| `flush-ticket-time` | Log active time |

Run `node tools/hub-workflow-cli.mjs help` for full usage.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Missing token | Run `setup-my-cursor-token.ps1` |
| Wrong person on time | Use your own token on your laptop |
| Agent skips session prompt | Open project folder in Cursor; check rules installed |

## Maintaining the kit

```powershell
powershell -ExecutionPolicy Bypass -File "hub-cursor-kit\sync-kit.ps1"
npx tsx scripts/generate-cursor-team-guide-pdf.ts
```
