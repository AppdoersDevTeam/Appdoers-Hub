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

export const FLEX_COLUMN_WIDTH = 240
const MIN_WIDTH = 64

export function resolveColumnWidth(
  col: TableColumnDef,
  widths: Record<string, number>
): number {
  if (widths[col.id] != null) return widths[col.id]
  if (typeof col.defaultWidth === 'number') return col.defaultWidth
  return FLEX_COLUMN_WIDTH
}

function storageKey(tableId: string) {
  // v3: default-hide due/time so Status fits; reset crushed v1/v2 prefs
  return `hub:table:${tableId}:v3`
}

function buildDefaults(columns: TableColumnDef[]): TablePrefs {
  const visible = columns.filter((c) => c.defaultVisible !== false).map((c) => c.id)
  const widths: Record<string, number> = {}
  for (const c of columns) {
    widths[c.id] = resolveColumnWidth(c, {})
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
    for (const col of columns) {
      const stored = parsed.widths?.[col.id]
      if (typeof stored === 'number' && Number.isFinite(stored)) {
        widths[col.id] = Math.max(MIN_WIDTH, Math.round(stored))
      } else {
        widths[col.id] = resolveColumnWidth(col, {})
      }
    }
    return { visible, widths }
  } catch {
    return null
  }
}

export function useTablePrefs(tableId: string, columns: TableColumnDef[]) {
  const defaults = useMemo(() => buildDefaults(columns), [columns])
  const [prefs, setPrefs] = useState<TablePrefs>(defaults)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = parseStored(window.localStorage.getItem(storageKey(tableId)), columns)
    setPrefs(stored ?? defaults)
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- columns identity should be stable module consts
  }, [tableId])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(storageKey(tableId), JSON.stringify(prefs))
    } catch {
      // ignore quota / private mode
    }
  }, [hydrated, prefs, tableId])

  const isVisible = useCallback((id: string) => prefs.visible.includes(id), [prefs.visible])

  const widthFor = useCallback(
    (id: string): number => {
      if (prefs.widths[id] != null) return prefs.widths[id]
      const col = columns.find((c) => c.id === id)
      return col ? resolveColumnWidth(col, {}) : FLEX_COLUMN_WIDTH
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
