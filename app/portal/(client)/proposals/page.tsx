import { createClient } from '@/lib/supabase/server'
import { FileText, Download } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft: { label: 'On file', cls: 'bg-slate-100 text-slate-600' },
  sent: { label: 'Sent', cls: 'bg-blue-50 text-blue-600' },
  approved: { label: 'Approved', cls: 'bg-green-50 text-green-700' },
  declined: { label: 'Declined', cls: 'bg-red-50 text-red-600' },
  expired: { label: 'Expired', cls: 'bg-amber-50 text-amber-700' },
}

export default async function PortalProposalsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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

  const { data: proposals } = await supabase
    .from('proposals')
    .select('id, title, status, created_at, sent_at, file_name')
    .eq('client_id', contact.client_id)
    .eq('is_client_visible', true)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
        <p className="text-gray-500 mt-1">Download proposals shared by Appdoers.</p>
      </div>

      {!proposals || proposals.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">No proposals to display yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => {
            const st = statusConfig[p.status] ?? statusConfig.sent
            return (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{p.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {p.file_name ?? 'Proposal document'} ·{' '}
                      {p.sent_at ? `Shared ${formatDate(p.sent_at)}` : formatDate(p.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={`/api/proposals/${p.id}/file`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                  <span className={cn('rounded-full px-3 py-1 text-xs font-medium', st.cls)}>
                    {st.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
