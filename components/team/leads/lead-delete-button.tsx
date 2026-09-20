'use client'

import { DeleteRecordButton } from '@/components/ui/delete-record-button'
import { deleteLeadAction } from '@/lib/actions/leads'

interface Props {
  leadId: string
  leadName: string
  size?: 'default' | 'sm'
  fullWidth?: boolean
  className?: string
}

export function LeadDeleteButton({
  leadId,
  leadName,
  size = 'default',
  fullWidth,
  className,
}: Props) {
  return (
    <DeleteRecordButton
      title="Delete lead"
      message={`Delete "${leadName}"? Notes and lead-only proposals will also be deleted. This cannot be undone.`}
      confirmLabel="Delete Lead"
      buttonLabel="Delete Lead"
      size={size}
      fullWidth={fullWidth}
      className={className}
      onDelete={() => deleteLeadAction(leadId)}
      redirectTo="/app/leads"
    />
  )
}
