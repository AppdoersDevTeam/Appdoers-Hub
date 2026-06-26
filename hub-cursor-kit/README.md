# Hub Cursor Kit

Drop-in Hub workflow for any Cursor project. **Agents use the CLI only.**

**Team PDF:** [`Cursor-Team-Setup.pdf`](Cursor-Team-Setup.pdf)

---

## New project (one paste, zero interaction)

From the **project root** (after laptop token is set up once):

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/AppdoersDevTeam/Appdoers-Hub/master/hub-cursor-kit/install-project.ps1 -OutFile $env:TEMP\hub-install.ps1; & $env:TEMP\hub-install.ps1"
```

**Monorepo shortcut** (no download):

```powershell
powershell -ExecutionPolicy Bypass -File "..\Appdoers CRM\hub-cursor-kit\install-project.ps1"
```

From `Appdoers Work` root, install into another folder:

```powershell
powershell -ExecutionPolicy Bypass -File "tools\add-hub-to-project.ps1" -ProjectPath "AppdoersWebsite"
```

Then open that folder in Cursor → new Agent chat.

---

## New laptop (once per person)

1. Hub → **My Account** → **Cursor setup** → Generate token
2. Run once:

```powershell
powershell -ExecutionPolicy Bypass -File "Appdoers CRM\hub-cursor-kit\setup-my-cursor-token.ps1"
```

Token saves to `%USERPROFILE%\.appdoers\hub.env` — never edit again on this laptop.

---

## What gets installed

| File | Target |
|------|--------|
| `hub-workflow-cli.mjs` | `tools/` |
| `hub-ticket-time.mjs` | `tools/` |
| Four `.mdc` rule files | `.cursor/rules/` |

Token is **not** in the project — it lives in your laptop profile env file.

---

## CLI quick reference

`whoami` · `verify-setup` · `set-session` · `create-ticket` · `claim-ticket` · `move-ticket` · `flush-ticket-time`

```bash
node tools/hub-workflow-cli.mjs help
```

---

## Maintainers

```powershell
powershell -ExecutionPolicy Bypass -File "hub-cursor-kit\sync-kit.ps1"
npx tsx scripts/generate-cursor-team-guide-pdf.ts
```
