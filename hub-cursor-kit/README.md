# Hub Cursor Kit — drop into any client project

Copy these files into the **root** of any repo where Cursor should create Hub tickets.

## Files to copy

```
your-project/
  tools/hub-workflow-cli.mjs          <- from this kit
  .cursor/rules/hub-session-start.mdc <- from this kit
  .cursor/rules/hub-workflow-enforcement.mdc
  .env.local                          <- create locally (do not commit)
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

`.hub-session.json` is written at the project root (gitignored) and stores the active client/project for the session.

## Smoke test

```bash
node tools/hub-workflow-cli.mjs list-clients
node tools/hub-workflow-cli.mjs list-projects
```
