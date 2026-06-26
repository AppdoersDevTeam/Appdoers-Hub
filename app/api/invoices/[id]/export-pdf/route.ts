import { NextRequest } from 'next/server'
import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { InvoicePDFDocument, type BillingInfo, type CompanyInfo } from '@/lib/invoices/invoice-pdf-document'
import { normalizeInvoiceLines } from '@/lib/invoices/normalize'
import { renderPdfRoute } from '@/lib/pdf/render-route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_COMPANY: CompanyInfo = {
  name: 'Appdoers',
  email: 'hello@appdoers.co.nz',
  phone: '+64 22 5060 870',
  address: '',
  website: 'https://www.appdoers.co.nz',
}

const DEFAULT_BILLING: BillingInfo = {
  gst_rate: 0.15,
  bank_name: '',
  bank_account: '',
  bank_reference_prefix: 'INV',
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: invoice, error }, { data: companySetting }, { data: billingSetting }] = await Promise.all([
    supabase
      .from('invoices')
      .select(
        'id, invoice_number, status, type, issue_date, due_date, lines, subtotal, gst_amount, total, notes, paid_at, payment_reference, clients(company_name, contact_name, contact_email), projects(name)'
      )
      .eq('id', id)
      .maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'company').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'billing').maybeSingle(),
  ])

  if (error || !invoice) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const client = invoice.clients as {
    company_name?: string
    contact_name?: string | null
    contact_email?: string | null
  } | null
  const project = invoice.projects as { name?: string } | null
  const company = { ...DEFAULT_COMPANY, ...((companySetting?.value as Partial<CompanyInfo> | null) ?? {}) }
  const billing = { ...DEFAULT_BILLING, ...((billingSetting?.value as Partial<BillingInfo> | null) ?? {}) }
  const lines = normalizeInvoiceLines(invoice.lines)
  const clientName = client?.company_name ?? 'Client'

  return renderPdfRoute(
    React.createElement(InvoicePDFDocument, {
      invoiceNumber: invoice.invoice_number,
      status: invoice.status,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      type: invoice.type ?? 'adhoc',
      lines,
      subtotal: Number(invoice.subtotal ?? 0),
      gstAmount: Number(invoice.gst_amount ?? 0),
      total: Number(invoice.total ?? 0),
      notes: invoice.notes,
      paidAt: invoice.paid_at,
      paymentReference: invoice.payment_reference,
      clientName,
      contactName: client?.contact_name ?? null,
      contactEmail: client?.contact_email ?? null,
      projectName: project?.name ?? null,
      company,
      billing,
    }),
    `${invoice.invoice_number}_${clientName}.pdf`
  )
}
