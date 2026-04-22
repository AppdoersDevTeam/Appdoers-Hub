'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { logActivity } from './activity'
import { sendSlackMessage } from '@/lib/slack'
import type { ProposalStatus } from '@/lib/types/database'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface ProposalSection {
  id: string
  title: string
  content: string
  pricing_items?: PricingItem[]
}

export interface PricingItem {
  id: string
  name: string
  description?: string
  setup_fee: number
  monthly_fee: number
  service_catalog_id?: string
}

// ─── Create Proposal from Template ───────────────────────────────────────────

export async function createProposalAction(
  clientId: string,
  templateId: string,
  title: string,
  projectId?: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Load template sections
    const { data: template } = await supabase
      .from('proposal_templates')
      .select('sections, name')
      .eq('id', templateId)
      .single()

    if (!template) return { success: false, error: 'Template not found' }

    const { data: proposal, error } = await supabase
      .from('proposals')
      .insert({
        client_id: clientId,
        template_id: templateId,
        project_id: projectId ?? null,
        title,
        version: 1,
        status: 'draft',
        sections: template.sections,
        total_setup: 0,
        total_monthly: 0,
        created_by: user?.id,
      })
      .select('id')
      .single()

    if (error || !proposal) return { success: false, error: error?.message ?? 'Failed to create' }

    await logActivity({
      entityType: 'proposal',
      entityId: proposal.id,
      clientId,
      action: 'created',
      description: `Proposal "${title}" created from ${template.name}`,
    })

    revalidatePath('/app/proposals')
    return { success: true, data: { id: proposal.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Save Draft ───────────────────────────────────────────────────────────────

export async function saveProposalDraftAction(
  id: string,
  sections: ProposalSection[],
  title: string,
  totalSetup: number,
  totalMonthly: number
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase
      .from('proposals')
      .update({ sections, title, total_setup: totalSetup, total_monthly: totalMonthly })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath(`/app/proposals/${id}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Send Proposal ────────────────────────────────────────────────────────────

export async function sendProposalAction(id: string): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()

    const { data: proposal } = await supabase
      .from('proposals')
      .select('title, total_setup, total_monthly, clients(company_name)')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('proposals')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    const title = (proposal as { title?: string } | null)?.title ?? 'Proposal'
    const clientName =
      ((proposal as { clients?: { company_name?: string } } | null)?.clients
        ?.company_name) ?? 'client'
    const setup = (proposal as { total_setup?: number } | null)?.total_setup ?? 0
    const monthly = (proposal as { total_monthly?: number } | null)?.total_monthly ?? 0

    await logActivity({
      entityType: 'proposal',
      entityId: id,
      action: 'sent',
      description: `Proposal "${title}" sent to ${clientName}`,
    })

    await sendSlackMessage(`📄 Proposal Sent: ${title}`, [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📄 Proposal Sent*\n*Title:* ${title}\n*Client:* ${clientName}\n*Setup:* $${Number(setup).toFixed(2)} + $${Number(monthly).toFixed(2)}/mo`,
        },
      },
    ])

    revalidatePath(`/app/proposals/${id}`)
    revalidatePath('/app/proposals')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Update Status ────────────────────────────────────────────────────────────

export async function updateProposalStatusAction(
  id: string,
  status: ProposalStatus
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase
      .from('proposals')
      .update({ status })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath(`/app/proposals/${id}`)
    revalidatePath('/app/proposals')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
