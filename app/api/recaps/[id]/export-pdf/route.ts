import { NextRequest } from 'next/server'
import { renderPdfRoute } from '@/lib/pdf/render-route'
import { loadRecapPdfData } from '@/lib/recaps/load-recap-pdf'
import { requirePortalAccess, requireTeamAccess } from '@/lib/supabase/route-access'
import type { SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function loadAndRender(
  db: SupabaseClient,
  id: string,
  options?: { requireSent?: boolean; clientId?: string }
) {
  const result = await loadRecapPdfData(db, id)

  if (!result.ok) {
    if (result.status === 500) console.error('Recap PDF fetch error:', result.error)
    return Response.json(
      { error: result.status === 500 ? 'Failed to load recap' : 'Not found' },
      { status: result.status }
    )
  }

  const recap = result.data

  if (options?.clientId && recap.clientId !== options.clientId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (options?.requireSent && !recap.isSent) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  return renderPdfRoute(async () => {
    const { renderRecapPdfToBuffer } = await import('@/lib/pdf/render-recap-pdf')
    return renderRecapPdfToBuffer(recap.props)
  }, recap.filename)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const team = await requireTeamAccess()
  if (team.ok) {
    return loadAndRender(team.db, id)
  }

  const portal = await requirePortalAccess()
  if (!portal.ok) {
    return Response.json({ error: portal.message }, { status: portal.status })
  }

  return loadAndRender(portal.db, id, { requireSent: true, clientId: portal.clientId })
}
