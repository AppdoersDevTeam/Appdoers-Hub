import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Receipt } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

const statusConfig: Record<string, { label: string; cls: string }> = {
  sent: { label: 'Due', cls: 'bg-blue-50 text-blue-600' },
  overdue: { label: 'Overdue', cls: 'bg-red-50 text-red-600' },
  paid: { label: 'Paid', cls: 'bg-green-50 text-green-700' },
}

export default async function PortalInvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: contact } = await supabase
    .from('client_contacts')
    .select('client_id')
    .eq('portal_user_id', user?.id ?? '')
    .single()

  if (!contact) {
    return <div className="text-center py-20"><p className="text-gray-500">No account found.</p></div>
  }

  const today = new Date().toISOString().split('T')[0]

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, issue_date, due_date, subtotal, gst_amount, total, paid_at')
    .eq('client_id', contact.client_id)
    .in('status', ['sent', 'overdue', 'paid'])
    .order('issue_date', { ascending: false })

  const rows = (invoices ?? []).map((inv) => ({
    ...inv,
    is_overdue: inv.status === 'sent' && (inv.due_date as string) < today,
  }))

  const totalDue = rows.filter(r => r.status === 'sent' || r.is_overdue).reduce((s, r) => s + Number(r.total), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="text-gray-500 mt-1">View and track your invoices from Appdoers.</p>
      </div>

      {totalDue > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">Amount Due</p>
            <p className="text-2xl font-bold text-blue-700 mt-0.5">{formatCurrency(totalDue)}</p>
          </div>
          <p className="text-xs text-blue-600">Includes GST</p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Receipt className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">No invoices to display yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Invoice #', 'Issue Date', 'Due Date', 'Amount', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((inv) => {
                const displayStatus = inv.is_overdue ? 'overdue' : inv.status
                const st = statusConfig[displayStatus] ?? statusConfig.sent
                return (
                  <tr key={inv.id} className={cn('hover:bg-gray-50 transition-colors', inv.is_overdue && 'bg-red-50/30')}>
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(inv.issue_date as string)}</td>
                    <td className={cn('px-4 py-3', inv.is_overdue ? 'text-red-600 font-medium' : 'text-gray-600')}>
                      {formatDate(inv.due_date as string)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(Number(inv.total))}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', st.cls)}>{st.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
        <p className="text-sm text-gray-600">
          <strong>Payment details:</strong> Please use the invoice number as your payment reference.
          Contact <a href="mailto:hello@appdoers.co.nz" className="text-blue-600 hover:underline">hello@appdoers.co.nz</a> with any billing queries.
        </p>
      </div>
    </div>
  )
}
