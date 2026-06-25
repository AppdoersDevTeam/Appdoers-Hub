import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { MarkdownContent } from './pdf-markdown'
import {
  HOW_PLANS_WORK,
  PLAN_COMPARISON,
  resolveServiceDetails,
  type PricingItem,
  type ServiceCatalogEntry,
} from './service-guide'

const BRAND = '#2563eb'
const BRAND_DARK = '#1e40af'
const SLATE_900 = '#0f172a'
const SLATE_600 = '#475569'
const SLATE_400 = '#94a3b8'
const BORDER = '#e2e8f0'

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 64, paddingHorizontal: 52, fontFamily: 'Helvetica', fontSize: 10.5, color: SLATE_900, backgroundColor: '#ffffff' },
  coverPage: { paddingTop: 80, paddingBottom: 64, paddingHorizontal: 52, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  coverAccent: { height: 6, backgroundColor: BRAND, marginBottom: 48 },
  coverLogo: { width: 48, height: 48, borderRadius: 8, backgroundColor: BRAND, marginBottom: 32 },
  coverBrand: { fontSize: 11, letterSpacing: 2, color: BRAND, textTransform: 'uppercase', marginBottom: 16, fontFamily: 'Helvetica-Bold' },
  coverTitle: { fontSize: 30, fontFamily: 'Helvetica-Bold', color: SLATE_900, marginBottom: 12, lineHeight: 1.2 },
  coverSubtitle: { fontSize: 14, color: SLATE_600, marginBottom: 6 },
  coverMeta: { fontSize: 10, color: SLATE_400, marginTop: 32 },
  coverTagline: { fontSize: 11, color: SLATE_600, marginTop: 48, lineHeight: 1.6, maxWidth: 360 },
  sectionHeader: { marginBottom: 14, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: BRAND, borderBottomStyle: 'solid' },
  sectionNumber: { fontSize: 9, color: BRAND, fontFamily: 'Helvetica-Bold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: SLATE_900 },
  sectionBlock: { marginBottom: 22 },
  introText: { fontSize: 10.5, lineHeight: 1.65, color: SLATE_600, marginBottom: 12 },
  table: { marginTop: 8, borderWidth: 1, borderColor: BORDER, borderStyle: 'solid' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: BORDER, borderBottomStyle: 'solid' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', borderBottomStyle: 'solid' },
  tableFooter: { flexDirection: 'row', backgroundColor: '#eff6ff', borderTopWidth: 2, borderTopColor: BRAND, borderTopStyle: 'solid' },
  cellService: { width: '22%', padding: 9, fontSize: 9.5 },
  cellDesc: { width: '38%', padding: 9, fontSize: 9.5, color: SLATE_600 },
  cellMoney: { width: '20%', padding: 9, fontSize: 9.5, textAlign: 'right' },
  cellBold: { fontFamily: 'Helvetica-Bold', color: SLATE_900 },
  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  summaryCard: { flex: 1, padding: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', borderRadius: 4 },
  summaryCardHighlight: { flex: 1, padding: 12, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#93c5fd', borderStyle: 'solid', borderRadius: 4 },
  summaryLabel: { fontSize: 8, color: SLATE_400, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: SLATE_900 },
  summaryValueBrand: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: BRAND_DARK },
  guideCard: { marginBottom: 12, padding: 12, backgroundColor: '#f8fafc', borderLeftWidth: 3, borderLeftColor: BRAND, borderLeftStyle: 'solid' },
  guideCardTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: SLATE_900, marginBottom: 4 },
  guideCardBody: { fontSize: 9.5, lineHeight: 1.55, color: SLATE_600 },
  planCard: { marginBottom: 14, padding: 14, borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', borderRadius: 4 },
  planName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: SLATE_900, marginBottom: 2 },
  planTagline: { fontSize: 9.5, color: BRAND, marginBottom: 8 },
  planBullet: { flexDirection: 'row', marginBottom: 3 },
  planBulletDot: { width: 12, fontSize: 9, color: BRAND },
  planBulletText: { flex: 1, fontSize: 9, lineHeight: 1.5, color: SLATE_600 },
  planNote: { fontSize: 9, color: SLATE_600, marginTop: 8, fontFamily: 'Helvetica-Bold' },
  serviceItem: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', borderBottomStyle: 'solid' },
  serviceItemName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: SLATE_900, marginBottom: 3 },
  serviceItemType: { fontSize: 8, color: BRAND, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  serviceItemDesc: { fontSize: 9.5, lineHeight: 1.55, color: SLATE_600 },
  footer: { position: 'absolute', bottom: 28, left: 52, right: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: 'solid', paddingTop: 8 },
  footerText: { fontSize: 8, color: SLATE_400 },
  pageNumber: { fontSize: 8, color: SLATE_400 },
  appendixTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: SLATE_900, marginBottom: 6 },
  appendixSubtitle: { fontSize: 10, color: SLATE_600, marginBottom: 18, lineHeight: 1.5 },
})

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export interface ProposalSection {
  id: string
  title: string
  content: string
  pricing_items?: PricingItem[]
}

