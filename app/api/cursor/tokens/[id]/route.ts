import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = await createServiceClient()
  const { error } = await service
    .from('cursor_api_tokens')
    .update({ is_active: false })
    .eq('id', id)
    .eq('team_user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
