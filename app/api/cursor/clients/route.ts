import { NextResponse } from 'next/server'
import { authenticateCursorRequest, cursorAuthFailed } from '@/lib/cursor-auth'

export async function GET(req: Request) {
  const auth = await authenticateCursorRequest(req)
  if (cursorAuthFailed(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = auth.service
    .from('clients')
    .select('id, company_name, status, website, location')
    .order('company_name', { ascending: true })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ clients: data ?? [] })
}
