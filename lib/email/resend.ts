import { Resend } from 'resend'

export const DEFAULT_FROM_EMAIL = 'Appdoers <contact@appdoers.co.nz>'
export const DEFAULT_REPLY_TO = 'contact@appdoers.co.nz'

export interface EmailAttachment {
  filename: string
  content: Buffer
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  text: string
  attachments?: EmailAttachment[]
  from?: string
  replyTo?: string
}

export type SendEmailResult = { ok: true; id: string } | { ok: false; error: string }

let client: Resend | null = null

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  client ??= new Resend(apiKey)
  return client
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const resend = getResend()
  if (!resend) {
    return { ok: false, error: 'Email is not configured: RESEND_API_KEY is missing.' }
  }

  const { data, error } = await resend.emails.send({
    from: input.from ?? process.env.RECAP_FROM_EMAIL ?? DEFAULT_FROM_EMAIL,
    to: input.to,
    replyTo: input.replyTo ?? DEFAULT_REPLY_TO,
    subject: input.subject,
    html: input.html,
    text: input.text,
    attachments: input.attachments?.map((a) => ({ filename: a.filename, content: a.content })),
  })

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Email provider returned no response.' }
  }
  return { ok: true, id: data.id }
}
