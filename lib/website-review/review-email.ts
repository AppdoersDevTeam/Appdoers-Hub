import { escapeHtml } from '@/lib/recaps/recap-email'
import { INCLUDED_ROUNDS } from './types'

const STYLE = {
  purple: '#5F02DC',
  tint: '#F3ECFD',
  text: '#000000',
  muted: '#595959',
  rule: '#BFBFBF',
  font: 'Arial, Helvetica, sans-serif',
}

const CONTACT_LINE = 'T: +64 22 5060 870 · E: contact@appdoers.co.nz · W: www.appdoers.co.nz'

export interface ReviewEmailInput {
  clientName: string
  contactName: string | null
  roundNumber: number
  reviewUrl: string
  clientDueDate: string | null
}

export interface ReviewEmail {
  subject: string
  html: string
  text: string
}

function firstName(contactName: string | null): string | null {
  const name = contactName?.trim()
  return name ? name.split(/\s+/)[0] : null
}

function formatDueDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function buildReviewEmail(input: ReviewEmailInput): ReviewEmail {
  const name = firstName(input.contactName)
  const roundText =
    input.roundNumber <= INCLUDED_ROUNDS
      ? `feedback round ${input.roundNumber} of ${INCLUDED_ROUNDS}`
      : `feedback round ${input.roundNumber}`
  const subject = `Your new website is ready to look at (${roundText})`
  const due = input.clientDueDate ? formatDueDate(input.clientDueDate) : null

  const lines = [
    name ? `Hi ${name},` : 'Hi there,',
    `Your website is ready for you to have a look at. This is ${roundText}.`,
    'Click the button below. We will walk you through your site one page at a time. For each part, just tell us if you are happy with it or what you would like changed. It takes about 15 minutes, and your answers save as you go.',
    'Please gather everyone\'s feedback and send it to us in one go.',
    due ? `If you can, please send it back by ${due}.` : null,
  ].filter((line): line is string => Boolean(line))

  const paragraphsHtml = lines
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${STYLE.text};">${escapeHtml(p)}</p>`)
    .join('')

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f6;font-family:${STYLE.font};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;font-family:${STYLE.font};">
  <tr><td style="padding:24px 32px 16px;border-bottom:3px solid ${STYLE.purple};">
    <span style="font-size:20px;font-weight:bold;color:${STYLE.purple};">Appdoers</span>
  </td></tr>
  <tr><td style="padding:28px 32px 8px;">
    <div style="font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${STYLE.purple};">Website review</div>
    <div style="font-size:24px;font-weight:bold;color:${STYLE.text};margin-top:6px;">Your website is ready to review</div>
    <div style="font-size:14px;color:${STYLE.muted};margin-top:4px;">${escapeHtml(input.clientName)}</div>
  </td></tr>
  <tr><td style="padding:20px 32px 0;">
    ${paragraphsHtml}
    <p style="margin:24px 0 0;"><a href="${escapeHtml(input.reviewUrl)}" style="display:inline-block;background:${STYLE.purple};color:#ffffff;font-weight:bold;font-size:16px;text-decoration:none;padding:14px 26px;border-radius:6px;">Start my review</a></p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${STYLE.tint};margin-top:24px;">
      <tr><td style="padding:14px 18px;font-size:14px;line-height:1.5;color:${STYLE.text};border-left:3px solid ${STYLE.purple};">
        Stuck? Just reply to this email or call us on +64 22 5060 870. We are happy to help.
      </td></tr>
    </table>
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
    ...lines.flatMap((p) => [p, '']),
    `Start your review: ${input.reviewUrl}`,
    '',
    'Stuck? Just reply to this email or call us on +64 22 5060 870.',
    '',
    'Kind regards,',
    'The Appdoers team',
    '',
    CONTACT_LINE,
  ].join('\n')

  return { subject, html, text }
}
