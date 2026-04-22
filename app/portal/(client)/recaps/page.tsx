import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils/cn'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

interface WorkItem {
  description: string
  category: string
}

const categoryColors: Record<string, string> = {
  Development: 'bg-blue-50 text-blue-700',
  Design: 'bg-purple-50 text-purple-700',
  SEO: 'bg-green-50 text-green-700',
  Content: 'bg-amber-50 text-amber-700',
  Maintenance: 'bg-gray-100 text-gray-700',
  Meetings: 'bg-indigo-50 text-indigo-700',
  Strategy: 'bg-rose-50 text-rose-700',
  Other: 'bg-gray-100 text-gray-600',
}

export default async function PortalRecapsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: contact } = await supabase
    .from('client_contacts')
    .select('client_id, first_name')
    .eq('portal_user_id', user?.id ?? '')
    .single()

  if (!contact) {
    return <div className="text-center py-20"><p className="text-gray-500">No account found.</p></div>
  }

  const { data: recaps } = await supabase
    .from('monthly_recaps')
    .select('id, month, year, intro_text, work_completed, performance_notes, coming_next, sent_at')
    .eq('client_id', contact.client_id)
    .eq('is_sent', true)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  if (!recaps || recaps.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Reports</h1>
          <p className="text-gray-500 mt-1">Monthly progress updates from Appdoers.</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <span className="text-2xl">📊</span>
          </div>
          <p className="font-medium text-gray-900 mb-1">No reports yet</p>
          <p className="text-sm text-gray-500">Your monthly progress reports will appear here once sent by Appdoers.</p>
        </div>
      </div>
    )
  }

  // Show most recent expanded, rest collapsed
  const [latest, ...older] = recaps

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Monthly Reports</h1>
        <p className="text-gray-500 mt-1">{recaps.length} report{recaps.length !== 1 ? 's' : ''} from Appdoers</p>
      </div>

      {/* Latest recap — expanded */}
      <RecapCard recap={latest} expanded />

      {/* Older recaps */}
      {older.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Previous Reports</h2>
          {older.map((r) => <RecapCard key={r.id} recap={r} expanded={false} />)}
        </div>
      )}
    </div>
  )
}

function RecapCard({ recap, expanded }: {
  recap: {
    id: string
    month: number
    year: number
    intro_text: string | null
    work_completed: unknown
    performance_notes: string | null
    coming_next: string | null
    sent_at: string | null
  }
  expanded: boolean
}) {
  const workItems = (recap.work_completed as WorkItem[] | null) ?? []
  const periodLabel = `${MONTHS[recap.month - 1]} ${recap.year}`

  if (!expanded) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">{periodLabel}</p>
            <p className="text-sm text-gray-500 mt-0.5">{workItems.length} work item{workItems.length !== 1 ? 's' : ''} completed</p>
          </div>
          {recap.sent_at && (
            <p className="text-xs text-gray-400">
              {new Date(recap.sent_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Group work items by category
  const byCategory = workItems.reduce<Record<string, WorkItem[]>>((acc, item) => {
    const cat = item.category ?? 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <div className="rounded-xl border border-blue-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-5">
        <p className="text-xs text-blue-200 font-medium uppercase tracking-wide">Monthly Progress Report</p>
        <h2 className="text-2xl font-bold text-white mt-1">{periodLabel}</h2>
        {recap.sent_at && (
          <p className="text-blue-200 text-sm mt-1">
            Sent {new Date(recap.sent_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Intro */}
        {recap.intro_text && (
          <div>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{recap.intro_text}</p>
          </div>
        )}

        {/* Work completed */}
        {workItems.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">✅ Work Completed This Month</h3>
            <div className="space-y-3">
              {Object.entries(byCategory).map(([cat, items]) => (
                <div key={cat}>
                  <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-medium mb-2', categoryColors[cat] ?? categoryColors.Other)}>
                    {cat}
                  </span>
                  <ul className="space-y-1 ml-1">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                        {item.description}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance */}
        {recap.performance_notes && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">📈 Performance & Highlights</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{recap.performance_notes}</p>
          </div>
        )}

        {/* Coming next */}
        {recap.coming_next && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">🔜 Coming Next Month</h3>
            <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap">{recap.coming_next}</p>
          </div>
        )}

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-400 text-center">Report prepared by Appdoers · appdoers.co.nz</p>
        </div>
      </div>
    </div>
  )
}
