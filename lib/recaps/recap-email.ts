import type { RecapStats, RecapWorkItem } from '@/lib/recaps/types'
import { formatCurrency, formatHours } from '@/lib/utils/format'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const BRAND = {
  primary: '#1dd3b0',
  secondary: '#086375',
  deep: '#3c1642',
  highlight: '#affc41',
  light: '#e6f7f4',
  muted: '#b8e8df',
  slate900: '#0f172a',
  slate600: '#475569',
  slate400: '#94a3b8',
  border: '#e2e8f0',
}

export interface RecapEmailInput {
  clientName: string
  contactName: string | null
  month: number
  year: number
  stats: RecapStats | null
  workItems: RecapWorkItem[]
  comingNext: string | null
  portalUrl: string | null
  logoUrl: string | null
}

export interface RecapEmail {
  subject: string
  html: string
  text: string
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function firstName(contactName: string | null): string | null {
  const name = contactName?.trim()
  return name ? name.split(/\s+/)[0] : null
}

function highlights(stats: RecapStats | null, workItems: RecapWorkItem[]): string[] {
  if (stats && stats.tasks.length > 0) {
    return stats.tasks.slice(0, 3).map((t) => t.title)
  }
  return workItems.slice(0, 3).map((w) => w.description.replace(/\s+—\s+.*$/, ''))
}

function comingNextItems(comingNext: string | null): string[] {
  if (!comingNext?.trim()) return []
  return comingNext
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[•\-*]\s+/.test(line))
    .map((line) => line.replace(/^[•\-*]\s+/, ''))
    .slice(0, 3)
}

function statCell(value: string, label: string): string {
  return `<td width="33%" align="center" style="padding:16px 8px;background:${BRAND.light};border-radius:8px;">
    <div style="font-size:26px;font-weight:700;color:${BRAND.secondary};">${escapeHtml(value)}</div>
    <div style="font-size:12px;color:${BRAND.slate600};margin-top:4px;">${escapeHtml(label)}</div>
  </td>`
}

function listHtml(items: string[]): string {
  return items
    .map(
      (item) =>
        `<tr><td width="18" valign="top" style="font-size:15px;color:${BRAND.secondary};padding:4px 0;line-height:1.5;">&#8226;</td><td style="font-size:15px;color:${BRAND.slate900};padding:4px 0;line-height:1.5;">${escapeHtml(item)}</td></tr>`
    )
    .join('')
}

function sectionHtml(title: string, items: string[]): string {
  if (items.length === 0) return ''
  return `<tr><td style="padding:16px 32px 0;">
    <div style="font-size:16px;font-weight:700;color:${BRAND.deep};margin-bottom:6px;">${escapeHtml(title)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${listHtml(items)}</table>
  </td></tr>`
}

