'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { DASHBOARD_PERIODS, type DashboardPeriod } from '@/lib/dashboard/periods'

interface Props {
  current: DashboardPeriod
}

export function PeriodToggle({ current }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const setPeriod = (period: DashboardPeriod) => {
    const params = new URLSearchParams(searchParams.toString())
    if (period === 'month') {
      params.delete('period')
    } else {
      params.set('period', period)
    }
    const query = params.toString()
    router.push(query ? `/app/dashboard?${query}` : '/app/dashboard')
  }

  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
      {DASHBOARD_PERIODS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setPeriod(value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            current === value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
