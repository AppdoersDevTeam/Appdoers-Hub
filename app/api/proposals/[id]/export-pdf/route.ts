import { NextRequest } from 'next/server'
import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { ProposalPDFDocument } from '@/lib/proposals/proposal-pdf-document'
import type { ProposalSection } from '@/lib/proposals/proposal-pdf-document'
import type { ServiceCatalogEntry } from '@/lib/proposals/service-guide'
import { renderPdfRoute } from '@/lib/pdf/render-route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*, clients(company_name, contact_name, contact_email)')
    .eq('id', id)
    .maybeSingle()

  if (error || !proposal) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: catalog } = await supabase
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

  return renderPdfRoute(
    React.createElement(ProposalPDFDocument, {
      title: proposal.title,
      clientName,
      contactName: client?.contact_name,
      sections,
      catalog: catalogEntries,
      version: proposal.version,
    }),
    `${proposal.title}_Quote_v${proposal.version}.pdf`
  )
}
