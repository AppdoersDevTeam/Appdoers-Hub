'use client'

import { FieldLabel } from '@/components/intake/field'
import { cn } from '@/lib/utils/cn'
import {
  MAINTENANCE_PAGES_NOTE,
  SITE_STRUCTURES,
  type CompanyTypeId,
  type SitePageNode,
} from '@/lib/intake/site-structures'

function PageRow({
  node,
  selected,
  depth,
  onToggle,
}: {
  node: SitePageNode
  selected: string[]
  depth: number
  onToggle: (id: string) => void
}) {
  const isOn = selected.includes(node.id)
  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(node.id)}
        aria-pressed={isOn}
        className={cn(
          'flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
          isOn
            ? 'border-blue-600 bg-blue-50 text-blue-900'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
        )}
        style={{ marginLeft: depth * 16, width: `calc(100% - ${depth * 16}px)` }}
      >
        <span
          className={cn(
            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]',
            isOn ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-transparent'
          )}
        >
          ✓
        </span>
        <span>
          {node.label}
          {node.optional ? <span className="ml-1 text-xs text-slate-500">(Optional)</span> : null}
        </span>
      </button>
      {node.children && node.children.length > 0 && (
        <div className="mt-1.5 space-y-1.5">
          {node.children.map((child) => (
            <PageRow key={child.id} node={child} selected={selected} depth={depth + 1} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  )
}

export function SiteStructurePicker({
  companyType,
  selected,
  onToggle,
}: {
  companyType: CompanyTypeId
  selected: string[]
  onToggle: (id: string) => void
}) {
  const nodes = SITE_STRUCTURES[companyType]
  return (
    <div className="space-y-3">
      <p>
        <FieldLabel help="Tick the pages you want. This is a starting map — we can add or drop pages later.">
          Suggested site structure
        </FieldLabel>
      </p>
      <div className="space-y-1.5">
        {nodes.map((node) => (
          <PageRow key={node.id} node={node} selected={selected} depth={0} onToggle={onToggle} />
        ))}
      </div>
      <p className="text-xs leading-relaxed text-slate-500">{MAINTENANCE_PAGES_NOTE}</p>
    </div>
  )
}
