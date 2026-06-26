import { NextRequest } from 'next/server'
import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { RecapPDFDocument } from '@/lib/recaps/recap-pdf-document'
import { normalizeRecapWorkItems } from '@/lib/recaps/normalize'
import { renderPdfRoute } from '@/lib/pdf/render-route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: recap, error } = await supabase
    .from('monthly_recaps')
    .select('id, month, year, intro_text, work_completed, performance_notes, coming_next, sent_at, clients(company_name)')
    .eq('id', id)
    .maybeSingle()

  if (error || !recap) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const client = recap.clients as { company_name?: string } | null
  const clientName = client?.company_name ?? 'Client'
  const workCompleted = normalizeRecapWorkItems(recap.work_completed)
  const safeMonth = Math.min(12, Math.max(1, Number(recap.month) || 1))
  const periodSlug = `${MONTHS[safeMonth - 1]}_${recap.year}`

  return renderPdfRoute(
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
