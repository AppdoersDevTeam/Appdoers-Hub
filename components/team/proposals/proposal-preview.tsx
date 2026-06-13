'use client'

import { formatCurrency, formatLongDate } from '@/lib/utils/format'

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
      <div className="mb-16 rounded-xl bg-gradient-to-br from-slate-50 to-white p-12 text-center border border-slate-200">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-600/20">
          <div className="h-8 w-8 rounded bg-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{title}</h1>
        {client && (
          <p className="text-lg text-slate-500">Prepared for {client.company_name}</p>
        )}
        <p className="mt-4 text-sm text-slate-500">{formatLongDate(new Date())}</p>
      </div>

      {/* Sections */}
      <div className="space-y-12">
        {sections.map((section) => {
          if (section.id === 'cover') return null // Already shown above

          if (section.id === 'investment') {
            const items = section.pricing_items ?? []
            return (
              <div key={section.id} className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-3">{section.title}</h2>
                {section.content && (
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{section.content}</p>
                )}
                {items.length > 0 && (
                  <>
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Service</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Description</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Setup</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Monthly</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {items.map((item, i) => (
                            <tr key={i} className="bg-white">
                              <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                              <td className="px-4 py-3 text-slate-500">{item.description || '—'}</td>
                              <td className="px-4 py-3 text-right text-slate-600">{item.setup_fee > 0 ? formatCurrency(item.setup_fee) : '—'}</td>
                              <td className="px-4 py-3 text-right text-slate-600">{item.monthly_fee > 0 ? `${formatCurrency(item.monthly_fee)}/mo` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-blue-600/30 bg-slate-50">
                            <td colSpan={2} className="px-4 py-3 font-semibold text-slate-900">Total Investment</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(totalSetup)}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(totalMonthly)}/mo</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                        <p className="text-xs text-slate-500 mb-1">Setup</p>
                        <p className="text-lg font-bold text-slate-900">{formatCurrency(totalSetup)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                        <p className="text-xs text-slate-500 mb-1">Monthly</p>
                        <p className="text-lg font-bold text-slate-900">{formatCurrency(totalMonthly)}/mo</p>
                      </div>
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
                        <p className="text-xs text-slate-500 mb-1">Annual Value</p>
                        <p className="text-lg font-bold text-blue-600">{formatCurrency(totalSetup + totalMonthly * 12)}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          }

          return (
            <div key={section.id} className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-3">{section.title}</h2>
              <div className="text-slate-600 leading-relaxed whitespace-pre-wrap">{section.content || <span className="text-slate-500 italic">No content yet.</span>}</div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-16 border-t border-slate-200 pt-8 text-center">
        <p className="text-sm text-slate-500">Prepared by Appdoers · appdoers.co.nz</p>
        {client?.contact_email && (
          <p className="text-xs text-slate-500 mt-1">Attention: {client.contact_name ?? ''} · {client.contact_email}</p>
        )}
      </div>
    </div>
  )
}
