'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartCard } from './chart-card'
import type { CountByLabel } from '@/lib/dashboard/types'

interface Props {
  data: CountByLabel[]
  periodLabel: string
}

export function TeamHoursChart({ data, periodLabel }: Props) {
  const hasData = data.some((d) => d.value > 0)

  return (
    <ChartCard
      title="Team Hours"
      subtitle={periodLabel}
      isEmpty={!hasData}
      emptyMessage="No time logged this period"
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            width={72}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
            }}
            formatter={(value) => [`${Number(value ?? 0)}h`, 'Logged']}
          />
          <Bar dataKey="value" fill="#059669" radius={[0, 4, 4, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
