import { NextRequest } from 'next/server'
import { normalizeRecapWorkItems } from '@/lib/recaps/normalize'
import { renderPdfRoute } from '@/lib/pdf/render-route'
import { requirePortalAccess, requireTeamAccess } from '@/lib/supabase/route-access'
import type { SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

async function loadAndRender(
  db: SupabaseClient,
  id: string,
  options?: { requireSent?: boolean; clientId?: string }
) {
  const { data: recap, error } = await db
    .from('monthly_recaps')
    .select('id, month, year, intro_text, work_completed, performance_notes, coming_next, sent_at, client_id, is_sent')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Recap PDF fetch error:', error.message)
    return Response.json({ error: 'Failed to load recap' }, { status: 500 })
  }

  if (!recap) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  if (options?.clientId && recap.client_id !== options.clientId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (options?.requireSent && !recap.is_sent) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: client } = await db
    .from('clients')
    .select('company_name')
    .eq('id', recap.client_id)
    .maybeSingle()

  const clientName = client?.company_name ?? 'Client'
  const workCompleted = normalizeRecapWorkItems(recap.work_completed)
  const safeMonth = Math.min(12, Math.max(1, Number(recap.month) || 1))
  const periodSlug = `${MONTHS[safeMonth - 1]}_${recap.year}`

  const pdfProps = {
    clientName,
    month: safeMonth,
    year: Number(recap.year),
    introText: recap.intro_text,
    workCompleted,
    performanceNotes: recap.performance_notes,
    comingNext: recap.coming_next,
    sentAt: recap.sent_at,
  }

  return renderPdfRoute(async () => {
    const { renderRecapPdfToBuffer } = await import('@/lib/pdf/render-recap-pdf')
    return renderRecapPdfToBuffer(pdfProps)
  }, `${clientName}_${periodSlug}_Progress_Report.pdf`)
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
