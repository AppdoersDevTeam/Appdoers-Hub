#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  createTicketTimeStore,
  isFlushStage,
  isWorkStage,
  logTicketHours,
} from './hub-ticket-time.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const workspaceRoot = path.resolve(__dirname, '..')
const sessionFilePath = path.join(workspaceRoot, '.hub-session.json')
const ticketTime = createTicketTimeStore(workspaceRoot)

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

function getUserHubEnvPath() {
  const home = process.env.USERPROFILE || process.env.HOME || ''
  if (!home) return null
  return path.join(home, '.appdoers', 'hub.env')
}

function loadHubEnv() {
  const candidates = [
    getUserHubEnvPath(),
    path.join(workspaceRoot, '.env.local'),
    path.join(workspaceRoot, '.env.hub'),
    path.join(workspaceRoot, '..', '.env.hub'),
  ].filter(Boolean)

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
  node tools/hub-workflow-cli.mjs whoami
  node tools/hub-workflow-cli.mjs verify-setup
  node tools/hub-workflow-cli.mjs list-clients [--status active]
  node tools/hub-workflow-cli.mjs list-projects [--client-id <uuid>]
  node tools/hub-workflow-cli.mjs show-session
  node tools/hub-workflow-cli.mjs set-session --client-id <uuid> --project-id <uuid> --team-user-id <uuid> [--team-member-name "..."] [--client-name "..."] [--project-name "..."] [--force]
  node tools/hub-workflow-cli.mjs clear-session
  node tools/hub-workflow-cli.mjs list-tickets [--project-id <uuid>] [--stage pm] [--limit 50]
  node tools/hub-workflow-cli.mjs get-ticket --ticket-id <uuid>
  node tools/hub-workflow-cli.mjs create-ticket --title "..." [--project-id <uuid>] [--type feature] [--priority p2] [--stage pm] [--description "..."] [--note "..."] [--assigned-to <uuid>]
  node tools/hub-workflow-cli.mjs move-ticket --ticket-id <uuid> --stage <pm|designer|developer|qa|reviewer|done> [--note "..."]
  node tools/hub-workflow-cli.mjs update-ticket --ticket-id <uuid> [--project-id <uuid>] [--title "..."] [--description "..."] [--clear-description] [--type feature] [--priority p2] [--assigned-to <uuid>] [--clear-assigned] [--note "..."]
  node tools/hub-workflow-cli.mjs claim-ticket --ticket-id <uuid> [--agent-name "..."] [--assigned-to <uuid>] [--note "..."]
  node tools/hub-workflow-cli.mjs note --ticket-id <uuid> --note "..."
  node tools/hub-workflow-cli.mjs flush-ticket-time --ticket-id <uuid> [--note "..."] [--finalize]
  node tools/hub-workflow-cli.mjs show-ticket-time [--ticket-id <uuid>]

Session:
  .hub-session.json stores active client, project, and team member for this workspace.
  .hub-ticket-time.json tracks active work time per ticket (idle gaps over 5 minutes are excluded).
  create-ticket uses the session project when --project-id is omitted.
  claim-ticket uses session team member for assignment when --assigned-to is omitted.
  claim-ticket / move-ticket --stage developer start the active timer.
  flush-ticket-time logs unlogged active time; move-ticket --stage qa|reviewer|done auto-flushes.

Required env vars (in ~/.appdoers/hub.env on your laptop, or legacy .env.hub):
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

function readSession() {
  if (!fs.existsSync(sessionFilePath)) return null
  try {
    return JSON.parse(fs.readFileSync(sessionFilePath, 'utf8'))
  } catch {
    return null
  }
}

function writeSession(session) {
  fs.writeFileSync(sessionFilePath, `${JSON.stringify(session, null, 2)}\n`, 'utf8')
}

async function fetchWhoami() {
  return hubFetch('/api/cursor/me')
}

async function resolveProjectId(explicitProjectId) {
  if (explicitProjectId) return String(explicitProjectId)
  const session = readSession()
  if (session?.project_id) return String(session.project_id)
  throw new Error(
    'No project selected. Run set-session after asking the user which client and project to use, or pass --project-id.'
  )
}

function resolveSessionAssignee(explicitAssignedTo) {
  if (explicitAssignedTo) return String(explicitAssignedTo)
  const session = readSession()
  if (session?.team_user_id) return String(session.team_user_id)
  return undefined
}

function resolveSessionAgentName(explicitAgentName) {
  if (explicitAgentName) return String(explicitAgentName)
  const session = readSession()
  if (session?.team_member_name) return String(session.team_member_name)
  return 'Cursor AI'
}

function touchTicketTime(ticketId) {
  if (!ticketId) return null
  return ticketTime.touchTicket(String(ticketId))
}

async function flushTicketTime(ticketId, { finalize = false, description } = {}) {
  const id = String(ticketId)
  const prepared = ticketTime.prepareFlush(id, { finalize })
  if (prepared.hours <= 0) {
    return { time_logged: null, ...prepared }
  }

  const timeResult = await logTicketHours(hubFetch, id, prepared.hours, description)
  return {
    time_logged: {
      ticket_id: id,
      hours: prepared.hours,
      ...timeResult,
    },
    ...prepared,
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  const [command] = args._

  if (!command || command === 'help' || command === '--help') {
    usage()
    process.exit(0)
  }

  if (command === 'whoami') {
    const data = await fetchWhoami()
    print({
      ...data,
      message: `Authenticated as ${data.team_user?.full_name ?? 'Unknown'} (token: ${data.token?.name ?? 'Unknown'}).`,
    })
    return
  }

  if (command === 'verify-setup') {
    const userEnvPath = getUserHubEnvPath()
    const checks = {
      hub_url_set: Boolean(HUB_URL),
      token_set: Boolean(HUB_TOKEN),
      hub_url: HUB_URL || null,
      env_file: userEnvPath,
      whoami: null,
      session: readSession(),
      ok: false,
    }

    if (!checks.hub_url_set || !checks.token_set) {
      print({
        ...checks,
        ok: false,
        message:
          'Missing APPDOERS_HUB_URL or APPDOERS_CURSOR_TOKEN. Add them to .env.local or .env.hub.',
      })
      process.exit(1)
    }

    try {
      checks.whoami = await fetchWhoami()
      checks.ok = true
      print({
        ...checks,
        message: `Setup OK. Authenticated as ${checks.whoami.team_user?.full_name ?? 'Unknown'}.`,
      })
    } catch (err) {
      const needsDeploy = String(err.message).includes('404')
      if (needsDeploy) {
        try {
          await hubFetch('/api/cursor/clients?status=active')
          checks.ok = true
          print({
            ...checks,
            whoami_unavailable: true,
            message:
              'Setup OK (token valid). Deploy latest Hub for whoami support — using list-clients fallback.',
          })
          return
        } catch (fallbackErr) {
          err = fallbackErr
        }
      }
      print({
        ...checks,
        ok: false,
        error: err.message,
        message: 'Token or Hub URL invalid. Check APPDOERS_HUB_URL and APPDOERS_CURSOR_TOKEN.',
      })
      process.exit(1)
    }
    return
  }

  if (command === 'list-clients') {
    const params = new URLSearchParams()
    if (args.status) params.set('status', String(args.status))
    const query = params.toString()
    const data = await hubFetch(`/api/cursor/clients${query ? `?${query}` : ''}`)
    print(data)
    return
  }

  if (command === 'list-projects') {
    const params = new URLSearchParams()
    if (args['client-id']) params.set('client_id', String(args['client-id']))
    const query = params.toString()
    const data = await hubFetch(`/api/cursor/projects${query ? `?${query}` : ''}`)
    print(data)
    return
  }

  if (command === 'show-session') {
    const session = readSession()
    if (!session) {
      print({
        session: null,
        message:
          'No active Hub session. Run whoami, ask the user which client/project/team member to use, then run set-session.',
      })
      return
    }

    let tokenOwner = null
    let team_member_mismatch = false
    try {
      const me = await fetchWhoami()
      tokenOwner = me.team_user
      if (session.team_user_id && tokenOwner?.id && session.team_user_id !== tokenOwner.id) {
        team_member_mismatch = true
      }
    } catch {
      // whoami unavailable — still show session
    }

    print({
      session,
      token_owner: tokenOwner,
      team_member_mismatch,
      message: team_member_mismatch
        ? 'Session team member does not match token owner. Run clear-session and set-session again, or update APPDOERS_CURSOR_TOKEN.'
        : 'Active Hub session.',
    })
    return
  }

  if (command === 'set-session') {
    if (!args['client-id']) throw new Error('--client-id is required')
    if (!args['project-id']) throw new Error('--project-id is required')

    let tokenTeamUserId
    let tokenTeamMemberName
    try {
      const me = await fetchWhoami()
      tokenTeamUserId = me.team_user?.id
      tokenTeamMemberName = me.team_user?.full_name ?? 'Unknown'
    } catch (err) {
      if (!args['team-user-id'] || !args['team-member-name']) {
        throw new Error(
          `whoami unavailable (${err.message}). Pass --team-user-id and --team-member-name explicitly, or deploy latest Hub.`
        )
      }
    }

    let teamUserId = args['team-user-id'] ? String(args['team-user-id']) : tokenTeamUserId
    let teamMemberName = args['team-member-name']
      ? String(args['team-member-name'])
      : tokenTeamMemberName

    if (!teamUserId) {
      throw new Error('--team-user-id is required (or run whoami to resolve from token).')
    }

    if (!args.force && tokenTeamUserId && teamUserId !== tokenTeamUserId) {
      throw new Error(
        `Team member ${teamMemberName} (${teamUserId}) does not match token owner ${tokenTeamMemberName} (${tokenTeamUserId}). Use the correct APPDOERS_CURSOR_TOKEN or pass --force.`
      )
    }

    let clientName = args['client-name'] ? String(args['client-name']) : undefined
    let projectName = args['project-name'] ? String(args['project-name']) : undefined

    if (!clientName || !projectName) {
      const clients = await hubFetch('/api/cursor/clients')
      const projects = await hubFetch(`/api/cursor/projects?client_id=${args['client-id']}`)
      clientName =
        clientName ??
        clients.clients?.find((client) => client.id === args['client-id'])?.company_name ??
        'Unknown client'
      projectName =
        projectName ??
        projects.projects?.find((project) => project.id === args['project-id'])?.name ??
        'Unknown project'
    }

    const session = {
      client_id: String(args['client-id']),
      client_name: clientName,
      project_id: String(args['project-id']),
      project_name: projectName,
      team_user_id: teamUserId,
      team_member_name: teamMemberName,
      updated_at: new Date().toISOString(),
    }
    writeSession(session)
    print({ session, message: 'Hub session saved for this project workspace.' })
    return
  }

  if (command === 'clear-session') {
    if (fs.existsSync(sessionFilePath)) fs.unlinkSync(sessionFilePath)
    print({ cleared: true })
    return
  }

  if (command === 'list-tickets') {
    const params = new URLSearchParams()
    const projectId = args['project-id'] ?? readSession()?.project_id
    if (projectId) params.set('project_id', String(projectId))
    if (args.stage) params.set('stage', String(args.stage))
    if (args.limit) params.set('limit', String(args.limit))
    const query = params.toString()
    const data = await hubFetch(`/api/cursor/tickets${query ? `?${query}` : ''}`)
    print(data)
    return
  }

  if (command === 'get-ticket') {
    if (!args['ticket-id']) throw new Error('--ticket-id is required')
    touchTicketTime(args['ticket-id'])
    const data = await hubFetch(`/api/cursor/tickets/${args['ticket-id']}`)
    print(data)
    return
  }

  if (command === 'show-ticket-time') {
    const ticketId = args['ticket-id'] ?? ticketTime.getActiveTicketId()
    if (!ticketId) {
      print({
        active_ticket_id: null,
        ticket_time: null,
        message: 'No active ticket timer. Start with claim-ticket or move-ticket --stage developer.',
      })
      return
    }
    const snapshot = ticketTime.getTicketTime(String(ticketId))
    print({
      active_ticket_id: ticketTime.getActiveTicketId(),
      ticket_time: snapshot,
      message: snapshot
        ? 'Ticket time snapshot (idle gaps over 5 minutes excluded).'
        : 'No tracked time for this ticket yet. Start with claim-ticket or move-ticket --stage developer.',
    })
    return
  }

  if (command === 'flush-ticket-time') {
    if (!args['ticket-id']) throw new Error('--ticket-id is required')
    const description = args.note
      ? String(args.note)
      : 'Cursor active work (auto-logged at request completion)'
    const result = await flushTicketTime(args['ticket-id'], {
      finalize: Boolean(args.finalize),
      description,
    })
    print(result)
    return
  }

  if (command === 'create-ticket') {
    if (!args.title) throw new Error('--title is required')
    const projectId = await resolveProjectId(args['project-id'])
    const assignedTo = resolveSessionAssignee(args['assigned-to'])
    const payload = {
      project_id: projectId,
      title: String(args.title),
      description: args.description ? String(args.description) : undefined,
      type: args.type ? String(args.type) : 'feature',
      priority: args.priority ? String(args.priority) : 'p2',
      stage: args.stage ? String(args.stage) : 'pm',
      note: args.note ? String(args.note) : undefined,
      assigned_to: assignedTo,
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
    const ticketId = String(args['ticket-id'])
    const stage = String(args.stage)
    let timeFlush = null

    if (isFlushStage(stage)) {
      timeFlush = await flushTicketTime(ticketId, {
        finalize: true,
        description: `Cursor active work (auto-logged on move to ${stage})`,
      })
    } else if (isWorkStage(stage)) {
      ticketTime.startTicket(ticketId)
    } else {
      touchTicketTime(ticketId)
    }

    const payload = {
      stage,
      note: args.note ? String(args.note) : undefined,
    }
    const data = await hubFetch(`/api/cursor/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    print(timeFlush ? { ...data, time_logged: timeFlush.time_logged, time_tracking: timeFlush } : data)
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
      throw new Error(
        'Provide at least one field to update: --project-id, --title, --description, --clear-description, --type, --priority, --assigned-to, --clear-assigned'
      )
    }

    touchTicketTime(args['ticket-id'])
    const data = await hubFetch(`/api/cursor/tickets/${args['ticket-id']}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    print(data)
    return
  }

  if (command === 'claim-ticket') {
    if (!args['ticket-id']) throw new Error('--ticket-id is required')
    const ticketId = String(args['ticket-id'])
    const timer = ticketTime.startTicket(ticketId)
    const agentName = resolveSessionAgentName(args['agent-name'])
    const assignedTo = resolveSessionAssignee(args['assigned-to'])
    const claimNote = args.note
      ? String(args.note)
      : `Claimed by ${agentName}. Starting implementation now.`
    const payload = {
      claim: true,
      agent_name: agentName,
      note: claimNote,
      assigned_to: assignedTo,
    }
    const data = await hubFetch(`/api/cursor/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    print({ ...data, time_tracking: { started: true, ...timer } })
    return
  }

  if (command === 'note') {
    if (!args['ticket-id']) throw new Error('--ticket-id is required')
    if (!args.note) throw new Error('--note is required')
    touchTicketTime(args['ticket-id'])
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
