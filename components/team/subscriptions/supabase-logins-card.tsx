'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SlideOver } from '@/components/ui/slide-over'
import {
  createSupabaseAccountAction,
  updateSupabaseAccountAction,
  deleteSupabaseAccountAction,
  type HubClientOption,
  type SupabaseAccountInput,
  type SupabaseAccountWithProjects,
  type SupabaseLinkedProject,
} from '@/lib/actions/supabase-accounts'
import { cn } from '@/lib/utils/cn'

const labelClass = 'block text-xs font-medium text-slate-500 mb-1'
const selectClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'

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

const emptySlot = { name: '', client_id: '' }

function padProjects(projects: { name: string; client_id: string }[], limit: number) {
  const next = projects.slice(0, limit)
  while (next.length < limit) next.push({ ...emptySlot })
  return next
}

const emptyForm = (subscriptionId: string): SupabaseAccountInput => ({
  subscription_id: subscriptionId,
  login_email: '',
  project_slot_limit: 2,
  projects: [{ ...emptySlot }, { ...emptySlot }],
})

interface Props {
  subscriptionId: string
  accounts: SupabaseAccountWithProjects[]
  clients: HubClientOption[]
  canEdit: boolean
  onAccountsChange?: (accounts: SupabaseAccountWithProjects[]) => void
}

export function SupabaseLoginsCard({
  subscriptionId,
  accounts: initial,
  clients,
  canEdit,
  onAccountsChange,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [accounts, setAccounts] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SupabaseAccountWithProjects | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<SupabaseAccountInput>(emptyForm(subscriptionId))

  const clientNameById = new Map(clients.map(client => [client.id, client.company_name]))

  const commitAccounts = (next: SupabaseAccountWithProjects[]) => {
    setAccounts(next)
    onAccountsChange?.(next)
  }

  const toSavedProjects = (projects: { name: string; client_id: string }[]): SupabaseLinkedProject[] =>
    projects
      .map(project => ({
        name: project.name.trim(),
        client_id: project.client_id || null,
        client_name: project.client_id ? (clientNameById.get(project.client_id) ?? null) : null,
      }))
      .filter(project => Boolean(project.name))

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm(subscriptionId))
    setError(null)
    setShowForm(true)
  }

  const openEdit = (account: SupabaseAccountWithProjects) => {
    setEditing(account)
    setForm({
      subscription_id: subscriptionId,
      login_email: account.login_email,
      project_slot_limit: account.project_slot_limit,
      projects: padProjects(
        account.projects.map(project => ({
          name: project.name,
          client_id: project.client_id ?? '',
        })),
        account.project_slot_limit
      ),
    })
    setError(null)
    setShowForm(true)
  }

  const setSlotLimit = (limit: number) => {
    const nextLimit = Math.max(1, limit)
    setForm(current => ({
      ...current,
      project_slot_limit: nextLimit,
      projects: padProjects(current.projects, nextLimit),
    }))
  }

  const setProjectField = (index: number, field: 'name' | 'client_id', value: string) => {
    setForm(current => {
      const projects = current.projects.map((project, i) => (
        i === index ? { ...project, [field]: value } : project
      ))
      return { ...current, projects }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const projects = toSavedProjects(form.projects).map(project => ({
      name: project.name,
      client_id: project.client_id ?? '',
    }))
    startTransition(async () => {
      const payload = { ...form, projects }
      const result = editing
        ? await updateSupabaseAccountAction(editing.id, payload)
        : await createSupabaseAccountAction(payload)

      if (!result.success) {
        setError(result.error)
        return
      }

      const saved: SupabaseAccountWithProjects = {
        id: editing?.id ?? result.data?.id ?? '',
        subscription_id: subscriptionId,
        login_email: form.login_email.trim().toLowerCase(),
        project_slot_limit: form.project_slot_limit,
        projects: toSavedProjects(form.projects),
      }

      if (editing) {
        commitAccounts(accounts.map(account => (account.id === editing.id ? saved : account)))
      } else {
        commitAccounts(
          [...accounts, saved].sort((a, b) => a.login_email.localeCompare(b.login_email))
        )
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
              Which Supabase projects sit on each login, which Hub client they belong to, and how many slots remain.
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
            No logins yet. Add a login, the project names, and the Hub client for each.
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
                      <p className="text-xs text-slate-500 mt-1">No projects listed</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {account.projects.map(project => (
                          <span
                            key={`${project.client_id ?? 'none'}-${project.name}`}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                          >
                            {project.client_id ? (
                              <Link href={`/app/clients/${project.client_id}`} className="hover:text-slate-900">
                                {project.client_name ?? 'Client'} — {project.name}
                              </Link>
                            ) : (
                              project.name
                            )}
                          </span>
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
              onChange={e => setSlotLimit(parseInt(e.target.value, 10) || 1)}
            />
            <p className="text-xs text-slate-500 mt-1">Free tier allows 2 projects per login.</p>
          </div>

          <div className="space-y-3">
            <label className={labelClass}>Projects</label>
            {form.projects.map((project, index) => (
              <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  value={project.name}
                  onChange={e => setProjectField(index, 'name', e.target.value)}
                  placeholder={`Project ${index + 1} name`}
                />
                <select
                  className={selectClass}
                  value={project.client_id}
                  onChange={e => setProjectField(index, 'client_id', e.target.value)}
                >
                  <option value="">Hub client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.company_name}</option>
                  ))}
                </select>
              </div>
            ))}
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
