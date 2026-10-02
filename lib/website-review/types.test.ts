import { describe, expect, it } from 'vitest'
import {
  countReview,
  groupItemsByPage,
  itemAnswerError,
  normalizePins,
  normalizeReviewSettings,
  roundLabel,
  type ReviewPin,
} from './types'

const pin = (comment: string, view: 'desktop' | 'mobile' = 'desktop'): ReviewPin => ({ id: comment || 'p', x: 10, y: 20, view, comment })

describe('groupItemsByPage', () => {
  it('groups by page in first-seen order, sorted by sort_order', () => {
    const groups = groupItemsByPage([
      { page_name: 'About', sort_order: 30 },
      { page_name: 'Home', sort_order: 10 },
      { page_name: 'Home', sort_order: 20 },
    ])
    expect(groups.map((g) => [g.page, g.items.length])).toEqual([
      ['Home', 2],
      ['About', 1],
    ])
  })
})

describe('countReview', () => {
  it('counts sections and content requests separately', () => {
    const counts = countReview([
      { kind: 'section', client_status: 'looks_good', pins: [] },
      { kind: 'section', client_status: 'changes', pins: [pin('a'), pin('b')] },
      { kind: 'section', client_status: 'pending', pins: [] },
      { kind: 'content_request', client_status: 'provided', pins: [] },
      { kind: 'content_request', client_status: 'pending', pins: [] },
    ])
    expect(counts).toEqual({ looksGood: 1, changes: 1, notReviewed: 1, requests: 2, requestsProvided: 1, pins: 2 })
  })
})

describe('itemAnswerError', () => {
  const base = { kind: 'section' as const, section_name: 'Hero', client_comment: null, pins: [] as ReviewPin[] }

  it('requires a pin note or comment when changes are requested', () => {
    expect(itemAnswerError({ ...base, client_status: 'changes' })).toMatch(/Hero/)
    expect(itemAnswerError({ ...base, client_status: 'changes', pins: [pin('   ')] })).toMatch(/Hero/)
  })

  it('accepts a pin note, a comment, or any other status', () => {
    expect(itemAnswerError({ ...base, client_status: 'changes', pins: [pin('Bigger logo')] })).toBeNull()
    expect(itemAnswerError({ ...base, client_status: 'changes', client_comment: 'New photo' })).toBeNull()
    expect(itemAnswerError({ ...base, client_status: 'looks_good' })).toBeNull()
    expect(itemAnswerError({ ...base, client_status: 'pending' })).toBeNull()
  })
})

describe('normalizePins', () => {
  it('clamps coordinates, defaults view, drops junk and caps the count', () => {
    const pins = normalizePins([{ id: 'a', x: 150, y: -5, comment: 'hi' }, null, 'x', { id: 'b', x: 50, y: 50, view: 'mobile' }])
    expect(pins).toEqual([
      { id: 'a', x: 100, y: 0, view: 'desktop', comment: 'hi', task_id: null },
      { id: 'b', x: 50, y: 50, view: 'mobile', comment: '', task_id: null },
    ])
    expect(normalizePins(Array.from({ length: 50 }, (_, i) => ({ id: String(i), x: 1, y: 1 })))).toHaveLength(30)
    expect(normalizePins('nope')).toEqual([])
  })
})

describe('normalizeReviewSettings', () => {
  it('falls back to defaults for invalid values', () => {
    expect(normalizeReviewSettings({ turnaround_days: 0, walkthrough_video_url: 5 })).toEqual({ walkthrough_video_url: '', turnaround_days: 5 })
    expect(normalizeReviewSettings({ turnaround_days: '7', walkthrough_video_url: ' https://x.y ' })).toEqual({
      walkthrough_video_url: 'https://x.y',
      turnaround_days: 7,
    })
  })
})

describe('roundLabel', () => {
  it('marks rounds past the included three as extra', () => {
    expect(roundLabel(2)).toBe('Round 2 of 3')
    expect(roundLabel(4)).toBe('Round 4 (extra)')
  })
})
