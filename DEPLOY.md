# Appdoers Hub — Deployment Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project called `appdoers-hub`
2. Choose a strong database password — save it somewhere safe
3. Select region closest to New Zealand (Sydney, Australia)
4. Wait for project to provision (~2 minutes)

## Step 2: Run the Database Schema

1. In Supabase dashboard → **SQL Editor**
2. Copy the full contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and click **Run**
4. You should see: tables created, RLS enabled, seed data inserted

## Step 3: Create Your Director Account

1. In Supabase → **Authentication** → **Users** → **Invite user**
2. Enter your email (sara2023s / fabiano email)
3. Accept the invite email and set your password
4. In **SQL Editor**, run this to register as a director:

```sql
INSERT INTO team_users (id, email, full_name, role)
VALUES (
  '<your-auth-user-id>',  -- paste from Authentication → Users
  'your@email.com',
  'Your Full Name',
  'director'
);
```

Repeat for Fabiano.

## Step 4: Get Environment Variables

In Supabase → **Settings** → **API**:

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (keep secret!) |

## Step 5: Local Development

1. Copy `.env.local.example` → `.env.local`
2. Fill in the values from Step 4
3. Set `NEXT_PUBLIC_APP_URL=http://localhost:3000`
4. Set `SLACK_WEBHOOK_URL` = your Slack webhook
5. Run: `npm run dev`
6. Open: http://localhost:3000

## Step 6: Deploy to Vercel

1. Push this repo to GitHub (create a new private repo called `appdoers-hub`)
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo
3. Add all environment variables from `.env.local` (except use your live Supabase keys)
4. Set `NEXT_PUBLIC_APP_URL` = your Vercel auto-domain (e.g. `https://appdoers-hub.vercel.app`)
5. Deploy

## Step 7: Configure Supabase Auth Redirect

In Supabase → **Authentication** → **URL Configuration**:
- **Site URL**: `https://your-vercel-url.vercel.app`
- **Redirect URLs**: `https://your-vercel-url.vercel.app/api/auth/callback`

## Step 8: Verify

- [ ] Visit your Vercel URL
- [ ] `/app/login` renders correctly
- [ ] Sign in with your director account
- [ ] Dashboard loads
- [ ] `/portal/login` renders correctly

## Supabase Storage Bucket

Create a storage bucket called `client-files`:
1. Supabase → **Storage** → **New bucket**
2. Name: `client-files`
3. Public: **No** (private)
4. Add RLS policy: team members can read/write all, portal users can read/write their client's files only
