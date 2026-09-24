import { NextResponse } from 'next/server'
import { authenticateCursorRequest, cursorAuthFailed } from '@/lib/cursor-auth'

export async function GET(req: Request) {
  const auth = await authenticateCursorRequest(req)
  if (cursorAuthFailed(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { data: teamUser, error } = await auth.service
    .from('team_users')
    .select('id, full_name, email, role')
    .eq('id', auth.teamUserId)
    .single()

  if (error || !teamUser) {
    return NextResponse.json({ error: 'Team user not found for token' }, { status: 404 })
  }

  return NextResponse.json({
    team_user: {
      id: teamUser.id,
      full_name: teamUser.full_name,
      email: teamUser.email,
      role: teamUser.role,
    },
    token: {
      id: auth.tokenId,
      name: auth.tokenName,
    },
  })
}
