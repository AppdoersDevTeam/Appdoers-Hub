'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { updateTeamPermissionsAction } from '@/lib/actions/permissions'
import {
  ALL_FEATURES,
  FEATURE_LABELS,
  getEffectivePermissions,
  type Feature,
  type PermissionLevel,
} from '@/lib/permissions'

interface TeamMember {
  id: string
  full_name: string
  email: string
  role: string
  permissions: Record<string, string>
}

interface Props {
  members: TeamMember[]
}

const LEVELS: PermissionLevel[] = ['edit', 'view', 'none']

const levelStyle: Record<PermissionLevel, string> = {
  edit: 'bg-emerald-500 text-white',
  view: 'bg-blue-600 text-white',
  none: 'bg-slate-100 text-slate-500',
}

const levelLabel: Record<PermissionLevel, string> = {
  edit: 'Edit',
  view: 'View',
  none: 'None',
}

function MemberPermissions({ member }: { member: TeamMember }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effective = getEffectivePermissions(member.role, member.permissions)
  const [local, setLocal] = useState<Record<Feature, PermissionLevel>>(effective)

  // Directors can't be edited
  if (member.role === 'director') {
    return (
      <div className="hub-card space-y-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-medium text-slate-900">{member.full_name}</p>
            <p className="text-xs text-slate-500">{member.email}</p>
          </div>
          <span className="ml-auto rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">Director</span>
        </div>
        <p className="text-xs text-slate-500">Directors have full access to all features and cannot be restricted.</p>
      </div>
    )
  }

  const toggleLevel = (feature: Feature) => {
    const current = local[feature]
    const next = current === 'edit' ? 'view' : current === 'view' ? 'none' : 'edit'
    setLocal(prev => ({ ...prev, [feature]: next }))
  }

  const handleSave = () => {
    setError(null)
    startTransition(async () => {
      const result = await updateTeamPermissionsAction(member.id, local)
      if (!result.success) { setError(result.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="hub-card space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
          {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">{member.full_name}</p>
          <p className="text-xs text-slate-500">{member.email} · <span className="capitalize">{member.role}</span></p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_auto] gap-2 pb-1 border-b border-slate-200">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Feature</p>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Access</p>
        </div>
        {ALL_FEATURES.map(feature => (
          <div key={feature} className="grid grid-cols-[1fr_auto] items-center gap-2">
            <span className="text-sm text-slate-600">{FEATURE_LABELS[feature]}</span>
            <button
              type="button"
              onClick={() => toggleLevel(feature)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors min-w-[60px] text-center ${levelStyle[local[feature]]}`}
            >
              {levelLabel[local[feature]]}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        Click a badge to cycle: <span className="text-emerald-600">Edit</span> → <span className="text-blue-600">View</span> → <span className="text-slate-500">None</span>
      </p>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Permissions'}
        </Button>
        {saved && <span className="text-xs text-emerald-600">✓ Saved</span>}
      </div>
    </div>
  )
}

export function TeamPermissions({ members }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Team Permissions</h2>
        <p className="text-sm text-slate-500">Control what each team member can view or edit. Directors always have full access.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {members.map(member => (
          <MemberPermissions key={member.id} member={member} />
        ))}
      </div>
    </div>
  )
}
