import { notFound, redirect } from 'next/navigation'
import { InvoiceEditor } from '@/components/team/invoices/invoice-editor'
import { fetchClientDisplayInfo } from '@/lib/clients/fetch-client-display'
import { requireTeamAccess } from '@/lib/supabase/route-access'

interface Props {
  params: Promise<{ id: string }>
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params
  const access = await requireTeamAccess()
  if (!access.ok) {
    if (access.status === 401) redirect('/app/login')
    notFound()
  }

  const { data: invoice, error: invoiceError } = await access.db
    .from('invoices')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (invoiceError) {
    console.error('Invoice detail fetch error:', invoiceError.message)
    notFound()
  }

  if (!invoice) notFound()

  const [{ data: clientRow }, clientInfo, { data: project }, { data: clients }, { data: projects }] =
    await Promise.all([
      access.db
        .from('clients')
        .select('id, company_name')
        .eq('id', invoice.client_id)
        .maybeSingle(),
      fetchClientDisplayInfo(access.db, invoice.client_id as string),
      invoice.project_id
        ? access.db
            .from('projects')
            .select('id, name')
            .eq('id', invoice.project_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      access.db.from('clients').select('id, company_name').eq('status', 'active').order('company_name'),
      access.db.from('projects').select('id, name, client_id').order('name'),
    ])

  const client = clientRow
    ? {
        ...clientRow,
        contact_name: clientInfo.contactName,
        contact_email: clientInfo.contactEmail,
      }
    : null

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
