# Cursor setup for the team

**Share the PDF:** [`Cursor-Team-Setup.pdf`](Cursor-Team-Setup.pdf)

Everyone uses the same **Appdoers Work** repo and can share one **Cursor Pro** login. Each person runs setup **once on their own laptop** — no env swapping.

## One-time setup (~3 minutes, per laptop)

### 1. Get your token in Hub

1. Sign in to [Appdoers Hub](https://appdoers-hub-two.vercel.app)
2. **My Account** → **Cursor setup**
3. Generate token → copy it

### 2. Run the setup script (once per laptop)

From your `Appdoers Work` folder:

```powershell
powershell -ExecutionPolicy Bypass -File "Appdoers CRM\hub-cursor-kit\setup-my-cursor-token.ps1"
```

Paste your token when asked. Saved to `%USERPROFILE%\.appdoers\hub.env` — **never edit again on this laptop.**

### 3. Verify

```powershell
cd "Appdoers CRM"
node tools/hub-workflow-cli.mjs whoami
```

### 4. Use Cursor

Open the **project folder** you are working on → new Agent chat → pick client & project.

---

## FAQ

| Question | Answer |
|----------|--------|
| Same repo for everyone? | Yes |
| Same Cursor Pro login? | Yes |
| Different laptops? | Each laptop runs step 2 once — no swapping |
| Token in git? | No — your Windows user folder only |

More: [`README.md`](README.md)
