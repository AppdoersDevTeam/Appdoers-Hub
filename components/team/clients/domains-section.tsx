'use client'

import { useState, useTransition } from 'react'
import { Plus, Edit2, Trash2, ExternalLink, RefreshCw, Shield, ShieldAlert, ShieldCheck, ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SlideOver } from '@/components/ui/slide-over'
import { createDomainAction, updateDomainAction, deleteDomainAction, type DomainInput } from '@/lib/actions/domains'
import { formatDate } from '@/lib/utils/format'

interface Domain {
  id: string
  domain_name: string
  registrar: string | null
  expiry_date: string | null
  auto_renew: boolean
  hosting_provider: string | null
  vercel_project_name: string | null
  ssl_status: string | null
  tech_stack: string[]
  dns_notes: string | null
}

const labelClass = 'block text-xs font-medium text-[#94A3B8] mb-1'
const inputClass = 'w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none'

const REGISTRARS = ['GoDaddy', 'Namecheap', 'Cloudflare', 'Google Domains', 'Hover', 'Name.com', 'Domain.com', 'Other']
const HOSTING = ['Vercel', 'Netlify', 'WP Engine', 'SiteGround', 'Kinsta', 'Cloudflare Pages', 'AWS', 'DigitalOcean', 'Other']
const SSL_OPTIONS = ['active', 'expiring_soon', 'expired', 'unknown']
const TECH_OPTIONS = ['WordPress', 'Next.js', 'React', 'Webflow', 'Shopify', 'Squarespace', 'Wix', 'Laravel', 'Gatsby', 'Astro', 'Vue', 'Nuxt']

