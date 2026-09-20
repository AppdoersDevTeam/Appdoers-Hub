#!/usr/bin/env node
/**
 * Register Hub as the Slack destination for Supabase organization project events.
 *
 * Setup (once per Supabase organization — new projects inherit this):
 * 1. Create Slack channel + incoming webhook. Paste it in Hub Settings → Slack Channels → Alerts.
 * 2. Set SUPABASE_PLATFORM_WEBHOOK_SECRET in Hub/.env.local and Vercel.
 * 3. Create a Supabase personal access token (Account → Access Tokens).
 * 4. Run:
 *      node tools/register-supabase-org-slack-webhook.mjs --org-slug YOUR_ORG_SLUG
 *
 * Env:
 *   SUPABASE_ACCESS_TOKEN              Personal access token (this script only)
 *   SUPABASE_PLATFORM_WEBHOOK_SECRET   Shared secret Hub verifies
 *   NEXT_PUBLIC_APP_URL                Hub public URL (or pass --hub-url)
 *
 * Probe only (does not create an endpoint):
 *   node tools/register-supabase-org-slack-webhook.mjs --org-slug YOUR_ORG_SLUG --probe
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(__dirname, '..')

const EVENT_TYPES = [
  'v1.project.paused',
  'v1.project.restored',
  'v1.project.removed',
  'v1.project.pending_shutdown_notification',
  'v1.project.shutdown_eligible',
  'v1.project.disk_growth',
  'v1.project.subscription_updated',
  'v1.project.infra_restarted',
  'v1.project.restore_failed',
  'v1.project.hibernation_suspended',
  'v1.project.hibernation_waken',
]

function parseDotEnv(content) {
  const values = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const sep = line.indexOf('=')
    if (sep === -1) continue
    const key = line.slice(0, sep).trim()
    if (!key) continue
    let value = line.slice(sep + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    values[key] = value
  }
  return values
}

function loadLocalEnv() {
  const filePath = path.join(workspaceRoot, '.env.local')
  if (!fs.existsSync(filePath)) return
  const loaded = parseDotEnv(fs.readFileSync(filePath, 'utf8'))
  for (const [key, value] of Object.entries(loaded)) {
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = value
    }
  }
}

function parseArgs(argv) {
  const args = { probe: false }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--probe') {
      args.probe = true
      continue
    }
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
      continue
    }
    args[key] = next
    i += 1
  }
  return args
}

async function api(token, method, pathname, body) {
  const res = await fetch(`https://api.supabase.com${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: token,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }
  return { ok: res.ok, status: res.status, json, text }
}

function explainStatus(status) {
  if (status === 401 || status === 403) {
    return 'Token was rejected. Create a personal access token at https://supabase.com/dashboard/account/tokens and export SUPABASE_ACCESS_TOKEN.'
  }
  if (status === 404) {
    return 'Platform webhooks are not available on this org yet (API returned 404). The Studio Webhooks page is still a preview. Do not use mailbox forwarding; wait for Supabase to enable org webhooks or check Feature Previews → Platform Webhooks.'
  }
  return `Unexpected status ${status}.`
}

async function main() {
  loadLocalEnv()
  const args = parseArgs(process.argv.slice(2))
  const orgSlug = String(args['org-slug'] || args.org || '').trim()
  const token = (process.env.SUPABASE_ACCESS_TOKEN || '').trim()
  const secret = (process.env.SUPABASE_PLATFORM_WEBHOOK_SECRET || '').trim()
  const hubUrl = String(args['hub-url'] || process.env.NEXT_PUBLIC_APP_URL || '')
    .trim()
    .replace(/\/+$/, '')

  if (!orgSlug) {
    console.error('Missing --org-slug (Dashboard URL: /org/<slug>/...)')
    process.exit(1)
  }
  if (!token) {
    console.error('Missing SUPABASE_ACCESS_TOKEN')
    process.exit(1)
  }

  const listPath = `/v2/organizations/${encodeURIComponent(orgSlug)}/webhooks/endpoints`
  const listed = await api(token, 'GET', listPath)

  if (!listed.ok) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          step: 'list-endpoints',
          status: listed.status,
          message: explainStatus(listed.status),
          body: listed.json,
        },
        null,
        2
      )
    )
    process.exit(1)
  }

  if (args.probe) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          step: 'probe',
          message: 'Platform webhooks API is reachable for this org.',
          endpoints: listed.json,
        },
        null,
        2
      )
    )
    return
  }

  if (!secret) {
    console.error('Missing SUPABASE_PLATFORM_WEBHOOK_SECRET')
    process.exit(1)
  }
  if (!hubUrl) {
    console.error('Missing NEXT_PUBLIC_APP_URL or --hub-url')
    process.exit(1)
  }

  const endpointUrl = `${hubUrl}/api/webhooks/supabase-platform`
  const createBodies = [
    {
      data: {
        type: 'endpoint',
        attributes: {
          url: endpointUrl,
          enabled: true,
          description: 'Appdoers Hub Slack alerts',
          event_types: EVENT_TYPES.map((type) => ({ type })),
          custom_headers: { Authorization: `Bearer ${secret}` },
        },
      },
    },
    {
      data: {
        url: endpointUrl,
        enabled: true,
        description: 'Appdoers Hub Slack alerts',
        event_types: EVENT_TYPES.map((type) => ({ type })),
        custom_headers: { Authorization: `Bearer ${secret}` },
      },
    },
  ]

  let created = null
  for (const body of createBodies) {
    const attempt = await api(token, 'POST', listPath, body)
    if (attempt.ok) {
      created = attempt
      break
    }
    created = attempt
    if (attempt.status !== 400) break
  }

  if (!created?.ok) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          step: 'create-endpoint',
          status: created?.status,
          message: explainStatus(created?.status ?? 0),
          body: created?.json,
        },
        null,
        2
      )
    )
    process.exit(1)
  }

  const endpointId =
    created.json?.data?.id || created.json?.data?.attributes?.id || created.json?.id || null

  let testResult = null
  if (endpointId) {
    testResult = await api(
      token,
      'POST',
      `/v2/organizations/${encodeURIComponent(orgSlug)}/webhooks/endpoints/${endpointId}/test`,
      { data: { type: 'v1.project.paused' } }
    )
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        endpoint_url: endpointUrl,
        endpoint: created.json,
        test: testResult
          ? { status: testResult.status, ok: testResult.ok, body: testResult.json }
          : 'skipped (no endpoint id in create response)',
        next: 'Paste the Slack incoming webhook in Hub Settings → Slack Channels → Alerts, then Send test.',
      },
      null,
      2
    )
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
