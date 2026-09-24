'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { convertLeadToClientAction } from '@/lib/actions/leads'
import { cn } from '@/lib/utils/cn'

interface Props {
  leadId: string
  leadName: string
  className?: string
  size?: 'default' | 'sm'
  fullWidth?: boolean
  iconOnly?: boolean
}

export function ConvertLeadButton({
  leadId,
  leadName,
  className,
  size = 'default',
  fullWidth = false,
  iconOnly = false,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const confirm = () => {
    setError(null)
    startTransition(async () => {
      const result = await convertLeadToClientAction(leadId)
      if (!result.success) {
        setError(result.error)
        setOpen(false)
        return
      }
      router.push(`/app/clients/${result.data.id}`)
    })
  }

  const label = isPending ? 'Converting…' : 'Convert to Client'

  return (
    <div className={cn(iconOnly ? 'inline-flex' : fullWidth && 'w-full space-y-1')}>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {iconOnly ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={isPending}
          title={label}
          aria-label={label}
          className={cn(
            'rounded p-1 text-slate-500 hover:text-emerald-600 transition-colors disabled:opacity-50',
            className
          )}
        >
          <UserPlus className="h-3.5 w-3.5" />
        </button>
      ) : (
        <Button
          type="button"
          variant="success"
          size={size}
          className={cn(fullWidth && 'w-full', className)}
          disabled={isPending}
          onClick={() => setOpen(true)}
        >
          <UserPlus className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          {label}
        </Button>
      )}
      <ConfirmModal
        open={open}
        title="Convert to client"
        message={`Create a client from ${leadName} and mark this lead as won? You'll be taken to the new client record.`}
        confirmLabel="Convert to Client"
        pendingLabel="Converting…"
        danger={false}
        isPending={isPending}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </div>
  )
}
