'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { logActivity } from './activity'
import { sendSlackMessage } from '@/lib/slack'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface ContractSection {
  id: string
  title: string
  content: string
}

const DEFAULT_CONTRACT_SECTIONS: ContractSection[] = [
  { id: 'parties', title: 'Parties', content: 'This agreement is between Appdoers Limited ("Appdoers"), a New Zealand company, and [CLIENT NAME] ("Client").' },
  { id: 'scope', title: 'Scope of Work', content: '' },
  { id: 'timeline', title: 'Timeline', content: '' },
  { id: 'fees', title: 'Fees & Payment', content: 'The Client agrees to pay the fees outlined in the approved proposal. Setup fee is due on commencement. Monthly retainer is billed on the 1st of each month via invoice with 7-day payment terms. GST (15%) is applicable to all fees.' },
  { id: 'ip', title: 'Intellectual Property', content: 'Full ownership of the completed website and all deliverables transfers to the Client upon receipt of all outstanding payments. Appdoers retains the right to display the work in its portfolio.' },
  { id: 'revisions', title: 'Revisions Policy', content: 'Two rounds of revisions are included in the design and development phases. Additional revisions are billed at the agreed hourly rate.' },
  { id: 'hosting', title: 'Hosting & Maintenance', content: 'Where a monthly retainer is included, Appdoers will manage all hosting, security updates, and technical maintenance. The Client is responsible for providing accurate content in a timely manner.' },
  { id: 'termination', title: 'Termination', content: 'Either party may terminate this agreement with 30 days written notice. Upon termination, all outstanding fees become immediately payable. Work completed to date will be delivered to the Client upon final payment.' },
  { id: 'liability', title: 'Limitation of Liability', content: 'Appdoers\' total liability is limited to the fees paid in the 3 months prior to the event giving rise to the claim. Appdoers is not liable for indirect, consequential, or incidental damages.' },
  { id: 'governing_law', title: 'Governing Law', content: 'This agreement is governed by the laws of New Zealand. Any disputes will be resolved in the courts of New Zealand.' },
  { id: 'signatures', title: 'Signatures', content: 'By signing below, both parties agree to the terms of this agreement.' },
]

// ─── Generate Contract from Proposal ─────────────────────────────────────────

export async function generateContractAction(
  proposalId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: proposal } = await supabase
      .from('proposals')
      .select('*, clients(company_name)')
      .eq('id', proposalId)
      .single()

    if (!proposal) return { success: false, error: 'Proposal not found' }

    const clientName =
      (proposal.clients as { company_name?: string } | null)?.company_name ??
      'Client'

    // Pre-fill sections from proposal
    const sections: ContractSection[] = DEFAULT_CONTRACT_SECTIONS.map((s) => {
      if (s.id === 'parties') {
        return { ...s, content: `This agreement is between Appdoers Limited ("Appdoers"), a New Zealand company, and ${clientName} ("Client").` }
      }
      if (s.id === 'scope' && proposal.sections) {
        const scopeSection = (proposal.sections as { id: string; content: string }[]).find(
          (ps) => ps.id === 'scope'
        )
        return { ...s, content: scopeSection?.content ?? s.content }
      }
      if (s.id === 'timeline' && proposal.sections) {
        const timelineSection = (proposal.sections as { id: string; content: string }[]).find(
          (ps) => ps.id === 'timeline'
        )
        return { ...s, content: timelineSection?.content ?? s.content }
      }
      if (s.id === 'fees') {
        return {
          ...s,
          content: `Setup Fee: $${Number(proposal.total_setup ?? 0).toFixed(2)} NZD (due on commencement)\nMonthly Retainer: $${Number(proposal.total_monthly ?? 0).toFixed(2)} NZD/month (billed 1st of each month)\n\nAll amounts are exclusive of GST (15%). Payment terms: 7 days from invoice date.`,
        }
      }
      return s
    })

    const { data: contract, error } = await supabase
      .from('contracts')
      .insert({
        client_id: proposal.client_id,
        proposal_id: proposalId,
        project_id: proposal.project_id,
        title: `${proposal.title} — Service Agreement`,
        status: 'draft',
        content: sections,
        created_by: user?.id,
      })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    await logActivity({
      entityType: 'contract',
      entityId: contract.id,
      clientId: proposal.client_id,
      action: 'created',
      description: `Contract generated from proposal "${proposal.title}"`,
    })

    revalidatePath('/app/contracts')
    revalidatePath(`/app/proposals/${proposalId}`)
    return { success: true, data: { id: contract.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Update Contract Content ──────────────────────────────────────────────────

export async function updateContractAction(
  id: string,
  content: ContractSection[]
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase
      .from('contracts')
      .update({ content })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath(`/app/contracts/${id}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Send Contract ────────────────────────────────────────────────────────────

export async function sendContractAction(id: string): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()

    const { data: contract } = await supabase
      .from('contracts')
      .select('title, clients(company_name)')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('contracts')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    const title = (contract as { title?: string } | null)?.title ?? 'Contract'
    const clientName =
      ((contract as { clients?: { company_name?: string } } | null)?.clients
        ?.company_name) ?? 'client'

    await logActivity({
      entityType: 'contract',
      entityId: id,
      action: 'sent',
      description: `Contract "${title}" sent to ${clientName}`,
    })

    await sendSlackMessage(`📝 Contract Sent: ${title}`, [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📝 Contract Sent to Client*\n*Title:* ${title}\n*Client:* ${clientName}\n_Awaiting e-signature in client portal._`,
        },
      },
    ])

    revalidatePath(`/app/contracts/${id}`)
    revalidatePath('/app/contracts')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Sign Contract (Portal) ───────────────────────────────────────────────────

export async function signContractAction(
  id: string,
  signedByName: string,
  signedByEmail: string
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const headersList = await headers()
    const ip =
      headersList.get('x-forwarded-for')?.split(',')[0] ??
      headersList.get('x-real-ip') ??
      'unknown'

    const { data: contract } = await supabase
      .from('contracts')
      .select('title, client_id, clients(company_name)')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('contracts')
      .update({
        status: 'signed',
        signed_at: new Date().toISOString(),
        signed_by_name: signedByName,
        signed_by_email: signedByEmail,
        signed_ip: ip,
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    const title = (contract as { title?: string } | null)?.title ?? 'Contract'
    const clientName =
      ((contract as { clients?: { company_name?: string } } | null)?.clients
        ?.company_name) ?? 'client'
    const clientId = (contract as { client_id?: string } | null)?.client_id

    await logActivity({
      entityType: 'contract',
      entityId: id,
      clientId: clientId ?? null,
      action: 'signed',
      description: `Contract "${title}" signed by ${signedByName}`,
    })

    await sendSlackMessage(`✍️ Contract Signed: ${title}`, [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*✍️ Contract Signed!*\n*Contract:* ${title}\n*Client:* ${clientName}\n*Signed by:* ${signedByName} (${signedByEmail})\n*Signed at:* ${new Date().toLocaleString('en-NZ')}`,
        },
      },
    ])

    revalidatePath(`/app/contracts/${id}`)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
