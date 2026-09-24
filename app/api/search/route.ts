import { NextRequest, NextResponse } from 'next/server'
import { requireTeamAccess } from '@/lib/supabase/route-access'

export async function GET(req: NextRequest) {
  const access = await requireTeamAccess()
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status })
  }

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().replace(/[,()]/g, ' ')
  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const term = `%${q}%`

  const [{ data: clients }, { data: leads }, { data: projects }, { data: tasks }] = await Promise.all([
    access.db.from('clients').select('id, company_name').ilike('company_name', term).limit(6),
    access.db.from('leads').select('id, contact_name, company_name').or(`contact_name.ilike.${term},company_name.ilike.${term}`).limit(6),
    access.db.from('projects').select('id, name').ilike('name', term).limit(6),
    access.db.from('tasks').select('id, title').ilike('title', term).limit(8),
  ])

  const results = [
    ...(clients ?? []).map((row) => ({
      id: row.id,
      type: 'client' as const,
      title: row.company_name,
      href: `/app/clients/${row.id}`,
    })),
    ...(leads ?? []).map((row) => ({
      id: row.id,
      type: 'lead' as const,
      title: row.company_name ? `${row.contact_name} · ${row.company_name}` : row.contact_name,
      href: `/app/leads/${row.id}`,
    })),
    ...(projects ?? []).map((row) => ({
      id: row.id,
      type: 'project' as const,
      title: row.name,
      href: `/app/projects/${row.id}`,
    })),
    ...(tasks ?? []).map((row) => ({
      id: row.id,
      type: 'task' as const,
      title: row.title,
      href: `/app/tasks/${row.id}`,
    })),
  ]

  return NextResponse.json({ results })
}
