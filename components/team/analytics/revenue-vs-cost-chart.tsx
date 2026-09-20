'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartCard } from '@/components/team/dashboard/chart-card'
import { formatCurrency } from '@/lib/utils/format'

interface Props {
  mrr: number
  yearlyRevenue: number
  monthlySpend: number
  yearlySpend: number
  monthlyProfit: number
  yearlyProfit: number
}

export function RevenueVsCostChart({
  mrr,
  yearlyRevenue,
  monthlySpend,
  yearlySpend,
  monthlyProfit,
  yearlyProfit,
}: Props) {
  const chartData = [
    {
      period: 'Monthly',
      Revenue: parseFloat(mrr.toFixed(2)),
      Spend: parseFloat(monthlySpend.toFixed(2)),
      Profit: parseFloat(monthlyProfit.toFixed(2)),
    },
    {
      period: 'Yearly',
      Revenue: parseFloat(yearlyRevenue.toFixed(2)),
      Spend: parseFloat(yearlySpend.toFixed(2)),
      Profit: parseFloat(yearlyProfit.toFixed(2)),
    },
  ]
  const hasData = mrr > 0 || monthlySpend > 0

  return (
    <ChartCard
      title="Revenue vs Tool Spend"
      subtitle="Monthly and yearly profit (NZD)"
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
            dataKey="period"
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
            formatter={(value, name) => [formatCurrency(Number(value ?? 0)), String(name)]}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            iconType="circle"
            iconSize={8}
          />
          <Bar dataKey="Revenue" fill="#059669" radius={[4, 4, 0, 0]} barSize={22} />
          <Bar dataKey="Spend" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={22} />
          <Bar dataKey="Profit" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
