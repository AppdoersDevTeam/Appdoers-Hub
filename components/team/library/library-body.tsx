'use client'

import type { ReactNode } from 'react'

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const token = match[0]
    if (token.startsWith('**')) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('`')) {
      parts.push(
        <code key={key++} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-700">
          {token.slice(1, -1)}
        </code>
      )
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (linkMatch) {
        parts.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline underline-offset-2 hover:text-blue-700"
          >
            {linkMatch[1]}
          </a>
        )
      }
    }
    lastIndex = match.index + token.length
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

function isBullet(line: string) {
  return /^\s*[-*]\s+/.test(line)
}

function isNumbered(line: string) {
  return /^\s*\d+\.\s+/.test(line)
}

export function LibraryBody({
  content,
  emptyLabel = 'No content yet. Edit this item to add the process or guide.',
}: {
  content: string
  emptyLabel?: string
}) {
  const text = content.trim()
  if (!text) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>
  }

  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i += 1
      continue
    }

    if (/^###\s+/.test(line)) {
      blocks.push(
        <h3 key={key++} className="pt-2 text-sm font-semibold text-slate-900">
          {renderInline(line.replace(/^###\s+/, ''))}
        </h3>
      )
      i += 1
      continue
    }
    if (/^##\s+/.test(line)) {
      blocks.push(
        <h2 key={key++} className="pt-3 text-base font-semibold text-slate-900">
          {renderInline(line.replace(/^##\s+/, ''))}
        </h2>
      )
      i += 1
      continue
    }
    if (/^#\s+/.test(line)) {
      blocks.push(
        <h1 key={key++} className="pt-3 text-lg font-semibold text-slate-900">
          {renderInline(line.replace(/^#\s+/, ''))}
        </h1>
      )
      i += 1
      continue
    }

    if (isBullet(line)) {
      const items: string[] = []
      while (i < lines.length && isBullet(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''))
        i += 1
      }
      blocks.push(
        <ul key={key++} className="list-disc space-y-1 pl-5">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      )
      continue
    }

    if (isNumbered(line)) {
      const items: string[] = []
      while (i < lines.length && isNumbered(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''))
        i += 1
      }
      blocks.push(
        <ol key={key++} className="list-decimal space-y-1 pl-5">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ol>
      )
      continue
    }

    const paragraph: string[] = [line]
    i += 1
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !isBullet(lines[i]) &&
      !isNumbered(lines[i])
    ) {
      paragraph.push(lines[i])
      i += 1
    }
    blocks.push(
      <p key={key++} className="whitespace-pre-wrap">
        {renderInline(paragraph.join('\n'))}
      </p>
    )
  }

  return <div className="space-y-3 text-sm leading-relaxed text-slate-700">{blocks}</div>
}
