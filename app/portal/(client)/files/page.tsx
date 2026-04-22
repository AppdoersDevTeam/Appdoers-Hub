import { createClient } from '@/lib/supabase/server'
import { PortalFilesView } from '@/components/portal/files-view'

export default async function PortalFilesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: contact } = await supabase
    .from('client_contacts')
    .select('client_id')
    .eq('portal_user_id', user?.id ?? '')
    .single()

  if (!contact) {
    return <div className="text-center py-20"><p className="text-gray-500">No account found.</p></div>
  }

  const { data: files } = await supabase
    .from('files')
    .select('id, name, size, mime_type, folder, created_at')
    .eq('client_id', contact.client_id)
    .eq('is_client_visible', true)
    .order('created_at', { ascending: false })

  return (
    <PortalFilesView
      files={(files ?? []).map((f) => ({
        id: f.id,
        name: f.name as string,
        size: f.size as number | null,
        mime_type: f.mime_type as string | null,
        folder: f.folder as string | null,
        created_at: f.created_at as string,
      }))}
    />
  )
}
