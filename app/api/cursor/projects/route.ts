import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { hashApiToken } from '@/lib/cursor-workflow'

async function authenticateCursorRequest(req: Request) {
  const authHeader = req.headers.get('authorization')
  const headerToken = req.headers.get('x-appdoers-api-token')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  const token = (headerToken ?? bearerToken ?? '').trim()

  if (!token) return { error: 'Missing API token' as const }

  const service = await createServiceClient()
  const { data, error } = await service
    .from('cursor_api_tokens')
    .select('id')
    .eq('token_hash', hashApiToken(token))
    .eq('is_active', true)
    .single()

  if (error || !data) return { error: 'Invalid API token' as const }

  await service.from('cursor_api_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)
  return { service }
}

export async function GET(req: Request) {
  const auth = await authenticateCursorRequest(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { data, error } = await auth.service
    .from('projects')
    .select('id, name, status, current_phase, clients(company_name)')
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const projects = (data ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    status: project.status,
    current_phase: project.current_phase,
    client_name: (project.clients as { company_name?: string } | null)?.company_name ?? null,
  }))

  return NextResponse.json({ projects })
}
