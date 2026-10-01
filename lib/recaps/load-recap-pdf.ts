import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeRecapWorkItems } from '@/lib/recaps/normalize'
import { parseRecapStats } from '@/lib/recaps/stats'
import type { RecapPDFProps } from '@/lib/recaps/recap-pdf-document'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export interface LoadedRecapPdf {
  clientId: string
  isSent: boolean
  props: RecapPDFProps
  filename: string
}

export type LoadRecapPdfResult =
  | { ok: true; data: LoadedRecapPdf }
  | { ok: false; status: 404 | 500; error: string }

export async function loadRecapPdfData(db: SupabaseClient, id: string): Promise<LoadRecapPdfResult> {
  const { data: recap, error } = await db
    .from('monthly_recaps')
    .select(
      'id, month, year, intro_text, work_completed, performance_notes, coming_next, stats, sent_at, client_id, is_sent'
    )
    .eq('id', id)
    .maybeSingle()

  if (error) return { ok: false, status: 500, error: error.message }
  if (!recap) return { ok: false, status: 404, error: 'Not found' }

  const { data: client } = await db
    .from('clients')
    .select('company_name')
    .eq('id', recap.client_id)
    .maybeSingle()

  const clientName = client?.company_name ?? 'Client'
  const safeMonth = Math.min(12, Math.max(1, Number(recap.month) || 1))
  const periodSlug = `${MONTHS[safeMonth - 1]}_${recap.year}`

  return {
    ok: true,
    data: {
      clientId: recap.client_id as string,
      isSent: Boolean(recap.is_sent),
      filename: `${clientName}_${periodSlug}_Recap.pdf`,
      props: {
        clientName,
        month: safeMonth,
        year: Number(recap.year),
        introText: recap.intro_text,
        workCompleted: normalizeRecapWorkItems(recap.work_completed),
        performanceNotes: recap.performance_notes,
        comingNext: recap.coming_next,
        sentAt: recap.sent_at,
        stats: parseRecapStats(recap.stats),
      },
    },
  }
}
