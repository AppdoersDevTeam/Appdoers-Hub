'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { sendSlackMessage } from '@/lib/slack'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface RecapWorkItem {
  description: string
  category: string
}

export interface RecapInput {
  client_id: string
  project_id?: string | null
  month: number
  year: number
  intro_text: string
  work_completed: RecapWorkItem[]
  performance_notes: string
  coming_next: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// ─── Auto-generate recap data from DB ────────────────────────────────────────

export async function generateRecapDataAction(
  clientId: string,
  month: number,
  year: number
): Promise<ActionResult<{
  tasksCompleted: number
  hoursLogged: number
  phasesCompleted: string[]
  recentTasks: { title: string; type: string }[]
}>> {
  try {
    const supabase = await createSupabaseClient()

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const [{ data: tasks }, { data: timeEntries }, { data: phases }] = await Promise.all([
      supabase
        .from('tasks')
        .select('title, type')
        .eq('client_id', clientId)
        .eq('status', 'closed')
        .gte('updated_at', startDate)
        .lte('updated_at', endDate + 'T23:59:59Z'),

      supabase
        .from('time_entries')
        .select('hours, projects(client_id)')
        .gte('date', startDate)
        .lte('date', endDate),

      supabase
        .from('project_phases')
        .select('phase, projects(client_id)')
        .eq('status', 'completed')
        .gte('updated_at', startDate)
        .lte('updated_at', endDate + 'T23:59:59Z'),
    ])

    const clientHours = (timeEntries ?? [])
      .filter((e) => (e.projects as { client_id?: string } | null)?.client_id === clientId)
      .reduce((sum, e) => sum + Number(e.hours), 0)

    const clientPhases = (phases ?? [])
      .filter((p) => (p.projects as { client_id?: string } | null)?.client_id === clientId)
      .map((p) => p.phase as string)

    return {
      success: true,
      data: {
        tasksCompleted: tasks?.length ?? 0,
        hoursLogged: parseFloat(clientHours.toFixed(1)),
        phasesCompleted: clientPhases,
        recentTasks: (tasks ?? []).slice(0, 10).map((t) => ({
          title: t.title as string,
          type: t.type as string,
        })),
      },
    }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Create / Save Recap ──────────────────────────────────────────────────────

export async function saveRecapAction(
  input: RecapInput,
  existingId?: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
      client_id: input.client_id,
      project_id: input.project_id ?? null,
      month: input.month,
      year: input.year,
      intro_text: input.intro_text,
      work_completed: input.work_completed,
      performance_notes: input.performance_notes,
      coming_next: input.coming_next,
      is_sent: false,
    }

    let id: string

    if (existingId) {
      const { error } = await supabase.from('monthly_recaps').update(payload).eq('id', existingId)
      if (error) return { success: false, error: error.message }
      id = existingId
    } else {
      const { data, error } = await supabase
        .from('monthly_recaps')
        .insert({ ...payload, created_by: user?.id })
        .select('id')
        .single()
      if (error) return { success: false, error: error.message }
      id = data.id
    }

    revalidatePath('/app/recaps')
    return { success: true, data: { id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Send Recap ───────────────────────────────────────────────────────────────

export async function sendRecapAction(recapId: string): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: recap } = await supabase
      .from('monthly_recaps')
      .select('*, clients(company_name, contact_name, contact_email)')
      .eq('id', recapId)
      .single()

    if (!recap) return { success: false, error: 'Recap not found' }

    const { error } = await supabase
      .from('monthly_recaps')
      .update({ is_sent: true, sent_at: new Date().toISOString(), sent_by: user?.id })
      .eq('id', recapId)

    if (error) return { success: false, error: error.message }

    const clientName = (recap.clients as { company_name?: string } | null)?.company_name ?? 'client'
    const monthLabel = `${MONTH_NAMES[(recap.month as number) - 1]} ${recap.year}`

    await sendSlackMessage(`📊 Monthly Recap Sent: ${clientName} — ${monthLabel}`, [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📊 Monthly Recap Sent*\n*Client:* ${clientName}\n*Period:* ${monthLabel}\n*Coming next:* ${String(recap.coming_next ?? '').slice(0, 120)}…`,
        },
      },
    ])

    revalidatePath('/app/recaps')
    revalidatePath(`/portal/recaps`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Delete Recap ─────────────────────────────────────────────────────────────

export async function deleteRecapAction(recapId: string): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase.from('monthly_recaps').delete().eq('id', recapId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/app/recaps')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
