'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { logActivity } from './activity'
import { sendToChannel } from '@/lib/slack'
import type { ProjectPhase, ClientFacingStatus } from '@/lib/types/database'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

const PHASES: ProjectPhase[] = [
  'discovery',
  'design',
  'development',
  'review_qa',
  'launch',
  'maintenance',
]

const phaseLabel: Record<ProjectPhase, string> = {
  discovery: 'Discovery',
  design: 'Design',
  development: 'Development',
  review_qa: 'Review & QA',
  launch: 'Launch',
  maintenance: 'Maintenance',
}

const clientStatusLabel: Record<ClientFacingStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  awaiting_appdoers: 'Awaiting Appdoers',
  awaiting_client: 'Awaiting Client',
  completed: 'Completed',
  on_hold: 'On Hold',
}

// ─── Create Project ───────────────────────────────────────────────────────────

export interface CreateProjectInput {
  client_id: string
  name: string
  type: 'web' | 'ecommerce' | 'community' | 'custom'
  start_date?: string
  target_launch_date?: string
  estimated_hours?: number
  description?: string
  live_url?: string
}

export async function createProjectAction(
  input: CreateProjectInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseClient()

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        ...input,
        current_phase: 'discovery',
        client_status: 'new',
        status: 'active',
      })
      .select('id, name')
      .single()

    if (error) return { success: false, error: error.message }

    // Auto-create all 6 phase records
    const phaseRows = PHASES.map((phase) => ({
      project_id: project.id,
      phase,
      status: 'pending',
    }))
    await supabase.from('project_phases').insert(phaseRows)

    // Get client name for activity log
    const { data: client } = await supabase
      .from('clients')
      .select('company_name')
      .eq('id', input.client_id)
      .single()

    await logActivity({
      entityType: 'project',
      entityId: project.id,
      clientId: input.client_id,
      action: 'created',
      description: `Project "${project.name}" created for ${client?.company_name ?? 'client'}`,
    })

    revalidatePath('/app/projects')
    revalidatePath(`/app/clients/${input.client_id}`)
    return { success: true, data: { id: project.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Delete Project ───────────────────────────────────────────────────────────

export async function deleteProjectAction(id: string, clientId: string): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    await supabase.from('tasks').delete().eq('project_id', id)
    await supabase.from('project_phases').delete().eq('project_id', id)
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/app/projects')
    revalidatePath(`/app/clients/${clientId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Update Project ───────────────────────────────────────────────────────────

export async function updateProjectAction(
  id: string,
  input: Partial<CreateProjectInput & { status: 'active' | 'on_hold' | 'completed' | 'cancelled' }>
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase.from('projects').update(input).eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath(`/app/projects/${id}`)
    revalidatePath('/app/projects')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Update Phase Record ──────────────────────────────────────────────────────

export interface UpdatePhaseInput {
  status?: 'pending' | 'in_progress' | 'completed'
  assigned_to?: string | null
  estimated_hours?: number | null
  start_date?: string | null
  end_date?: string | null
  notes?: string | null
}

export async function updatePhaseAction(
  phaseId: string,
  projectId: string,
  input: UpdatePhaseInput
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase
      .from('project_phases')
      .update(input)
      .eq('id', phaseId)

    if (error) return { success: false, error: error.message }
    revalidatePath(`/app/projects/${projectId}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Advance Current Phase ────────────────────────────────────────────────────

export async function advancePhaseAction(
  projectId: string,
  currentPhase: ProjectPhase
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const idx = PHASES.indexOf(currentPhase)
    if (idx === -1 || idx === PHASES.length - 1) {
      return { success: false, error: 'Already at final phase' }
    }
    const nextPhase = PHASES[idx + 1]

    const { data: project } = await supabase
      .from('projects')
      .select('name, client_id, clients(company_name)')
      .eq('id', projectId)
      .single()

    const { error } = await supabase
      .from('projects')
      .update({ current_phase: nextPhase })
      .eq('id', projectId)

    if (error) return { success: false, error: error.message }

    // Mark previous phase complete
    await supabase
      .from('project_phases')
      .update({ status: 'completed' })
      .eq('project_id', projectId)
      .eq('phase', currentPhase)

    // Mark next phase in_progress
    await supabase
      .from('project_phases')
      .update({ status: 'in_progress' })
      .eq('project_id', projectId)
      .eq('phase', nextPhase)

    const projectName = (project as { name?: string } | null)?.name ?? projectId
    const clientName =
      ((project as { clients?: { company_name?: string } } | null)?.clients
        ?.company_name) ?? 'client'

    await logActivity({
      entityType: 'project',
      entityId: projectId,
      action: 'phase_advanced',
      description: `Project "${projectName}" advanced to ${phaseLabel[nextPhase]}`,
    })

    await sendToChannel('projects', `📋 Phase Change: ${projectName}`, [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📋 Project Phase Updated*\n*Project:* ${projectName}\n*Client:* ${clientName}\n*Phase:* ${phaseLabel[currentPhase]} → *${phaseLabel[nextPhase]}*`,
        },
      },
    ])

    revalidatePath(`/app/projects/${projectId}`)
    revalidatePath('/app/projects')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Update Client Status ─────────────────────────────────────────────────────

export async function updateClientStatusAction(
  projectId: string,
  newStatus: ClientFacingStatus
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()

    const { data: project } = await supabase
      .from('projects')
      .select('name, client_id, clients(company_name)')
      .eq('id', projectId)
      .single()

    const { error } = await supabase
      .from('projects')
      .update({ client_status: newStatus })
      .eq('id', projectId)

    if (error) return { success: false, error: error.message }

    const projectName = (project as { name?: string } | null)?.name ?? projectId
    const clientName =
      ((project as { clients?: { company_name?: string } } | null)?.clients
        ?.company_name) ?? 'client'

    await logActivity({
      entityType: 'project',
      entityId: projectId,
      action: 'client_status_changed',
      description: `"${projectName}" client status → ${clientStatusLabel[newStatus]}`,
    })

    await sendToChannel('projects', `🔄 Status: ${projectName}`, [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🔄 Client Status Updated*\n*Project:* ${projectName}\n*Client:* ${clientName}\n*Status:* *${clientStatusLabel[newStatus]}*`,
        },
      },
    ])

    revalidatePath(`/app/projects/${projectId}`)
    revalidatePath('/app/projects')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
