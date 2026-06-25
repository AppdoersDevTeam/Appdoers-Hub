# Cursor Workflow API

This API lets Cursor agents create and move Hub tickets through enforced workflow stages.

## 1) Create an API token

Sign into Hub, then call:

- `POST /api/cursor/tokens`
- body: `{ "name": "Sara Laptop Cursor" }`

The response returns `token` once. Store it in the machine `.env` as `APPDOERS_CURSOR_TOKEN`.

## 2) Auth header

Use either:

- `Authorization: Bearer <token>`
- `x-appdoers-api-token: <token>`

## 3) Endpoints

- `GET /api/cursor/projects`
- `GET /api/cursor/tickets?project_id=<uuid>&stage=<pm|designer|developer|qa|reviewer|done>&limit=50`
- `POST /api/cursor/tickets`
- `GET /api/cursor/tickets/:id`
- `PATCH /api/cursor/tickets/:id`
- `GET /api/cursor/tokens`
- `DELETE /api/cursor/tokens/:id` (revokes token)

## 4) Ticket create payload

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

## 5) Stage updates

Use `PATCH /api/cursor/tickets/:id`:

```json
{
  "stage": "qa",
  "note": "Developer complete; ready for QA checks"
}
```

## 6) Ticket field updates

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

List/get ticket responses now include `project_name` and `client_name` so agents can verify assignment before creating or moving work.

## 7) Claim pattern

```json
{
  "claim": true,
  "agent_name": "Cursor AI",
  "note": "Claimed by Cursor AI",
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
