import { formatDistanceToNow } from 'date-fns'

export const APP_TIMEZONE = 'Pacific/Auckland'

export function todayYmd(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function formatCurrency(amount: number, currency = 'NZD'): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

/** Round hours to 2 decimals — matches `lib/task-time.ts` storage precision. */
export function roundHours(hours: number): number {
  return Math.round((Number(hours) || 0) * 100) / 100
}

/**
 * Display hours with up to 2 decimal places so small values (e.g. 0.02h)
 * are not collapsed to 0.0h by 1-decimal formatting.
 */
export function formatHours(hours: number, empty = '—'): string {
  const n = roundHours(hours)
  if (!(n > 0)) return empty
  const trimmed = n.toFixed(2).replace(/\.?0+$/, '')
  return `${trimmed}h`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date))
}

export function formatLongDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: APP_TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatMonthDay(date: string | Date): string {
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: APP_TIMEZONE,
    day: 'numeric',
    month: 'short',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatInvoiceNumber(seq: number): string {
  return `APD-${String(seq).padStart(4, '0')}`
}

export const GST_RATE = 0.15

export function calculateGST(subtotal: number): number {
  return Math.round(subtotal * GST_RATE * 100) / 100
}

export function calculateTotal(subtotal: number): number {
  return Math.round((subtotal + calculateGST(subtotal)) * 100) / 100
}
