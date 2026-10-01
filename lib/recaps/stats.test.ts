import { describe, expect, it } from 'vitest'
import { buildRecapStats, computeTurnaround, parseRecapStats, resolveRecapPlanKey } from './stats'

const tasks = [
  { id: 'a', title: 'Homepage design', type: 'design', status: 'closed', isBillable: false, projectName: 'Site' },
  { id: 'b', title: 'Shop filters', type: 'feature', status: 'in_progress', isBillable: true, projectName: 'Shop' },
  { id: 'c', title: 'Fix form', type: 'bug', status: 'closed', isBillable: false, projectName: 'Site' },
]

const entries = [
  { taskId: 'a', hours: 4, date: '2026-09-02', isBillable: true },
  { taskId: 'b', hours: 6, date: '2026-09-10', isBillable: false },
  { taskId: 'c', hours: 1.5, date: '2026-09-30', isBillable: false },
  { taskId: null, hours: 1, date: '2026-09-15', isBillable: false },
]

function build(plan: 'full' | 'basic' | 'none') {
  return buildRecapStats({ month: 9, year: 2026, plan, tasksCompleted: 2, phasesCompleted: [], tasks, entries })
}

describe('buildRecapStats', () => {
  it('computes Full plan savings from non-billable hours using the task flag', () => {
    const stats = build('full')
    // a (task non-billable, entry flag ignored) 4 + c 1.5 + untasked non-billable 1 = 6.5
    expect(stats.savings).toEqual({ nonBillableHours: 6.5, hourlyRate: 49, amount: 318.5 })
    expect(stats.hoursLogged).toBe(12.5)
  })

  it('omits savings for non-Full plans', () => {
    expect(build('basic').savings).toBeNull()
    expect(build('none').savings).toBeNull()
  })

  it('groups hours by category with untracked time under Other', () => {
    const stats = build('full')
    expect(stats.categories).toEqual([
      { name: 'Development', tasks: 1, hours: 6 },
      { name: 'Design', tasks: 1, hours: 4 },
      { name: 'Maintenance', tasks: 1, hours: 1.5 },
      { name: 'Other', tasks: 0, hours: 1 },
    ])
    expect(stats.tasks.map((t) => t.title)).toEqual(['Shop filters', 'Homepage design', 'Fix form'])
  })

  it('buckets hours by week and folds a short tail into the last week', () => {
    const stats = build('full')
    expect(stats.weeklyHours).toEqual([
      { label: '1–7', hours: 4 },
      { label: '8–14', hours: 6 },
      { label: '15–21', hours: 1 },
      { label: '22–30', hours: 1.5 },
    ])
  })
})

describe('previous month comparison', () => {
  it('carries previous totals through and defaults to null', () => {
    const withPrev = buildRecapStats({
      month: 9, year: 2026, plan: 'basic', tasksCompleted: 2, phasesCompleted: [], tasks, entries,
      previous: { tasksCompleted: 5, hoursLogged: 8.25 },
    })
    expect(withPrev.previous).toEqual({ tasksCompleted: 5, hoursLogged: 8.25 })
    expect(build('basic').previous).toBeNull()
  })

  it('parses snapshots saved before previous existed as null', () => {
    const legacy = JSON.parse(JSON.stringify(build('full')))
    delete legacy.previous
    expect(parseRecapStats(legacy)?.previous).toBeNull()
  })
})

describe('year to date and account details', () => {
  it('stores and parses ytd and account snapshots', () => {
    const stats = buildRecapStats({
      month: 9, year: 2026, plan: 'full', tasksCompleted: 2, phasesCompleted: [], tasks, entries,
      ytd: { tasksCompleted: 40, hoursLogged: 80, savings: 1960 },
      account: {
        planName: 'Full Website',
        renewalDate: null,
        monthsRemaining: null,
        addOns: [],
        domains: [
          { domain: 'a.co.nz', sslStatus: 'active' },
          { domain: 'b.co.nz', sslStatus: null },
        ],
      },
    })
    const parsed = parseRecapStats(JSON.parse(JSON.stringify(stats)))
    expect(parsed?.ytd).toEqual({ tasksCompleted: 40, hoursLogged: 80, savings: 1960 })
    expect(parsed?.account?.domains.map((d) => d.domain)).toEqual(['a.co.nz', 'b.co.nz'])
    expect(build('basic').ytd).toBeNull()
    expect(build('basic').account).toBeNull()
  })
})

describe('legacy snapshots', () => {
  it('converts a single saved domain into the domains list', () => {
    const legacy = JSON.parse(JSON.stringify(build('full')))
    legacy.account = { planName: 'Full', renewalDate: null, monthsRemaining: null, addOns: [], domain: 'old.co.nz', sslStatus: 'active' }
    delete legacy.trend
    const parsed = parseRecapStats(legacy)
    expect(parsed?.account?.domains).toEqual([{ domain: 'old.co.nz', sslStatus: 'active' }])
    expect(parsed?.trend).toEqual([])
  })
})

describe('computeTurnaround', () => {
  it('averages creation-to-completion time and finds the fastest task', () => {
    const result = computeTurnaround([
      { title: 'Slow', createdAt: '2026-09-01T00:00:00Z', closedAt: '2026-09-03T00:00:00Z' },
      { title: 'Quick', createdAt: '2026-09-10T09:00:00Z', closedAt: '2026-09-10T11:00:00Z' },
      { title: 'No dates', createdAt: null, closedAt: '2026-09-10T11:00:00Z' },
    ])
    expect(result).toEqual({ averageHours: 25, fastestHours: 2, fastestTitle: 'Quick', count: 2 })
  })

  it('returns null when no task has both dates', () => {
    expect(computeTurnaround([{ title: 'x', createdAt: null, closedAt: null }])).toBeNull()
  })
})

describe('resolveRecapPlanKey', () => {
  it('prefers catalog plan key and falls back to subscription plan', () => {
    expect(resolveRecapPlanKey({ catalogPlanKey: 'full', subscriptionPlan: 'basic' })).toBe('full')
    expect(resolveRecapPlanKey({ catalogPlanKey: null, subscriptionPlan: 'basic' })).toBe('basic')
    expect(resolveRecapPlanKey({})).toBe('none')
    expect(resolveRecapPlanKey({ subscriptionPlan: 'enterprise' })).toBe('none')
  })
})

describe('parseRecapStats', () => {
  it('round-trips a snapshot and rejects unknown shapes', () => {
    const stats = build('full')
    expect(parseRecapStats(JSON.parse(JSON.stringify(stats)))).toEqual(stats)
    expect(parseRecapStats(null)).toBeNull()
    expect(parseRecapStats({ version: 2 })).toBeNull()
  })
})
