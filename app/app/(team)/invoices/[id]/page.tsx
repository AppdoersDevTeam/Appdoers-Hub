import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InvoiceEditor } from '@/components/team/invoices/invoice-editor'

interface Props {
  params: Promise<{ id: string }>
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (invoiceError || !invoice) notFound()

  const [{ data: client }, { data: project }, { data: clients }, { data: projects }] =
    await Promise.all([
      supabase
        .from('clients')
        .select('id, company_name, contact_name, contact_email')
        .eq('id', invoice.client_id)
        .maybeSingle(),
      invoice.project_id
        ? supabase
            .from('projects')
            .select('id, name')
            .eq('id', invoice.project_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('clients').select('id, company_name').eq('status', 'active').order('company_name'),
      supabase.from('projects').select('id, name, client_id').order('name'),
    ])

  return (
    <InvoiceEditor
      invoice={invoice}
      client={client}
      project={project}
      allClients={clients ?? []}
      allProjects={projects ?? []}
    />
  )
}
