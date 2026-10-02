import React from 'react'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import {
  PDF_BORDER,
  PDF_BRAND_DEEP,
  PDF_BRAND_LIGHT,
  PDF_CONTRACT_PURPLE,
  PDF_SLATE_400,
  PDF_SLATE_600,
  PDF_SLATE_700,
  PDF_SLATE_900,
} from '@/lib/pdf/brand'
import { APPDOERS_COMPANY_DEFAULTS } from '@/lib/pdf/company-defaults'
import { pdfFontStyles } from '@/lib/pdf/fonts'
import { PdfLetterhead, PdfPageFooter, pdfHeaderTextStyles } from '@/lib/pdf/primitives'
import type { ReviewCounts, ReviewItemKind, ReviewItemStatus, ReviewPin } from './types'

const company = APPDOERS_COMPANY_DEFAULTS
const IMAGE_MAX_W = 515
const IMAGE_MAX_H = 520

export type RecordImage = { data: Buffer; format: 'png' | 'jpg'; width: number; height: number }

export interface ReviewRecordItem {
  page_name: string
  section_name: string
  kind: ReviewItemKind
  team_note: string | null
  client_status: ReviewItemStatus
  client_comment: string | null
  pins: ReviewPin[]
  attachments: string[]
  desktop: RecordImage | null
  mobile: RecordImage | null
}

export interface ReviewRecordPDFProps {
  clientName: string
  roundLabel: string
  submittedAt: string
  submittedBy: string | null
  stagingUrl: string | null
  generalNotes: string | null
  counts: ReviewCounts
  items: ReviewRecordItem[]
}

const STATUS_TEXT: Record<ReviewItemStatus, string> = {
  pending: 'Not reviewed',
  looks_good: 'Looks good',
  changes: 'Needs changes',
  provided: 'Provided',
}

const styles = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 56, ...pdfFontStyles.regular, fontSize: 9.5, color: PDF_SLATE_700 },
  body: { paddingHorizontal: 40, paddingTop: 18 },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  stat: { flex: 1, borderWidth: 1, borderColor: PDF_BORDER, borderRadius: 4, padding: 8 },
  statValue: { ...pdfFontStyles.bold, fontSize: 16, color: PDF_SLATE_900 },
  statLabel: { fontSize: 8, color: PDF_SLATE_600, marginTop: 2 },
  meta: { fontSize: 9, color: PDF_SLATE_600, marginBottom: 3 },
  notesBox: { backgroundColor: PDF_BRAND_LIGHT, padding: 10, borderRadius: 4, marginBottom: 16 },
  notesTitle: { ...pdfFontStyles.semibold, fontSize: 10, color: PDF_SLATE_900, marginBottom: 4 },
  pageTitle: { ...pdfFontStyles.bold, fontSize: 13, color: PDF_BRAND_DEEP, marginTop: 10, marginBottom: 6 },
  item: { borderTopWidth: 1, borderTopColor: PDF_BORDER, paddingTop: 10, marginBottom: 12 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemTitle: { ...pdfFontStyles.semibold, fontSize: 11, color: PDF_SLATE_900 },
  badge: { fontSize: 8.5, ...pdfFontStyles.semibold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  teamNote: { fontSize: 8.5, color: PDF_SLATE_400, marginBottom: 6 },
  imageWrap: { position: 'relative', marginBottom: 6, borderWidth: 1, borderColor: PDF_BORDER },
  pin: {
    position: 'absolute',
    width: 14,
    height: 14,
    marginLeft: -7,
    marginTop: -7,
    borderRadius: 7,
    backgroundColor: PDF_CONTRACT_PURPLE,
    color: '#ffffff',
    fontSize: 7.5,
    ...pdfFontStyles.bold,
    textAlign: 'center',
    paddingTop: 2.5,
  },
  viewLabel: { fontSize: 8, color: PDF_SLATE_400, marginBottom: 3 },
  pinRow: { flexDirection: 'row', marginBottom: 3 },
  pinNumber: { ...pdfFontStyles.bold, color: PDF_CONTRACT_PURPLE, width: 18 },
  pinText: { flex: 1 },
  comment: { marginTop: 3, lineHeight: 1.45 },
})

function badgeColors(status: ReviewItemStatus) {
  if (status === 'looks_good' || status === 'provided') return { backgroundColor: '#dcfce7', color: '#166534' }
  if (status === 'changes') return { backgroundColor: '#fef3c7', color: '#92400e' }
  return { backgroundColor: '#f1f5f9', color: '#475569' }
}

function fitImage(img: RecordImage) {
  const scale = Math.min(IMAGE_MAX_W / img.width, IMAGE_MAX_H / img.height, 1)
  return { width: Math.round(img.width * scale), height: Math.round(img.height * scale) }
}

