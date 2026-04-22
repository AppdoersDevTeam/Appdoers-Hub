'use client'

import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/app/login')
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex h-8 w-8 items-center justify-center rounded-md text-[#94A3B8] transition-colors hover:bg-[#1C2537] hover:text-[#F1F5F9]"
      title="Sign out"
    >
      <LogOut className="h-4 w-4" />
    </button>
  )
}
