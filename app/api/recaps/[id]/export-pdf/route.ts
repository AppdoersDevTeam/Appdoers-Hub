import { NextRequest } from 'next/server'
import React from 'react'
import { RecapPDFDocument } from '@/lib/recaps/recap-pdf-document'
import { normalizeRecapWorkItems } from '@/lib/recaps/normalize'
import { renderPdfElement } from '@/lib/pdf/render-route'
import { requireTeamAccess } from '@/lib/supabase/route-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const access = await requireTeamAccess()
  if (!access.ok) {
    return Response.json({ error: access.message }, { status: access.status })
  }

  const { data: recap, error } = await access.db
    .from('monthly_recaps')
    .select('id, month, year, intro_text, work_completed, performance_notes, coming_next, sent_at, client_id')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Recap PDF fetch error:', error.message)
    return Response.json({ error: 'Failed to load recap' }, { status: 500 })
  }

  if (!recap) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: client } = await access.db
    .from('clients')
    .select('company_name')
    .eq('id', recap.client_id)
    .maybeSingle()

  const clientName = client?.company_name ?? 'Client'
  const workCompleted = normalizeRecapWorkItems(recap.work_completed)
  const safeMonth = Math.min(12, Math.max(1, Number(recap.month) || 1))
  const periodSlug = `${MONTHS[safeMonth - 1]}_${recap.year}`

  return renderPdfElement(
    React.createElement(RecapPDFDocument, {
      clientName,
      month: safeMonth,
      year: Number(recap.year),
      introText: recap.intro_text,
      workCompleted,
      performanceNotes: recap.performance_notes,
      comingNext: recap.coming_next,
      sentAt: recap.sent_at,
    }),
    `${clientName}_${periodSlug}_Progress_Report.pdf`
  )
}
