'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { logActivity } from './activity'
import { sendSlackMessage } from '@/lib/slack'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface InvoiceLine {
  description: string
  quantity: number
  unit_price: number
  amount: number
  time_entry_id?: string | null
}

export interface InvoiceInput {
  client_id: string
  project_id?: string | null
  type?: string
  issue_date: string
  due_date: string
  lines: InvoiceLine[]
  notes?: string
}

function calcTotals(lines: InvoiceLine[]) {
  const subtotal = lines.reduce((sum, l) => sum + (l.amount || 0), 0)
  const gst_amount = parseFloat((subtotal * 0.15).toFixed(2))
  const total = parseFloat((subtotal + gst_amount).toFixed(2))
  return { subtotal, gst_amount, total }
}

// ─── Create Invoice ───────────────────────────────────────────────────────────

export async function createInvoiceAction(
  input: InvoiceInput
): Promise<ActionResult<{ id: string; invoice_number: string }>> {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { subtotal, gst_amount, total } = calcTotals(input.lines)

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        client_id: input.client_id,
        project_id: input.project_id ?? null,
        type: input.type ?? 'adhoc',
        status: 'draft',
        issue_date: input.issue_date,
        due_date: input.due_date,
        lines: input.lines,
        subtotal,
        gst_amount,
        total,
        notes: input.notes ?? null,
        created_by: user?.id,
      })
      .select('id, invoice_number')
      .single()

    if (error) return { success: false, error: error.message }

    await logActivity({
      entityType: 'invoice',
      entityId: data.id,
      clientId: input.client_id,
      action: 'created',
      description: `Invoice ${data.invoice_number} created`,
    })

    revalidatePath('/app/invoices')
    return { success: true, data: { id: data.id, invoice_number: data.invoice_number } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Update Invoice ───────────────────────────────────────────────────────────

export async function updateInvoiceAction(
  id: string,
  input: Partial<InvoiceInput>
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()

    const updates: Record<string, unknown> = {
      project_id: input.project_id ?? null,
      issue_date: input.issue_date,
      due_date: input.due_date,
      notes: input.notes ?? null,
    }

    if (input.lines) {
      const { subtotal, gst_amount, total } = calcTotals(input.lines)
      updates.lines = input.lines
      updates.subtotal = subtotal
      updates.gst_amount = gst_amount
      updates.total = total
    }

    const { error } = await supabase.from('invoices').update(updates).eq('id', id)
    if (error) return { success: false, error: error.message }

    revalidatePath(`/app/invoices/${id}`)
    revalidatePath('/app/invoices')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Send Invoice ─────────────────────────────────────────────────────────────

export async function sendInvoiceAction(id: string): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()

    const { data: invoice } = await supabase
      .from('invoices')
      .select('invoice_number, total, due_date, clients(company_name)')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('invoices')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    const num = (invoice as { invoice_number?: string } | null)?.invoice_number ?? id
    const total = (invoice as { total?: number } | null)?.total ?? 0
    const dueDate = (invoice as { due_date?: string } | null)?.due_date ?? ''
    const clientName = ((invoice as { clients?: { company_name?: string } } | null)?.clients?.company_name) ?? 'client'

    await logActivity({
      entityType: 'invoice',
      entityId: id,
      action: 'sent',
      description: `Invoice ${num} sent to ${clientName}`,
    })

    await sendSlackMessage(`🧾 Invoice Sent: ${num}`, [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🧾 Invoice Sent*\n*Invoice:* ${num}\n*Client:* ${clientName}\n*Total:* $${Number(total).toFixed(2)} NZD\n*Due:* ${dueDate}`,
        },
      },
    ])

    revalidatePath(`/app/invoices/${id}`)
    revalidatePath('/app/invoices')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Mark Paid ────────────────────────────────────────────────────────────────

export async function markInvoicePaidAction(
  id: string,
  paymentReference?: string
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()

    const { data: invoice } = await supabase
      .from('invoices')
      .select('invoice_number, total, clients(company_name)')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString().split('T')[0],
        payment_reference: paymentReference ?? null,
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    const num = (invoice as { invoice_number?: string } | null)?.invoice_number ?? id
    const total = (invoice as { total?: number } | null)?.total ?? 0
    const clientName = ((invoice as { clients?: { company_name?: string } } | null)?.clients?.company_name) ?? 'client'

    await logActivity({
      entityType: 'invoice',
      entityId: id,
      action: 'paid',
      description: `Invoice ${num} marked as paid${paymentReference ? ` (ref: ${paymentReference})` : ''}`,
    })

    await sendSlackMessage(`💰 Invoice Paid: ${num}`, [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*💰 Invoice Paid!*\n*Invoice:* ${num}\n*Client:* ${clientName}\n*Amount:* $${Number(total).toFixed(2)} NZD${paymentReference ? `\n*Reference:* ${paymentReference}` : ''}`,
        },
      },
    ])

    revalidatePath(`/app/invoices/${id}`)
    revalidatePath('/app/invoices')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Mark Overdue ─────────────────────────────────────────────────────────────

export async function markInvoiceOverdueAction(id: string): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase.from('invoices').update({ status: 'overdue' }).eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath(`/app/invoices/${id}`)
    revalidatePath('/app/invoices')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Create from Time Entries ─────────────────────────────────────────────────

export async function createInvoiceFromTimeAction(
  clientId: string,
  projectId: string,
  timeEntryIds: string[],
  dueDate: string
): Promise<ActionResult<{ id: string; invoice_number: string }>> {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch the time entries
    const { data: entries } = await supabase
      .from('time_entries')
      .select('id, description, hours, hourly_rate, tasks(title)')
      .in('id', timeEntryIds)
      .eq('is_invoiced', false)

    if (!entries || entries.length === 0) {
      return { success: false, error: 'No uninvoiced time entries found' }
    }

    const lines: InvoiceLine[] = entries.map((e) => {
      const rate = (e.hourly_rate as number | null) ?? 150
      const amount = parseFloat(((e.hours as number) * rate).toFixed(2))
      const taskTitle = (e.tasks as { title?: string } | null)?.title
      return {
        description: e.description || taskTitle || 'Development work',
        quantity: e.hours as number,
        unit_price: rate,
        amount,
        time_entry_id: e.id as string,
      }
    })

    const { subtotal, gst_amount, total } = calcTotals(lines)
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        client_id: clientId,
        project_id: projectId,
        type: 'time_billing',
        status: 'draft',
        issue_date: today,
        due_date: dueDate,
        lines,
        subtotal,
        gst_amount,
        total,
        created_by: user?.id,
      })
      .select('id, invoice_number')
      .single()

    if (error) return { success: false, error: error.message }

    // Mark time entries as invoiced
    await supabase
      .from('time_entries')
      .update({ is_invoiced: true })
      .in('id', timeEntryIds)

    await logActivity({
      entityType: 'invoice',
      entityId: data.id,
      clientId,
      action: 'created',
      description: `Invoice ${data.invoice_number} generated from ${entries.length} time entries`,
    })

    revalidatePath('/app/invoices')
    revalidatePath(`/app/projects/${projectId}`)
    return { success: true, data: { id: data.id, invoice_number: data.invoice_number } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
