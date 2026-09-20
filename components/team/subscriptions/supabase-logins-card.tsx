'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SlideOver } from '@/components/ui/slide-over'
import {
  createSupabaseAccountAction,
  updateSupabaseAccountAction,
  deleteSupabaseAccountAction,
  type HubProjectOption,
  type SupabaseAccountInput,
  type SupabaseAccountWithProjects,
} from '@/lib/actions/supabase-accounts'
import { cn } from '@/lib/utils/cn'

const labelClass = 'block text-xs font-medium text-slate-500 mb-1'

function SlotBadge({ used, limit }: { used: number; limit: number }) {
  const full = used >= limit
  const over = used > limit
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        over
          ? 'bg-red-50 text-red-700'
          : full
            ? 'bg-amber-50 text-amber-700'
            : 'bg-slate-100 text-slate-600'
      )}
    >
      {used}/{limit}{full ? (over ? ' over' : ' full') : ''}
    </span>
  )
}

const emptyForm = (subscriptionId: string): SupabaseAccountInput => ({
  subscription_id: subscriptionId,
  login_email: '',
  project_slot_limit: 2,
  project_ids: [],
})

interface Props {
  subscriptionId: string
  accounts: SupabaseAccountWithProjects[]
  pickerProjects: HubProjectOption[]
  canEdit: boolean
  onAccountsChange?: (accounts: SupabaseAccountWithProjects[]) => void
}

