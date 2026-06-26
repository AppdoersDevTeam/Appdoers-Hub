# Cursor Workflow API (internal maintainer reference)

> **Not for Cursor agents.** Agents must use `node tools/hub-workflow-cli.mjs` only. This document is for Hub/backend maintainers.

## Auth

- `Authorization: Bearer <token>` or `x-appdoers-api-token: <token>`
- Tokens are created per team member in Hub → **My Account** → **Cursor setup**, or `POST /api/cursor/tokens` (authenticated Hub session)

## Endpoints

- `GET /api/cursor/me` — token owner identity
- `GET /api/cursor/clients?status=active`
- `GET /api/cursor/projects?client_id=<uuid>`
- `GET /api/cursor/tickets?project_id=<uuid>&stage=<pm|designer|developer|qa|reviewer|done>&limit=50`
- `POST /api/cursor/tickets`
- `GET /api/cursor/tickets/:id`
- `PATCH /api/cursor/tickets/:id`
- `POST /api/cursor/tickets/:id/time`
- `GET /api/cursor/tokens`
- `DELETE /api/cursor/tokens/:id` (revokes token)

## GET /api/cursor/me

Response:

```json
{
  "team_user": { "id": "uuid", "full_name": "Sara", "email": "...", "role": "director" },
  "token": { "id": "uuid", "name": "Sara Laptop Cursor" }
}
```

## Session workflow (CLI)

Agents use the CLI, not these endpoints directly:

```bash
node tools/hub-workflow-cli.mjs whoami
node tools/hub-workflow-cli.mjs list-clients
node tools/hub-workflow-cli.mjs list-projects --client-id "<client-uuid>"
node tools/hub-workflow-cli.mjs set-session --client-id "<uuid>" --project-id "<uuid>" --team-user-id "<uuid>" --team-member-name "Sara"
node tools/hub-workflow-cli.mjs show-session
```

See `hub-cursor-kit/README.md` for portable setup.

## Ticket create payload

```json
{
  "project_id": "uuid",
  "title": "Build homepage hero",
  "description": "Implement approved hero section",
  "type": "feature",
  "priority": "p1",
  "stage": "pm",
  "note": "Created by PM Agent from intake"
}
```

## Stage updates

Use `PATCH /api/cursor/tickets/:id`:

```json
{
  "stage": "qa",
  "note": "Developer complete; ready for QA checks"
}
```

## Ticket field updates

Use `PATCH /api/cursor/tickets/:id` to edit ticket metadata or reassign project/client:

```json
{
  "project_id": "uuid",
  "title": "Updated task title",
  "description": "Updated description",
  "type": "feature",
  "priority": "p1",
  "assigned_to": "team-user-uuid",
  "note": "Reassigned to Ashburton Baptist Church / New Website"
}
```

Set `"assigned_to": null` to clear assignee. Set `"description": null` to clear description.

When `project_id` changes, Hub:
- validates the target project exists
- updates the task's project
- rewrites existing activity log `client_id` values for that task
- logs a `cursor_project_changed` activity entry

CLI equivalent:

```bash
node tools/hub-workflow-cli.mjs update-ticket \
  --ticket-id "<uuid>" \
  --project-id "520e3d30-2eaf-4d09-8c72-bb5781025561" \
  --title "Fix contact form" \
  --description "Wire form to pastor@ashburtonbaptist.co.nz" \
  --note "Moved from Appdoers New Website to ABC New Website"
```

List/get ticket responses include `project_name` and `client_name` so agents can verify assignment before creating or moving work.

## Claim pattern

```json
{
  "claim": true,
  "agent_name": "Sara",
  "note": "Claimed by Sara",
  "stage": "developer"
}
```

When `claim: true` is provided, the ticket is auto-assigned to the authenticated cursor token owner unless `assigned_to` is explicitly provided.

Stage mapping:

- `pm`, `designer` -> task status `open`
- `developer` -> `in_progress`
- `qa`, `reviewer` -> `awaiting_review`
- `done` -> `closed`

Every create/update note writes to `activity_log` for audit history.

## Automatic active time tracking

The Hub workflow CLI tracks **active work time** per ticket in `.hub-ticket-time.json` (gitignored).

- Timer starts: `claim-ticket` or `move-ticket --stage developer`
- Timer ticks: any ticket command (`note`, `get-ticket`, `update-ticket`, etc.)
- Idle rule: gaps longer than **5 minutes** between CLI touches are excluded
- Flush per request: `flush-ticket-time --ticket-id <uuid>` when implementation for a user request is complete
- Auto-flush on stage: moving to `qa`, `reviewer`, or `done` logs unlogged active time via `POST /api/cursor/tickets/:id/time`

```bash
node tools/hub-workflow-cli.mjs show-ticket-time --ticket-id "<uuid>"
node tools/hub-workflow-cli.mjs flush-ticket-time --ticket-id "<uuid>" --note "Completed homepage hero implementation"
```

Do **not** manually pass `hours` or `time_spent` in PATCH payloads — inflated wall-clock estimates were causing incorrect totals.
