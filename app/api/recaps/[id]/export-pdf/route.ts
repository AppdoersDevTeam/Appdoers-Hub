import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { RecapPDFDocument } from '@/lib/recaps/recap-pdf-document'
import type { RecapWorkItem } from '@/lib/actions/recaps'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: recap } = await supabase
    .from('monthly_recaps')
    .select('id, month, year, intro_text, work_completed, performance_notes, coming_next, sent_at, clients(company_name)')
    .eq('id', id)
    .single()

  if (!recap) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const client = recap.clients as { company_name?: string } | null
  const clientName = client?.company_name ?? 'Client'
  const workCompleted = (recap.work_completed as RecapWorkItem[] | null) ?? []
  const periodSlug = `${MONTHS[recap.month - 1]}_${recap.year}`

  try {
    const buffer = await renderToBuffer(
      React.createElement(RecapPDFDocument, {
        clientName,
        month: recap.month,
        year: recap.year,
        introText: recap.intro_text,
        workCompleted,
        performanceNotes: recap.performance_notes,
        comingNext: recap.coming_next,
        sentAt: recap.sent_at,
      }) as React.ReactElement
    )

    const filename = `${clientName.replace(/[^a-z0-9]/gi, '_')}_${periodSlug}_Progress_Report.pdf`

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('Recap PDF generation error:', err)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
