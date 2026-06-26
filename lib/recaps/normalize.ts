import type { RecapWorkItem } from '@/lib/recaps/types'

export function normalizeRecapWorkItems(value: unknown): RecapWorkItem[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      description: String(item.description ?? '').trim(),
      category: typeof item.category === 'string' && item.category.trim() ? item.category : 'Other',
    }))
    .filter((item) => item.description.length > 0)
}
