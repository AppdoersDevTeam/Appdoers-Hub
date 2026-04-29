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

Stage mapping:

- `pm`, `designer` -> task status `open`
- `developer` -> `in_progress`
- `qa`, `reviewer` -> `awaiting_review`
- `done` -> `closed`

Every create/update note writes to `activity_log` for audit history.
