import { describe, expect, it } from 'vitest'
import { formatHours, roundHours } from './format'

describe('roundHours', () => {
  it('rounds to 2 decimals', () => {
    expect(roundHours(0.019)).toBe(0.02)
    expect(roundHours(1.234)).toBe(1.23)
    expect(roundHours(1.235)).toBe(1.24)
  })
})

describe('formatHours', () => {
  it('preserves small values that toFixed(1) would hide', () => {
    expect(formatHours(0.02)).toBe('0.02h')
    expect((0.02).toFixed(1)).toBe('0.0')
  })

  it('strips trailing zeros', () => {
    expect(formatHours(1.5)).toBe('1.5h')
    expect(formatHours(2)).toBe('2h')
  })

  it('returns empty for zero', () => {
    expect(formatHours(0)).toBe('—')
    expect(formatHours(0, '0h')).toBe('0h')
  })
})
