import { revalidatePath } from 'next/cache'
import type { DocumentKind } from '@/lib/documents'

export function revalidateDocumentPaths(kind: DocumentKind, clientId?: string | null, leadId?: string | null) {
  const listPath = kind === 'proposal' ? '/app/proposals' : '/app/contracts'
  const portalPath = kind === 'proposal' ? '/portal/proposals' : '/portal/contracts'
  revalidatePath(listPath)
  revalidatePath(portalPath)
  if (clientId) revalidatePath(`/app/clients/${clientId}`)
  if (leadId) revalidatePath(`/app/leads/${leadId}`)
}
