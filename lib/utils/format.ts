import { formatDistanceToNow } from 'date-fns'

export const APP_TIMEZONE = 'Pacific/Auckland'

export function formatCurrency(amount: number, currency = 'NZD'): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
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
