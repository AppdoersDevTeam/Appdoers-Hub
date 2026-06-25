import React from 'react'
import { Text, View, StyleSheet, type Styles } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  paragraph: { fontSize: 10.5, lineHeight: 1.65, color: '#334155', marginBottom: 8 },
  bulletRow: { flexDirection: 'row', marginBottom: 5, paddingLeft: 4 },
  bulletDot: { width: 14, fontSize: 10.5, color: '#2563eb', lineHeight: 1.65 },
  bulletText: { flex: 1, fontSize: 10.5, lineHeight: 1.65, color: '#334155' },
  numberedRow: { flexDirection: 'row', marginBottom: 5, paddingLeft: 4 },
  numberedIndex: { width: 18, fontSize: 10.5, color: '#2563eb', fontFamily: 'Helvetica-Bold', lineHeight: 1.65 },
  numberedText: { flex: 1, fontSize: 10.5, lineHeight: 1.65, color: '#334155' },
  bold: { fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  table: { marginVertical: 10, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'solid' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', borderBottomStyle: 'solid' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', borderBottomStyle: 'solid' },
  tableCell: { flex: 1, padding: 8, fontSize: 9.5, color: '#334155' },
  tableCellHeader: { flex: 1, padding: 8, fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
})

function renderInlineMarkdown(text: string, baseStyle: Styles[string] = styles.paragraph) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  if (parts.length === 1) {
    return React.createElement(Text, { style: baseStyle }, text)
  }

  return React.createElement(
    Text,
    { style: baseStyle },
    ...parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return React.createElement(Text, { key: i, style: styles.bold }, part.slice(2, -2))
      }
      return part
    })
  )
}

function parseTableRow(line: string): string[] {
  return line
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell, index, arr) => !(index === 0 && cell === '') && !(index === arr.length - 1 && cell === ''))
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s\-:|]+\|?$/.test(line.trim()) && line.includes('-')
}

export function MarkdownContent({ content }: { content: string }) {
  if (!content?.trim()) return null

  const lines = content.split('\n')
  const elements: React.ReactElement[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      i++
      continue
    }

    // Markdown table
    if (trimmed.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headerCells = parseTableRow(trimmed)
      i += 2
      const bodyRows: string[][] = []
      while (i < lines.length && lines[i].trim().includes('|')) {
        bodyRows.push(parseTableRow(lines[i]))
        i++
      }

      elements.push(
        React.createElement(
          View,
          { key: `table-${i}`, style: styles.table, wrap: false },
          React.createElement(
            View,
            { style: styles.tableHeaderRow },
            ...headerCells.map((cell, ci) =>
              React.createElement(Text, { key: ci, style: styles.tableCellHeader }, cell)
            )
          ),
          ...bodyRows.map((row, ri) =>
            React.createElement(
              View,
              { key: ri, style: styles.tableRow },
              ...row.map((cell, ci) =>
                React.createElement(Text, { key: ci, style: styles.tableCell }, cell)
              )
            )
          )
        )
      )
      continue
    }

    // Bullet list
    if (/^[-*]\s/.test(trimmed)) {
      const bullets: string[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        bullets.push(lines[i].trim().replace(/^[-*]\s+/, ''))
        i++
      }
      elements.push(
        React.createElement(
          View,
          { key: `bullets-${i}`, style: { marginBottom: 6 } },
          ...bullets.map((bullet, bi) =>
            React.createElement(
              View,
              { key: bi, style: styles.bulletRow },
              React.createElement(Text, { style: styles.bulletDot }, '•'),
              renderInlineMarkdown(bullet, styles.bulletText)
            )
          )
        )
      )
      continue
    }

    // Numbered list
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''))
        i++
      }
      elements.push(
        React.createElement(
          View,
          { key: `numbered-${i}`, style: { marginBottom: 6 } },
          ...items.map((item, ni) =>
            React.createElement(
              View,
              { key: ni, style: styles.numberedRow },
              React.createElement(Text, { style: styles.numberedIndex }, `${ni + 1}.`),
              renderInlineMarkdown(item, styles.numberedText)
            )
          )
        )
      )
      continue
    }

    // Paragraph (merge consecutive non-special lines)
    const paragraphLines: string[] = [trimmed]
    i++
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^[-*]\s/.test(lines[i].trim()) &&
      !/^\d+\.\s/.test(lines[i].trim()) &&
      !(lines[i].trim().includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1]))
    ) {
      paragraphLines.push(lines[i].trim())
      i++
    }

    elements.push(
      React.createElement(
        View,
        { key: `para-${i}` },
        renderInlineMarkdown(paragraphLines.join(' '))
      )
    )
  }

  return React.createElement(View, null, ...elements)
}
