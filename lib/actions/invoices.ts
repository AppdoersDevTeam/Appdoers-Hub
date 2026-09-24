'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { logActivity } from './activity'
import { sendSlackAlert } from '@/lib/slack'
import { oneRelation } from '@/lib/documents'
import { todayYmd } from '@/lib/utils/format'
import type { InvoiceLine } from '@/lib/invoices/types'

export type { InvoiceLine } from '@/lib/invoices/types'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

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
    if (!data?.id) {
      return { success: false, error: 'Invoice could not be created. Please try again.' }
    }

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

    const updates: Record<string, unknown> = {}
    if (input.project_id !== undefined) updates.project_id = input.project_id
    if (input.issue_date !== undefined) updates.issue_date = input.issue_date
    if (input.due_date !== undefined) updates.due_date = input.due_date
    if (input.notes !== undefined) updates.notes = input.notes
    if (input.client_id !== undefined) updates.client_id = input.client_id
    if (input.type !== undefined) updates.type = input.type

    if (input.lines) {
      const { subtotal, gst_amount, total } = calcTotals(input.lines)
      updates.lines = input.lines
      updates.subtotal = subtotal
      updates.gst_amount = gst_amount
      updates.total = total
    }

    if (Object.keys(updates).length === 0) {
      return { success: true, data: undefined }
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

    const num = invoice?.invoice_number ?? id
    const total = invoice?.total ?? 0
    const dueDate = invoice?.due_date ?? ''
    const clientName =
      oneRelation(invoice?.clients as { company_name?: string } | { company_name?: string }[] | null)
        ?.company_name ?? 'client'

    await logActivity({
      entityType: 'invoice',
      entityId: id,
      action: 'sent',
      description: `Invoice ${num} sent to ${clientName}`,
    })

    await sendSlackAlert('billing', {
      text: `Invoice sent: ${num}`,
      title: 'Invoice sent',
      fields: [
        { label: 'Invoice', value: num },
        { label: 'Client', value: clientName },
        { label: 'Total', value: `$${Number(total).toFixed(2)} NZD` },
        { label: 'Due', value: dueDate },
      ],
    })

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
        paid_at: todayYmd(),
        payment_reference: paymentReference ?? null,
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    const num = invoice?.invoice_number ?? id
    const total = invoice?.total ?? 0
    const clientName =
      oneRelation(invoice?.clients as { company_name?: string } | { company_name?: string }[] | null)
        ?.company_name ?? 'client'

    await logActivity({
      entityType: 'invoice',
      entityId: id,
      action: 'paid',
      description: `Invoice ${num} marked as paid${paymentReference ? ` (ref: ${paymentReference})` : ''}`,
    })

    await sendSlackAlert('billing', {
      text: `Invoice paid: ${num}`,
      title: 'Invoice paid',
      fields: [
        { label: 'Invoice', value: num },
        { label: 'Client', value: clientName },
        { label: 'Amount', value: `$${Number(total).toFixed(2)} NZD` },
        ...(paymentReference ? [{ label: 'Reference', value: paymentReference }] : []),
      ],
    })

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

    const { data: entries } = await supabase
      .from('time_entries')
      .select('id, description, hours, team_users(hourly_rate), tasks(title)')
      .in('id', timeEntryIds)
      .eq('is_invoiced', false)

    if (!entries || entries.length === 0) {
      return { success: false, error: 'No uninvoiced time entries found' }
    }

    const lines: InvoiceLine[] = entries.map((e) => {
      const rate =
        Number(
          oneRelation(e.team_users as { hourly_rate?: number } | { hourly_rate?: number }[] | null)
            ?.hourly_rate ?? 0
        ) || 150
      const hours = Number(e.hours) || 0
      const amount = parseFloat((hours * rate).toFixed(2))
      const taskTitle = oneRelation(e.tasks as { title?: string } | { title?: string }[] | null)?.title
      return {
        description: (e.description as string | null) || taskTitle || 'Development work',
        quantity: hours,
        unit_price: rate,
        amount,
        time_entry_id: e.id as string,
      }
    })

    const { subtotal, gst_amount, total } = calcTotals(lines)
    const today = todayYmd()

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
    if (!data?.id) {
      return { success: false, error: 'Invoice could not be created. Please try again.' }
    }

    await supabase
      .from('time_entries')
      .update({ is_invoiced: true, invoice_id: data.id })
      .in(
        'id',
        entries.map((e) => e.id as string)
      )

    await logActivity({
      entityType: 'invoice',
      entityId: data.id,
      clientId,
      action: 'created',
      description: `Invoice ${data.invoice_number} generated from ${entries.length} time entries`,
    })

    revalidatePath('/app/invoices')
    revalidatePath(`/app/invoices/${data.id}`)
    revalidatePath(`/app/projects/${projectId}`)
    return { success: true, data: { id: data.id, invoice_number: data.invoice_number } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function voidInvoiceAction(id: string): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createSupabaseClient()
    const { data: invoice, error: loadError } = await supabase
      .from('invoices')
      .select('status, invoice_number')
      .eq('id', id)
      .maybeSingle()

    if (loadError) return { success: false, error: loadError.message }
    if (!invoice) return { success: false, error: 'Invoice not found' }
    if (invoice.status === 'paid') {
      return { success: false, error: 'Paid invoices cannot be voided' }
    }

    const { error } = await supabase.from('invoices').update({ status: 'void' }).eq('id', id)
    if (error) return { success: false, error: error.message }

    await logActivity({
      entityType: 'invoice',
      entityId: id,
      action: 'voided',
      description: `Invoice ${invoice.invoice_number ?? id} voided`,
    })

    revalidatePath(`/app/invoices/${id}`)
    revalidatePath('/app/invoices')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
