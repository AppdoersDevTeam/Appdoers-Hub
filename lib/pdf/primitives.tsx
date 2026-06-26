import React from 'react'
import { Image, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PDF_LOGO_BOX_STYLE, PDF_LOGO_PATH, PDF_LOGO_STYLE } from './assets'
import {
  PDF_BORDER,
  PDF_BRAND_DEEP,
  PDF_BRAND_LIGHT,
  PDF_BRAND_PRIMARY,
  PDF_BRAND_SECONDARY,
  PDF_HEADER_ON_DARK,
  PDF_HEADER_ON_DARK_MUTED,
  PDF_HEADER_ON_DARK_SUBTLE,
  PDF_SLATE_400,
  PDF_SLATE_600,
  PDF_SLATE_700,
  PDF_SLATE_900,
} from './brand'
import type { PdfBillingInfo, PdfCompanyInfo } from './company-defaults'
import { formatWebsiteHost } from './company-defaults'
import { pdfFontStyles } from './fonts'

const styles = StyleSheet.create({
  headerBand: {
    backgroundColor: PDF_BRAND_SECONDARY,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 48,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: 24,
  },
  headerRight: {
    alignItems: 'flex-end',
    maxWidth: '42%',
  },
  logoBox: PDF_LOGO_BOX_STYLE,
  companyLegalName: {
    fontSize: 10,
    ...pdfFontStyles.semibold,
    color: PDF_HEADER_ON_DARK,
    marginBottom: 3,
  },
  companyMeta: {
    fontSize: 8.5,
    ...pdfFontStyles.regular,
    color: PDF_HEADER_ON_DARK_MUTED,
    lineHeight: 1.55,
  },
  headerChildren: {
    marginTop: 14,
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
    ...pdfFontStyles.regular,
  },
  pageNumber: {
    fontSize: 8,
    color: PDF_SLATE_400,
    ...pdfFontStyles.regular,
  },
  sectionTitleWrap: {
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: PDF_BRAND_SECONDARY,
    borderBottomStyle: 'solid',
  },
  sectionTitleText: {
    fontSize: 13,
    ...pdfFontStyles.bold,
    color: PDF_SLATE_700,
  },
  paymentBox: {
    padding: 14,
    backgroundColor: PDF_BRAND_LIGHT,
    borderLeftWidth: 3,
    borderLeftColor: PDF_BRAND_SECONDARY,
    borderLeftStyle: 'solid',
  },
  paymentTitle: {
    fontSize: 9,
    ...pdfFontStyles.bold,
    color: PDF_BRAND_DEEP,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  paymentText: {
    fontSize: 9.5,
    lineHeight: 1.6,
    color: PDF_SLATE_600,
    ...pdfFontStyles.regular,
  },
})

export function PdfLogo({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.logoBox}>
      <Image
        src={PDF_LOGO_PATH}
        style={
          compact
            ? { ...PDF_LOGO_STYLE, width: 100, height: 30 }
            : PDF_LOGO_STYLE
        }
      />
    </View>
  )
}

export function PdfCompanyDetails({
  company,
  onDark = true,
}: {
  company: PdfCompanyInfo
  onDark?: boolean
}) {
  const nameColor = onDark ? PDF_HEADER_ON_DARK : PDF_SLATE_900
  const metaColor = onDark ? PDF_HEADER_ON_DARK_MUTED : PDF_SLATE_600

  const metaLines = [
    company.address,
    company.gstNumber ? `GST: ${company.gstNumber}` : null,
    company.nzbn ? `NZBN ${company.nzbn}` : null,
    company.email,
    company.phone,
    company.website ? formatWebsiteHost(company.website) : null,
  ].filter(Boolean)

  return (
    <View>
      <Text style={[styles.companyLegalName, { color: nameColor }]}>
        {company.legalName || company.name}
      </Text>
      {metaLines.map((line, i) => (
        <Text key={i} style={[styles.companyMeta, { color: metaColor }]}>
          {line}
        </Text>
      ))}
    </View>
  )
}

export function PdfLetterhead({
  company,
  right,
  children,
  showLogo = true,
  showCompanyDetails = true,
}: {
  company: PdfCompanyInfo
  right?: React.ReactNode
  children?: React.ReactNode
  showLogo?: boolean
  showCompanyDetails?: boolean
}) {
  return (
    <View style={styles.headerBand}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {showLogo ? <PdfLogo /> : null}
          {showCompanyDetails ? <PdfCompanyDetails company={company} onDark /> : null}
        </View>
        {right ? <View style={styles.headerRight}>{right}</View> : null}
      </View>
      {children ? <View style={styles.headerChildren}>{children}</View> : null}
    </View>
  )
}

export function PdfPageFooter({
  label,
  legalName = 'Appdoers Limited',
}: {
  label: string
  legalName?: string
}) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{label}</Text>
      <Text style={styles.footerText}>{legalName} · appdoers.co.nz</Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  )
}

export function PdfPlainText({
  text,
  style,
}: {
  text: string
  style: { fontSize: number; lineHeight: number; color: string; marginBottom?: number }
}) {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim())
  return (
    <View>
      {paragraphs.map((paragraph, i) => (
        <Text key={i} style={[style, pdfFontStyles.regular, i > 0 ? { marginTop: 8 } : {}]}>
          {paragraph}
        </Text>
      ))}
    </View>
  )
}

export function PdfSectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.sectionTitleWrap}>
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  )
}

export function PdfPaymentBlock({
  billing,
  paymentRef,
  companyEmail,
  notes,
}: {
  billing: PdfBillingInfo
  paymentRef: string
  companyEmail?: string
  notes?: string | null
}) {
  const bankLines: string[] = []
  if (billing.bank_name) bankLines.push(`Bank: ${billing.bank_name}`)
  if (billing.account_name) bankLines.push(`Account name: ${billing.account_name}`)
  if (billing.bank_account) bankLines.push(`Account number: ${billing.bank_account}`)

  const footerNote = billing.invoice_footer?.trim() || notes?.trim()

  return (
    <View style={styles.paymentBox}>
      <Text style={styles.paymentTitle}>Payment Details</Text>
      <Text style={styles.paymentText}>
        {bankLines.length > 0 ? `${bankLines.join('\n')}\n` : ''}
        Reference: {paymentRef}
        {'\n'}
        Please pay by the due date. All amounts in NZD and include GST where shown.
        {billing.stripe_link ? `\nPay online: ${billing.stripe_link}` : ''}
        {companyEmail ? `\nQuestions: ${companyEmail}` : ''}
        {footerNote ? `\n\n${footerNote}` : ''}
      </Text>
    </View>
  )
}

export const pdfHeaderTextStyles = StyleSheet.create({
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: PDF_HEADER_ON_DARK_SUBTLE,
    ...pdfFontStyles.bold,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    ...pdfFontStyles.bold,
    color: PDF_HEADER_ON_DARK,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: PDF_HEADER_ON_DARK_MUTED,
    ...pdfFontStyles.regular,
    marginBottom: 4,
  },
  meta: {
    fontSize: 9.5,
    color: PDF_HEADER_ON_DARK_SUBTLE,
    ...pdfFontStyles.regular,
    marginTop: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginTop: 6,
  },
  statusText: {
    fontSize: 8.5,
    ...pdfFontStyles.bold,
    color: PDF_HEADER_ON_DARK,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  accentValue: {
    fontSize: 16,
    ...pdfFontStyles.bold,
    color: PDF_BRAND_PRIMARY,
  },
})
