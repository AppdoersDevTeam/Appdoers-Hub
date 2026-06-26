import { NextRequest } from 'next/server'
import type { ProposalSection } from '@/lib/proposals/proposal-pdf-document'
import type { ServiceCatalogEntry } from '@/lib/proposals/service-guide'
import { renderPdfRoute } from '@/lib/pdf/render-route'
import { requireTeamAccess } from '@/lib/supabase/route-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const access = await requireTeamAccess()
  if (!access.ok) {
    return Response.json({ error: access.message }, { status: access.status })
  }

  const { data: proposal, error } = await access.db
    .from('proposals')
    .select('*, clients(company_name, contact_name, contact_email)')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Proposal PDF fetch error:', error.message)
    return Response.json({ error: 'Failed to load proposal' }, { status: 500 })
  }

  if (!proposal) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: catalog } = await access.db
    .from('service_catalog')
    .select('id, name, description, type, plan_key, setup_fee, monthly_fee')
    .eq('is_active', true)
    .order('sort_order')

  const client = proposal.clients as {
    company_name?: string
    contact_name?: string | null
    contact_email?: string | null
  } | null

  const clientName = client?.company_name ?? 'Client'
  const sections: ProposalSection[] = proposal.sections ?? []
  const catalogEntries: ServiceCatalogEntry[] = (catalog ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    type: s.type,
    plan_key: s.plan_key,
    setup_fee: Number(s.setup_fee),
    monthly_fee: Number(s.monthly_fee),
  }))

  const pdfProps = {
    title: proposal.title,
    clientName,
    contactName: client?.contact_name,
    sections,
    catalog: catalogEntries,
    version: proposal.version,
  }

  return renderPdfRoute(async () => {
    const { renderProposalPdfToBuffer } = await import('@/lib/pdf/render-proposal-pdf')
    return renderProposalPdfToBuffer(pdfProps)
  }, `${proposal.title}_Quote_v${proposal.version}.pdf`)
}