export function buildRecapEmail(input: RecapEmailInput): RecapEmail {
  const monthName = MONTHS[Math.min(12, Math.max(1, input.month)) - 1]
  const period = `${monthName} ${input.year}`
  const name = firstName(input.contactName)
  const stats = input.stats

  const tasksDone = stats ? stats.tasksCompleted : input.workItems.length
  const hours = stats ? stats.hoursLogged : 0
  const milestones = stats?.phasesCompleted.length ?? 0
  const areas = stats?.categories.length ?? new Set(input.workItems.map((w) => w.category)).size
  const savings = stats?.savings && stats.savings.amount > 0 ? stats.savings : null

  const subject = `Your ${period} monthly recap from Appdoers`
  const greeting = name ? `Hi ${name},` : 'Hi there,'
  const intro = `Here is a summary of the work we completed for you in ${monthName}. Your full report is attached as a PDF.`
  const tops = highlights(stats, input.workItems)
  const next = comingNextItems(input.comingNext)
  const savingsLine = savings
    ? `${formatHours(savings.nonBillableHours, '0h')} of work at ${formatCurrency(savings.hourlyRate)} per hour, included in your Full plan at no additional cost.`
    : ''

  const thirdStat =
    milestones > 0
      ? statCell(String(milestones), milestones === 1 ? 'milestone reached' : 'milestones reached')
      : statCell(String(areas), areas === 1 ? 'area of work' : 'areas of work')

  const savingsHtml = savings
    ? `<tr><td style="padding:8px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.deep};border-radius:8px;">
          <tr><td style="padding:24px;">
            <div style="font-size:12px;color:${BRAND.highlight};font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">How much your plan saved you this month</div>
            <div style="font-size:34px;font-weight:700;color:#ffffff;margin-top:8px;">${escapeHtml(formatCurrency(savings.amount))}</div>
            <div style="font-size:14px;color:#e9d5ff;margin-top:6px;line-height:1.5;">${escapeHtml(savingsLine)}</div>
          </td></tr>
        </table>
      </td></tr>`
    : ''

  const buttonHtml = input.portalUrl
    ? `<tr><td style="padding:24px 32px 0;">
        <a href="${escapeHtml(input.portalUrl)}" style="display:inline-block;background:${BRAND.secondary};color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;padding:12px 22px;border-radius:6px;">View in your client portal</a>
      </td></tr>`
    : ''

  const logoHtml = input.logoUrl
    ? `<img src="${escapeHtml(input.logoUrl)}" width="120" alt="Appdoers" style="display:block;border:0;background:#ffffff;border-radius:6px;padding:6px 10px;">`
    : `<div style="font-size:20px;font-weight:700;color:#ffffff;">Appdoers</div>`

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
  <tr><td style="background:${BRAND.secondary};padding:28px 32px;">
    ${logoHtml}
    <div style="font-size:12px;color:${BRAND.primary};font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin-top:20px;">Monthly recap</div>
    <div style="font-size:26px;font-weight:700;color:#ffffff;margin-top:6px;line-height:1.2;">${escapeHtml(period)}</div>
    <div style="font-size:14px;color:${BRAND.muted};margin-top:4px;">${escapeHtml(input.clientName)}</div>
  </td></tr>
  <tr><td style="padding:28px 32px 8px;font-size:15px;line-height:1.6;color:${BRAND.slate600};">
    <div style="color:${BRAND.slate900};">${escapeHtml(greeting)}</div>
    <div style="margin-top:12px;">${escapeHtml(intro)}</div>
  </td></tr>
  <tr><td style="padding:16px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px 0;">
      <tr>
        ${statCell(String(tasksDone), tasksDone === 1 ? 'task completed' : 'tasks completed')}
        ${statCell(formatHours(hours, '0h'), 'of work')}
        ${thirdStat}
      </tr>
    </table>
  </td></tr>
  ${savingsHtml}
  ${sectionHtml('Highlights', tops)}
  ${sectionHtml('Coming up next month', next)}
  <tr><td style="padding:20px 32px 0;font-size:14px;color:${BRAND.slate600};line-height:1.6;">
    The attached report includes a breakdown of where the time was spent and a full list of every task.
  </td></tr>
  ${buttonHtml}
  <tr><td style="padding:24px 32px 32px;font-size:15px;color:${BRAND.slate600};line-height:1.6;">
    If you have any questions, simply reply to this email.<br><br>
    Kind regards,<br><span style="color:${BRAND.slate900};font-weight:600;">The Appdoers team</span>
  </td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid ${BRAND.border};padding:16px 32px;font-size:12px;color:${BRAND.slate400};text-align:center;">
    Appdoers Limited · appdoers.co.nz
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`

  const textLines = [
    greeting,
    '',
    intro,
    '',
    `- ${tasksDone} ${tasksDone === 1 ? 'task' : 'tasks'} completed`,
    `- ${formatHours(hours, '0h')} of work`,
    milestones > 0 ? `- ${milestones} ${milestones === 1 ? 'milestone' : 'milestones'} reached` : null,
    savings
      ? `\nHow much your plan saved you this month: ${formatCurrency(savings.amount)}\n${savingsLine}`
      : null,
    tops.length ? `\nHighlights:\n${tops.map((t) => `- ${t}`).join('\n')}` : null,
    next.length ? `\nComing up next month:\n${next.map((t) => `- ${t}`).join('\n')}` : null,
    input.portalUrl ? `\nYou can also view your recaps in the client portal: ${input.portalUrl}` : null,
    '',
    'If you have any questions, simply reply to this email.',
    '',
    'Kind regards,',
    'The Appdoers team',
  ].filter((line): line is string => line !== null)

  return { subject, html, text: textLines.join('\n') }
}
