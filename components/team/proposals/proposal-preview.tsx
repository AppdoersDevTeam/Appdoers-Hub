'use client'

import { formatCurrency } from '@/lib/utils/format'

interface Section {
  id: string
  title: string
  content: string
  pricing_items?: {
    name: string
    description: string
    setup_fee: number
    monthly_fee: number
  }[]
}

interface Client {
  company_name: string
  contact_name?: string | null
  contact_email?: string | null
}

export function ProposalPreview({
  title,
  sections,
  client,
  totalSetup,
  totalMonthly,
}: {
  title: string
  sections: Section[]
  client: Client | null
  totalSetup: number
  totalMonthly: number
}) {
  return (
    <div className="mx-auto max-w-3xl px-8 py-12">
      {/* Cover */}
      <div className="mb-16 rounded-xl bg-gradient-to-br from-[#1C2537] to-[#0A0F1E] p-12 text-center border border-[#1F2D45]">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#3B82F6]/20">
          <div className="h-8 w-8 rounded bg-[#3B82F6]" />
        </div>
        <h1 className="text-3xl font-bold text-[#F1F5F9] mb-2">{title}</h1>
        {client && (
          <p className="text-lg text-[#94A3B8]">Prepared for {client.company_name}</p>
        )}
        <p className="mt-4 text-sm text-[#475569]">{new Date().toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Sections */}
      <div className="space-y-12">
        {sections.map((section) => {
          if (section.id === 'cover') return null // Already shown above

          if (section.id === 'investment') {
            const items = section.pricing_items ?? []
            return (
              <div key={section.id} className="space-y-4">
                <h2 className="text-xl font-bold text-[#F1F5F9] border-b border-[#1F2D45] pb-3">{section.title}</h2>
                {section.content && (
                  <p className="text-[#CBD5E1] leading-relaxed whitespace-pre-wrap">{section.content}</p>
                )}
                {items.length > 0 && (
                  <>
                    <div className="overflow-hidden rounded-lg border border-[#1F2D45]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#1F2D45] bg-[#0D1526]">
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#475569]">Service</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#475569]">Description</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#475569]">Setup</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#475569]">Monthly</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1F2D45]">
                          {items.map((item, i) => (
                            <tr key={i} className="bg-[#0A0F1E]">
                              <td className="px-4 py-3 font-medium text-[#F1F5F9]">{item.name}</td>
                              <td className="px-4 py-3 text-[#94A3B8]">{item.description || '—'}</td>
                              <td className="px-4 py-3 text-right text-[#CBD5E1]">{item.setup_fee > 0 ? formatCurrency(item.setup_fee) : '—'}</td>
                              <td className="px-4 py-3 text-right text-[#CBD5E1]">{item.monthly_fee > 0 ? `${formatCurrency(item.monthly_fee)}/mo` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-[#3B82F6]/30 bg-[#0D1526]">
                            <td colSpan={2} className="px-4 py-3 font-semibold text-[#F1F5F9]">Total Investment</td>
                            <td className="px-4 py-3 text-right font-bold text-[#F1F5F9]">{formatCurrency(totalSetup)}</td>
                            <td className="px-4 py-3 text-right font-bold text-[#F1F5F9]">{formatCurrency(totalMonthly)}/mo</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-lg border border-[#1F2D45] bg-[#0D1526] p-4 text-center">
                        <p className="text-xs text-[#475569] mb-1">Setup</p>
                        <p className="text-lg font-bold text-[#F1F5F9]">{formatCurrency(totalSetup)}</p>
                      </div>
                      <div className="rounded-lg border border-[#1F2D45] bg-[#0D1526] p-4 text-center">
                        <p className="text-xs text-[#475569] mb-1">Monthly</p>
                        <p className="text-lg font-bold text-[#F1F5F9]">{formatCurrency(totalMonthly)}/mo</p>
                      </div>
                      <div className="rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/10 p-4 text-center">
                        <p className="text-xs text-[#475569] mb-1">Annual Value</p>
                        <p className="text-lg font-bold text-[#3B82F6]">{formatCurrency(totalSetup + totalMonthly * 12)}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          }

          return (
            <div key={section.id} className="space-y-3">
              <h2 className="text-xl font-bold text-[#F1F5F9] border-b border-[#1F2D45] pb-3">{section.title}</h2>
              <div className="text-[#CBD5E1] leading-relaxed whitespace-pre-wrap">{section.content || <span className="text-[#475569] italic">No content yet.</span>}</div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-16 border-t border-[#1F2D45] pt-8 text-center">
        <p className="text-sm text-[#475569]">Prepared by Appdoers · appdoers.co.nz</p>
        {client?.contact_email && (
          <p className="text-xs text-[#475569] mt-1">Attention: {client.contact_name ?? ''} · {client.contact_email}</p>
        )}
      </div>
    </div>
  )
}
