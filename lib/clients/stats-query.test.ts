import { describe, expect, it } from 'vitest'
import { missingInternalClientColumn } from './stats-query'

describe('missingInternalClientColumn', () => {
  it('detects PostgREST errors for the is_internal column', () => {
    expect(
      missingInternalClientColumn({ message: 'column clients.is_internal does not exist' })
    ).toBe(true)
    expect(missingInternalClientColumn({ message: 'Could not find the is_internal column of clients in the schema cache' })).toBe(true)
    expect(missingInternalClientColumn({ message: 'permission denied' })).toBe(false)
    expect(missingInternalClientColumn(null)).toBe(false)
  })
})
