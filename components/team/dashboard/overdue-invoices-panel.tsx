import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { ActionPanel } from './action-panel'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { OverdueInvoiceItem } from '@/lib/dashboard/types'

interface Props {
  items: OverdueInvoiceItem[]
  totalCount: number
}

export function OverdueInvoicesPanel({ items, totalCount }: Props) {
  return (
    <ActionPanel
      title="Overdue Invoices"
      count={totalCount}
      viewAllHref="/app/invoices?status=overdue"
      borderAccent="border-l-red-500"
      icon={<AlertCircle className="h-4 w-4 text-red-600" />}
      emptyMessage="No overdue invoices"
      isEmpty={items.length === 0}
    >
      {items.map((inv) => (
        <div key={inv.id} className="flex items-center justify-between py-2">
          <div>
            <Link
              href={`/app/invoices/${inv.id}`}
              className="text-sm font-mono font-medium text-slate-900 hover:text-blue-600 transition-colors"
            >
              {inv.invoiceNumber}
            </Link>
            <p className="text-xs text-slate-500">
              {inv.clientName} · Due {formatDate(inv.dueDate)}
            </p>
          </div>
          <span className="text-sm font-semibold text-red-600">
            {formatCurrency(inv.total)}
          </span>
        </div>
      ))}
    </ActionPanel>
  )
}
