import { formatCurrency } from '@/lib/utils/format'
import type { TopToolByCost } from '@/lib/analytics/types'

interface Props {
  data: TopToolByCost[]
}

export function TopToolsTable({ data }: Props) {
  return (
    <div className="hub-card overflow-hidden p-0">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Top Tools by Cost</h2>
        <p className="mt-0.5 text-xs text-slate-500">Highest monthly spend across active subscriptions</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {['Tool', 'Category', 'Monthly', '% of Spend'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  No active subscriptions.
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                      {row.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-900">
                    {formatCurrency(row.monthly)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.percentOfSpend.toFixed(1)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
