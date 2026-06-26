import type { InvoiceLine } from '@/lib/invoices/types'

export function normalizeInvoiceLines(value: unknown): InvoiceLine[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => {
      const quantity = Number(item.quantity) || 0
      const unitPrice = Number(item.unit_price) || 0
      const amount = Number(item.amount) || parseFloat((quantity * unitPrice).toFixed(2))
      return {
        description: String(item.description ?? '').trim(),
        quantity,
        unit_price: unitPrice,
        amount,
        time_entry_id: typeof item.time_entry_id === 'string' ? item.time_entry_id : null,
      }
    })
    .filter((item) => item.description.length > 0 || item.amount > 0)
}
