'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  isPending?: boolean
  danger?: boolean
}

export function ConfirmModal({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  isPending = false,
  danger = true,
}: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-[#1F2D45] bg-[#0D1526] p-6 shadow-2xl">
        <h3 className="text-base font-semibold text-[#F1F5F9]">{title}</h3>
        <p className="mt-2 text-sm text-[#94A3B8]">{message}</p>
        <div className="mt-6 flex gap-3">
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className={
              danger
                ? 'flex-1 bg-[#EF4444] hover:bg-[#DC2626] text-white border-0'
                : 'flex-1'
            }
          >
            {isPending ? 'Deleting…' : confirmLabel}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
