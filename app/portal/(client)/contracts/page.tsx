import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Pending', cls: 'bg-gray-100 text-gray-600' },
  sent: { label: 'Awaiting Signature', cls: 'bg-blue-50 text-blue-600' },
  signed: { label: 'Signed', cls: 'bg-green-50 text-green-700' },
  expired: { label: 'Expired', cls: 'bg-amber-50 text-amber-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-600' },
}

export default async function PortalContractsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get the contact's client_id
  const { data: contact } = await supabase
    .from('client_contacts')
    .select('client_id')
    .eq('portal_user_id', user?.id ?? '')
    .single()

  if (!contact) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">No account found.</p>
      </div>
    )
  }

  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, title, status, created_at, sent_at, signed_at')
    .eq('client_id', contact.client_id)
    .in('status', ['sent', 'signed'])
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
        <p className="text-gray-500 mt-1">Review and sign your service agreements.</p>
      </div>

      {(!contracts || contracts.length === 0) ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">No contracts to display yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => {
            const st = statusConfig[c.status] ?? statusConfig.sent
            return (
              <Link
                key={c.id}
                href={`/portal/contracts/${c.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{c.title}</p>
                    <p className="text-sm text-gray-500">
                      {c.signed_at
                        ? `Signed ${formatDate(c.signed_at)}`
                        : c.sent_at
                        ? `Received ${formatDate(c.sent_at)}`
                        : formatDate(c.created_at)}
                    </p>
                  </div>
                </div>
                <span className={cn('rounded-full px-3 py-1 text-xs font-medium', st.cls)}>{st.label}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