export function SupabaseLoginsCard({
  subscriptionId,
  accounts: initial,
  pickerProjects,
  canEdit,
  onAccountsChange,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [accounts, setAccounts] = useState(initial)

  const commitAccounts = (next: SupabaseAccountWithProjects[]) => {
    setAccounts(next)
    onAccountsChange?.(next)
  }
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SupabaseAccountWithProjects | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<SupabaseAccountInput>(emptyForm(subscriptionId))
  const [projectFilter, setProjectFilter] = useState('')

  const projectOwner = useMemo(() => {
    const map = new Map<string, { accountId: string; email: string }>()
    for (const account of accounts) {
      for (const project of account.projects) {
        map.set(project.id, { accountId: account.id, email: account.login_email })
      }
    }
    return map
  }, [accounts])

  const groupedProjects = useMemo(() => {
    const query = projectFilter.trim().toLowerCase()
    const groups = new Map<string, { clientId: string; clientName: string; projects: HubProjectOption[] }>()
    for (const project of pickerProjects) {
      if (
        query &&
        !project.name.toLowerCase().includes(query) &&
        !project.client_name.toLowerCase().includes(query)
      ) {
        continue
      }
      const existing = groups.get(project.client_id)
      if (existing) {
        existing.projects.push(project)
      } else {
        groups.set(project.client_id, { clientId: project.client_id, clientName: project.client_name, projects: [project] })
      }
    }
    return Array.from(groups.values()).sort((a, b) => a.clientName.localeCompare(b.clientName))
  }, [pickerProjects, projectFilter])

  const projectById = useMemo(() => {
    const map = new Map(pickerProjects.map(project => [project.id, project]))
    return map
  }, [pickerProjects])

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm(subscriptionId))
    setProjectFilter('')
    setError(null)
    setShowForm(true)
  }

  const openEdit = (account: SupabaseAccountWithProjects) => {
    setEditing(account)
    setForm({
      subscription_id: subscriptionId,
      login_email: account.login_email,
      project_slot_limit: account.project_slot_limit,
      project_ids: account.projects.map(project => project.id),
    })
    setProjectFilter('')
    setError(null)
    setShowForm(true)
  }

  const toggleProject = (projectId: string) => {
    setForm(current => {
      const selected = current.project_ids.includes(projectId)
      if (selected) {
        return { ...current, project_ids: current.project_ids.filter(id => id !== projectId) }
      }
      if (current.project_ids.length >= current.project_slot_limit) return current
      return { ...current, project_ids: [...current.project_ids, projectId] }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = editing
        ? await updateSupabaseAccountAction(editing.id, form)
        : await createSupabaseAccountAction(form)

      if (!result.success) {
        setError(result.error)
        return
      }

      const linkedProjects = form.project_ids
        .map(id => projectById.get(id))
        .filter((project): project is HubProjectOption => Boolean(project))

      if (editing) {
        commitAccounts(accounts.map(account => (
          account.id === editing.id
            ? {
                ...account,
                login_email: form.login_email.trim().toLowerCase(),
                project_slot_limit: form.project_slot_limit,
                projects: linkedProjects,
              }
            : account
        )))
      } else {
        const newId = (result as { success: true; data: { id: string } }).data.id
        commitAccounts([
          ...accounts,
          {
            id: newId,
            subscription_id: subscriptionId,
            login_email: form.login_email.trim().toLowerCase(),
            project_slot_limit: form.project_slot_limit,
            projects: linkedProjects,
          },
        ].sort((a, b) => a.login_email.localeCompare(b.login_email)))
      }
      setShowForm(false)
    })
  }

  const handleDelete = (account: SupabaseAccountWithProjects) => {
    if (!confirm(`Remove ${account.login_email} from this Supabase subscription?`)) return
    startTransition(async () => {
      const result = await deleteSupabaseAccountAction(account.id)
      if (result.success) commitAccounts(accounts.filter(item => item.id !== account.id))
    })
  }

  return (
    <>
      <div className="hub-card">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Supabase logins</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Which Hub projects sit on each Supabase account, and how many free-tier slots remain.
            </p>
          </div>
          {canEdit && (
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add login
            </Button>
          )}
        </div>

        {accounts.length === 0 ? (
          <p className="text-sm text-slate-500">
            No logins yet. Add a login to track which Hub projects sit on each account.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 border border-slate-200 rounded-md">
            {accounts.map(account => (
              <li key={account.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900 break-all">{account.login_email}</span>
                      <SlotBadge used={account.projects.length} limit={account.project_slot_limit} />
                    </div>
                    {account.projects.length === 0 ? (
                      <p className="text-xs text-slate-500 mt-1">No Hub projects linked</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {account.projects.map(project => (
                          <Link
                            key={project.id}
                            href={`/app/projects/${project.id}`}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                          >
                            {project.client_name} — {project.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(account)}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-600"
                        aria-label={`Edit ${account.login_email}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(account)}
                        disabled={isPending}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                        aria-label={`Delete ${account.login_email}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SlideOver
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Supabase login' : 'Add Supabase login'}
        width="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

          <div>
            <label className={labelClass}>Login email *</label>
            <Input
              type="email"
              value={form.login_email}
              onChange={e => setForm(current => ({ ...current, login_email: e.target.value }))}
              placeholder="supabase-1@appdoers.co.nz"
              required
            />
          </div>

          <div>
            <label className={labelClass}>Project slot limit</label>
            <Input
              type="number"
              min={1}
              value={form.project_slot_limit}
              onChange={e => setForm(current => ({
                ...current,
                project_slot_limit: Math.max(1, parseInt(e.target.value, 10) || 1),
              }))}
            />
            <p className="text-xs text-slate-500 mt-1">Free tier allows 2 projects per login.</p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-1">
              <label className={cn(labelClass, 'mb-0')}>Hub projects</label>
              <span className="text-xs text-slate-500">
                {form.project_ids.length}/{form.project_slot_limit} selected
              </span>
            </div>
            <Input
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              placeholder="Filter by client or project…"
              className="mb-2"
            />
            <div className="max-h-72 overflow-y-auto rounded-md border border-slate-200 divide-y divide-slate-100">
              {groupedProjects.length === 0 ? (
                <p className="px-3 py-4 text-sm text-slate-500">No matching projects.</p>
              ) : groupedProjects.map(group => (
                <div key={group.clientId} className="px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 mb-1">{group.clientName}</p>
                  <div className="space-y-1">
                    {group.projects.map(project => {
                      const owner = projectOwner.get(project.id)
                      const takenByOther = Boolean(owner && owner.accountId !== editing?.id)
                      const selected = form.project_ids.includes(project.id)
                      const slotsFull = !selected && form.project_ids.length >= form.project_slot_limit
                      const disabled = takenByOther || slotsFull
                      return (
                        <label
                          key={project.id}
                          className={cn(
                            'flex items-start gap-2 rounded-md px-1 py-1 text-sm',
                            disabled ? 'text-slate-400' : 'text-slate-700 hover:bg-slate-50'
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={selected}
                            disabled={disabled}
                            onChange={() => toggleProject(project.id)}
                          />
                          <span>
                            {project.name}
                            {takenByOther && (
                              <span className="block text-xs text-slate-400">On {owner?.email}</span>
                            )}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? 'Saving…' : editing ? 'Save' : 'Add login'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  )
}

export function supabaseLoginSummary(accounts: SupabaseAccountWithProjects[]) {
  const loginCount = accounts.length
  const used = accounts.reduce((sum, account) => sum + account.projects.length, 0)
  const limit = accounts.reduce((sum, account) => sum + account.project_slot_limit, 0)
  const anyFull = accounts.some(account => account.projects.length >= account.project_slot_limit)
  return { loginCount, used, limit, anyFull }
}
