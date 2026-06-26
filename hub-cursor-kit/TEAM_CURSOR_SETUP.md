# Cursor setup for the team

**PDF:** [`Cursor-Team-Setup.pdf`](Cursor-Team-Setup.pdf)

## Laptop (once per person)

1. Hub → **My Account** → **Cursor setup** → Generate token
2. Run once:

```powershell
powershell -ExecutionPolicy Bypass -File "Appdoers CRM\hub-cursor-kit\setup-my-cursor-token.ps1"
```

Saved to `%USERPROFILE%\.appdoers\hub.env` — never change on this laptop.

## Each new project (one paste)

From the project folder:

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/AppdoersDevTeam/Appdoers-Hub/master/hub-cursor-kit/install-project.ps1 -OutFile $env:TEMP\hub-install.ps1; & $env:TEMP\hub-install.ps1"
```

Open folder in Cursor → new Agent chat → pick client & project.

## FAQ

| Question | Answer |
|----------|--------|
| Same repo + Cursor Pro for everyone? | Yes |
| Different laptops? | Each runs laptop setup once; each project runs install one-liner once |
| Token in git? | No — laptop profile only |
