'use client'

import { ArrowDown, ArrowUp, FileText, ImageIcon, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { groupItemsByPage, type ReviewItemKind } from '@/lib/website-review/types'

export type EditableSection = {
  key: string
  id?: string
  page_name: string
  section_name: string
  kind: ReviewItemKind
  team_note: string | null
}

export function newSectionKey() {
  return `new-${crypto.randomUUID()}`
}

/** Page/section structure editor shared by templates and individual reviews. */
export function SectionsEditor<T extends EditableSection>({
  items,
  onChange,
  makeItem,
  renderExtra,
  disabled,
}: {
  items: T[]
  onChange: (items: T[]) => void
  makeItem: (base: EditableSection) => T
  renderExtra?: (item: T) => React.ReactNode
  disabled?: boolean
}) {
  const ordered = items.map((item, index) => ({ ...item, sort_order: index }))
  const groups = groupItemsByPage(ordered)

  function flatten(next: { page: string; items: T[] }[]) {
    onChange(next.flatMap((g) => g.items))
  }

  function currentGroups() {
    return groups.map((g) => ({ page: g.page, items: g.items.map(({ sort_order: _s, ...rest }) => rest as unknown as T) }))
  }

  function updateItem(key: string, patch: Partial<EditableSection>) {
    onChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  function renamePage(page: string, name: string) {
    onChange(items.map((item) => (item.page_name === page ? { ...item, page_name: name } : item)))
  }

  function movePage(index: number, delta: number) {
    const next = currentGroups()
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    flatten(next)
  }

  function deletePage(index: number) {
    const next = currentGroups()
    next.splice(index, 1)
    flatten(next)
  }

  function moveItem(groupIndex: number, itemIndex: number, delta: number) {
    const next = currentGroups()
    const list = next[groupIndex].items
    const target = itemIndex + delta
    if (target < 0 || target >= list.length) return
    ;[list[itemIndex], list[target]] = [list[target], list[itemIndex]]
    flatten(next)
  }

  function addItem(groupIndex: number, kind: ReviewItemKind) {
    const next = currentGroups()
    const page = next[groupIndex].page
    next[groupIndex].items.push(
      makeItem({
        key: newSectionKey(),
        page_name: page,
        section_name: kind === 'content_request' ? 'Please provide…' : 'New section',
        kind,
        team_note: null,
      })
    )
    flatten(next)
  }

  function addPage() {
    let name = 'New page'
    let n = 2
    while (groups.some((g) => g.page === name)) name = `New page ${n++}`
    onChange([
      ...items,
      makeItem({ key: newSectionKey(), page_name: name, section_name: 'Top section', kind: 'section', team_note: null }),
    ])
  }

  return (
    <div className="space-y-4">
      {groups.map((group, groupIndex) => (
        <div key={`${groupIndex}-${group.page}`} className="rounded-lg border border-slate-200 bg-slate-50/60">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Page</span>
            <input
              className="hub-input max-w-xs flex-1 font-semibold"
              value={group.page}
              disabled={disabled}
              onChange={(e) => renamePage(group.page, e.target.value)}
              aria-label="Page name"
            />
            <div className="ml-auto flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" disabled={disabled || groupIndex === 0} onClick={() => movePage(groupIndex, -1)} aria-label="Move page up">
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" disabled={disabled || groupIndex === groups.length - 1} onClick={() => movePage(groupIndex, 1)} aria-label="Move page down">
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => deletePage(groupIndex)} aria-label="Delete page">
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {group.items.map((item, itemIndex) => (
              <div key={item.key} className="space-y-2 bg-white px-3 py-3">
                <div className="flex flex-wrap items-start gap-2">
                  <span
                    className="mt-2 shrink-0 text-slate-400"
                    title={item.kind === 'content_request' ? 'Content request' : 'Section to review'}
                  >
                    {item.kind === 'content_request' ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                  </span>
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                    <input
                      className="hub-input"
                      value={item.section_name}
                      disabled={disabled}
                      onChange={(e) => updateItem(item.key, { section_name: e.target.value })}
                      placeholder={item.kind === 'content_request' ? 'What do you need from them?' : 'Section name'}
                      aria-label="Section name"
                    />
                    <input
                      className="hub-input"
                      value={item.team_note ?? ''}
                      disabled={disabled}
                      onChange={(e) => updateItem(item.key, { team_note: e.target.value })}
                      placeholder="Note or question for the client (optional)"
                      aria-label="Note for the client"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <select
                      className="hub-input w-auto py-1.5 text-xs"
                      value={item.kind}
                      disabled={disabled}
                      onChange={(e) => updateItem(item.key, { kind: e.target.value as ReviewItemKind })}
                      aria-label="Type"
                    >
                      <option value="section">Review</option>
                      <option value="content_request">Content request</option>
                    </select>
                    <Button type="button" variant="ghost" size="icon" disabled={disabled || itemIndex === 0} onClick={() => moveItem(groupIndex, itemIndex, -1)} aria-label="Move up">
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" disabled={disabled || itemIndex === group.items.length - 1} onClick={() => moveItem(groupIndex, itemIndex, 1)} aria-label="Move down">
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      onClick={() => onChange(items.filter((i) => i.key !== item.key))}
                      aria-label="Delete section"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                {renderExtra ? renderExtra(item as unknown as T) : null}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 px-3 py-2">
            <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => addItem(groupIndex, 'section')}>
              <Plus className="h-3.5 w-3.5" /> Section
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => addItem(groupIndex, 'content_request')}>
              <Plus className="h-3.5 w-3.5" /> Content request
            </Button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" disabled={disabled} onClick={addPage}>
        <Plus className="h-4 w-4" /> Add page
      </Button>
    </div>
  )
}
