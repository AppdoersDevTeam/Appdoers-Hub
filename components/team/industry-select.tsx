'use client'

import { INDUSTRY_OPTIONS, industryLabel, isIndustryId, normalizeIndustry, type IndustryId } from '@/lib/industries'
import { cn } from '@/lib/utils/cn'

export function IndustrySelect({
  value,
  onChange,
  className,
  allowEmpty = true,
  emptyLabel = 'Select…',
}: {
  value: string
  onChange: (storedLabel: string) => void
  className?: string
  allowEmpty?: boolean
  emptyLabel?: string
}) {
  const selected = normalizeIndustry(value)
  return (
    <select
      className={cn(className)}
      value={selected}
      onChange={(e) => {
        const next = e.target.value
        onChange(isIndustryId(next) ? industryLabel(next as IndustryId)! : '')
      }}
    >
      {allowEmpty && <option value="">{emptyLabel}</option>}
      {INDUSTRY_OPTIONS.map((item) => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </select>
  )
}