interface ProposalPDFProps {
  title: string
  clientName: string
  contactName?: string | null
  sections: ProposalSection[]
  catalog: ServiceCatalogEntry[]
  version: number
}

function PageFooter({ label }: { label: string }) {
  return React.createElement(
    View,
    { style: styles.footer, fixed: true },
    React.createElement(Text, { style: styles.footerText }, label),
    React.createElement(Text, { style: styles.footerText }, 'appdoers.co.nz'),
    React.createElement(Text, {
      style: styles.pageNumber,
      render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`,
    })
  )
}

function SectionBlock({
  index,
  title,
  children,
}: {
  index: number
  title: string
  children: React.ReactNode
}) {
  return React.createElement(
    View,
    { style: styles.sectionBlock, wrap: false },
    React.createElement(
      View,
      { style: styles.sectionHeader },
      React.createElement(Text, { style: styles.sectionNumber }, `Section ${index}`),
      React.createElement(Text, { style: styles.sectionTitle }, title)
    ),
    children
  )
}

function InvestmentSection({
  section,
  index,
}: {
  section: ProposalSection
  index: number
}) {
  const items = section.pricing_items ?? []
  const totalSetup = items.reduce((sum, item) => sum + (item.setup_fee || 0), 0)
  const totalMonthly = items.reduce((sum, item) => sum + (item.monthly_fee || 0), 0)

  return React.createElement(
    View,
    { style: styles.sectionBlock, wrap: false },
    React.createElement(
      View,
      { style: styles.sectionHeader },
      React.createElement(Text, { style: styles.sectionNumber }, `Section ${index}`),
      React.createElement(Text, { style: styles.sectionTitle }, section.title)
    ),
    section.content ? React.createElement(MarkdownContent, { content: section.content }) : null,
    items.length > 0
      ? React.createElement(
          View,
          { style: styles.table, wrap: false },
          React.createElement(
            View,
            { style: styles.tableHeader },
            React.createElement(Text, { style: [styles.cellService, styles.cellBold] }, 'Service'),
            React.createElement(Text, { style: [styles.cellDesc, styles.cellBold] }, 'Description'),
            React.createElement(Text, { style: [styles.cellMoney, styles.cellBold] }, 'Setup'),
            React.createElement(Text, { style: [styles.cellMoney, styles.cellBold] }, 'Monthly')
          ),
          ...items.map((item, i) =>
            React.createElement(
              View,
              { key: i, style: styles.tableRow },
              React.createElement(Text, { style: [styles.cellService, styles.cellBold] }, item.name),
              React.createElement(Text, { style: styles.cellDesc }, item.description?.trim() || '—'),
              React.createElement(
                Text,
                { style: styles.cellMoney },
                item.setup_fee > 0 ? formatCurrency(item.setup_fee) : '—'
              ),
              React.createElement(
                Text,
                { style: styles.cellMoney },
                item.monthly_fee > 0 ? `${formatCurrency(item.monthly_fee)}/mo` : '—'
              )
            )
          ),
          React.createElement(
            View,
            { style: styles.tableFooter },
            React.createElement(Text, { style: [styles.cellService, styles.cellBold, { width: '60%' }] }, 'Total Investment'),
            React.createElement(Text, { style: [styles.cellMoney, styles.cellBold] }, formatCurrency(totalSetup)),
            React.createElement(
              Text,
              { style: [styles.cellMoney, styles.cellBold] },
              `${formatCurrency(totalMonthly)}/mo`
            )
          )
        )
      : null,
    items.length > 0
      ? React.createElement(
          View,
          { style: styles.summaryRow },
          React.createElement(
            View,
            { style: styles.summaryCard },
            React.createElement(Text, { style: styles.summaryLabel }, 'One-time setup'),
            React.createElement(Text, { style: styles.summaryValue }, formatCurrency(totalSetup))
          ),
          React.createElement(
            View,
            { style: styles.summaryCard },
            React.createElement(Text, { style: styles.summaryLabel }, 'Monthly recurring'),
            React.createElement(
              Text,
              { style: styles.summaryValue },
              `${formatCurrency(totalMonthly)}/mo`
            )
          ),
          React.createElement(
            View,
            { style: styles.summaryCardHighlight },
            React.createElement(Text, { style: styles.summaryLabel }, '12-month value'),
            React.createElement(
              Text,
              { style: styles.summaryValueBrand },
              formatCurrency(totalSetup + totalMonthly * 12)
            )
          )
        )
      : null
  )
}

function ServiceGuideAppendix({
  items,
  catalog,
}: {
  items: PricingItem[]
  catalog: ServiceCatalogEntry[]
}) {
  const uniqueItems = items.filter(
    (item, index, arr) => arr.findIndex((x) => x.name === item.name) === index
  )

  return React.createElement(
    Page,
    { size: 'A4', style: styles.page },
    React.createElement(Text, { style: styles.appendixTitle }, 'Understanding Your Quote'),
    React.createElement(
      Text,
      { style: styles.appendixSubtitle },
      'This appendix explains how Appdoers plans work and what each service in your quote includes.'
    ),
    React.createElement(Text, { style: [styles.sectionTitle, { marginBottom: 10 }] }, HOW_PLANS_WORK.title),
    React.createElement(Text, { style: styles.introText }, HOW_PLANS_WORK.intro),
    ...HOW_PLANS_WORK.sections.map((s, i) =>
      React.createElement(
        View,
        { key: i, style: styles.guideCard },
        React.createElement(Text, { style: styles.guideCardTitle }, s.heading),
        React.createElement(Text, { style: styles.guideCardBody }, s.body)
      )
    ),
    PageFooter({ label: 'Appdoers Quote' })
  )
}

function PlansComparisonAppendix() {
  return React.createElement(
    Page,
    { size: 'A4', style: styles.page },
    React.createElement(Text, { style: [styles.sectionTitle, { marginBottom: 14 }] }, PLAN_COMPARISON.title),
    ...PLAN_COMPARISON.plans.map((plan, i) =>
      React.createElement(
        View,
        { key: i, style: styles.planCard, wrap: false },
        React.createElement(Text, { style: styles.planName }, plan.name),
        React.createElement(Text, { style: styles.planTagline }, plan.tagline),
        ...plan.includes.map((feature, fi) =>
          React.createElement(
            View,
            { key: fi, style: styles.planBullet },
            React.createElement(Text, { style: styles.planBulletDot }, '•'),
            React.createElement(Text, { style: styles.planBulletText }, feature)
          )
        ),
        React.createElement(Text, { style: styles.planNote }, `Ideal for: ${plan.idealFor}`),
        React.createElement(Text, { style: { fontSize: 9, color: SLATE_600, marginTop: 4 } }, plan.pricingNote)
      )
    ),
    PageFooter({ label: 'Appdoers Quote' })
  )
}

function LineItemsAppendix({
  items,
  catalog,
}: {
  items: PricingItem[]
  catalog: ServiceCatalogEntry[]
}) {
  if (items.length === 0) return null

  const uniqueItems = items.filter(
    (item, index, arr) => arr.findIndex((x) => x.name === item.name) === index
  )

  return React.createElement(
    Page,
    { size: 'A4', style: styles.page },
    React.createElement(Text, { style: [styles.sectionTitle, { marginBottom: 14 }] }, 'Services in This Quote'),
    React.createElement(
      Text,
      { style: [styles.introText, { marginBottom: 16 }] },
      'Each line item below is explained in plain language so you know exactly what you are investing in.'
    ),
    ...uniqueItems.flatMap((item, i) => {
      const details = resolveServiceDetails(item, catalog)
      const typeLabel =
        details.type === 'plan' ? 'Website Plan' : details.type === 'addon' ? 'Add-on' : 'Custom Service'

      const pricingNote =
        item.setup_fee > 0 || item.monthly_fee > 0
          ? [
              item.setup_fee > 0 ? `Setup: ${formatCurrency(item.setup_fee)}` : null,
              item.monthly_fee > 0 ? `Monthly: ${formatCurrency(item.monthly_fee)}/mo` : null,
            ]
              .filter(Boolean)
              .join('  ·  ')
          : null

      return [
        React.createElement(
          View,
          { key: i, style: styles.serviceItem },
          React.createElement(Text, { style: styles.serviceItemType }, typeLabel),
          React.createElement(Text, { style: styles.serviceItemName }, details.name),
          React.createElement(Text, { style: styles.serviceItemDesc }, details.description),
          pricingNote
            ? React.createElement(
                Text,
                { style: { fontSize: 9, color: SLATE_600, marginTop: 4 } },
                pricingNote
              )
            : null
        ),
      ]
    }),
    PageFooter({ label: 'Appdoers Quote' })
  )
}

export function ProposalPDFDocument({
  title,
  clientName,
  contactName,
  sections,
  catalog,
  version,
}: ProposalPDFProps) {
  const date = new Date().toLocaleDateString('en-NZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const contentSections = sections.filter((s) => s.id !== 'cover')
  const investmentItems = sections.find((s) => s.id === 'investment')?.pricing_items ?? []
  const footerLabel = `Appdoers · Quote v${version}`

  return React.createElement(
    Document,
    {
      title,
      author: 'Appdoers',
      subject: `Quote for ${clientName}`,
      creator: 'Appdoers Hub',
    },
    // Cover
    React.createElement(
      Page,
      { size: 'A4', style: styles.coverPage },
      React.createElement(View, { style: styles.coverAccent }),
      React.createElement(View, { style: styles.coverLogo }),
      React.createElement(Text, { style: styles.coverBrand }, 'Appdoers'),
      React.createElement(Text, { style: styles.coverTitle }, title),
      React.createElement(Text, { style: styles.coverSubtitle }, `Prepared for ${clientName}`),
      contactName
        ? React.createElement(Text, { style: styles.coverSubtitle }, `Attention: ${contactName}`)
        : null,
      React.createElement(Text, { style: styles.coverMeta }, date),
      React.createElement(
        Text,
        { style: styles.coverTagline },
        'Websites and online tools for New Zealand organisations. This quote outlines your project scope, investment, and how our plans work.'
      ),
      PageFooter({ label: footerLabel })
    ),
    // Content sections (split across pages naturally)
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      ...contentSections.map((section, index) => {
        const sectionIndex = index + 1

        if (section.id === 'investment') {
          return React.createElement(InvestmentSection, {
            key: section.id,
            section,
            index: sectionIndex,
          })
        }

        return React.createElement(SectionBlock, {
          key: section.id,
          index: sectionIndex,
          title: section.title,
          children: React.createElement(MarkdownContent, { content: section.content || '' }),
        })
      }),
      PageFooter({ label: footerLabel })
    ),
    ServiceGuideAppendix({ items: investmentItems, catalog }),
    PlansComparisonAppendix(),
    LineItemsAppendix({ items: investmentItems, catalog })
  )
}
