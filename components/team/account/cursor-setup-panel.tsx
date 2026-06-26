'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  createCursorTokenAction,
  revokeCursorTokenAction,
  type CursorTokenSummary,
} from '@/lib/actions/cursor-tokens'

const labelClass = 'block text-xs font-medium text-slate-500 mb-1'

function formatWhen(iso: string | null) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

interface Props {
  tokens: CursorTokenSummary[]
  hubUrl: string
}

export function CursorSetupPanel({ tokens: initialTokens, hubUrl }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tokenName, setTokenName] = useState('')
  const [newToken, setNewToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'env' | 'token' | null>(null)

  const envSnippet = newToken
    ? `APPDOERS_HUB_URL=${hubUrl}\nAPPDOERS_CURSOR_TOKEN=${newToken}`
    : ''

  const copyText = async (text: string, kind: 'env' | 'token') => {
    await navigator.clipboard.writeText(text)
    setCopied(kind)
    setTimeout(() => setCopied(null), 2500)
  }

  const generateToken = () => {
    if (!tokenName.trim()) {
      setError('Give this token a name (e.g. your name + laptop)')
      return
    }
    setError(null)
    setNewToken(null)
    startTransition(async () => {
      const result = await createCursorTokenAction(tokenName.trim())
      if (!result.success) {
        setError(result.error)
        return
      }
      setNewToken(result.data.token)
      setTokenName('')
      router.refresh()
    })
  }

  const revokeToken = (id: string) => {
    startTransition(async () => {
      const result = await revokeCursorTokenAction(id)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="hub-card space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Cursor setup</h2>
        <p className="mt-1 text-xs text-slate-500">
          Connect Cursor to Hub for tickets and time tracking. Everyone on the team uses the
          same repo — each person still needs their own token so work logs to the right name.
        </p>
      </div>

      <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
        <li>Generate your token below (one per person).</li>
        <li>Copy the env block into <code className="rounded bg-slate-100 px-1">Appdoers Work\.env.hub</code> on your computer.</li>
        <li>
          Run once:{' '}
          <code className="rounded bg-slate-100 px-1 text-xs">
            node tools/hub-workflow-cli.mjs verify-setup
          </code>
        </li>
        <li>Open your project folder in Cursor and start an agent chat — it will ask client, project, and confirm your name.</li>
      </ol>

      {newToken && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <p className="text-sm font-medium text-emerald-900">
            Token created — copy now. It will not be shown again.
          </p>
          <div>
            <label className={labelClass}>Paste into .env.hub</label>
            <textarea
              readOnly
              rows={3}
              value={envSnippet}
              className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2 font-mono text-xs text-slate-800"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => copyText(envSnippet, 'env')}>
              {copied === 'env' ? 'Copied!' : 'Copy .env block'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyText(newToken, 'token')}
            >
              {copied === 'token' ? 'Copied!' : 'Copy token only'}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3 border-t border-slate-100 pt-4">
        <div>
          <label className={labelClass}>Token name</label>
          <Input
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            placeholder="e.g. Sara laptop"
            disabled={isPending}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button onClick={generateToken} disabled={isPending} size="sm">
          {isPending ? 'Generating…' : 'Generate Cursor token'}
        </Button>
      </div>

      {initialTokens.length > 0 && (
        <div className="border-t border-slate-100 pt-4 space-y-2">
          <p className="text-xs font-medium text-slate-500">Your active tokens</p>
          <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
            {initialTokens.map((token) => (
              <li
                key={token.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">{token.name}</p>
                  <p className="text-xs text-slate-500">
                    Created {formatWhen(token.created_at)} · Last used {formatWhen(token.last_used_at)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => revokeToken(token.id)}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">
        Sharing one computer? Only one token can live in <code className="rounded bg-slate-100 px-1">.env.hub</code> at a time — swap it when someone else uses that machine.
      </p>
    </div>
  )
}
