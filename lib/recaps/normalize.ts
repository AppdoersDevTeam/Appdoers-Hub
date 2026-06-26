import type { RecapWorkItem } from '@/lib/recaps/types'

function parseWorkCompletedValue(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export function normalizeRecapWorkItems(value: unknown): RecapWorkItem[] {
  return parseWorkCompletedValue(value)
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => {
      const description = String(
        item.description ?? item.title ?? item.text ?? item.name ?? ''
      ).trim()
      const category =
        typeof item.category === 'string' && item.category.trim()
          ? item.category
          : 'Other'
      return { description, category }
    })
    .filter((item) => item.description.length > 0)
}
