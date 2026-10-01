const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Matches the library contract documents. */
const STYLE = {
  purple: '#5F02DC',
  tint: '#F3ECFD',
  text: '#000000',
  muted: '#595959',
  rule: '#BFBFBF',
  font: 'Arial, Helvetica, sans-serif',
}

const CONTACT_LINE = 'T: +64 22 5060 870 · E: contact@appdoers.co.nz · W: www.appdoers.co.nz'
const ADDRESS_LINE = '49 Braebrook Drive, Netherby, Ashburton 7700, New Zealand'

export interface RecapEmailInput {
  clientName: string
  contactName: string | null
  month: number
  year: number
  /** The recap's Introduction text, shown verbatim (same as the PDF). */
  introText: string | null
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

function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function buildRecapEmail(input: RecapEmailInput): RecapEmail {
  const monthName = MONTHS[Math.min(12, Math.max(1, input.month)) - 1]
  const period = `${monthName} ${input.year}`
  const subject = `Your ${period} recap from Appdoers`

  const name = firstName(input.contactName)
  const intro = input.introText?.trim()
    ? input.introText.trim()
    : `${name ? `Hi ${name},` : 'Hi there,'}\n\nYour ${monthName} recap is attached.`
  const introParagraphs = paragraphs(intro)

  const introHtml = introParagraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${STYLE.text};">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`
    )
    .join('')

  const logoHtml = input.logoUrl
    ? `<img src="${escapeHtml(input.logoUrl)}" width="140" alt="Appdoers" style="display:block;border:0;">`
    : `<span style="font-size:20px;font-weight:bold;color:${STYLE.purple};">Appdoers</span>`

  const buttonHtml = input.portalUrl
    ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(input.portalUrl)}" style="display:inline-block;background:${STYLE.purple};color:#ffffff;font-weight:bold;font-size:14px;text-decoration:none;padding:12px 22px;border-radius:4px;">View in your client portal</a></p>`
    : ''

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f6;font-family:${STYLE.font};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;font-family:${STYLE.font};">
  <tr><td style="padding:24px 32px 16px;border-bottom:3px solid ${STYLE.purple};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td valign="middle">${logoHtml}</td>
      <td valign="middle" align="right" style="font-size:11px;line-height:1.5;color:${STYLE.muted};">
        <span style="color:${STYLE.purple};font-weight:bold;">Appdoers.co.nz</span><br>${escapeHtml(ADDRESS_LINE)}
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:28px 32px 8px;">
    <div style="font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${STYLE.purple};">Monthly recap</div>
    <div style="font-size:26px;font-weight:bold;color:${STYLE.text};margin-top:6px;">Your ${escapeHtml(period)} Recap</div>
    <div style="font-size:14px;color:${STYLE.muted};margin-top:4px;">${escapeHtml(input.clientName)}</div>
  </td></tr>
  <tr><td style="padding:20px 32px 0;">
    ${introHtml}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${STYLE.tint};margin-top:8px;">
      <tr><td style="padding:14px 18px;font-size:14px;line-height:1.5;color:${STYLE.text};border-left:3px solid ${STYLE.purple};">
        Your full recap is attached as a PDF.
      </td></tr>
    </table>
    ${buttonHtml}
  </td></tr>
  <tr><td style="padding:28px 32px 32px;font-size:15px;line-height:1.6;color:${STYLE.text};">
    Kind regards,<br><strong>The Appdoers team</strong>
  </td></tr>
  <tr><td style="padding:14px 32px;border-top:1px solid ${STYLE.rule};font-size:11px;color:${STYLE.muted};text-align:center;">
    ${escapeHtml(CONTACT_LINE)}
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`

  const text = [
    ...introParagraphs.flatMap((p) => [p, '']),
    'Your full recap is attached as a PDF.',
    input.portalUrl ? `You can also view it in your client portal: ${input.portalUrl}` : null,
    '',
    'Kind regards,',
    'The Appdoers team',
    '',
    CONTACT_LINE,
  ]
    .filter((line): line is string => line !== null)
    .join('\n')

  return { subject, html, text }
}
