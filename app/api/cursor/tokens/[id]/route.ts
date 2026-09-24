import { NextResponse } from 'next/server'
import { requireTeamAccess } from '@/lib/supabase/route-access'

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const access = await requireTeamAccess()
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status })
  }

  const { error } = await access.db
    .from('cursor_api_tokens')
    .update({ is_active: false })
    .eq('id', id)
    .eq('team_user_id', access.userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
