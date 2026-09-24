import { NextResponse } from 'next/server'
import { authenticateCursorRequest, cursorAuthFailed } from '@/lib/cursor-auth'
import { getJoinedClientName } from '@/lib/cursor-ticket-format'

export async function GET(req: Request) {
  const auth = await authenticateCursorRequest(req)
  if (cursorAuthFailed(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('client_id')

  let query = auth.service
    .from('projects')
    .select('id, client_id, name, status, current_phase, clients(company_name)')
    .order('name', { ascending: true })

  if (clientId) query = query.eq('client_id', clientId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const projects = (data ?? []).map((project) => ({
    id: project.id,
    client_id: project.client_id,
    name: project.name,
    status: project.status,
    current_phase: project.current_phase,
    client_name: getJoinedClientName(project.clients),
  }))

  return NextResponse.json({ projects })
}
