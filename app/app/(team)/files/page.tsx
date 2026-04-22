import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { FilesManager } from '@/components/team/files/files-manager'

export default async function FilesPage() {
  const supabase = await createClient()

  const [{ data: files }, { data: clients }] = await Promise.all([
    supabase
      .from('files')
      .select('id, name, size, mime_type, folder, is_client_visible, created_at, client_id, project_id, clients(company_name), projects(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id, company_name')
      .eq('status', 'active')
      .order('company_name'),
  ])

  const rows = (files ?? []).map((f) => ({
    id: f.id,
    name: f.name as string,
    size: f.size as number | null,
    mime_type: f.mime_type as string | null,
    folder: f.folder as string | null,
    is_client_visible: f.is_client_visible as boolean,
    created_at: f.created_at as string,
    client_id: f.client_id as string,
    project_id: f.project_id as string | null,
    client_name: (f.clients as { company_name?: string } | null)?.company_name ?? '—',
    project_name: (f.projects as { name?: string } | null)?.name ?? null,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Files"
        subtitle={`${rows.length} file${rows.length !== 1 ? 's' : ''}`}
      />
      <FilesManager
        files={rows}
        clients={clients ?? []}
        showClientColumn
      />
    </div>
  )
}
