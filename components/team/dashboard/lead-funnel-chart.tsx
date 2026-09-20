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
import { ChartCard } from './chart-card'
import type { CountByLabel } from '@/lib/dashboard/types'

const BAR_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef']

interface Props {
  data: CountByLabel[]
}

export function LeadFunnelChart({ data }: Props) {
  const hasData = data.some((d) => d.value > 0)
  const chartHeight = Math.max(200, data.length * 44)

  return (
    <ChartCard
      title="Lead Pipeline"
      subtitle="Active leads by stage"
      isEmpty={!hasData}
      emptyMessage="No active leads in pipeline"
      className="h-full"
    >
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
            }}
            formatter={(value) => [
              `${Number(value ?? 0)} lead${Number(value ?? 0) !== 1 ? 's' : ''}`,
              'Count',
            ]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
            {data.map((_, index) => (
              <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
