import {
  startOfMonth,
  endOfMonth,
  subDays,
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfWeek,
} from 'date-fns'

export type DashboardPeriod = 'week' | 'month' | 'quarter'

export const DASHBOARD_PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
]

export function parseDashboardPeriod(value?: string): DashboardPeriod {
  if (value === 'week' || value === 'quarter') return value
  return 'month'
}

export type BucketSize = 'day' | 'week'

export interface PeriodRange {
  period: DashboardPeriod
  start: string
  end: string
  label: string
  bucketSize: BucketSize
}

export function getPeriodRange(period: DashboardPeriod): PeriodRange {
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  if (period === 'week') {
    const start = subDays(today, 6)
    return {
      period,
      start: format(start, 'yyyy-MM-dd'),
      end: todayStr,
      label: 'Last 7 days',
      bucketSize: 'day',
    }
  }

  if (period === 'quarter') {
    const start = subDays(today, 89)
    return {
      period,
      start: format(start, 'yyyy-MM-dd'),
      end: todayStr,
      label: 'Last 90 days',
      bucketSize: 'week',
    }
  }

  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  return {
    period: 'month',
    start: format(monthStart, 'yyyy-MM-dd'),
    end: format(monthEnd, 'yyyy-MM-dd'),
    label: format(today, 'MMMM yyyy'),
    bucketSize: 'day',
  }
}

export function buildDateBuckets(
  range: PeriodRange
): { key: string; label: string }[] {
  const start = new Date(range.start + 'T00:00:00')
  const end = new Date(range.end + 'T00:00:00')

  if (range.bucketSize === 'week') {
    return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
      const cappedEnd = weekEnd > end ? end : weekEnd
      return {
        key: format(weekStart, 'yyyy-MM-dd'),
        label: `${format(weekStart, 'MMM d')}–${format(cappedEnd, 'MMM d')}`,
      }
    })
  }

  return eachDayOfInterval({ start, end }).map((day) => ({
    key: format(day, 'yyyy-MM-dd'),
    label: format(day, 'MMM d'),
  }))
}

export function bucketKeyForDate(dateStr: string, range: PeriodRange): string {
  if (range.bucketSize === 'day') return dateStr

  const date = new Date(dateStr + 'T00:00:00')
  const buckets = buildDateBuckets(range)
  for (const bucket of buckets) {
    const bucketStart = new Date(bucket.key + 'T00:00:00')
    const bucketEnd = endOfWeek(bucketStart, { weekStartsOn: 1 })
    if (date >= bucketStart && date <= bucketEnd) return bucket.key
  }
  return buckets[0]?.key ?? dateStr
}
