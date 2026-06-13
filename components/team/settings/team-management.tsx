'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, PowerOff, Power, KeyRound, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SlideOver } from '@/components/ui/slide-over'
import {
  createTeamMemberAction,
  updateTeamMemberAction,
  toggleTeamMemberActiveAction,
  resetMemberPasswordAction,
} from '@/lib/actions/team'
import { cn } from '@/lib/utils/cn'

const labelClass = 'block text-xs font-medium text-slate-500 mb-1'
const selectClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'

const ROLES = [
  { value: 'account_manager', label: 'Account Manager' },
  { value: 'developer', label: 'Developer' },
  { value: 'designer', label: 'Designer' },
  { value: 'director', label: 'Director' },
]

const roleColors: Record<string, string> = {
  director: 'bg-blue-50 text-blue-700',
  account_manager: 'bg-emerald-50 text-emerald-700',
  developer: 'bg-purple-50 text-purple-700',
  designer: 'bg-amber-50 text-amber-700',
}

const roleLabels: Record<string, string> = {
  director: 'Director',
  account_manager: 'Account Manager',
  developer: 'Developer',
  designer: 'Designer',
}

interface Member {
  id: string
  full_name: string
  email: string
  role: string
  phone: string | null
  title: string | null
  is_active: boolean
}

interface Props {
  members: Member[]
  currentUserId: string
}

const emptyForm = {
  email: '',
  full_name: '',
  role: 'developer',
  phone: '',
  title: '',
  password: '',
}

export function TeamManagement({ members, currentUserId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Create slide-over
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(emptyForm)

  // Edit slide-over
  const [editMember, setEditMember] = useState<Member | null>(null)
  const [editForm, setEditForm] = useState({
    full_name: '',
    role: '',
    phone: '',
    title: '',
  })

  // Reset password
  const [resetMember, setResetMember] = useState<Member | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const flash = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3500)
  }

  const handleCreate = () => {
    setError(null)
    if (!createForm.email || !createForm.full_name || !createForm.password) {
      setError('Email, name and password are required')
      return
    }
    if (createForm.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    startTransition(async () => {
      const result = await createTeamMemberAction(createForm)
      if (!result.success) { setError(result.error); return }
      setCreateForm(emptyForm)
      setShowCreate(false)
      flash('Team member created successfully')
      router.refresh()
    })
  }

  const openEdit = (m: Member) => {
    setEditMember(m)
    setEditForm({ full_name: m.full_name, role: m.role, phone: m.phone ?? '', title: m.title ?? '' })
    setError(null)
  }

  const handleEdit = () => {
    if (!editMember) return
    setError(null)
    if (!editForm.full_name.trim()) { setError('Name is required'); return }
    startTransition(async () => {
      const result = await updateTeamMemberAction(editMember.id, editForm)
      if (!result.success) { setError(result.error); return }
      setEditMember(null)
      flash('Team member updated')
      router.refresh()
    })
  }

  const handleToggleActive = (member: Member) => {
    startTransition(async () => {
      const result = await toggleTeamMemberActiveAction(member.id, !member.is_active)
      if (!result.success) { setError(result.error); return }
      flash(member.is_active ? 'Member deactivated' : 'Member reactivated')
      router.refresh()
    })
  }

  const handleResetPassword = () => {
    if (!resetMember) return
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return }
    setError(null)
    startTransition(async () => {
      const result = await resetMemberPasswordAction(resetMember.id, newPassword)
      if (!result.success) { setError(result.error); return }
      setResetMember(null)
      setNewPassword('')
      flash('Password reset successfully')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Team Members</h2>
          <p className="text-sm text-slate-500">
            Manage who has access to Appdoers Hub.
          </p>
        </div>
        <Button size="sm" onClick={() => { setShowCreate(true); setError(null) }}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Member
        </Button>
      </div>

      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-600">
          {success}
        </div>
      )}

      {/* Members table */}
      <div className="hub-card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {['Member', 'Role', 'Phone', 'Title', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {members.map((m) => (
              <tr key={m.id} className={cn('transition-colors hover:bg-slate-50', !m.is_active && 'opacity-50')}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                      {m.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {m.full_name}
                        {m.id === currentUserId && (
                          <span className="ml-2 text-xs text-slate-500">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', roleColors[m.role] ?? 'bg-slate-100 text-slate-500')}>
                    {roleLabels[m.role] ?? m.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{m.phone ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{m.title ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', m.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                    {m.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(m)}
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                      title="Edit member"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => { setResetMember(m); setNewPassword(''); setError(null) }}
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600 transition-colors"
                      title="Reset password"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </button>
                    {m.id !== currentUserId && (
                      <button
                        onClick={() => handleToggleActive(m)}
                        disabled={isPending}
                        className={cn(
                          'rounded p-1.5 transition-colors',
                          m.is_active
                            ? 'text-slate-500 hover:bg-slate-100 hover:text-red-600'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-emerald-600'
                        )}
                        title={m.is_active ? 'Deactivate member' : 'Reactivate member'}
                      >
                        {m.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create slide-over */}
      <SlideOver open={showCreate} onClose={() => setShowCreate(false)} title="Add Team Member">
        <div className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <div>
            <label className={labelClass}>Full Name *</label>
            <Input value={createForm.full_name} onChange={(e) => setCreateForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Jane Smith" />
          </div>
          <div>
            <label className={labelClass}>Email *</label>
            <Input type="email" value={createForm.email} onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@appdoers.co.nz" />
          </div>
          <div>
            <label className={labelClass}>Role *</label>
            <select className={selectClass} value={createForm.role} onChange={(e) => setCreateForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Job Title</label>
            <Input value={createForm.title} onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Lead Developer" />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <Input value={createForm.phone} onChange={(e) => setCreateForm(f => ({ ...f, phone: e.target.value }))} placeholder="+64 21 000 0000" />
          </div>
          <div>
            <label className={labelClass}>Temporary Password *</label>
            <Input type="password" value={createForm.password} onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 characters" />
            <p className="mt-1 text-xs text-slate-500">They can change this from their Account page.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleCreate} disabled={isPending} className="flex-1">
              {isPending ? 'Creating…' : 'Create Member'}
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      </SlideOver>

      {/* Edit slide-over */}
      <SlideOver open={!!editMember} onClose={() => setEditMember(null)} title="Edit Team Member">
        <div className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <div>
            <label className={labelClass}>Full Name *</label>
            <Input value={editForm.full_name} onChange={(e) => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Role</label>
            <select className={selectClass} value={editForm.role} onChange={(e) => setEditForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Job Title</label>
            <Input value={editForm.title} onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Lead Developer" />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <Input value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="+64 21 000 0000" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleEdit} disabled={isPending} className="flex-1">
              {isPending ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
          </div>
        </div>
      </SlideOver>

      {/* Reset password modal */}
      <SlideOver open={!!resetMember} onClose={() => setResetMember(null)} title={`Reset Password — ${resetMember?.full_name}`}>
        <div className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <p className="text-sm text-slate-600">
            Set a new temporary password for <strong>{resetMember?.full_name}</strong>. They should change it after logging in.
          </p>
          <div>
            <label className={labelClass}>New Password *</label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 8 characters" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleResetPassword} disabled={isPending || newPassword.length < 8} className="flex-1">
              {isPending ? 'Resetting…' : 'Reset Password'}
            </Button>
            <Button variant="outline" onClick={() => setResetMember(null)}>Cancel</Button>
          </div>
        </div>
      </SlideOver>
    </div>
  )
}
