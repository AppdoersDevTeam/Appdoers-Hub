# Cursor setup for the team

**PDF:** [`Cursor-Team-Setup.pdf`](Cursor-Team-Setup.pdf)

Needs **Node.js 18+**. Does **not** need Appdoers CRM on the machine.

## Laptop (once per person)

1. Hub → **My Account** → **Cursor setup** → Generate token
2. Run this in PowerShell (any folder):

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/AppdoersDevTeam/Appdoers-Hub/master/hub-cursor-kit/setup-my-cursor-token.ps1 -OutFile $env:TEMP\setup-token.ps1; & $env:TEMP\setup-token.ps1"
```

Saved to `%USERPROFILE%\.appdoers\hub.env` — never change on this laptop.

## Each new project (one paste)

From the project folder (for example ABCWebsite):

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/AppdoersDevTeam/Appdoers-Hub/master/hub-cursor-kit/install-project.ps1 -OutFile $env:TEMP\hub-install.ps1; & $env:TEMP\hub-install.ps1"
```

Open folder in Cursor → new Agent chat → pick client & project.

**Always-on tickets:** paste [`CURSOR-PASTE-PROMPT.md`](CURSOR-PASTE-PROMPT.md) into Cursor → Settings → Rules → User Rules (once per laptop). Then every project chat will create Hub tickets.

## FAQ

| Question | Answer |
|----------|--------|
| Same repo + Cursor Pro for everyone? | Yes |
| Different laptops? | Each runs laptop setup once; each project runs install one-liner once |
| Token in git? | No — laptop profile only |
| Need Appdoers CRM cloned? | No. Scripts download from GitHub |
