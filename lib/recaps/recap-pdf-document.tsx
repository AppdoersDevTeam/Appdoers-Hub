import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { RecapWorkItem } from '@/lib/recaps/types'
import {
  PDF_BRAND,
  PDF_BRAND_DARK,
  PDF_BRAND_LIGHT,
  PDF_BORDER,
  PDF_SLATE_400,
  PDF_SLATE_700,
  PDF_SLATE_900,
} from '@/lib/pdf/brand'

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
    color: PDF_SLATE_700,
    backgroundColor: '#ffffff',
  },
  headerBand: {
    backgroundColor: PDF_BRAND,
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
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: PDF_BRAND,
    borderBottomStyle: 'solid',
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: PDF_SLATE_900,
  },
  paragraph: {
    fontSize: 10.5,
    lineHeight: 1.7,
    color: PDF_SLATE_700,
    marginBottom: 6,
  },
  emptyState: {
    fontSize: 10.5,
    lineHeight: 1.6,
    color: PDF_SLATE_400,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  categoryBlock: {
    marginBottom: 14,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    color: PDF_BRAND,
    lineHeight: 1.65,
  },
  bulletText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 1.65,
    color: PDF_SLATE_700,
  },
  highlightBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderStyle: 'solid',
    padding: 16,
    marginTop: 4,
  },
  highlightTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: PDF_BRAND_DARK,
    marginBottom: 8,
  },
  highlightText: {
    fontSize: 10.5,
    lineHeight: 1.7,
    color: '#1e3a8a',
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: PDF_BORDER,
    borderStyle: 'solid',
    marginRight: 12,
  },
  statCardLast: {
    marginRight: 0,
  },
  statLabel: {
    fontSize: 7.5,
    color: PDF_SLATE_400,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
    fontFamily: 'Helvetica-Bold',
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: PDF_SLATE_900,
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
    borderTopColor: PDF_BORDER,
    borderTopStyle: 'solid',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: PDF_SLATE_400,
  },
  pageNumber: {
    fontSize: 8,
    color: PDF_SLATE_400,
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

function textParagraphs(
  text: string,
  style: { fontSize: number; lineHeight: number; color: string; marginBottom?: number }
) {
  return text
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((paragraph, i) => (
      <Text key={`p-${i}`} style={[style, i > 0 ? { marginTop: 8 } : {}]}>
        {paragraph}
      </Text>
    ))
}

function workByCategory(items: RecapWorkItem[]) {
  const byCategory = items.reduce<Record<string, RecapWorkItem[]>>((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return Object.keys(byCategory)
    .sort()
    .map((category) => {
      const colors = CATEGORY_STYLES[category] ?? CATEGORY_STYLES.Other
      const categoryItems = byCategory[category]

      return (
        <View key={category} style={styles.categoryBlock}>
          <View style={[styles.categoryBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.categoryBadgeText, { color: colors.text }]}>{category}</Text>
          </View>
          {categoryItems.map((item, i) => (
            <View key={`${category}-${i}`} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{item.description}</Text>
            </View>
          ))}
        </View>
      )
    })
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
  const safeMonth = Math.min(12, Math.max(1, month))
  const periodLabel = `${MONTHS[safeMonth - 1]} ${year}`
  const sentLabel = formatSentDate(sentAt)
  const workItems = workCompleted
  const categories = new Set(workItems.map((w) => w.category || 'Other'))
  const hasIntro = Boolean(introText?.trim())
  const hasWork = workItems.length > 0
  const hasPerformance = Boolean(performanceNotes?.trim())
  const hasComingNext = Boolean(comingNext?.trim())
  const hasBody = hasIntro || hasWork || hasPerformance || hasComingNext

  return (
    <Document
      title={`${periodLabel} Progress Report — ${clientName}`}
      author="Appdoers"
      subject={`Monthly progress report for ${clientName}`}
      creator="Appdoers Hub"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          <Text style={styles.headerEyebrow}>Monthly Progress Report</Text>
          <Text style={styles.headerTitle}>{periodLabel}</Text>
          <Text style={styles.headerClient}>{clientName}</Text>
          <Text style={styles.headerMeta}>
            {sentLabel ? `Sent ${sentLabel}` : 'Draft — prepared by Appdoers'}
          </Text>
        </View>

        <View style={styles.body}>
          {!hasBody ? (
            <Text style={styles.emptyState}>
              No report content has been saved yet. Add an introduction, work items, or notes in
              the recap editor, click Save, then export again.
            </Text>
          ) : null}

          {hasWork ? (
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Work Items</Text>
                <Text style={styles.statValue}>{String(workItems.length)}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Categories</Text>
                <Text style={styles.statValue}>{String(categories.size)}</Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  styles.statCardLast,
                  { backgroundColor: PDF_BRAND_LIGHT, borderColor: '#93c5fd' },
                ]}
              >
                <Text style={styles.statLabel}>Reporting Period</Text>
                <Text style={[styles.statValue, { fontSize: 12, color: PDF_BRAND_DARK }]}>
                  {periodLabel}
                </Text>
              </View>
            </View>
          ) : null}

          {hasIntro ? (
            <View style={styles.section} wrap>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Introduction</Text>
              </View>
              <View>{textParagraphs(introText!.trim(), styles.paragraph)}</View>
            </View>
          ) : null}

          {hasWork ? (
            <View style={styles.section} wrap>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Work Completed This Month</Text>
              </View>
              <View>{workByCategory(workItems)}</View>
            </View>
          ) : null}

          {hasPerformance ? (
            <View style={styles.section} wrap>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Performance & Highlights</Text>
              </View>
              <View>{textParagraphs(performanceNotes!.trim(), styles.paragraph)}</View>
            </View>
          ) : null}

          {hasComingNext ? (
            <View style={styles.section} wrap>
              <View style={styles.highlightBox}>
                <Text style={styles.highlightTitle}>Coming Next Month</Text>
                <View>{textParagraphs(comingNext!.trim(), styles.highlightText)}</View>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{`Appdoers · ${periodLabel} Progress Report`}</Text>
          <Text style={styles.footerText}>appdoers.co.nz</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
