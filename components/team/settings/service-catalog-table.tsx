'use client'

import { useState, useTransition } from 'react'
import { Plus, Edit2, Power } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SlideOver } from '@/components/ui/slide-over'
import { createServiceAction, updateServiceAction, toggleServiceActiveAction } from '@/lib/actions/service-catalog'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

interface Service {
  id: string
  name: string
  description: string | null
  type: string
  plan_key: string | null
  setup_fee: number
  monthly_fee: number
  is_active: boolean
  sort_order: number
}

const labelClass = 'block text-xs font-medium text-slate-500 mb-1'
const selectClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'

export function ServiceCatalogTable({ services }: { services: Service[] }) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [error, setError] = useState<string | null>(null)

  const emptyForm = { name: '', description: '', type: 'addon' as 'plan' | 'addon', plan_key: '', setup_fee: '', monthly_fee: '' }
  const [form, setForm] = useState(emptyForm)

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (s: Service) => {
    setEditing(s)
    setForm({ name: s.name, description: s.description ?? '', type: s.type as 'plan' | 'addon', plan_key: s.plan_key ?? '', setup_fee: String(s.setup_fee), monthly_fee: String(s.monthly_fee) })
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const input = {
        name: form.name,
        description: form.description || undefined,
        type: form.type,
        plan_key: form.plan_key || undefined,
        setup_fee: parseFloat(form.setup_fee) || 0,
        monthly_fee: parseFloat(form.monthly_fee) || 0,
      }
      const result = editing
        ? await updateServiceAction(editing.id, input)
        : await createServiceAction(input)
      if (!result.success) { setError(result.error); return }
      setShowForm(false)
    })
  }

  const handleToggle = (s: Service) => {
    startTransition(async () => {
      await toggleServiceActiveAction(s.id, !s.is_active)
    })
  }

  return (
    <>
      <div className="hub-card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <p className="text-sm text-slate-500">{services.length} service{services.length !== 1 ? 's' : ''}</p>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Service
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {['Name', 'Type', 'Setup Fee', 'Monthly Fee', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {services.map((s) => (
                <tr key={s.id} className={cn('transition-colors hover:bg-slate-50', !s.is_active && 'opacity-50')}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{s.name}</p>
                    {s.description && <p className="text-xs text-slate-500">{s.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium',
                      s.type === 'plan' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
                    )}>
                      {s.type === 'plan' ? 'Plan' : 'Add-on'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatCurrency(s.setup_fee)}</td>
                  <td className="px-4 py-3 text-slate-600">{s.monthly_fee > 0 ? `${formatCurrency(s.monthly_fee)}/mo` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium',
                      s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    )}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(s)} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-600">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleToggle(s)} disabled={isPending} title={s.is_active ? 'Deactivate' : 'Activate'} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-600">
                        <Power className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SlideOver open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Service' : 'New Service'}>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}
          <div>
            <label className={labelClass}>Name *</label>
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Type</label>
              <select className={selectClass} value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value as 'plan' | 'addon' }))}>
                <option value="plan">Plan</option>
                <option value="addon">Add-on</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Setup Fee</label>
              <Input type="number" min={0} step={0.01} value={form.setup_fee} onChange={(e) => setForm(f => ({ ...f, setup_fee: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Monthly Fee</label>
              <Input type="number" min={0} step={0.01} value={form.monthly_fee} onChange={(e) => setForm(f => ({ ...f, monthly_fee: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">{isPending ? 'Saving…' : editing ? 'Save' : 'Add Service'}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  )
}
