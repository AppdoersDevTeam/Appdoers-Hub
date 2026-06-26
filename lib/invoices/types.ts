export interface InvoiceLine {
  description: string
  quantity: number
  unit_price: number
  amount: number
  time_entry_id?: string | null
}
