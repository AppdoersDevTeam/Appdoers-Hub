import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { InvoicesTable } from '@/components/team/invoices/invoices-table'

export default async function InvoicesPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  const [{ data: invoices }, { data: clients }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, status, type, issue_date, due_date, subtotal, gst_amount, total, paid_at, sent_at, clients(company_name), projects(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id, company_name')
      .eq('status', 'active')
      .order('company_name'),
  ])

  const rows = (invoices ?? []).map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    status: inv.status as string,
    type: inv.type as string,
    issue_date: inv.issue_date as string,
    due_date: inv.due_date as string,
    subtotal: Number(inv.subtotal ?? 0),
    gst_amount: Number(inv.gst_amount ?? 0),
    total: Number(inv.total ?? 0),
    paid_at: inv.paid_at as string | null,
    sent_at: inv.sent_at as string | null,
    client_name: (inv.clients as { company_name?: string } | null)?.company_name ?? '—',
    project_name: (inv.projects as { name?: string } | null)?.name ?? null,
    is_overdue: inv.status === 'sent' && (inv.due_date as string) < today,
  }))

  const totalOutstanding = rows
    .filter((r) => r.status === 'sent' || r.status === 'overdue')
    .reduce((sum, r) => sum + r.total, 0)
  const totalOverdue = rows
    .filter((r) => r.status === 'overdue' || r.is_overdue)
    .reduce((sum, r) => sum + r.total, 0)
  const totalPaidThisMonth = rows
    .filter((r) => r.status === 'paid' && r.paid_at?.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((sum, r) => sum + r.total, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        subtitle={`${rows.length} invoice${rows.length !== 1 ? 's' : ''}`}
      />
      <InvoicesTable
        invoices={rows}
        clients={clients ?? []}
        totalOutstanding={totalOutstanding}
        totalOverdue={totalOverdue}
        totalPaidThisMonth={totalPaidThisMonth}
      />
    </div>
  )
}
