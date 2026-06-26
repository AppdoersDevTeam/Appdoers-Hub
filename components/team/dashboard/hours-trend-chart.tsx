'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartCard } from './chart-card'
import type { HoursByDate } from '@/lib/dashboard/types'

const CHART_MARGIN = { top: 8, right: 12, left: 4, bottom: 4 }

interface Props {
  data: HoursByDate[]
  periodLabel: string
}

export function HoursTrendChart({ data, periodLabel }: Props) {
  const hasData = data.some((d) => d.hours > 0)
  const tickInterval = data.length > 14 ? Math.ceil(data.length / 7) - 1 : 0

  return (
    <ChartCard
      title="Hours Logged"
      subtitle={periodLabel}
      isEmpty={!hasData}
      className="min-h-[300px]"
    >
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v) => `${v}h`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
            }}
            formatter={(value) => [`${Number(value ?? 0)}h`, 'Hours']}
          />
          <Area
            type="monotone"
            dataKey="hours"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#hoursGradient)"
            name="hours"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
