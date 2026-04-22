'use client'

import { useState, useTransition } from 'react'
import { Plus, Edit2, Trash2, Eye, EyeOff, ExternalLink, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SlideOver } from '@/components/ui/slide-over'
import { createCredentialAction, updateCredentialAction, deleteCredentialAction, type CredentialInput } from '@/lib/actions/credentials'

interface Credential {
  id: string
  platform: string
  username: string | null
  password_encrypted: string | null
  url: string | null
  notes: string | null
}

const labelClass = 'block text-xs font-medium text-[#94A3B8] mb-1'

const COMMON_PLATFORMS = [
  'WordPress', 'Shopify', 'Webflow', 'Squarespace', 'Wix',
  'GoDaddy', 'Namecheap', 'Cloudflare', 'Vercel', 'Netlify',
  'Google Analytics', 'Google Search Console', 'Google Ads',
  'Facebook', 'Instagram', 'LinkedIn', 'cPanel', 'FTP', 'Other',
]

export function CredentialsSection({
  credentials: initial,
  clientId,
}: {
  credentials: Credential[]
  clientId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [credentials, setCredentials] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Credential | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState<string | null>(null)

  const emptyForm: CredentialInput = { platform: '', username: '', password_encrypted: '', url: '', notes: '' }
  const [form, setForm] = useState<CredentialInput>(emptyForm)

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (c: Credential) => {
    setEditing(c)
    setForm({ platform: c.platform, username: c.username ?? '', password_encrypted: c.password_encrypted ?? '', url: c.url ?? '', notes: c.notes ?? '' })
    setShowForm(true)
  }

  const togglePassword = (id: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.platform.trim()) { setError('Platform is required'); return }
    startTransition(async () => {
      const result = editing
        ? await updateCredentialAction(editing.id, clientId, form)
        : await createCredentialAction(clientId, form)

      if (!result.success) { setError(result.error); return }

      if (editing) {
        setCredentials(prev => prev.map(c => c.id === editing.id ? { ...c, ...form, id: c.id } : c))
      } else {
        setCredentials(prev => [{ ...form, id: (result as { success: true; data: { id: string } }).data.id, username: form.username || null, password_encrypted: form.password_encrypted || null, url: form.url || null, notes: form.notes || null }, ...prev])
      }
      setShowForm(false)
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this credential? This cannot be undone.')) return
    startTransition(async () => {
      const result = await deleteCredentialAction(id, clientId)
      if (result.success) setCredentials(prev => prev.filter(c => c.id !== id))
    })
  }

  const selectClass = 'w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none'

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#475569]">🔒 Internal only — never visible to clients</p>
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Credential
          </Button>
        </div>

        {credentials.length === 0 ? (
          <div className="rounded-lg border border-[#1F2D45] px-4 py-10 text-center text-[#475569]">
            No credentials stored yet. Add logins, API keys, and access details above.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {credentials.map((c) => (
              <div key={c.id} className="hub-card space-y-2 group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[#1F2D45] px-2 py-0.5 text-xs font-medium text-[#94A3B8]">{c.platform}</span>
                    {c.url && (
                      <a href={c.url.startsWith('http') ? c.url : `https://${c.url}`} target="_blank" rel="noopener noreferrer" className="text-[#475569] hover:text-[#3B82F6] transition-colors">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(c)} className="rounded p-1 text-[#475569] hover:bg-[#1F2D45] hover:text-[#94A3B8]">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} disabled={isPending} className="rounded p-1 text-[#475569] hover:bg-[#1F2D45] hover:text-[#EF4444]">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {c.username && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#475569] w-16 shrink-0">Username</span>
                    <span className="text-sm text-[#CBD5E1] font-mono flex-1 truncate">{c.username}</span>
                    <button onClick={() => copyToClipboard(c.username!, c.id + '-u')} className="text-[#475569] hover:text-[#94A3B8]" title="Copy">
                      <Copy className="h-3 w-3" />
                    </button>
                    {copied === c.id + '-u' && <span className="text-xs text-[#10B981]">Copied!</span>}
                  </div>
                )}

                {c.password_encrypted && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#475569] w-16 shrink-0">Password</span>
                    <span className="text-sm text-[#CBD5E1] font-mono flex-1">
                      {visiblePasswords.has(c.id) ? c.password_encrypted : '••••••••'}
                    </span>
                    <button onClick={() => togglePassword(c.id)} className="text-[#475569] hover:text-[#94A3B8]">
                      {visiblePasswords.has(c.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                    <button onClick={() => copyToClipboard(c.password_encrypted!, c.id + '-p')} className="text-[#475569] hover:text-[#94A3B8]" title="Copy">
                      <Copy className="h-3 w-3" />
                    </button>
                    {copied === c.id + '-p' && <span className="text-xs text-[#10B981]">Copied!</span>}
                  </div>
                )}

                {c.notes && <p className="text-xs text-[#475569] border-t border-[#1F2D45] pt-2 mt-2">{c.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <SlideOver open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Credential' : 'Add Credential'}>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && <div className="rounded-md border border-[#EF4444]/20 bg-[#EF4444]/10 px-4 py-2 text-sm text-[#EF4444]">{error}</div>}
          <div>
            <label className={labelClass}>Platform *</label>
            <select className={selectClass} value={form.platform} onChange={(e) => setForm(f => ({ ...f, platform: e.target.value }))}>
              <option value="">Select platform…</option>
              {COMMON_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {form.platform === 'Other' && (
              <Input className="mt-2" placeholder="Platform name" onChange={(e) => setForm(f => ({ ...f, platform: e.target.value }))} />
            )}
          </div>
          <div>
            <label className={labelClass}>URL / Login Page</label>
            <Input value={form.url} onChange={(e) => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
          </div>
          <div>
            <label className={labelClass}>Username / Email</label>
            <Input value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} placeholder="admin@example.com" />
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <Input type="text" value={form.password_encrypted} onChange={(e) => setForm(f => ({ ...f, password_encrypted: e.target.value }))} placeholder="Stored as plain text — internal use only" />
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-3 py-2 text-sm text-[#F1F5F9] placeholder:text-[#475569] focus:border-[#3B82F6] focus:outline-none resize-none"
              placeholder="2FA enabled, API key, etc."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">{isPending ? 'Saving…' : editing ? 'Save' : 'Add Credential'}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  )
}
