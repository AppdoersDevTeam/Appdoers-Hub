'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { cn } from '@/lib/utils/cn'

type DeleteResult = { success: true; data?: unknown } | { success: false; error: string }

interface Props {
  title: string
  message: string
  confirmLabel: string
  buttonLabel?: string
  iconOnly?: boolean
  className?: string
  onDelete: () => Promise<DeleteResult>
  redirectTo?: string
}

export function DeleteRecordButton({
  title,
  message,
  confirmLabel,
  buttonLabel,
  iconOnly = false,
  className,
  onDelete,
  redirectTo,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const label = buttonLabel ?? confirmLabel

  const confirm = () => {
    setError(null)
    startTransition(async () => {
      const result = await onDelete()
      if (!result.success) {
        setError(result.error)
        setOpen(false)
        return
      }
      setOpen(false)
      if (redirectTo) router.push(redirectTo)
      else router.refresh()
    })
  }

  return (
    <div className={cn(iconOnly ? 'inline-flex' : 'space-y-1', className)}>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {iconOnly ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={isPending}
          title={label}
          aria-label={label}
          className="rounded p-1 text-slate-500 hover:text-red-600 transition-colors disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : (
        <Button
          type="button"
          variant="destructive"
          onClick={() => setOpen(true)}
          disabled={isPending}
          className="w-full"
        >
          <Trash2 className="h-4 w-4" />
          {isPending ? 'Deleting…' : label}
        </Button>
      )}
      <ConfirmModal
        open={open}
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        pendingLabel="Deleting…"
        isPending={isPending}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </div>
  )
}
