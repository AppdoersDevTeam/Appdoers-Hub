'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartCard } from '@/components/team/dashboard/chart-card'
import { formatCurrency } from '@/lib/utils/format'
import type { CategorySpend } from '@/lib/analytics/types'

const BAR_COLORS = ['#059669', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#0891b2', '#4f46e5', '#64748b']

interface Props {
  data: CategorySpend[]
}

export function SpendByCategoryChart({ data }: Props) {
  const chartData = data.map((d) => ({
    label: d.category,
    value: parseFloat(d.monthly.toFixed(2)),
  }))
  const hasData = chartData.some((d) => d.value > 0)

  return (
    <ChartCard
      title="Spend by Category"
      subtitle="Active tools normalized to monthly NZD"
      isEmpty={!hasData}
      emptyMessage="No active subscriptions"
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v}`}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            width={88}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
            }}
            formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Monthly']}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
