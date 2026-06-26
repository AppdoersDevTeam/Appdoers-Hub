import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { InvoiceLine } from '@/lib/invoices/types'
import {
  PDF_BRAND,
  PDF_BRAND_DARK,
  PDF_BORDER,
  PDF_SLATE_400,
  PDF_SLATE_600,
  PDF_SLATE_700,
  PDF_SLATE_900,
} from '@/lib/pdf/brand'
import { formatPdfCurrency, formatPdfDate } from '@/lib/pdf/format'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
  cancelled: 'Cancelled',
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 56,
    paddingHorizontal: 0,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: PDF_SLATE_700,
    backgroundColor: '#ffffff',
  },
  headerBand: {
    backgroundColor: PDF_BRAND,
    paddingTop: 36,
    paddingBottom: 24,
    paddingHorizontal: 48,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandBlock: {},
  brandName: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  brandMeta: {
    fontSize: 9,
    color: '#bfdbfe',
    lineHeight: 1.5,
  },
  invoiceBlock: {
    alignItems: 'flex-end',
  },
  invoiceEyebrow: {
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#93c5fd',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statusText: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: {
    paddingHorizontal: 48,
    paddingTop: 28,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 28,
  },
  metaCol: {
    flex: 1,
    marginRight: 20,
  },
  metaColLast: {
    marginRight: 0,
  },
  metaLabel: {
    fontSize: 7.5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: PDF_SLATE_400,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  metaValue: {
    fontSize: 10.5,
    color: PDF_SLATE_900,
    lineHeight: 1.5,
    fontFamily: 'Helvetica-Bold',
  },
  metaSub: {
    fontSize: 9.5,
    color: PDF_SLATE_600,
    lineHeight: 1.5,
    marginTop: 2,
  },
  table: {
    borderWidth: 1,
    borderColor: PDF_BORDER,
    borderStyle: 'solid',
    marginBottom: 20,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: PDF_BORDER,
    borderBottomStyle: 'solid',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    borderBottomStyle: 'solid',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  th: {
    padding: 10,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: PDF_SLATE_400,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  td: {
    padding: 10,
    fontSize: 10,
    color: PDF_SLATE_700,
  },
  colDesc: { width: '46%' },
  colQty: { width: '14%', textAlign: 'right' },
  colUnit: { width: '18%', textAlign: 'right' },
  colAmount: { width: '22%', textAlign: 'right' },
  tdBold: {
    fontFamily: 'Helvetica-Bold',
    color: PDF_SLATE_900,
  },
  totalsWrap: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 24,
  },
  totalsBox: {
    width: 240,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 10,
    color: PDF_SLATE_600,
  },
  totalValue: {
    fontSize: 10,
    color: PDF_SLATE_900,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: PDF_BRAND,
    borderTopStyle: 'solid',
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: PDF_SLATE_900,
  },
  grandTotalValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: PDF_BRAND_DARK,
  },
  notesBox: {
    padding: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: PDF_BORDER,
    borderStyle: 'solid',
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: PDF_SLATE_900,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 9.5,
    lineHeight: 1.6,
    color: PDF_SLATE_600,
  },
  paymentBox: {
    padding: 14,
    backgroundColor: '#eff6ff',
    borderLeftWidth: 3,
    borderLeftColor: PDF_BRAND,
    borderLeftStyle: 'solid',
  },
  paymentTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: PDF_BRAND_DARK,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  paymentText: {
    fontSize: 9.5,
    lineHeight: 1.6,
    color: '#1e3a8a',
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

export interface CompanyInfo {
  name: string
  email: string
  phone: string
  address: string
  website: string
}

export interface BillingInfo {
  bank_name: string
  bank_account: string
  bank_reference_prefix: string
  gst_rate: number
}

export interface InvoicePDFProps {
  invoiceNumber: string
  status: string
  issueDate: string
  dueDate: string
  type: string
  lines: InvoiceLine[]
  subtotal: number
  gstAmount: number
  total: number
  notes: string | null
  paidAt: string | null
  paymentReference: string | null
  clientName: string
  contactName: string | null
  contactEmail: string | null
  projectName: string | null
  company: CompanyInfo
  billing: BillingInfo
}

export function InvoicePDFDocument({
  invoiceNumber,
  status,
  issueDate,
  dueDate,
  type,
  lines,
  subtotal,
  gstAmount,
  total,
  notes,
  paidAt,
  paymentReference,
  clientName,
  contactName,
  contactEmail,
  projectName,
  company,
  billing,
}: InvoicePDFProps) {
  const gstPercent = Math.round((billing.gst_rate || 0.15) * 100)
  const statusLabel = STATUS_LABELS[status] ?? status
  const typeLabel = type.replace(/_/g, ' ')
  const paymentRef = `${billing.bank_reference_prefix || 'INV'}${invoiceNumber.replace(/^APD-/, '')}`

  return (
    <Document
      title={`Invoice ${invoiceNumber} — ${clientName}`}
      author={company.name}
      subject={`Tax invoice for ${clientName}`}
      creator="Appdoers Hub"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          <View style={styles.headerRow}>
            <View style={styles.brandBlock}>
              <Text style={styles.brandName}>{company.name}</Text>
              <Text style={styles.brandMeta}>
                {company.email}
                {company.phone ? `\n${company.phone}` : ''}
                {company.website ? `\n${company.website.replace(/^https?:\/\//, '')}` : ''}
              </Text>
            </View>
            <View style={styles.invoiceBlock}>
              <Text style={styles.invoiceEyebrow}>Tax Invoice</Text>
              <Text style={styles.invoiceNumber}>{invoiceNumber}</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{statusLabel}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Bill To</Text>
              <Text style={styles.metaValue}>{clientName}</Text>
              {contactName ? <Text style={styles.metaSub}>{contactName}</Text> : null}
              {contactEmail ? <Text style={styles.metaSub}>{contactEmail}</Text> : null}
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Invoice Details</Text>
              <Text style={styles.metaSub}>Issue date: {formatPdfDate(issueDate)}</Text>
              <Text style={styles.metaSub}>Due date: {formatPdfDate(dueDate)}</Text>
              <Text style={styles.metaSub}>Type: {typeLabel}</Text>
              {projectName ? <Text style={styles.metaSub}>Project: {projectName}</Text> : null}
            </View>
            <View style={[styles.metaCol, styles.metaColLast]}>
              <Text style={styles.metaLabel}>Amount Due (NZD)</Text>
              <Text style={[styles.metaValue, { fontSize: 16, color: PDF_BRAND_DARK }]}>
                {formatPdfCurrency(status === 'paid' ? 0 : total)}
              </Text>
              {paidAt ? (
                <Text style={styles.metaSub}>
                  Paid {formatPdfDate(paidAt)}
                  {paymentReference ? ` · Ref ${paymentReference}` : ''}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={[styles.th, styles.colDesc]}>Description</Text>
              <Text style={[styles.th, styles.colQty]}>Qty / Hrs</Text>
              <Text style={[styles.th, styles.colUnit]}>Unit Price</Text>
              <Text style={[styles.th, styles.colAmount]}>Amount</Text>
            </View>
            {lines.length === 0 ? (
              <View style={[styles.tableRow, styles.tableRowLast]}>
                <Text style={[styles.td, styles.colDesc, { color: PDF_SLATE_400 }]}>
                  No line items
                </Text>
                <Text style={[styles.td, styles.colQty]} />
                <Text style={[styles.td, styles.colUnit]} />
                <Text style={[styles.td, styles.colAmount]} />
              </View>
            ) : (
              lines.map((line, i) => (
                <View
                  key={i}
                  style={[styles.tableRow, i === lines.length - 1 ? styles.tableRowLast : {}]}
                >
                  <Text style={[styles.td, styles.colDesc]}>{line.description}</Text>
                  <Text style={[styles.td, styles.colQty]}>{String(line.quantity)}</Text>
                  <Text style={[styles.td, styles.colUnit]}>{formatPdfCurrency(line.unit_price)}</Text>
                  <Text style={[styles.td, styles.colAmount, styles.tdBold]}>
                    {formatPdfCurrency(line.amount)}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.totalsWrap}>
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{formatPdfCurrency(subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>GST ({gstPercent}%)</Text>
                <Text style={styles.totalValue}>{formatPdfCurrency(gstAmount)}</Text>
              </View>
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Total (incl. GST)</Text>
                <Text style={styles.grandTotalValue}>{formatPdfCurrency(total)}</Text>
              </View>
            </View>
          </View>

          {notes?.trim() ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>Notes</Text>
              {notes
                .split(/\n\n+/)
                .filter((p) => p.trim())
                .map((paragraph, i) => (
                  <Text key={i} style={[styles.notesText, i > 0 ? { marginTop: 6 } : {}]}>
                    {paragraph}
                  </Text>
                ))}
            </View>
          ) : null}

          <View style={styles.paymentBox}>
            <Text style={styles.paymentTitle}>Payment Details</Text>
            <Text style={styles.paymentText}>
              {billing.bank_name && billing.bank_account
                ? `Bank: ${billing.bank_name}\nAccount: ${billing.bank_account}\n`
                : ''}
              Reference: {paymentRef}
              {'\n'}
              Please pay by the due date. All amounts in NZD and include GST where shown.
              {company.email ? `\nQuestions: ${company.email}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{`${company.name} · Invoice ${invoiceNumber}`}</Text>
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
