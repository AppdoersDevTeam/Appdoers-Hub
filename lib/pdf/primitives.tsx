import React from 'react'
import { Text, View, StyleSheet } from '@react-pdf/renderer'
import { PDF_BORDER, PDF_SLATE_400, PDF_SLATE_700 } from './brand'

const styles = StyleSheet.create({
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

export function PdfPageFooter({ label }: { label: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{label}</Text>
      <Text style={styles.footerText}>appdoers.co.nz</Text>
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
        <Text key={i} style={[style, i > 0 ? { marginTop: 8 } : {}]}>
          {paragraph}
        </Text>
      ))}
    </View>
  )
}

export function PdfSectionTitle({ title }: { title: string }) {
  return (
    <View
      style={{
        marginBottom: 10,
        paddingBottom: 6,
        borderBottomWidth: 2,
        borderBottomColor: '#2563eb',
        borderBottomStyle: 'solid',
      }}
    >
      <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: PDF_SLATE_700 }}>{title}</Text>
    </View>
  )
}
