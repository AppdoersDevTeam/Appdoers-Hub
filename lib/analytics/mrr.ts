import { clientRunRateMrr } from '@/lib/clients/billing'

export { clientRunRateMrr }

export interface MrrClientRow {
  id: string
  monthly_fee: number
  billing_cycle: string | null
}

export interface MrrAddonRow {
  client_id: string
  monthly_fee: number
}

export function aggregateClientMrr(
  clients: MrrClientRow[],
  addons: MrrAddonRow[]
): { mrr: number; payingClientCount: number } {
  const addonByClient = new Map<string, number>()
  for (const addon of addons) {
    addonByClient.set(
      addon.client_id,
      (addonByClient.get(addon.client_id) ?? 0) + (Number(addon.monthly_fee) || 0)
    )
  }

  let mrr = 0
  let payingClientCount = 0
  for (const client of clients) {
    const value = clientRunRateMrr(
      Number(client.monthly_fee),
      client.billing_cycle,
      addonByClient.get(client.id) ?? 0
    )
    mrr += value
    if (value > 0) payingClientCount += 1
  }

  return { mrr, payingClientCount }
}
