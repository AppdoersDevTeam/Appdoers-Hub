import fs from 'node:fs'
import path from 'node:path'

/** Maximum single work burst logged on flush (90 minutes). */
export const MAX_BURST_MS = 90 * 60 * 1000

/** Gaps longer than this between CLI touches are treated as idle and not counted. */
export const IDLE_GAP_MS = 5 * 60 * 1000

/** Minimum active time before creating a Hub time entry (0.01h ≈ 36s). */
export const MIN_LOG_HOURS = 0.01

const WORK_STAGES = new Set(['developer'])
const FLUSH_STAGES = new Set(['qa', 'reviewer', 'done'])

export function isWorkStage(stage) {
  return WORK_STAGES.has(String(stage ?? '').toLowerCase())
}

export function isFlushStage(stage) {
  return FLUSH_STAGES.has(String(stage ?? '').toLowerCase())
}

export function createTicketTimeStore(workspaceRoot) {
  const timeFilePath = path.join(workspaceRoot, '.hub-ticket-time.json')

  function readState() {
    if (!fs.existsSync(timeFilePath)) {
      return { active_ticket_id: null, sessions: {} }
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(timeFilePath, 'utf8'))
      return {
        active_ticket_id: parsed.active_ticket_id ?? null,
        sessions: parsed.sessions ?? {},
      }
    } catch {
      return { active_ticket_id: null, sessions: {} }
    }
  }

  function writeState(state) {
    fs.writeFileSync(timeFilePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
  }

  function ensureSession(state, ticketId, nowIso = new Date().toISOString()) {
    if (!state.sessions[ticketId]) {
      state.sessions[ticketId] = {
        started_at: nowIso,
        last_tick_at: nowIso,
        active_ms: 0,
        logged_ms: 0,
      }
    }
    return state.sessions[ticketId]
  }

  function msToHours(ms) {
    return parseFloat((ms / 3_600_000).toFixed(2))
  }

  function tickSession(session, now = Date.now(), { finalizeSlice = false } = {}) {
    const lastTick = new Date(session.last_tick_at).getTime()
    const delta = now - lastTick
    if (delta <= 0) return

    if (finalizeSlice) {
      session.active_ms += Math.min(delta, MAX_BURST_MS)
    } else if (delta < IDLE_GAP_MS) {
      session.active_ms += delta
    }

    session.last_tick_at = new Date(now).toISOString()
  }

  function getUnloggedMs(session) {
    return Math.max(0, session.active_ms - (session.logged_ms ?? 0))
  }

  function startTicket(ticketId) {
    const state = readState()
    const nowIso = new Date().toISOString()

    if (state.active_ticket_id && state.active_ticket_id !== ticketId) {
      const previous = state.sessions[state.active_ticket_id]
      if (previous) tickSession(previous)
    }

    const session = ensureSession(state, ticketId, nowIso)
    if (!session.started_at) session.started_at = nowIso
    session.last_tick_at = nowIso
    state.active_ticket_id = ticketId
    writeState(state)
    return { ticket_id: ticketId, active_ms: session.active_ms, logged_ms: session.logged_ms }
  }

  function touchTicket(ticketId) {
    const state = readState()
    const session = state.sessions[ticketId]
    if (!session) return null
    tickSession(session)
    writeState(state)
    return {
      ticket_id: ticketId,
      active_ms: session.active_ms,
      logged_ms: session.logged_ms,
      unlogged_ms: getUnloggedMs(session),
    }
  }

  function getTicketTime(ticketId) {
    const state = readState()
    const session = state.sessions[ticketId]
    if (!session) return null
    tickSession(session)
    writeState(state)
    return {
      ticket_id: ticketId,
      started_at: session.started_at,
      last_tick_at: session.last_tick_at,
      active_ms: session.active_ms,
      logged_ms: session.logged_ms,
      unlogged_ms: getUnloggedMs(session),
      active_hours: msToHours(session.active_ms),
      unlogged_hours: msToHours(getUnloggedMs(session)),
      active_seconds: Math.round(session.active_ms / 1000),
      unlogged_seconds: Math.round(getUnloggedMs(session) / 1000),
      is_active: state.active_ticket_id === ticketId,
    }
  }

  function prepareFlush(ticketId, { finalize = false } = {}) {
    const state = readState()
    const session = state.sessions[ticketId]
    if (!session) {
      return { hours: 0, active_ms: 0, logged_ms: 0, finalize }
    }

    tickSession(session, Date.now(), { finalizeSlice: true })
    const unloggedMs = getUnloggedMs(session)
    const hours = msToHours(unloggedMs)

    if (hours >= MIN_LOG_HOURS) {
      session.logged_ms = session.active_ms
    }

    const result = {
      hours: hours >= MIN_LOG_HOURS ? hours : 0,
      active_ms: session.active_ms,
      logged_ms: session.logged_ms,
      unlogged_ms_before_flush: unloggedMs,
      finalize,
      below_minimum: hours > 0 && hours < MIN_LOG_HOURS,
    }

    if (finalize) {
      if (state.active_ticket_id === ticketId) state.active_ticket_id = null
      delete state.sessions[ticketId]
    }

    writeState(state)
    return result
  }

  function getActiveTicketId() {
    return readState().active_ticket_id
  }

  return {
    timeFilePath,
    startTicket,
    touchTicket,
    getTicketTime,
    getActiveTicketId,
    prepareFlush,
    msToHours,
  }
}

export async function logTicketHours(hubFetch, ticketId, hours, description) {
  if (hours < MIN_LOG_HOURS) {
    return { skipped: true, reason: 'below_minimum', hours }
  }

  return hubFetch(`/api/cursor/tickets/${ticketId}/time`, {
    method: 'POST',
    body: JSON.stringify({
      hours,
      description: description ?? 'Cursor active work (auto-logged)',
      is_billable: true,
    }),
  })
}
