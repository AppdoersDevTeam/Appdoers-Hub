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
  companyMonthlySpend: number
  clientMonthlySpend: number
  runRateAfterCompanyTools: number
}

export function RevenueVsCostChart({
  mrr,
  companyMonthlySpend,
  clientMonthlySpend,
  runRateAfterCompanyTools,
}: Props) {
  const chartData = [
    {
      label: 'Monthly run-rate',
      Revenue: parseFloat(mrr.toFixed(2)),
      'Company spend': parseFloat(companyMonthlySpend.toFixed(2)),
      'Client spend': parseFloat(clientMonthlySpend.toFixed(2)),
      'After company tools': parseFloat(runRateAfterCompanyTools.toFixed(2)),
    },
  ]
  const hasData = mrr > 0 || companyMonthlySpend > 0 || clientMonthlySpend > 0

  return (
    <ChartCard
      title="Revenue vs Tool Spend"
      subtitle="Monthly run-rate. Client tools are pass-through and not subtracted."
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
            formatter={(value, name) => [formatCurrency(Number(value ?? 0)), String(name)]}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            iconType="circle"
            iconSize={8}
          />
          <Bar dataKey="Revenue" fill="#059669" radius={[4, 4, 0, 0]} barSize={18} />
          <Bar dataKey="Company spend" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={18} />
          <Bar dataKey="Client spend" fill="#d97706" radius={[4, 4, 0, 0]} barSize={18} />
          <Bar dataKey="After company tools" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
