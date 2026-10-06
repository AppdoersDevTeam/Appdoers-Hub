import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { PartnershipLine, PartnershipProfit } from '@/lib/analytics/partnership'

interface Props {
  data: PartnershipProfit
}

function profitTone(amount: number): string {
  return amount >= 0 ? 'text-emerald-700' : 'text-red-600'
}

function SumRow({
  label,
  value,
  sign,
  strong,
  tone,
}: {
  label: string
  value: number
  sign?: '+' | '−' | '='
  strong?: boolean
  tone?: string
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 py-1.5', strong && 'border-t border-slate-200 pt-2')}>
      <span className={cn('text-sm', strong ? 'font-semibold text-slate-900' : 'text-slate-600')}>
        {sign && <span className="mr-1.5 inline-block w-3 text-slate-500">{sign}</span>}
        {label}
      </span>
      <span className={cn('font-mono text-sm', strong ? 'font-semibold' : '', tone ?? 'text-slate-900')}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

function LineList({ title, lines, empty }: { title: string; lines: PartnershipLine[]; empty: string }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{title}</h3>
      {lines.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {lines.map((line) => (
            <li key={line.id} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="min-w-0 truncate text-slate-700">{line.name}</span>
              <span className="shrink-0 font-mono text-slate-900">{formatCurrency(line.monthly)}/mo</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function PartnershipProfitCard({ data }: Props) {
  const { excluded } = data
  const excludedCount = excluded.clients.length + excluded.subscriptions.length

  return (
    <div className="hub-card space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Per month</h3>
          <SumRow label="Clients" value={data.monthlyRevenue} />
          <SumRow label="Expenses" value={data.monthlyExpenses} sign="−" />
          <SumRow label="Profit" value={data.monthlyProfit} sign="=" strong tone={profitTone(data.monthlyProfit)} />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ShareTile name="Sara" amount={data.monthlyShare} period="/mo" />
            <ShareTile name="Fabiano" amount={data.monthlyShare} period="/mo" />
          </div>
        </div>
        <div>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">This year ({data.year})</h3>
          <SumRow label="Clients (recurring × 12)" value={data.recurringYearlyRevenue} />
          <SumRow label={`Setup fees (started ${data.year})`} value={data.setupFeesThisYear} sign="+" />
          <SumRow label="Expenses" value={data.yearlyExpenses} sign="−" />
          <SumRow label="Profit" value={data.yearlyProfit} sign="=" strong tone={profitTone(data.yearlyProfit)} />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ShareTile name="Sara" amount={data.yearlyShare} period="/yr" />
            <ShareTile name="Fabiano" amount={data.yearlyShare} period="/yr" />
          </div>
        </div>
      </div>

      <details className="rounded-md border border-slate-200">
        <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-slate-700">
          What&apos;s included ({data.clients.length} client{data.clients.length !== 1 ? 's' : ''},{' '}
          {data.subscriptions.length} subscription{data.subscriptions.length !== 1 ? 's' : ''})
        </summary>
        <div className="grid grid-cols-1 gap-5 border-t border-slate-200 px-3 py-3 md:grid-cols-2">
          <LineList title="Clients" lines={data.clients} empty="No shared paying clients." />
          <LineList title="Subscriptions" lines={data.subscriptions} empty="No shared subscriptions." />
        </div>
      </details>

      <details className="rounded-md border border-slate-200">
        <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-slate-700">
          Fabiano-only (excluded) — {excludedCount === 0 ? 'none' : (
            <>
              {formatCurrency(excluded.monthlyRevenue)}/mo clients, {formatCurrency(excluded.monthlyExpenses)}/mo subs
            </>
          )}
        </summary>
        <div className="grid grid-cols-1 gap-5 border-t border-slate-200 px-3 py-3 md:grid-cols-2">
          <LineList title="Clients" lines={excluded.clients} empty="No Fabiano-only clients." />
          <LineList title="Subscriptions" lines={excluded.subscriptions} empty="No Fabiano-only subscriptions." />
        </div>
      </details>
    </div>
  )
}

function ShareTile({ name, amount, period }: { name: string; amount: number; period: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{name} · 50%</p>
      <p className={cn('font-mono text-base font-semibold', profitTone(amount))}>
        {formatCurrency(amount)}
        <span className="text-xs font-normal text-slate-500">{period}</span>
      </p>
    </div>
  )
}
