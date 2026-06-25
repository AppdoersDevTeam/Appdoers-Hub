#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const workspaceRoot = path.resolve(__dirname, '..')

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

function loadHubEnv() {
  const candidates = [
    path.join(workspaceRoot, '.env.local'),
    path.join(workspaceRoot, '..', '.env.hub'),
  ]

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue
    const loaded = parseDotEnv(fs.readFileSync(filePath, 'utf8'))
    if (!process.env.APPDOERS_HUB_URL && loaded.APPDOERS_HUB_URL) {
      process.env.APPDOERS_HUB_URL = loaded.APPDOERS_HUB_URL
    }
    if (!process.env.APPDOERS_CURSOR_TOKEN && loaded.APPDOERS_CURSOR_TOKEN) {
      process.env.APPDOERS_CURSOR_TOKEN = loaded.APPDOERS_CURSOR_TOKEN
    }
    if (process.env.APPDOERS_HUB_URL && process.env.APPDOERS_CURSOR_TOKEN) {
      break
    }
  }
}

loadHubEnv()

const HUB_URL = (process.env.APPDOERS_HUB_URL || '').replace(/\/+$/, '')
const HUB_TOKEN = process.env.APPDOERS_CURSOR_TOKEN || ''

function usage() {
  console.log(`Appdoers Hub Workflow CLI

Usage:
  node tools/hub-workflow-cli.mjs list-projects
  node tools/hub-workflow-cli.mjs list-tickets --project-id <uuid> [--stage pm] [--limit 50]
  node tools/hub-workflow-cli.mjs get-ticket --ticket-id <uuid>
  node tools/hub-workflow-cli.mjs create-ticket --project-id <uuid> --title "..." [--type feature] [--priority p2] [--stage pm] [--note "..."] [--assigned-to <uuid>]
  node tools/hub-workflow-cli.mjs move-ticket --ticket-id <uuid> --stage <pm|designer|developer|qa|reviewer|done> [--note "..."]
  node tools/hub-workflow-cli.mjs update-ticket --ticket-id <uuid> [--project-id <uuid>] [--title "..."] [--description "..."] [--clear-description] [--type feature] [--priority p2] [--assigned-to <uuid>] [--clear-assigned] [--note "..."]
  node tools/hub-workflow-cli.mjs claim-ticket --ticket-id <uuid> [--agent-name "Cursor AI"] [--assigned-to <uuid>] [--note "..."]
  node tools/hub-workflow-cli.mjs note --ticket-id <uuid> --note "..."

Required env vars:
  APPDOERS_HUB_URL
  APPDOERS_CURSOR_TOKEN
`)
}

function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i]
    if (!item.startsWith('--')) {
      args._.push(item)
      continue
    }
    const key = item.slice(2)
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

async function hubFetch(pathname, init = {}) {
  if (!HUB_URL || !HUB_TOKEN) {
    throw new Error('Missing APPDOERS_HUB_URL or APPDOERS_CURSOR_TOKEN')
  }
  const res = await fetch(`${HUB_URL}${pathname}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${HUB_TOKEN}`,
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`)
  }
  return data
}

function print(data) {
  console.log(JSON.stringify(data, null, 2))
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  const [command] = args._

  if (!command || command === 'help' || command === '--help') {
    usage()
    process.exit(0)
  }

  if (command === 'list-projects') {
    const data = await hubFetch('/api/cursor/projects')
    print(data)
    return
  }

  if (command === 'list-tickets') {
    const params = new URLSearchParams()
    if (args['project-id']) params.set('project_id', String(args['project-id']))
    if (args.stage) params.set('stage', String(args.stage))
    if (args.limit) params.set('limit', String(args.limit))
    const query = params.toString()
    const data = await hubFetch(`/api/cursor/tickets${query ? `?${query}` : ''}`)
    print(data)
    return
  }

  if (command === 'get-ticket') {
    if (!args['ticket-id']) throw new Error('--ticket-id is required')
    const data = await hubFetch(`/api/cursor/tickets/${args['ticket-id']}`)
    print(data)
    return
  }

  if (command === 'create-ticket') {
    if (!args['project-id']) throw new Error('--project-id is required')
    if (!args.title) throw new Error('--title is required')
    const payload = {
      project_id: String(args['project-id']),
      title: String(args.title),
      description: args.description ? String(args.description) : undefined,
      type: args.type ? String(args.type) : 'feature',
      priority: args.priority ? String(args.priority) : 'p2',
      stage: args.stage ? String(args.stage) : 'pm',
      note: args.note ? String(args.note) : undefined,
      assigned_to: args['assigned-to'] ? String(args['assigned-to']) : undefined,
    }
    const data = await hubFetch('/api/cursor/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    print(data)
    return
  }

  if (command === 'move-ticket') {
    if (!args['ticket-id']) throw new Error('--ticket-id is required')
    if (!args.stage) throw new Error('--stage is required')
    const payload = {
      stage: String(args.stage),
      note: args.note ? String(args.note) : undefined,
    }
    const data = await hubFetch(`/api/cursor/tickets/${args['ticket-id']}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    print(data)
    return
  }

  if (command === 'update-ticket') {
    if (!args['ticket-id']) throw new Error('--ticket-id is required')

    const payload = {}
    if (args['project-id']) payload.project_id = String(args['project-id'])
    if (args.title) payload.title = String(args.title)
    if (args['clear-description']) payload.description = null
    else if (args.description !== undefined) payload.description = String(args.description)
    if (args.type) payload.type = String(args.type)
    if (args.priority) payload.priority = String(args.priority)
    if (args['clear-assigned']) payload.assigned_to = null
    else if (args['assigned-to']) payload.assigned_to = String(args['assigned-to'])
    if (args.note) payload.note = String(args.note)

    if (Object.keys(payload).length === 0) {
      throw new Error('Provide at least one field to update: --project-id, --title, --description, --clear-description, --type, --priority, --assigned-to, --clear-assigned')
    }

    const data = await hubFetch(`/api/cursor/tickets/${args['ticket-id']}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    print(data)
    return
  }

  if (command === 'claim-ticket') {
    if (!args['ticket-id']) throw new Error('--ticket-id is required')
    const agentName = args['agent-name'] ? String(args['agent-name']) : 'Cursor AI'
    const claimNote = args.note
      ? String(args.note)
      : `Claimed by ${agentName}. Starting implementation now.`
    const payload = {
      claim: true,
      agent_name: agentName,
      note: claimNote,
      assigned_to: args['assigned-to'] ? String(args['assigned-to']) : undefined,
    }
    const data = await hubFetch(`/api/cursor/tickets/${args['ticket-id']}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    print(data)
    return
  }

  if (command === 'note') {
    if (!args['ticket-id']) throw new Error('--ticket-id is required')
    if (!args.note) throw new Error('--note is required')
    const payload = { note: String(args.note) }
    const data = await hubFetch(`/api/cursor/tickets/${args['ticket-id']}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    print(data)
    return
  }

  throw new Error(`Unknown command: ${command}`)
}

run().catch((err) => {
  console.error(`[hub-workflow-cli] ${err.message}`)
  process.exit(1)
})
