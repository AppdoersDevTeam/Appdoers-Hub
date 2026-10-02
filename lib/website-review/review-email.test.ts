import { describe, expect, it } from 'vitest'
import { buildReviewEmail } from './review-email'

describe('buildReviewEmail', () => {
  const base = {
    clientName: 'Ashburton Baptist <Church>',
    contactName: 'Jane Smith',
    roundNumber: 2,
    reviewUrl: 'https://hub.example/review/rev_abc',
    clientDueDate: null,
  }

  it('greets by first name, names the round and links the review', () => {
    const email = buildReviewEmail(base)
    expect(email.subject).toContain('round 2 of 3')
    expect(email.text).toContain('Hi Jane,')
    expect(email.text).toContain('https://hub.example/review/rev_abc')
    expect(email.html).toContain('href="https://hub.example/review/rev_abc"')
  })

  it('escapes the client name in HTML', () => {
    expect(buildReviewEmail(base).html).toContain('Ashburton Baptist &lt;Church&gt;')
  })

  it('includes the reply-by date when set and drops "of 3" for extra rounds', () => {
    const email = buildReviewEmail({ ...base, roundNumber: 4, clientDueDate: '2026-10-09' })
    expect(email.subject).toContain('feedback round 4)')
    expect(email.text).toMatch(/send it back by .*October/)
  })
})
