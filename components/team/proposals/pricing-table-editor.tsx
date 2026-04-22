'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { PricingItem } from './proposal-builder'

interface Service {
  id: string
  name: string
  type: string
  plan_key: string | null
  setup_fee: number
  monthly_fee: number
}

interface Section {
  id: string
  title: string
  content: string
}

const labelClass = 'block text-xs font-medium text-[#94A3B8] mb-1'
const selectClass = 'w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none'

export function PricingTableEditor({
  section,
  services,
  pricingItems,
  onUpdate,
  onContentUpdate,
  totalSetup,
  totalMonthly,
}: {
  section: Section
  services: Service[]
  pricingItems: PricingItem[]
  onUpdate: (items: PricingItem[]) => void
  onContentUpdate: (content: string) => void
  totalSetup: number
  totalMonthly: number
}) {
  const [addMode, setAddMode] = useState<'catalog' | 'custom' | null>(null)
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [customItem, setCustomItem] = useState({ name: '', description: '', setup_fee: '', monthly_fee: '' })

  const addFromCatalog = () => {
    const svc = services.find((s) => s.id === selectedServiceId)
    if (!svc) return
    const newItem: PricingItem = {
      id: crypto.randomUUID(),
      service_id: svc.id,
      name: svc.name,
      description: '',
      setup_fee: svc.setup_fee,
      monthly_fee: svc.monthly_fee,
    }
    onUpdate([...pricingItems, newItem])
    setSelectedServiceId('')
    setAddMode(null)
  }

  const addCustomItem = () => {
    if (!customItem.name.trim()) return
    const newItem: PricingItem = {
      id: crypto.randomUUID(),
      service_id: null,
      name: customItem.name,
      description: customItem.description,
      setup_fee: parseFloat(customItem.setup_fee) || 0,
      monthly_fee: parseFloat(customItem.monthly_fee) || 0,
    }
    onUpdate([...pricingItems, newItem])
    setCustomItem({ name: '', description: '', setup_fee: '', monthly_fee: '' })
    setAddMode(null)
  }

  const removeItem = (index: number) => {
    onUpdate(pricingItems.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof PricingItem, value: string | number | null) => {
    const updated = pricingItems.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    )
    onUpdate(updated)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#F1F5F9]">{section.title}</h2>
        <p className="text-sm text-[#475569]">Define the services and pricing for this proposal.</p>
      </div>

      {/* Intro text */}
      <div>
        <label className={labelClass}>Section Introduction</label>
        <textarea
          value={section.content}
          onChange={(e) => onContentUpdate(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-4 py-3 text-sm text-[#F1F5F9] placeholder:text-[#475569] focus:border-[#3B82F6] focus:outline-none resize-y leading-relaxed"
          placeholder="Brief intro to the investment section…"
        />
      </div>

      {/* Pricing items table */}
      <div className="hub-card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-[#1F2D45] px-4 py-3">
          <p className="text-sm font-medium text-[#F1F5F9]">Line Items</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setAddMode('catalog')}>
              <Plus className="mr-1 h-3.5 w-3.5" /> From Catalog
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAddMode('custom')}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Custom
            </Button>
          </div>
        </div>

        {/* Add from catalog */}
        {addMode === 'catalog' && (
          <div className="flex items-end gap-3 border-b border-[#1F2D45] bg-[#0D1526] px-4 py-3">
            <div className="flex-1">
              <label className={labelClass}>Select from Service Catalog</label>
              <select className={selectClass} value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)}>
                <option value="">Choose a service…</option>
                <optgroup label="Plans">
                  {services.filter(s => s.type === 'plan').map(s => (
                    <option key={s.id} value={s.id}>{s.name} — Setup: {formatCurrency(s.setup_fee)} / Monthly: {formatCurrency(s.monthly_fee)}</option>
                  ))}
                </optgroup>
                <optgroup label="Add-ons">
                  {services.filter(s => s.type === 'addon').map(s => (
                    <option key={s.id} value={s.id}>{s.name} — Setup: {formatCurrency(s.setup_fee)} / Monthly: {formatCurrency(s.monthly_fee)}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <Button size="sm" onClick={addFromCatalog} disabled={!selectedServiceId}>Add</Button>
            <Button size="sm" variant="outline" onClick={() => setAddMode(null)}>Cancel</Button>
          </div>
        )}

        {/* Add custom item */}
        {addMode === 'custom' && (
          <div className="border-b border-[#1F2D45] bg-[#0D1526] px-4 py-3">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelClass}>Name *</label>
                <Input value={customItem.name} onChange={(e) => setCustomItem(f => ({ ...f, name: e.target.value }))} placeholder="Service name" />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <Input value={customItem.description} onChange={(e) => setCustomItem(f => ({ ...f, description: e.target.value }))} placeholder="Optional" />
              </div>
              <div>
                <label className={labelClass}>Setup Fee</label>
                <Input type="number" min={0} step={0.01} value={customItem.setup_fee} onChange={(e) => setCustomItem(f => ({ ...f, setup_fee: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label className={labelClass}>Monthly Fee</label>
                <Input type="number" min={0} step={0.01} value={customItem.monthly_fee} onChange={(e) => setCustomItem(f => ({ ...f, monthly_fee: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addCustomItem}>Add Item</Button>
              <Button size="sm" variant="outline" onClick={() => setAddMode(null)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1F2D45]">
                {['Service', 'Description', 'Setup Fee', 'Monthly Fee', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#475569]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2D45]">
              {pricingItems.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#475569]">No line items yet. Add from the catalog or create a custom item.</td></tr>
              ) : (
                pricingItems.map((item, i) => (
                  <tr key={i} className="hover:bg-[#1C2537] transition-colors">
                    <td className="px-4 py-2">
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(i, 'name', e.target.value)}
                        className="border-transparent bg-transparent text-[#F1F5F9] hover:border-[#1F2D45] focus:border-[#3B82F6]"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(i, 'description', e.target.value)}
                        className="border-transparent bg-transparent text-[#CBD5E1] hover:border-[#1F2D45] focus:border-[#3B82F6]"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.setup_fee}
                        onChange={(e) => updateItem(i, 'setup_fee', parseFloat(e.target.value) || 0)}
                        className="border-transparent bg-transparent text-[#CBD5E1] hover:border-[#1F2D45] focus:border-[#3B82F6] w-28"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.monthly_fee}
                        onChange={(e) => updateItem(i, 'monthly_fee', parseFloat(e.target.value) || 0)}
                        className="border-transparent bg-transparent text-[#CBD5E1] hover:border-[#1F2D45] focus:border-[#3B82F6] w-28"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => removeItem(i)} className="rounded p-1 text-[#475569] hover:bg-[#1F2D45] hover:text-[#EF4444]">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {pricingItems.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-[#1F2D45] bg-[#0D1526]">
                  <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-[#F1F5F9]">Totals</td>
                  <td className="px-4 py-3 text-sm font-semibold text-[#F1F5F9]">{formatCurrency(totalSetup)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-[#F1F5F9]">{formatCurrency(totalMonthly)}/mo</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Summary cards */}
      {pricingItems.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="hub-card">
            <p className="text-xs text-[#475569]">One-time Setup</p>
            <p className="mt-1 text-2xl font-bold text-[#F1F5F9]">{formatCurrency(totalSetup)}</p>
          </div>
          <div className="hub-card">
            <p className="text-xs text-[#475569]">Monthly Recurring</p>
            <p className="mt-1 text-2xl font-bold text-[#F1F5F9]">{formatCurrency(totalMonthly)}<span className="text-sm font-normal text-[#475569]">/mo</span></p>
          </div>
          <div className="hub-card">
            <p className="text-xs text-[#475569]">Annual Value (12mo)</p>
            <p className="mt-1 text-2xl font-bold text-[#10B981]">{formatCurrency(totalSetup + totalMonthly * 12)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
