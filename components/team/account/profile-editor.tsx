'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateProfileAction, changePasswordAction } from '@/lib/actions/team'

const labelClass = 'block text-xs font-medium text-[#94A3B8] mb-1'

interface Props {
  user: {
    id: string
    email: string
    full_name: string
    role: string
    phone: string | null
    title: string | null
    avatar_url: string | null
  }
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="hub-card space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-[#F1F5F9]">{title}</h2>
        {subtitle && <p className="text-xs text-[#475569]">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export function ProfileEditor({ user }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // ── Profile ──
  const [profile, setProfile] = useState({
    full_name: user.full_name,
    phone: user.phone ?? '',
    title: user.title ?? '',
    avatar_url: user.avatar_url ?? '',
  })
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const saveProfile = () => {
    if (!profile.full_name.trim()) {
      setProfileError('Name is required')
      return
    }
    setProfileError(null)
    startTransition(async () => {
      const result = await updateProfileAction(profile)
      if (!result.success) {
        setProfileError(result.error)
        return
      }
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
      router.refresh()
    })
  }

  // ── Password ──
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const savePassword = () => {
    if (passwords.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    setPasswordError(null)
    startTransition(async () => {
      const result = await changePasswordAction(passwords.newPassword)
      if (!result.success) {
        setPasswordError(result.error)
        return
      }
      setPasswords({ newPassword: '', confirmPassword: '' })
      setPasswordSaved(true)
      setTimeout(() => setPasswordSaved(false), 3000)
    })
  }

  const roleLabels: Record<string, string> = {
    director: 'Director',
    account_manager: 'Account Manager',
    developer: 'Developer',
    designer: 'Designer',
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Avatar + name header */}
      <div className="flex items-center gap-4">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.full_name}
            className="h-16 w-16 rounded-full object-cover border-2 border-[#1F2D45]"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1F2D45] text-xl font-bold text-[#94A3B8]">
            {user.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </div>
        )}
        <div>
          <p className="text-lg font-semibold text-[#F1F5F9]">{user.full_name}</p>
          <p className="text-sm text-[#475569]">{user.email}</p>
          <span className="mt-1 inline-block rounded-full bg-[#3B82F6]/10 px-2.5 py-0.5 text-xs font-medium text-[#3B82F6]">
            {roleLabels[user.role] ?? user.role}
          </span>
        </div>
      </div>

      {/* Profile details */}
      <Section
        title="Profile Details"
        subtitle="Update your name, job title, phone, and avatar."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Full Name *</label>
            <Input
              value={profile.full_name}
              onChange={(e) =>
                setProfile((p) => ({ ...p, full_name: e.target.value }))
              }
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <Input value={user.email} disabled className="opacity-50 cursor-not-allowed" />
            <p className="mt-1 text-xs text-[#475569]">
              Contact a director to change your email.
            </p>
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <Input
              value={profile.phone}
              onChange={(e) =>
                setProfile((p) => ({ ...p, phone: e.target.value }))
              }
              placeholder="+64 21 000 0000"
            />
          </div>
          <div>
            <label className={labelClass}>Job Title</label>
            <Input
              value={profile.title}
              onChange={(e) =>
                setProfile((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="e.g. Lead Developer"
            />
          </div>
          <div>
            <label className={labelClass}>Avatar URL</label>
            <Input
              value={profile.avatar_url}
              onChange={(e) =>
                setProfile((p) => ({ ...p, avatar_url: e.target.value }))
              }
              placeholder="https://..."
            />
          </div>
        </div>

        {profileError && (
          <p className="text-sm text-[#EF4444]">{profileError}</p>
        )}
        <div className="flex items-center gap-3">
          <Button onClick={saveProfile} disabled={isPending} size="sm">
            {isPending ? 'Saving…' : 'Save Profile'}
          </Button>
          {profileSaved && (
            <span className="text-xs text-[#10B981]">✓ Saved</span>
          )}
        </div>
      </Section>

      {/* Password */}
      <Section
        title="Change Password"
        subtitle="Choose a strong password of at least 8 characters."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>New Password</label>
            <Input
              type="password"
              value={passwords.newPassword}
              onChange={(e) =>
                setPasswords((p) => ({ ...p, newPassword: e.target.value }))
              }
              placeholder="Min. 8 characters"
            />
          </div>
          <div>
            <label className={labelClass}>Confirm New Password</label>
            <Input
              type="password"
              value={passwords.confirmPassword}
              onChange={(e) =>
                setPasswords((p) => ({
                  ...p,
                  confirmPassword: e.target.value,
                }))
              }
              placeholder="Repeat new password"
            />
          </div>
        </div>

        {passwordError && (
          <p className="text-sm text-[#EF4444]">{passwordError}</p>
        )}
        <div className="flex items-center gap-3">
          <Button
            onClick={savePassword}
            disabled={isPending || !passwords.newPassword}
            size="sm"
          >
            {isPending ? 'Updating…' : 'Update Password'}
          </Button>
          {passwordSaved && (
            <span className="text-xs text-[#10B981]">✓ Password updated</span>
          )}
        </div>
      </Section>
    </div>
  )
}
