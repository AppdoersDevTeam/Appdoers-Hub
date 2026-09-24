# Paste-ready Cursor prompt (Hub tickets in every project)

Use this so Cursor in **other projects** always confirms Hub session, creates tickets, tracks time, and follows stage flow.

**Best option (once, all projects):** Cursor → **Settings** → **Rules** → **User Rules** → paste **Prompt A**.

**Also works:** paste **Prompt A** as the first message in a new Agent chat, then send your real request in the next message.

**Chat shortcut:** if User Rules are already set, you can still paste **Prompt B** at the top of a request.

Install the Hub kit in that project first if `tools/hub-workflow-cli.mjs` is missing (the prompt tells the agent to install it).

---

## Prompt A — paste this (User Rule or first message)

```
Appdoers Hub is the source of truth for all work in this and every Appdoers project. Follow this on every request, including the first message of a new chat. Do not skip it because a folder looks unrelated, because the user asked for a small change, or because rules already exist.

USE THE CLI ONLY. Never call Hub HTTP endpoints yourself. All Hub actions:
  node tools/hub-workflow-cli.mjs <command>

If tools/hub-workflow-cli.mjs is missing, install the kit from the project root before doing anything else (PowerShell):
  powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/AppdoersDevTeam/Appdoers-Hub/master/hub-cursor-kit/install-project.ps1 -OutFile $env:TEMP\hub-install.ps1; & $env:TEMP\hub-install.ps1"
If that fails on token/setup, stop and tell the user: generate a token in Hub → My Account → Cursor setup, then run:
  powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/AppdoersDevTeam/Appdoers-Hub/master/hub-cursor-kit/setup-my-cursor-token.ps1 -OutFile $env:TEMP\setup-token.ps1; & $env:TEMP\setup-token.ps1"

SESSION (every new agent chat, even if .hub-session.json exists):
1. Run whoami. Show team member + token name.
2. Run show-session.
3. Ask the user to confirm with AskQuestion.
   - Session exists: "Continue as {client_name} / {project_name} / {team_member_name}?"
   - Missing or declined: list-clients → ask which client → list-projects --client-id <uuid> → ask which project → set-session with those ids and the whoami team member (name + team-user-id).
4. Session team member MUST be the token owner. If the user says they are someone else, STOP and tell them to update APPDOERS_CURSOR_TOKEN.
5. Echo confirmed client_name, project_name, team_member_name, and ids before other work.
Never guess client, project, or person. Never pick a project by name alone (names collide). Folder names are hints only. Confirm both company_name and project name. To switch later: clear-session and repeat.

TICKETS (before any code edit):
- User gave a ticket id → get-ticket and use it. If it is on the wrong client/project, update-ticket --project-id "<correct-uuid>" with a note.
- No ticket id → create-ticket --title "..." --stage pm (session project), then claim-ticket.
- Include the ticket id in progress updates and the final response.
- Do not edit application code until session is confirmed and a ticket exists.

STAGES (do not skip):
pm (intake) → claim / developer (implement + notes) → qa → reviewer → done
done only after explicit QA pass AND reviewer approval.
If blocked: keep the current stage and add a note starting with BLOCKED:

TIME:
Timer starts on claim-ticket or move-ticket --stage developer.
Gaps over 5 minutes are idle and must not be logged.
When implementation for a user request is complete, run flush-ticket-time --ticket-id "<id>" before the final reply.
Moving to qa, reviewer, or done auto-flushes.
Never pass hours or time_spent yourself. Time belongs to the token owner.

COMMANDS:
whoami, verify-setup
show-session, list-clients, list-projects --client-id <uuid>, set-session, clear-session
create-ticket, get-ticket, list-tickets, update-ticket, move-ticket, claim-ticket, note
show-ticket-time, flush-ticket-time
```

---

## Prompt B — short chat prefix (optional)

Paste this above your actual request if User Rules are already on, or to reinforce one chat:

```
Follow Appdoers Hub: confirm session (whoami + show-session + AskQuestion), create or use a Hub ticket before any code, use only `node tools/hub-workflow-cli.mjs`, then: 
```

Example:

```
Follow Appdoers Hub: confirm session (whoami + show-session + AskQuestion), create or use a Hub ticket before any code, use only `node tools/hub-workflow-cli.mjs`, then: update the homepage hero copy.
```
