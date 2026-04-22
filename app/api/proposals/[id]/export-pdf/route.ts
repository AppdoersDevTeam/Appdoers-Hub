import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Document, Page, Text, View, StyleSheet, renderToBuffer, Font } from '@react-pdf/renderer'
import React from 'react'

const styles = StyleSheet.create({
  page: { padding: 60, fontFamily: 'Helvetica', fontSize: 11, color: '#1a1a1a' },
  coverPage: { padding: 60, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100%' },
  coverTitle: { fontSize: 28, fontFamily: 'Helvetica-Bold', marginBottom: 12, textAlign: 'center' },
  coverSubtitle: { fontSize: 14, color: '#555', marginBottom: 8, textAlign: 'center' },
  coverDate: { fontSize: 10, color: '#888', textAlign: 'center', marginTop: 24 },
  sectionTitle: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 10, marginTop: 24, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#ddd', borderBottomStyle: 'solid' },
  body: { lineHeight: 1.6, color: '#333', marginBottom: 12 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f5f5f5', borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderTopColor: '#ddd', borderLeftColor: '#ddd', borderRightColor: '#ddd', borderTopStyle: 'solid', borderLeftStyle: 'solid', borderRightStyle: 'solid' },
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderTopColor: '#ddd', borderLeftColor: '#ddd', borderRightColor: '#ddd', borderTopStyle: 'solid', borderLeftStyle: 'solid', borderRightStyle: 'solid' },
  tableFooter: { flexDirection: 'row', backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd', borderStyle: 'solid' },
  tableCell: { flex: 1, padding: 8, fontSize: 10 },
  tableCellRight: { flex: 1, padding: 8, fontSize: 10, textAlign: 'right' },
  tableCellBold: { flex: 1, padding: 8, fontSize: 10, fontFamily: 'Helvetica-Bold' },
  summaryRow: { flexDirection: 'row', marginTop: 16, gap: 12 },
  summaryCard: { flex: 1, padding: 12, backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderStyle: 'solid', borderRadius: 4 },
  summaryLabel: { fontSize: 9, color: '#888', marginBottom: 4 },
  summaryValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1a1a1a' },
  footer: { position: 'absolute', bottom: 40, left: 60, right: 60, borderTopWidth: 1, borderTopColor: '#ddd', borderTopStyle: 'solid', paddingTop: 8, textAlign: 'center', fontSize: 9, color: '#888' },
})

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

interface Section {
  id: string
  title: string
  content: string
  pricing_items?: { name: string; description: string; setup_fee: number; monthly_fee: number }[]
}

function ProposalPDF({ title, clientName, sections }: { title: string; clientName: string; sections: Section[] }) {
  const investmentSection = sections.find((s) => s.id === 'investment')
  const items = investmentSection?.pricing_items ?? []
  const totalSetup = items.reduce((sum, item) => sum + (item.setup_fee || 0), 0)
  const totalMonthly = items.reduce((sum, item) => sum + (item.monthly_fee || 0), 0)
  const date = new Date().toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric' })

  return React.createElement(
    Document,
    null,
    // Cover page
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(View, { style: styles.coverPage },
        React.createElement(Text, { style: styles.coverTitle }, title),
        React.createElement(Text, { style: styles.coverSubtitle }, `Prepared for ${clientName}`),
        React.createElement(Text, { style: styles.coverDate }, date),
      ),
      React.createElement(Text, { style: styles.footer }, 'Appdoers · appdoers.co.nz')
    ),
    // Content pages
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      ...sections
        .filter((s) => s.id !== 'cover')
        .map((section) => {
          if (section.id === 'investment') {
            return React.createElement(
              View,
              { key: section.id },
              React.createElement(Text, { style: styles.sectionTitle }, section.title),
              section.content ? React.createElement(Text, { style: styles.body }, section.content) : null,
              items.length > 0
                ? React.createElement(
                    View,
                    null,
                    // Table header
                    React.createElement(
                      View,
                      { style: styles.tableHeader },
                      React.createElement(Text, { style: styles.tableCellBold }, 'Service'),
                      React.createElement(Text, { style: styles.tableCell }, 'Description'),
                      React.createElement(Text, { style: styles.tableCellRight }, 'Setup'),
                      React.createElement(Text, { style: styles.tableCellRight }, 'Monthly'),
                    ),
                    // Rows
                    ...items.map((item, i) =>
                      React.createElement(
                        View,
                        { key: i, style: styles.tableRow },
                        React.createElement(Text, { style: styles.tableCellBold }, item.name),
                        React.createElement(Text, { style: styles.tableCell }, item.description || '—'),
                        React.createElement(Text, { style: styles.tableCellRight }, item.setup_fee > 0 ? formatCurrency(item.setup_fee) : '—'),
                        React.createElement(Text, { style: styles.tableCellRight }, item.monthly_fee > 0 ? `${formatCurrency(item.monthly_fee)}/mo` : '—'),
                      )
                    ),
                    // Footer
                    React.createElement(
                      View,
                      { style: styles.tableFooter },
                      React.createElement(Text, { style: { ...styles.tableCellBold, flex: 2 } }, 'Total'),
                      React.createElement(Text, { style: styles.tableCellRight }, formatCurrency(totalSetup)),
                      React.createElement(Text, { style: styles.tableCellRight }, `${formatCurrency(totalMonthly)}/mo`),
                    ),
                    // Summary
                    React.createElement(
                      View,
                      { style: styles.summaryRow },
                      React.createElement(View, { style: styles.summaryCard },
                        React.createElement(Text, { style: styles.summaryLabel }, 'Setup'),
                        React.createElement(Text, { style: styles.summaryValue }, formatCurrency(totalSetup)),
                      ),
                      React.createElement(View, { style: styles.summaryCard },
                        React.createElement(Text, { style: styles.summaryLabel }, 'Monthly'),
                        React.createElement(Text, { style: styles.summaryValue }, `${formatCurrency(totalMonthly)}/mo`),
                      ),
                      React.createElement(View, { style: { ...styles.summaryCard, backgroundColor: '#eff6ff', borderColor: '#93c5fd' } },
                        React.createElement(Text, { style: styles.summaryLabel }, 'Annual Value'),
                        React.createElement(Text, { style: { ...styles.summaryValue, color: '#2563eb' } }, formatCurrency(totalSetup + totalMonthly * 12)),
                      ),
                    )
                  )
                : null,
            )
          }

          return React.createElement(
            View,
            { key: section.id },
            React.createElement(Text, { style: styles.sectionTitle }, section.title),
            React.createElement(Text, { style: styles.body }, section.content || ''),
          )
        }),
      React.createElement(Text, { style: styles.footer }, 'Appdoers · appdoers.co.nz')
    )
  )
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: proposal } = await supabase
    .from('proposals')
    .select('*, clients(company_name)')
    .eq('id', id)
    .single()

  if (!proposal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const clientName = (proposal.clients as { company_name?: string } | null)?.company_name ?? 'Client'
  const sections: Section[] = proposal.sections ?? []

  try {
    const buffer = await renderToBuffer(
      React.createElement(ProposalPDF, { title: proposal.title, clientName, sections })
    )

    const filename = `${proposal.title.replace(/[^a-z0-9]/gi, '_')}_v${proposal.version}.pdf`
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
