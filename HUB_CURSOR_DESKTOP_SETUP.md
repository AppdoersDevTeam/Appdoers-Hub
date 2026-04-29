# Hub + Cursor Desktop Setup

Primary setup is now workspace-wide. Use:

- `HUB_CURSOR_SETUP.md` at workspace root
- `tools/setup-hub-workflow.ps1` at workspace root

This file remains as a command reference.

## 1) Set local environment variables

Set these on each PC (user-level or terminal profile):

- `APPDOERS_HUB_URL=https://appdoers-hub-two.vercel.app`
- `APPDOERS_CURSOR_TOKEN=<your token>`

## 2) Quick smoke test

```powershell
node "tools/hub-workflow-cli.mjs" list-projects
```

If this returns projects, token + API are working.

## 3) Create a ticket from desktop

```powershell
node "tools/hub-workflow-cli.mjs" create-ticket --project-id "<project-uuid>" --title "Agent task from Cursor" --type feature --priority p2 --stage pm --note "Created from desktop"
```

## 4) Move ticket through stages

```powershell
node "tools/hub-workflow-cli.mjs" move-ticket --ticket-id "<ticket-uuid>" --stage developer --note "Work started"
node "tools/hub-workflow-cli.mjs" move-ticket --ticket-id "<ticket-uuid>" --stage qa --note "Ready for QA"
node "tools/hub-workflow-cli.mjs" move-ticket --ticket-id "<ticket-uuid>" --stage reviewer --note "QA passed"
node "tools/hub-workflow-cli.mjs" move-ticket --ticket-id "<ticket-uuid>" --stage done --note "Reviewer approved"
```

## 5) Team behavior in this repository

- `.cursor/rules/hub-workflow-enforcement.mdc`
- `.cursor/rules/hub-agent-behavior.mdc`

These rules tell Cursor agents to create/use Hub tickets first and follow full PM/Designer/Developer/QA/Reviewer workflow.
