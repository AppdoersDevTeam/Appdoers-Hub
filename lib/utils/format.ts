import { formatDistanceToNow, format } from 'date-fns'

export function formatCurrency(amount: number, currency = 'NZD'): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy')
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
