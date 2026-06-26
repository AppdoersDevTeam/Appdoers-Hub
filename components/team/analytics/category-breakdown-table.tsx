import { formatCurrency } from '@/lib/utils/format'
import type { CategorySpend } from '@/lib/analytics/types'

interface Props {
  data: CategorySpend[]
}

export function CategoryBreakdownTable({ data }: Props) {
  return (
    <div className="hub-card overflow-hidden p-0">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Category Breakdown</h2>
        <p className="mt-0.5 text-xs text-slate-500">Monthly and projected yearly spend by category</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {['Category', 'Monthly', 'Yearly (proj.)', '% of Spend', 'Tools'].map((h) => (
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
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No active subscriptions.
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.category} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.category}</td>
                  <td className="px-4 py-3 font-mono text-slate-900">
                    {formatCurrency(row.monthly)}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {formatCurrency(row.yearly)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.percentOfSpend.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.toolCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
