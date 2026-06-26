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

const STAGE_COLORS: Record<string, string> = {
  pm: '#64748b',
  designer: '#9333ea',
  developer: '#2563eb',
  qa: '#d97706',
  reviewer: '#ea580c',
  done: '#059669',
}

interface Props {
  data: CountByLabel[]
}

export function TaskWorkflowChart({ data }: Props) {
  const hasData = data.some((d) => d.value > 0)

  return (
    <ChartCard
      title="Open Tasks by Stage"
      subtitle="Workflow pipeline"
      isEmpty={!hasData}
      emptyMessage="No open tasks"
      className="h-full"
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={48}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            width={36}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
            }}
            formatter={(value) => [
              `${Number(value ?? 0)} task${Number(value ?? 0) !== 1 ? 's' : ''}`,
              'Open',
            ]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((entry) => (
              <Cell
                key={entry.key ?? entry.label}
                fill={STAGE_COLORS[entry.key ?? ''] ?? '#64748b'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
