import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { can, getEffectivePermissions } from '@/lib/permissions'
import { LibraryFileViewer } from '@/components/team/library/library-file-viewer'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LibraryFilePage({ params }: Props) {
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

  const { data: row, error } = await supabase
    .from('hub_library_items')
    .select('id, title, file_name, mime_type, file_size, updated_at')
    .eq('id', id)
    .maybeSingle()

  if (error || !row?.file_name) notFound()

  return (
    <div className="theme-team min-h-screen bg-[#64748b] p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-3">
        <div className="flex items-center justify-between gap-3 text-sm text-white">
          <Link href={`/app/library/${id}`} className="hover:underline">
            ← Back to {row.title}
          </Link>
        </div>
        <LibraryFileViewer
          itemId={row.id as string}
          fileName={row.file_name as string}
          mimeType={(row.mime_type as string | null) ?? null}
          fileSize={typeof row.file_size === 'number' ? row.file_size : null}
          cacheKey={`${row.file_name}-${row.updated_at}`}
          heightClass="min-h-[calc(100vh-6rem)] h-auto"
        />
      </div>
    </div>
  )
}
