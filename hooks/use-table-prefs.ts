'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

export type TableColumnDef = {
  id: string
  label: string
  /** Pixel width when set; omit for flexible title columns */
  defaultWidth?: number
  defaultVisible?: boolean
  /** When false, column cannot be hidden (e.g. actions) */
  hideable?: boolean
  sortable?: boolean
}

export type TablePrefs = {
  visible: string[]
  widths: Record<string, number>
}

const MIN_WIDTH = 80

function storageKey(tableId: string) {
  return `hub:table:${tableId}:v1`
}

function buildDefaults(columns: TableColumnDef[]): TablePrefs {
  const visible = columns
    .filter((c) => c.defaultVisible !== false)
    .map((c) => c.id)
  const widths: Record<string, number> = {}
  for (const c of columns) {
    if (typeof c.defaultWidth === 'number') widths[c.id] = c.defaultWidth
  }
  return { visible, widths }
}

function parseStored(raw: string | null, columns: TableColumnDef[]): TablePrefs | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<TablePrefs>
    if (!parsed || !Array.isArray(parsed.visible)) return null
    const ids = new Set(columns.map((c) => c.id))
    const required = columns.filter((c) => c.hideable === false).map((c) => c.id)
    const visible = parsed.visible.filter((id) => ids.has(id))
    for (const id of required) {
      if (!visible.includes(id)) visible.push(id)
    }
    if (visible.length === 0) return null
    const widths: Record<string, number> = {}
    if (parsed.widths && typeof parsed.widths === 'object') {
      for (const [id, w] of Object.entries(parsed.widths)) {
        if (ids.has(id) && typeof w === 'number' && Number.isFinite(w)) {
          widths[id] = Math.max(MIN_WIDTH, Math.round(w))
        }
      }
    }
    return { visible, widths }
  } catch {
    return null
  }
}

export function useTablePrefs(tableId: string, columns: TableColumnDef[]) {
  // Prefer module-level column arrays so this identity stays stable across renders.
  const defaults = useMemo(() => buildDefaults(columns), [columns])
  const [prefs, setPrefs] = useState<TablePrefs>(defaults)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = parseStored(window.localStorage.getItem(storageKey(tableId)), columns)
    setPrefs(stored ?? defaults)
    setHydrated(true)
    // Re-hydrate when table id changes; columns are expected to be stable module consts.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- columns identity should be stable
  }, [tableId])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(storageKey(tableId), JSON.stringify(prefs))
    } catch {
      // ignore quota / private mode
    }
  }, [hydrated, prefs, tableId])

  const isVisible = useCallback(
    (id: string) => prefs.visible.includes(id),
    [prefs.visible]
  )

  const widthFor = useCallback(
    (id: string): number | undefined => {
      if (prefs.widths[id] != null) return prefs.widths[id]
      const col = columns.find((c) => c.id === id)
      return col?.defaultWidth
    },
    [prefs.widths, columns]
  )

  const setVisible = useCallback((nextVisible: string[]) => {
    setPrefs((prev) => ({ ...prev, visible: nextVisible }))
  }, [])

  const toggleVisible = useCallback(
    (id: string) => {
      const col = columns.find((c) => c.id === id)
      if (!col || col.hideable === false) return
      setPrefs((prev) => {
        const has = prev.visible.includes(id)
        if (has) {
          const next = prev.visible.filter((v) => v !== id)
          // Keep at least one data column visible
          if (next.length === 0) return prev
          return { ...prev, visible: next }
        }
        return { ...prev, visible: [...prev.visible, id] }
      })
    },
    [columns]
  )

  const setWidth = useCallback((id: string, width: number) => {
    setPrefs((prev) => ({
      ...prev,
      widths: { ...prev.widths, [id]: Math.max(MIN_WIDTH, Math.round(width)) },
    }))
  }, [])

  const reset = useCallback(() => {
    setPrefs(defaults)
  }, [defaults])

  const visibleColumns = useMemo(
    () => columns.filter((c) => prefs.visible.includes(c.id)),
    [columns, prefs.visible]
  )

  return {
    prefs,
    hydrated,
    visibleColumns,
    isVisible,
    widthFor,
    setVisible,
    toggleVisible,
    setWidth,
    reset,
    minWidth: MIN_WIDTH,
  }
}
