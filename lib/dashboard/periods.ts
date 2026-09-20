import { APP_TIMEZONE } from '@/lib/utils/format'

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
  startIso: string
  endIso: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function part(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find((p) => p.type === type)?.value ?? ''
}

export function nzYmd(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  return `${part(parts, 'year')}-${part(parts, 'month')}-${part(parts, 'day')}`
}

export function addDaysYmd(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number)
  const utc = new Date(Date.UTC(year, month - 1, day + days))
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`
}

export function mondayOnOrBefore(ymd: string): string {
  const [year, month, day] = ymd.split('-').map(Number)
  const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  const offset = utcDay === 0 ? 6 : utcDay - 1
  return addDaysYmd(ymd, -offset)
}

export function nzWallToUtcIso(
  ymd: string,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0
): string {
  const [year, month, day] = ymd.split('-').map(Number)
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcGuess))
  const asUtc = Date.UTC(
    Number(part(parts, 'year')),
    Number(part(parts, 'month')) - 1,
    Number(part(parts, 'day')),
    Number(part(parts, 'hour')),
    Number(part(parts, 'minute')),
    Number(part(parts, 'second'))
  )
  return new Date(utcGuess - (asUtc - utcGuess) + ms).toISOString()
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function formatNzMonthYear(ymd: string): string {
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: APP_TIMEZONE,
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${ymd}T12:00:00+12:00`))
}

function formatNzDayMonth(ymd: string): string {
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: APP_TIMEZONE,
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${ymd}T12:00:00+12:00`))
}

const QUARTER_LABELS = ['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'] as const

export function getPeriodRange(period: DashboardPeriod, now = new Date()): PeriodRange {
  const today = nzYmd(now)
  const [year, month] = today.split('-').map(Number)

  if (period === 'week') {
    const start = mondayOnOrBefore(today)
    const end = addDaysYmd(start, 6)
    return {
      period,
      start,
      end,
      label: `${formatNzDayMonth(start)} – ${formatNzDayMonth(end)}`,
      bucketSize: 'day',
      startIso: nzWallToUtcIso(start),
      endIso: nzWallToUtcIso(end, 23, 59, 59, 999),
    }
  }

  if (period === 'quarter') {
    const quarterIndex = Math.floor((month - 1) / 3)
    const startMonth = quarterIndex * 3 + 1
    const endMonth = startMonth + 2
    const start = `${year}-${pad(startMonth)}-01`
    const end = `${year}-${pad(endMonth)}-${pad(lastDayOfMonth(year, endMonth))}`
    return {
      period,
      start,
      end,
      label: `${QUARTER_LABELS[quarterIndex]} ${year}`,
      bucketSize: 'week',
      startIso: nzWallToUtcIso(start),
      endIso: nzWallToUtcIso(end, 23, 59, 59, 999),
    }
  }

  const start = `${year}-${pad(month)}-01`
  const end = `${year}-${pad(month)}-${pad(lastDayOfMonth(year, month))}`
  return {
    period: 'month',
    start,
    end,
    label: formatNzMonthYear(today),
    bucketSize: 'day',
    startIso: nzWallToUtcIso(start),
    endIso: nzWallToUtcIso(end, 23, 59, 59, 999),
  }
}

function eachYmd(start: string, end: string): string[] {
  const days: string[] = []
  let current = start
  while (current <= end) {
    days.push(current)
    current = addDaysYmd(current, 1)
  }
  return days
}

export function buildDateBuckets(
  range: PeriodRange
): { key: string; label: string }[] {
  if (range.bucketSize === 'week') {
    const buckets: { key: string; label: string }[] = []
    let weekStart = mondayOnOrBefore(range.start)
    while (weekStart <= range.end) {
      const weekEnd = addDaysYmd(weekStart, 6)
      const cappedEnd = weekEnd > range.end ? range.end : weekEnd
      const cappedStart = weekStart < range.start ? range.start : weekStart
      buckets.push({
        key: weekStart,
        label: `${formatNzDayMonth(cappedStart)}–${formatNzDayMonth(cappedEnd)}`,
      })
      weekStart = addDaysYmd(weekStart, 7)
    }
    return buckets
  }

  return eachYmd(range.start, range.end).map((day) => ({
    key: day,
    label: formatNzDayMonth(day),
  }))
}

export function bucketKeyForDate(dateStr: string, range: PeriodRange): string {
  if (range.bucketSize === 'day') return dateStr
  return mondayOnOrBefore(dateStr)
}
