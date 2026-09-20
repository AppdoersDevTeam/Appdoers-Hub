import Link from 'next/link'

export interface ClientSupabaseLink {
  project_name: string
  login_email: string
}

export function ClientSupabaseCard({ links }: { links: ClientSupabaseLink[] }) {
  return (
    <div className="hub-card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Supabase</h3>
        <Link href="/app/subscriptions" className="text-xs text-blue-600 hover:text-blue-700">
          Manage logins
        </Link>
      </div>
      {links.length === 0 ? (
        <p className="text-sm text-slate-500">No Supabase login is tied to this client yet.</p>
      ) : (
        <ul className="space-y-3">
          {links.map(link => (
            <li key={`${link.login_email}-${link.project_name}`}>
              <p className="text-xs text-slate-500">Project</p>
              <p className="text-sm font-medium text-slate-900">{link.project_name}</p>
              <p className="text-xs text-slate-500 mt-1">Login</p>
              <p className="text-sm text-slate-600 break-all">{link.login_email}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
