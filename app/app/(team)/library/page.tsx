import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { LibraryList, type LibraryListItem } from '@/components/team/library/library-list'
import { getEffectivePermissions, can } from '@/lib/permissions'
import { parseLibraryKind } from '@/lib/library/constants'

export const dynamic = 'force-dynamic'

export default async function LibraryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: teamUser } = await supabase
    .from('team_users')
    .select('role, permissions')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  const effective = getEffectivePermissions(
    teamUser?.role ?? 'member',
    (teamUser?.permissions ?? {}) as Record<string, string>
  )

  if (!can(effective, 'library', 'view')) {
    redirect('/app/dashboard')
  }

  const [{ data: rows }, { data: teamMembers }] = await Promise.all([
    supabase
      .from('hub_library_items')
      .select('id, kind, title, summary, updated_at, updated_by, created_by')
      .order('updated_at', { ascending: false }),
    supabase
      .from('team_users')
      .select('id, full_name')
      .eq('is_active', true),
  ])

  const names = new Map((teamMembers ?? []).map((m) => [m.id as string, m.full_name as string]))

  const items: LibraryListItem[] = (rows ?? [])
    .map((row) => {
      const kind = parseLibraryKind(row.kind)
      if (!kind) return null
      return {
        id: row.id as string,
        kind,
        title: row.title as string,
        summary: (row.summary as string | null) ?? null,
        updated_at: row.updated_at as string,
        author_name: names.get(row.updated_by as string) ?? names.get(row.created_by as string) ?? null,
      }
    })
    .filter((item): item is LibraryListItem => item !== null)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Library"
        subtitle="Internal documents, templates, and workflows"
      />
      <LibraryList items={items} canEdit={can(effective, 'library', 'edit')} />
    </div>
  )
}
