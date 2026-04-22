'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Mail, Phone, Edit2, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SlideOver } from '@/components/ui/slide-over'
import {
  createContactAction,
  updateContactAction,
  deleteContactAction,
  grantPortalAccessAction,
  revokePortalAccessAction,
} from '@/lib/actions/clients'
import { cn } from '@/lib/utils/cn'

interface Contact {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: string | null
  is_primary: boolean
  has_portal_access: boolean
}

interface Props {
  clientId: string
  contacts: Contact[]
}

const labelClass = 'block text-xs font-medium text-[#94A3B8] mb-1'

export function ContactsSection({ clientId, contacts }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [error, setError] = useState<string | null>(null)

  const emptyForm = {
    full_name: '',
    email: '',
    phone: '',
    role: '',
    is_primary: contacts.length === 0,
  }
  const [form, setForm] = useState(emptyForm)

  const set = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const openAdd = () => {
    setEditing(null)
    setForm({ ...emptyForm, is_primary: contacts.length === 0 })
    setShowForm(true)
  }

  const openEdit = (c: Contact) => {
    setEditing(c)
    setForm({
      full_name: c.full_name,
      email: c.email,
      phone: c.phone ?? '',
      role: c.role ?? '',
      is_primary: c.is_primary,
    })
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = editing
        ? await updateContactAction(editing.id, clientId, {
            full_name: form.full_name,
            email: form.email,
            phone: form.phone || undefined,
            role: form.role || undefined,
            is_primary: form.is_primary,
          })
        : await createContactAction({
            client_id: clientId,
            full_name: form.full_name,
            email: form.email,
            phone: form.phone || undefined,
            role: form.role || undefined,
            is_primary: form.is_primary,
          })

      if (!result.success) {
        setError(result.error)
        return
      }
      setShowForm(false)
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteContactAction(id, clientId)
      if (!result.success) setError(result.error)
    })
  }

  const handlePortalToggle = (contact: Contact) => {
    startTransition(async () => {
      const result = contact.has_portal_access
        ? await revokePortalAccessAction(contact.id, clientId, contact.email)
        : await grantPortalAccessAction(contact.id, clientId, contact.email)
      if (!result.success) setError(result.error)
    })
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#F1F5F9]">Contacts</h3>
        <Button size="sm" onClick={openAdd}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Contact
        </Button>
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-[#EF4444]/10 border border-[#EF4444]/20 px-4 py-2 text-sm text-[#EF4444]">
          {error}
        </div>
      )}

      {contacts.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#475569]">
          No contacts yet. Add the first contact for this client.
        </p>
      ) : (
        <div className="divide-y divide-[#1F2D45] rounded-lg border border-[#1F2D45]">
          {contacts.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-4 py-3">
              {/* Avatar */}
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#1C2537] text-sm font-medium text-[#94A3B8]">
                {c.full_name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#F1F5F9]">
                    {c.full_name}
                  </span>
                  {c.is_primary && (
                    <span className="rounded-full bg-[#3B82F6]/10 px-2 py-0.5 text-xs text-[#3B82F6]">
                      Primary
                    </span>
                  )}
                  {c.has_portal_access && (
                    <span className="rounded-full bg-[#10B981]/10 px-2 py-0.5 text-xs text-[#10B981]">
                      Portal Access
                    </span>
                  )}
                </div>
                {c.role && (
                  <p className="text-xs text-[#475569]">{c.role}</p>
                )}
                <div className="mt-1 flex items-center gap-4">
                  {c.email && (
                    <span className="flex items-center gap-1 text-xs text-[#94A3B8]">
                      <Mail className="h-3 w-3" /> {c.email}
                    </span>
                  )}
                  {c.phone && (
                    <span className="flex items-center gap-1 text-xs text-[#94A3B8]">
                      <Phone className="h-3 w-3" /> {c.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePortalToggle(c)}
                  disabled={isPending}
                  title={
                    c.has_portal_access
                      ? 'Revoke portal access'
                      : 'Grant portal access'
                  }
                  className={cn(
                    'rounded-md p-1.5 text-xs transition-colors',
                    c.has_portal_access
                      ? 'bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20'
                      : 'text-[#475569] hover:bg-[#1C2537] hover:text-[#94A3B8]'
                  )}
                >
                  <Globe className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => openEdit(c)}
                  className="rounded-md p-1.5 text-[#475569] transition-colors hover:bg-[#1C2537] hover:text-[#94A3B8]"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={isPending}
                  className="rounded-md p-1.5 text-[#475569] transition-colors hover:bg-[#EF4444]/10 hover:text-[#EF4444]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Slide-over */}
      <SlideOver
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Contact' : 'Add Contact'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-md bg-[#EF4444]/10 border border-[#EF4444]/20 px-4 py-2 text-sm text-[#EF4444]">
              {error}
            </div>
          )}
          <div>
            <label className={labelClass}>Full Name *</label>
            <Input
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Email *</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Phone</label>
              <Input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Role / Title</label>
              <Input
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                placeholder="e.g. CEO"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_primary}
              onChange={(e) => set('is_primary', e.target.checked)}
              className="rounded border-[#1F2D45] bg-[#0A0F1E] text-[#3B82F6]"
            />
            <span className="text-sm text-[#CBD5E1]">Primary contact</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Contact'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </SlideOver>
    </div>
  )
}
