import Link from 'next/link'
import { Phone } from 'lucide-react'
import { ActionPanel } from './action-panel'
import { formatDate } from '@/lib/utils/format'
import type { FollowUpItem } from '@/lib/dashboard/types'

interface Props {
  items: FollowUpItem[]
}

export function FollowUpsPanel({ items }: Props) {
  return (
    <ActionPanel
      title="Follow-ups Due"
      count={items.length}
      viewAllHref="/app/leads"
      borderAccent="border-l-amber-500"
      icon={<Phone className="h-4 w-4 text-amber-600" />}
      emptyMessage="No follow-ups due today"
      isEmpty={items.length === 0}
    >
      {items.map((lead) => (
        <div key={lead.id} className="flex items-start justify-between gap-2 py-2">
          <div className="min-w-0">
            <Link
              href="/app/leads"
              className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors"
            >
              {lead.companyName}
            </Link>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
              {lead.nextAction ?? `Follow up with ${lead.contactName}`}
            </p>
          </div>
          <span className="shrink-0 text-xs text-slate-500">
            {formatDate(lead.nextActionDate)}
          </span>
        </div>
      ))}
    </ActionPanel>
  )
}
