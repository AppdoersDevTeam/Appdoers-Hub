import { NextRequest } from 'next/server'
import { fetchClientDisplayInfo } from '@/lib/clients/fetch-client-display'
import { type BillingInfo, type CompanyInfo } from '@/lib/invoices/invoice-pdf-document'
import { normalizeInvoiceLines } from '@/lib/invoices/normalize'
import { renderPdfRoute } from '@/lib/pdf/render-route'
import { requireInvoiceAccess } from '@/lib/supabase/route-access'

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
  const access = await requireInvoiceAccess(id)
  if (!access.ok) {
    return Response.json({ error: access.message }, { status: access.status })
  }

  const { db } = access

  const [{ data: invoice, error: invoiceError }, { data: companySetting }, { data: billingSetting }] =
    await Promise.all([
      db.from('invoices').select('*').eq('id', id).maybeSingle(),
      db.from('settings').select('value').eq('key', 'company').maybeSingle(),
      db.from('settings').select('value').eq('key', 'billing').maybeSingle(),
    ])

  if (invoiceError) {
    console.error('Invoice PDF fetch error:', invoiceError.message)
    return Response.json({ error: 'Failed to load invoice' }, { status: 500 })
  }

  if (!invoice) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const [{ data: clientRow }, { data: project }, clientInfo] = await Promise.all([
    db.from('clients').select('id, company_name').eq('id', invoice.client_id).maybeSingle(),
    invoice.project_id
      ? db.from('projects').select('name').eq('id', invoice.project_id).maybeSingle()
      : Promise.resolve({ data: null }),
    fetchClientDisplayInfo(db, invoice.client_id as string),
  ])

  const company = { ...DEFAULT_COMPANY, ...((companySetting?.value as Partial<CompanyInfo> | null) ?? {}) }
  const billing = { ...DEFAULT_BILLING, ...((billingSetting?.value as Partial<BillingInfo> | null) ?? {}) }
  const lines = normalizeInvoiceLines(invoice.lines)
  const clientName = clientRow?.company_name ?? clientInfo.companyName

  const pdfProps = {
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
    contactName: clientInfo.contactName,
    contactEmail: clientInfo.contactEmail,
    projectName: project?.name ?? null,
    company,
    billing,
  }

  return renderPdfRoute(async () => {
    const { renderInvoicePdfToBuffer } = await import('@/lib/pdf/render-invoice-pdf')
    return renderInvoicePdfToBuffer(pdfProps)
  }, `${invoice.invoice_number}_${clientName}.pdf`)
}
