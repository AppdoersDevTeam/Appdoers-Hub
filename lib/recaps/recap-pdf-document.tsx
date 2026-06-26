import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { RecapWorkItem } from '@/lib/actions/recaps'

const BRAND = '#2563eb'
const BRAND_DARK = '#1e40af'
const BRAND_LIGHT = '#dbeafe'
const SLATE_900 = '#0f172a'
const SLATE_700 = '#334155'
const SLATE_600 = '#475569'
const SLATE_400 = '#94a3b8'
const BORDER = '#e2e8f0'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  Development: { bg: '#eff6ff', text: '#1d4ed8' },
  Design: { bg: '#faf5ff', text: '#7c3aed' },
  SEO: { bg: '#f0fdf4', text: '#15803d' },
  Content: { bg: '#fffbeb', text: '#b45309' },
  Maintenance: { bg: '#f1f5f9', text: '#475569' },
  Meetings: { bg: '#eef2ff', text: '#4338ca' },
  Strategy: { bg: '#fff1f2', text: '#be123c' },
  Other: { bg: '#f1f5f9', text: '#64748b' },
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 56,
    paddingHorizontal: 0,
    fontFamily: 'Helvetica',
    fontSize: 10.5,
    color: SLATE_700,
    backgroundColor: '#ffffff',
  },
  headerBand: {
    backgroundColor: BRAND,
    paddingTop: 40,
    paddingBottom: 28,
    paddingHorizontal: 48,
    marginBottom: 28,
  },
  headerEyebrow: {
    fontSize: 8.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#bfdbfe',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginBottom: 6,
    lineHeight: 1.15,
  },
  headerClient: {
    fontSize: 13,
    color: '#e0e7ff',
    marginBottom: 4,
  },
  headerMeta: {
    fontSize: 9.5,
    color: '#93c5fd',
    marginTop: 10,
  },
  body: {
    paddingHorizontal: 48,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
    borderBottomStyle: 'solid',
  },
  sectionIcon: {
    fontSize: 11,
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: SLATE_900,
  },
  paragraph: {
    fontSize: 10.5,
    lineHeight: 1.7,
    color: SLATE_700,
    marginBottom: 6,
  },
  categoryBlock: {
    marginBottom: 14,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  categoryBadgeText: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.3,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 5,
    paddingLeft: 2,
  },
  bulletDot: {
    width: 14,
    fontSize: 10,
    color: BRAND,
    lineHeight: 1.65,
  },
  bulletText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 1.65,
    color: SLATE_700,
  },
  highlightBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 16,
    marginTop: 4,
  },
  highlightTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: BRAND_DARK,
    marginBottom: 8,
  },
  highlightText: {
    fontSize: 10.5,
    lineHeight: 1.7,
    color: '#1e3a8a',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'solid',
    borderRadius: 4,
  },
  statLabel: {
    fontSize: 7.5,
    color: SLATE_400,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
    fontFamily: 'Helvetica-Bold',
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: SLATE_900,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: 'solid',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: SLATE_400,
  },
  pageNumber: {
    fontSize: 8,
    color: SLATE_400,
  },
})

function formatSentDate(sentAt: string | null): string | null {
  if (!sentAt) return null
  return new Date(sentAt).toLocaleDateString('en-NZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function PlainTextBlock({
  text,
  style,
}: {
  text: string
  style: { fontSize: number; lineHeight: number; color: string; marginBottom?: number }
}) {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim())
  return React.createElement(
    View,
    null,
    ...paragraphs.map((paragraph, i) =>
      React.createElement(Text, { key: i, style: [style, i > 0 ? { marginTop: 8 } : {}] }, paragraph)
    )
  )
}

