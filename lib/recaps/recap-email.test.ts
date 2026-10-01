import { describe, expect, it } from 'vitest'
import { buildRecapEmail, escapeHtml } from './recap-email'
import { buildRecapStats } from './stats'

function stats(plan: 'full' | 'basic') {
  return buildRecapStats({
    month: 9,
    year: 2026,
    plan,
    tasksCompleted: 1,
    phasesCompleted: [],
    tasks: [{ id: 'a', title: '<b>Homepage</b>', type: 'design', status: 'closed', isBillable: false, projectName: null }],
    entries: [{ taskId: 'a', hours: 2, date: '2026-09-03', isBillable: false }],
  })
}

const base = {
  clientName: 'Acme & Co',
  contactName: 'Sam Smith',
  month: 9,
  year: 2026,
  workItems: [],
  comingNext: "Here's what's next:\n\n• Launch blog\n• New gallery",
  portalUrl: 'https://hub.example.com/portal/recaps',
  logoUrl: null,
}

describe('buildRecapEmail', () => {
  it('includes the savings callout only for Full plans', () => {
    const full = buildRecapEmail({ ...base, stats: stats('full') })
    expect(full.html).toContain('How much your plan saved you this month')
    expect(full.text).toContain('$98.00')

    const basic = buildRecapEmail({ ...base, stats: stats('basic') })
    expect(basic.html).not.toContain('How much your plan saved you')
    expect(basic.text).not.toContain('saved you')
  })

  it('escapes client-provided content', () => {
    const email = buildRecapEmail({ ...base, stats: stats('full') })
    expect(email.html).toContain('&lt;b&gt;Homepage&lt;/b&gt;')
    expect(email.html).toContain('Acme &amp; Co')
    expect(email.html).not.toContain('<b>Homepage</b>')
  })

  it('greets by first name and teases coming-next bullets', () => {
    const email = buildRecapEmail({ ...base, stats: stats('basic') })
    expect(email.subject).toContain('September')
    expect(email.html).toContain('Hi Sam')
    expect(email.text).toContain('- Launch blog')
    expect(email.html).toContain('https://hub.example.com/portal/recaps')
  })
})

describe('escapeHtml', () => {
  it('escapes quotes and angle brackets', () => {
    expect(escapeHtml(`"a" <b> 'c' &`)).toBe('&quot;a&quot; &lt;b&gt; &#39;c&#39; &amp;')
  })
})
