import Link from 'next/link'
import { MessagesSquare } from 'lucide-react'
import { ActionPanel } from './action-panel'
import { formatDate } from '@/lib/utils/format'
import type { FeedbackRoundItem } from '@/lib/website-review/dashboard'

const GROUP_LABEL: Record<FeedbackRoundItem['group'], { label: string; cls: string }> = {
  overdue: { label: 'Overdue', cls: 'text-red-600' },
  awaiting_us: { label: 'Awaiting us', cls: 'text-amber-600' },
  awaiting_client: { label: 'Awaiting client', cls: 'text-slate-500' },
}

export function FeedbackRoundsPanel({ items }: { items: FeedbackRoundItem[] }) {
  const needsUs = items.filter((i) => i.group !== 'awaiting_client').length
  return (
    <ActionPanel
      title="Website feedback rounds"
      count={needsUs}
      borderAccent="border-l-violet-500"
      icon={<MessagesSquare className="h-4 w-4 text-violet-600" />}
      emptyMessage="No open feedback rounds"
      isEmpty={items.length === 0}
    >
      {items.slice(0, 8).map((item) => {
        const group = GROUP_LABEL[item.group]
        return (
          <div key={item.id} className="flex items-start justify-between gap-2 py-2">
            <div className="min-w-0">
              <Link
                href={`/app/clients/${item.clientId}?tab=reviews&review=${item.id}`}
                className="line-clamp-1 text-sm font-medium text-slate-900 transition-colors hover:text-blue-600"
              >
                {item.clientName} · Round {item.roundNumber}
              </Link>
              <p className="mt-0.5 text-xs text-slate-500">
                {item.group === 'awaiting_client' ? `Sent ${item.days}d ago` : `Received ${item.days}d ago`}
                {item.ownerName ? ` · ${item.ownerName}` : ''}
                {item.dueDate && item.group !== 'awaiting_client' ? ` · due ${formatDate(item.dueDate)}` : ''}
              </p>
            </div>
            <span className={`shrink-0 text-xs font-medium ${group.cls}`}>{group.label}</span>
          </div>
        )
      })}
    </ActionPanel>
  )
}