function PageFooter({ periodLabel }: { periodLabel: string }) {
  return React.createElement(
    View,
    { style: styles.footer, fixed: true },
    React.createElement(Text, { style: styles.footerText }, `Appdoers · ${periodLabel} Progress Report`),
    React.createElement(Text, { style: styles.footerText }, 'appdoers.co.nz'),
    React.createElement(Text, {
      style: styles.pageNumber,
      render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`,
    })
  )
}

function WorkByCategory({ items }: { items: RecapWorkItem[] }) {
  const byCategory = items.reduce<Record<string, RecapWorkItem[]>>((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const categories = Object.keys(byCategory).sort()

  return React.createElement(
    View,
    null,
    ...categories.map((category) => {
      const colors = CATEGORY_STYLES[category] ?? CATEGORY_STYLES.Other
      const categoryItems = byCategory[category]

      return React.createElement(
        View,
        { key: category, style: styles.categoryBlock },
        React.createElement(
          View,
          { style: [styles.categoryBadge, { backgroundColor: colors.bg }] },
          React.createElement(Text, { style: [styles.categoryBadgeText, { color: colors.text }] }, category)
        ),
        ...categoryItems.map((item, i) =>
          React.createElement(
            View,
            { key: i, style: styles.bulletRow },
            React.createElement(Text, { style: styles.bulletDot }, '•'),
            React.createElement(Text, { style: styles.bulletText }, item.description)
          )
        )
      )
    })
  )
}

export interface RecapPDFProps {
  clientName: string
  month: number
  year: number
  introText: string | null
  workCompleted: RecapWorkItem[]
  performanceNotes: string | null
  comingNext: string | null
  sentAt: string | null
}

export function RecapPDFDocument({
  clientName,
  month,
  year,
  introText,
  workCompleted,
  performanceNotes,
  comingNext,
  sentAt,
}: RecapPDFProps) {
  const periodLabel = `${MONTHS[month - 1]} ${year}`
  const sentLabel = formatSentDate(sentAt)
  const workItems = workCompleted.filter((w) => w.description?.trim())
  const categories = new Set(workItems.map((w) => w.category || 'Other'))

  return React.createElement(
    Document,
    {
      title: `${periodLabel} Progress Report — ${clientName}`,
      author: 'Appdoers',
      subject: `Monthly progress report for ${clientName}`,
      creator: 'Appdoers Hub',
    },
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      // Header band
      React.createElement(
        View,
        { style: styles.headerBand },
        React.createElement(Text, { style: styles.headerEyebrow }, 'Monthly Progress Report'),
        React.createElement(Text, { style: styles.headerTitle }, periodLabel),
        React.createElement(Text, { style: styles.headerClient }, clientName),
        sentLabel
          ? React.createElement(Text, { style: styles.headerMeta }, `Sent ${sentLabel}`)
          : React.createElement(Text, { style: styles.headerMeta }, 'Draft — prepared by Appdoers')
      ),
      React.createElement(
        View,
        { style: styles.body },
        // Summary stats
        workItems.length > 0
          ? React.createElement(
              View,
              { style: styles.statsRow },
              React.createElement(
                View,
                { style: styles.statCard },
                React.createElement(Text, { style: styles.statLabel }, 'Work Items'),
                React.createElement(Text, { style: styles.statValue }, String(workItems.length))
              ),
              React.createElement(
                View,
                { style: styles.statCard },
                React.createElement(Text, { style: styles.statLabel }, 'Categories'),
                React.createElement(Text, { style: styles.statValue }, String(categories.size))
              ),
              React.createElement(
                View,
                { style: [styles.statCard, { backgroundColor: BRAND_LIGHT, borderColor: '#93c5fd' }] },
                React.createElement(Text, { style: styles.statLabel }, 'Reporting Period'),
                React.createElement(Text, { style: [styles.statValue, { fontSize: 12, color: BRAND_DARK }] }, periodLabel)
              )
            )
          : null,
        // Introduction
        introText?.trim()
          ? React.createElement(
              View,
              { style: styles.section },
              React.createElement(
                View,
                { style: styles.sectionHeader },
                React.createElement(Text, { style: styles.sectionTitle }, 'Introduction')
              ),
              React.createElement(PlainTextBlock, { text: introText, style: styles.paragraph })
            )
          : null,
        // Work completed
        workItems.length > 0
          ? React.createElement(
              View,
              { style: styles.section },
              React.createElement(
                View,
                { style: styles.sectionHeader },
                React.createElement(Text, { style: styles.sectionTitle }, 'Work Completed This Month')
              ),
              React.createElement(WorkByCategory, { items: workItems })
            )
          : null,
        // Performance
        performanceNotes?.trim()
          ? React.createElement(
              View,
              { style: styles.section },
              React.createElement(
                View,
                { style: styles.sectionHeader },
                React.createElement(Text, { style: styles.sectionTitle }, 'Performance & Highlights')
              ),
              React.createElement(PlainTextBlock, { text: performanceNotes, style: styles.paragraph })
            )
          : null,
        // Coming next
        comingNext?.trim()
          ? React.createElement(
              View,
              { style: styles.section },
              React.createElement(
                View,
                { style: styles.highlightBox },
                React.createElement(Text, { style: styles.highlightTitle }, 'Coming Next Month'),
                React.createElement(PlainTextBlock, { text: comingNext, style: styles.highlightText })
              )
            )
          : null
      ),
      PageFooter({ periodLabel })
    )
  )
}
