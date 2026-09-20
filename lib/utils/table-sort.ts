export type SortDir = 'asc' | 'desc'
export type SortValue = string | number | null | undefined

export function compareSortValues(a: SortValue, b: SortValue, dir: SortDir): number {
  const aEmpty = a == null || a === ''
  const bEmpty = b == null || b === ''
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1

  const mul = dir === 'asc' ? 1 : -1
  if (typeof a === 'number' && typeof b === 'number') {
    if (a === b) return 0
    return (a < b ? -1 : 1) * mul
  }

  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }) * mul
}

export function sortRows<T>(
  rows: T[],
  getValue: (row: T) => SortValue,
  dir: SortDir
): T[] {
  return [...rows].sort((a, b) => compareSortValues(getValue(a), getValue(b), dir))
}
