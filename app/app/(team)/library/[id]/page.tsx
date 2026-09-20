import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LibraryEditor, type LibraryItemDetail } from '@/components/team/library/library-editor'
import { getEffectivePermissions, can } from '@/lib/permissions'
import { parseLibraryKind } from '@/lib/library/constants'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LibraryItemPage({ params }: Props) {
  const { id } = await params
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

  const [{ data: row, error }, { data: teamMembers }] = await Promise.all([
    supabase
      .from('hub_library_items')
      .select('*')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('team_users')
      .select('id, full_name')
      .eq('is_active', true),
  ])

  if (error || !row) notFound()

  const kind = parseLibraryKind(row.kind)
  if (!kind) notFound()

  const names = new Map((teamMembers ?? []).map((m) => [m.id as string, m.full_name as string]))

  const item: LibraryItemDetail = {
    id: row.id as string,
    kind,
    title: row.title as string,
    summary: (row.summary as string | null) ?? null,
    body: (row.body as string | null) ?? '',
    link_url: (row.link_url as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    author_name: names.get(row.created_by as string) ?? null,
    editor_name: names.get(row.updated_by as string) ?? null,
  }

  return <LibraryEditor item={item} canEdit={can(effective, 'library', 'edit')} />
}
