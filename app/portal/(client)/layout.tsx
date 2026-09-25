import { PortalTopNav } from '@/components/portal/topnav'
import { createClient } from '@/lib/supabase/server'

export default async function PortalClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let clientName: string | undefined
  if (user) {
    const { data: contact } = await supabase
      .from('client_contacts')
      .select('clients(company_name)')
      .eq('portal_user_id', user.id)
      .eq('has_portal_access', true)
      .maybeSingle()
    const company = contact?.clients as { company_name?: string } | { company_name?: string }[] | null
    clientName = Array.isArray(company) ? company[0]?.company_name : company?.company_name
  }

  return (
    <div className="theme-portal min-h-dvh bg-[#F8FAFC]">
      <PortalTopNav clientName={clientName} />
      <main className="mx-auto max-w-6xl px-4 py-4 safe-bottom sm:px-6 sm:py-8">
        <div className="animate-fade-in">{children}</div>
      </main>
    </div>
  )
}
