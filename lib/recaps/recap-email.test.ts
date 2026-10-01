import { describe, expect, it } from 'vitest'
import { buildRecapEmail, escapeHtml } from './recap-email'

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u

const base = {
  clientName: 'Acme & Co',
  contactName: 'Sam Smith',
  month: 9,
  year: 2026,
  introText: 'Hi Sam,\n\nA big month for your website. The new <b>booking</b> page is live.',
  portalUrl: 'https://hub.example.com/portal/recaps',
  logoUrl: null,
}

describe('buildRecapEmail', () => {
  it('uses the recap introduction verbatim, escaped, with paragraphs kept', () => {
    const email = buildRecapEmail(base)
    expect(email.html).toContain('>Hi Sam,</p>')
    expect(email.html).toContain('The new &lt;b&gt;booking&lt;/b&gt; page is live.')
    expect(email.html).not.toContain('<b>booking</b>')
    expect(email.text.startsWith('Hi Sam,\n\nA big month for your website.')).toBe(true)
  })

  it('falls back to a short greeting when the introduction is empty', () => {
    const email = buildRecapEmail({ ...base, introText: '  ' })
    expect(email.text).toContain('Hi Sam,')
    expect(email.text).toContain('Your September recap is attached.')
  })

  it('has the subject, attachment note, portal link and contact line, and no stats blocks', () => {
    const email = buildRecapEmail(base)
    expect(email.subject).toBe('Your September 2026 recap from Appdoers')
    expect(email.html).toContain('Your full recap is attached as a PDF.')
    expect(email.html).toContain('https://hub.example.com/portal/recaps')
    expect(email.html).toContain('contact@appdoers.co.nz')
    expect(email.html).toContain('Acme &amp; Co')
    expect(email.html).not.toContain('saved you')
  })

  it('contains no emojis', () => {
    const email = buildRecapEmail(base)
    expect(EMOJI.test(email.html)).toBe(false)
    expect(EMOJI.test(email.text)).toBe(false)
    expect(EMOJI.test(email.subject)).toBe(false)
  })
})

describe('escapeHtml', () => {
  it('escapes quotes and angle brackets', () => {
    expect(escapeHtml(`"a" <b> 'c' &`)).toBe('&quot;a&quot; &lt;b&gt; &#39;c&#39; &amp;')
  })
})