function daysUntil(dateStr: string): number {
  const expiry = new Date(dateStr)
  const today = new Date()
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function ExpiryBadge({ dateStr }: { dateStr: string }) {
  const days = daysUntil(dateStr)
  const formatted = formatDate(dateStr)

  if (days < 0) return (
    <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium bg-[#EF4444]/20 text-[#EF4444]">
      Expired {formatted}
    </span>
  )
  if (days <= 30) return (
    <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium bg-[#F59E0B]/20 text-[#F59E0B]">
      ⚠ Expires in {days}d · {formatted}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium bg-[#1F2D45] text-[#94A3B8]">
      Expires {formatted}
    </span>
  )
}

function SslIcon({ status }: { status: string | null }) {
  switch (status) {
    case 'active': return <span title="SSL Active"><ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" /></span>
    case 'expiring_soon': return <span title="SSL Expiring Soon"><ShieldAlert className="h-3.5 w-3.5 text-[#F59E0B]" /></span>
    case 'expired': return <span title="SSL Expired"><ShieldOff className="h-3.5 w-3.5 text-[#EF4444]" /></span>
    default: return <span title="SSL Unknown"><Shield className="h-3.5 w-3.5 text-[#475569]" /></span>
  }
}

const emptyForm: DomainInput = {
  domain_name: '',
  registrar: '',
  expiry_date: '',
  auto_renew: false,
  hosting_provider: '',
  vercel_project_name: '',
  ssl_status: 'unknown',
  tech_stack: [],
  dns_notes: '',
}

export function DomainsSection({
  domains: initial,
  clientId,
}: {
  domains: Domain[]
  clientId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [domains, setDomains] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Domain | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<DomainInput>(emptyForm)

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (d: Domain) => {
    setEditing(d)
    setForm({
      domain_name: d.domain_name,
      registrar: d.registrar ?? '',
      expiry_date: d.expiry_date ?? '',
      auto_renew: d.auto_renew,
      hosting_provider: d.hosting_provider ?? '',
      vercel_project_name: d.vercel_project_name ?? '',
      ssl_status: d.ssl_status ?? 'unknown',
      tech_stack: d.tech_stack ?? [],
      dns_notes: d.dns_notes ?? '',
    })
    setShowForm(true)
  }

  const toggleTech = (tech: string) => {
    setForm(f => ({
      ...f,
      tech_stack: f.tech_stack?.includes(tech)
        ? f.tech_stack.filter(t => t !== tech)
        : [...(f.tech_stack ?? []), tech]
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.domain_name.trim()) { setError('Domain name is required'); return }
    startTransition(async () => {
      const payload: DomainInput = {
        ...form,
        expiry_date: form.expiry_date || null,
        registrar: form.registrar || undefined,
        hosting_provider: form.hosting_provider || undefined,
        vercel_project_name: form.vercel_project_name || undefined,
        dns_notes: form.dns_notes || undefined,
      }

      const result = editing
        ? await updateDomainAction(editing.id, clientId, payload)
        : await createDomainAction(clientId, payload)

      if (!result.success) { setError(result.error); return }

      if (editing) {
        setDomains(prev => prev.map(d => d.id === editing.id ? {
          ...d,
          domain_name: form.domain_name,
          registrar: form.registrar || null,
          expiry_date: form.expiry_date || null,
          auto_renew: form.auto_renew ?? false,
          hosting_provider: form.hosting_provider || null,
          vercel_project_name: form.vercel_project_name || null,
          ssl_status: form.ssl_status || 'unknown',
          tech_stack: form.tech_stack ?? [],
          dns_notes: form.dns_notes || null,
        } : d))
      } else {
        const newId = (result as { success: true; data: { id: string } }).data.id
        setDomains(prev => [{
          id: newId,
          domain_name: form.domain_name,
          registrar: form.registrar || null,
          expiry_date: form.expiry_date || null,
          auto_renew: form.auto_renew ?? false,
          hosting_provider: form.hosting_provider || null,
          vercel_project_name: form.vercel_project_name || null,
          ssl_status: form.ssl_status || 'unknown',
          tech_stack: form.tech_stack ?? [],
          dns_notes: form.dns_notes || null,
        }, ...prev])
      }
      setShowForm(false)
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this domain? This cannot be undone.')) return
    startTransition(async () => {
      const result = await deleteDomainAction(id, clientId)
      if (result.success) setDomains(prev => prev.filter(d => d.id !== id))
    })
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#475569]">Track domains, expiry dates, hosting, and tech stack.</p>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Domain
          </Button>
        </div>

        {domains.length === 0 ? (
          <div className="rounded-lg border border-[#1F2D45] px-4 py-10 text-center text-[#475569]">
            No domains tracked yet. Add the client's domain(s) above.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {domains.map((d) => (
              <div key={d.id} className="hub-card space-y-3 group">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <SslIcon status={d.ssl_status} />
                    <a
                      href={`https://${d.domain_name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-[#F1F5F9] hover:text-[#3B82F6] transition-colors truncate flex items-center gap-1"
                    >
                      {d.domain_name}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEdit(d)} className="rounded p-1 text-[#475569] hover:bg-[#1F2D45] hover:text-[#94A3B8]">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(d.id)} disabled={isPending} className="rounded p-1 text-[#475569] hover:bg-[#1F2D45] hover:text-[#EF4444]">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expiry */}
                {d.expiry_date && (
                  <div className="flex items-center justify-between">
                    <ExpiryBadge dateStr={d.expiry_date} />
                    {d.auto_renew && (
                      <span className="flex items-center gap-1 text-xs text-[#10B981]">
                        <RefreshCw className="h-3 w-3" /> Auto-renew
                      </span>
                    )}
                  </div>
                )}

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {d.registrar && (
                    <>
                      <span className="text-[#475569]">Registrar</span>
                      <span className="text-[#CBD5E1]">{d.registrar}</span>
                    </>
                  )}
                  {d.hosting_provider && (
                    <>
                      <span className="text-[#475569]">Hosting</span>
                      <span className="text-[#CBD5E1]">{d.hosting_provider}</span>
                    </>
                  )}
                  {d.vercel_project_name && (
                    <>
                      <span className="text-[#475569]">Vercel Project</span>
                      <span className="text-[#CBD5E1] font-mono">{d.vercel_project_name}</span>
                    </>
                  )}
                </div>

                {/* Tech stack */}
                {d.tech_stack && d.tech_stack.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {d.tech_stack.map(t => (
                      <span key={t} className="rounded px-1.5 py-0.5 text-xs bg-[#1F2D45] text-[#94A3B8]">{t}</span>
                    ))}
                  </div>
                )}

                {/* DNS notes */}
                {d.dns_notes && (
                  <p className="text-xs text-[#475569] border-t border-[#1F2D45] pt-2">{d.dns_notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <SlideOver open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Domain' : 'Add Domain'}>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && <div className="rounded-md border border-[#EF4444]/20 bg-[#EF4444]/10 px-4 py-2 text-sm text-[#EF4444]">{error}</div>}

          <div>
            <label className={labelClass}>Domain Name *</label>
            <Input value={form.domain_name} onChange={e => setForm(f => ({ ...f, domain_name: e.target.value }))} placeholder="example.co.nz" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Registrar</label>
              <select className={inputClass} value={form.registrar} onChange={e => setForm(f => ({ ...f, registrar: e.target.value }))}>
                <option value="">Select…</option>
                {REGISTRARS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Hosting</label>
              <select className={inputClass} value={form.hosting_provider} onChange={e => setForm(f => ({ ...f, hosting_provider: e.target.value }))}>
                <option value="">Select…</option>
                {HOSTING.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Expiry Date</label>
              <Input type="date" value={form.expiry_date ?? ''} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>SSL Status</label>
              <select className={inputClass} value={form.ssl_status ?? 'unknown'} onChange={e => setForm(f => ({ ...f, ssl_status: e.target.value }))}>
                {SSL_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="auto_renew"
              checked={form.auto_renew ?? false}
              onChange={e => setForm(f => ({ ...f, auto_renew: e.target.checked }))}
              className="h-4 w-4 rounded border-[#1F2D45] bg-[#0A0F1E] accent-[#3B82F6]"
            />
            <label htmlFor="auto_renew" className="text-sm text-[#CBD5E1]">Auto-renew enabled</label>
          </div>

          <div>
            <label className={labelClass}>Vercel Project Name</label>
            <Input value={form.vercel_project_name ?? ''} onChange={e => setForm(f => ({ ...f, vercel_project_name: e.target.value }))} placeholder="my-project" />
          </div>

          <div>
            <label className={labelClass}>Tech Stack</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {TECH_OPTIONS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTech(t)}
                  className={`rounded px-2 py-1 text-xs transition-colors ${
                    form.tech_stack?.includes(t)
                      ? 'bg-[#3B82F6] text-white'
                      : 'bg-[#1F2D45] text-[#94A3B8] hover:bg-[#263548]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>DNS / Notes</label>
            <textarea
              value={form.dns_notes ?? ''}
              onChange={e => setForm(f => ({ ...f, dns_notes: e.target.value }))}
              rows={2}
              className="w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] placeholder:text-[#475569] focus:border-[#3B82F6] focus:outline-none resize-none"
              placeholder="DNS provider, special records, notes…"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">{isPending ? 'Saving…' : editing ? 'Save' : 'Add Domain'}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  )
}