function Screenshot({ img, pins, label, offset }: { img: RecordImage; pins: ReviewPin[]; label: string; offset: number }) {
  const size = fitImage(img)
  return (
    <View wrap={false}>
      <Text style={styles.viewLabel}>{label}</Text>
      <View style={[styles.imageWrap, size]}>
        <Image src={{ data: img.data, format: img.format }} style={size} />
        {pins.map((pin, i) => (
          <Text key={pin.id} style={[styles.pin, { left: (pin.x / 100) * size.width, top: (pin.y / 100) * size.height }]}>
            {offset + i + 1}
          </Text>
        ))}
      </View>
    </View>
  )
}

function ItemBlock({ item }: { item: ReviewRecordItem }) {
  const desktopPins = item.pins.filter((p) => p.view === 'desktop')
  const mobilePins = item.pins.filter((p) => p.view === 'mobile')
  const numbered = [...desktopPins, ...mobilePins]
  return (
    <View style={styles.item}>
      <View style={styles.itemHeader} wrap={false}>
        <Text style={styles.itemTitle}>
          {item.section_name}
          {item.kind === 'content_request' ? '  (content request)' : ''}
        </Text>
        <Text style={[styles.badge, badgeColors(item.client_status)]}>{STATUS_TEXT[item.client_status]}</Text>
      </View>
      {item.team_note ? <Text style={styles.teamNote}>Asked: {item.team_note}</Text> : null}
      {item.desktop ? <Screenshot img={item.desktop} pins={desktopPins} label="Desktop" offset={0} /> : null}
      {item.mobile && (mobilePins.length > 0 || !item.desktop) ? (
        <Screenshot img={item.mobile} pins={mobilePins} label="Mobile" offset={desktopPins.length} />
      ) : null}
      {numbered.map((pin, i) => (
        <View key={pin.id} style={styles.pinRow}>
          <Text style={styles.pinNumber}>{i + 1}.</Text>
          <Text style={styles.pinText}>{pin.comment || '(no comment)'}</Text>
        </View>
      ))}
      {item.client_comment ? <Text style={styles.comment}>Comment: {item.client_comment}</Text> : null}
      {item.attachments.length > 0 ? <Text style={styles.comment}>Files: {item.attachments.join(', ')}</Text> : null}
    </View>
  )
}

export function ReviewRecordPDFDocument(props: ReviewRecordPDFProps) {
  const pages: { page: string; items: ReviewRecordItem[] }[] = []
  for (const item of props.items) {
    const group = pages.find((p) => p.page === item.page_name)
    if (group) group.items.push(item)
    else pages.push({ page: item.page_name, items: [item] })
  }

  return (
    <Document title={`Website feedback — ${props.clientName} — ${props.roundLabel}`} author={company.legalName}>
      <Page size="A4" style={styles.page} wrap>
        <PdfLetterhead company={company} showCompanyDetails={false}>
          <Text style={pdfHeaderTextStyles.title}>Website feedback record</Text>
          <Text style={pdfHeaderTextStyles.subtitle}>
            {props.clientName} · {props.roundLabel}
          </Text>
        </PdfLetterhead>
        <View style={styles.body}>
          <Text style={styles.meta}>Submitted: {props.submittedAt}{props.submittedBy ? ` by ${props.submittedBy}` : ''}</Text>
          {props.stagingUrl ? <Text style={styles.meta}>Site reviewed: {props.stagingUrl}</Text> : null}
          <View style={[styles.summaryRow, { marginTop: 8 }]}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{props.counts.looksGood}</Text>
              <Text style={styles.statLabel}>Looks good</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{props.counts.changes}</Text>
              <Text style={styles.statLabel}>Needs changes</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{props.counts.notReviewed}</Text>
              <Text style={styles.statLabel}>Not reviewed</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {props.counts.requestsProvided}/{props.counts.requests}
              </Text>
              <Text style={styles.statLabel}>Content provided</Text>
            </View>
          </View>
          {props.generalNotes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>General notes</Text>
              <Text style={{ lineHeight: 1.45 }}>{props.generalNotes}</Text>
            </View>
          ) : null}
          {pages.map((group) => (
            <View key={group.page}>
              <Text style={styles.pageTitle} minPresenceAhead={80}>
                {group.page}
              </Text>
              {group.items.map((item, i) => (
                <ItemBlock key={`${group.page}-${i}`} item={item} />
              ))}
            </View>
          ))}
        </View>
        <PdfPageFooter label={`Website feedback · ${props.clientName} · ${props.roundLabel}`} legalName={company.legalName} />
      </Page>
    </Document>
  )
}
