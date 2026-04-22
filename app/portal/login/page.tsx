'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function PortalLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError || !data.user) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    // Verify this is a portal user (not a team member accidentally using portal login)
    const { data: contact } = await supabase
      .from('client_contacts')
      .select('id')
      .eq('portal_user_id', data.user.id)
      .eq('has_portal_access', true)
      .single()

    if (!contact) {
      await supabase.auth.signOut()
      setError('No portal access found for this account. Please contact Appdoers.')
      setLoading(false)
      return
    }

    router.push('/portal/projects')
    router.refresh()
  }

  return (
    <div className="theme-portal flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#3B82F6] shadow-lg shadow-blue-500/20">
            <span className="text-xl font-bold text-white">A</span>
          </div>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Appdoers Hub</h1>
          <p className="mt-1 text-sm text-slate-500">Client portal</p>
        </div>

        <div className="portal-card">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Email
              </label>
              <Input
                portal
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourcompany.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Password
              </label>
              <Input
                portal
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <Button variant="portal-default" type="submit" className="w-full" loading={loading}>
              Sign in to portal
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Are you from the Appdoers team?{' '}
          <a href="/app/login" className="text-[#3B82F6] hover:underline">
            Team login →
          </a>
        </p>
      </div>
    </div>
  )
}
