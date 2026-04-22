'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signContractAction } from '@/lib/actions/contracts'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

interface ContractSection {
  id: string
  title: string
  content: string
}

interface Contract {
  id: string
  title: string
  status: string
  content: ContractSection[]
  signed_at: string | null
  signed_by_name: string | null
  signed_by_email: string | null
}

interface Contact {
  client_id: string
  first_name: string
  last_name: string
  email: string
}

export function PortalContractSign({
  contract,
  contact,
}: {
  contract: Contract
  contact: Contact
}) {
  const [isPending, startTransition] = useTransition()
  const [activeSection, setActiveSection] = useState<string>(contract.content[0]?.id ?? '')
  const [signerName, setSignerName] = useState(`${contact.first_name} ${contact.last_name}`.trim())
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signed, setSigned] = useState(contract.status === 'signed')

  const isSigned = signed || contract.status === 'signed'
  const signerDisplay = contract.signed_by_name ?? contract.signed_by_email

  const handleSign = () => {
    if (!signerName.trim()) { setError('Please enter your full name'); return }
    if (!agreed) { setError('Please confirm you have read and agree to the contract'); return }
    setError(null)
    startTransition(async () => {
      const result = await signContractAction(contract.id, signerName, contact.email)
      if (!result.success) {
        setError(result.error)
        return
      }
      setSigned(true)
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{contract.title}</h1>
          {isSigned && contract.signed_at && (
            <p className="text-sm text-green-600 mt-1">✓ Signed by {signerDisplay} on {formatDate(contract.signed_at ?? '')}</p>
          )}
        </div>
        {isSigned && (
          <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">Signed</span>
        )}
      </div>

      {/* Signed success */}
      {isSigned && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 flex items-center gap-4">
          <CheckCircle className="h-8 w-8 text-green-500 shrink-0" />
          <div>
            <p className="font-semibold text-green-900">Contract Successfully Signed</p>
            <p className="text-sm text-green-700 mt-0.5">
              Signed by <strong>{signerDisplay}</strong> on {contract.signed_at ? formatDate(contract.signed_at) : 'today'}.
              A copy has been sent to the Appdoers team.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Section nav */}
        <div className="w-48 shrink-0">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Sections</p>
          <div className="space-y-1">
            {contract.content.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  activeSection === s.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>

        {/* Contract content */}
        <div className="flex-1 space-y-6">
          {contract.content.map((s) => {
            if (s.id !== activeSection) return null
            return (
              <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900">{s.title}</h2>
                </div>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {s.content || <span className="text-gray-400 italic">No content for this section.</span>}
                </div>
              </div>
            )
          })}

          {/* Signature block — only if not signed */}
          {!isSigned && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Electronic Signature</h3>
              <p className="text-sm text-gray-600">
                By typing your full legal name and clicking "Sign Contract", you agree that this constitutes a legally binding electronic signature.
              </p>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Legal Name *</label>
                <Input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Type your full name"
                  className="max-w-sm bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  I confirm that I have read and understood this contract in its entirety and agree to be bound by its terms and conditions.
                </span>
              </label>

              <Button
                onClick={handleSign}
                disabled={isPending || !agreed || !signerName.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isPending ? 'Signing…' : 'Sign Contract'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
