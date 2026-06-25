import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { ProposalPDFDocument } from '@/lib/proposals/proposal-pdf-document'
import type { ProposalSection } from '@/lib/proposals/proposal-pdf-document'
import type { ServiceCatalogEntry } from '@/lib/proposals/service-guide'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: proposal } = await supabase
    .from('proposals')
    .select('*, clients(company_name, contact_name, contact_email)')
    .eq('id', id)
    .single()

  if (!proposal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
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

  try {
    const buffer = await renderToBuffer(
      React.createElement(ProposalPDFDocument, {
        title: proposal.title,
        clientName,
        contactName: client?.contact_name,
        sections,
        catalog: catalogEntries,
        version: proposal.version,
      })
    )

    const filename = `${proposal.title.replace(/[^a-z0-9]/gi, '_')}_Quote_v${proposal.version}.pdf`
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
