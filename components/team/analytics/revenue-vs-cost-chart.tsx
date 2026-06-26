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

interface Props {
  mrr: number
  monthlySpend: number
}

const COLORS = {
  revenue: '#059669',
  spend: '#ef4444',
  margin: '#2563eb',
}

export function RevenueVsCostChart({ mrr, monthlySpend }: Props) {
  const margin = Math.max(0, mrr - monthlySpend)
  const chartData = [
    { label: 'Revenue (MRR)', value: parseFloat(mrr.toFixed(2)), key: 'revenue' },
    { label: 'Tool Spend', value: parseFloat(monthlySpend.toFixed(2)), key: 'spend' },
    { label: 'Gross Margin', value: parseFloat(margin.toFixed(2)), key: 'margin' },
  ]
  const hasData = mrr > 0 || monthlySpend > 0

  return (
    <ChartCard
      title="Revenue vs Tool Spend"
      subtitle="Monthly comparison (NZD)"
      isEmpty={!hasData}
      emptyMessage="No revenue or subscription data"
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
            }}
            formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Amount']}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
            {chartData.map((entry) => (
              <Cell key={entry.key} fill={COLORS[entry.key as keyof typeof COLORS]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
