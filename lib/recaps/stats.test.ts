import { describe, expect, it } from 'vitest'
import { buildRecapStats, parseRecapStats, resolveRecapPlanKey } from './stats'

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
