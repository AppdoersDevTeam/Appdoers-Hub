import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InvoiceEditor } from '@/components/team/invoices/invoice-editor'

interface Props {
  params: Promise<{ id: string }>
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: invoice }, { data: clients }, { data: projects }] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, clients(id, company_name, contact_name, contact_email), projects(id, name)')
      .eq('id', id)
      .single(),
    supabase.from('clients').select('id, company_name').eq('status', 'active').order('company_name'),
    supabase.from('projects').select('id, name, client_id').order('name'),
  ])

  if (!invoice) notFound()

  return (
    <InvoiceEditor
      invoice={invoice}
      client={invoice.clients as { id: string; company_name: string; contact_name: string | null; contact_email: string | null } | null}
      project={invoice.projects as { id: string; name: string } | null}
      allClients={clients ?? []}
      allProjects={projects ?? []}
    />
  )
}
