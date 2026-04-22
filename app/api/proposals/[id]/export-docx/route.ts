import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ShadingType,
} from 'docx'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

interface Section {
  id: string
  title: string
  content: string
  pricing_items?: { name: string; description: string; setup_fee: number; monthly_fee: number }[]
}

function noBorder() {
  return { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
}

function buildDocx(title: string, clientName: string, sections: Section[]) {
  const investmentSection = sections.find((s) => s.id === 'investment')
  const items = investmentSection?.pricing_items ?? []
  const totalSetup = items.reduce((sum, item) => sum + (item.setup_fee || 0), 0)
  const totalMonthly = items.reduce((sum, item) => sum + (item.monthly_fee || 0), 0)
  const date = new Date().toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric' })

  const children: (Paragraph | Table)[] = []

  // Cover
  children.push(
    new Paragraph({ text: title, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
    new Paragraph({ children: [new TextRun({ text: `Prepared for ${clientName}`, size: 28, color: '555555' })], alignment: AlignmentType.CENTER }),
    new Paragraph({ children: [new TextRun({ text: date, size: 20, color: '888888' })], alignment: AlignmentType.CENTER }),
    new Paragraph({ text: '' }),
    new Paragraph({ text: '' }),
  )

  for (const section of sections) {
    if (section.id === 'cover') continue

    // Section heading
    children.push(
      new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1 }),
    )

    if (section.id === 'investment') {
      if (section.content) {
        children.push(new Paragraph({ text: section.content }))
      }

      if (items.length > 0) {
        // Pricing table
        const headerRow = new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Service', bold: true })] })], shading: { type: ShadingType.SOLID, color: 'F5F5F5' } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Description', bold: true })] })], shading: { type: ShadingType.SOLID, color: 'F5F5F5' } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Setup', bold: true })], alignment: AlignmentType.RIGHT })], shading: { type: ShadingType.SOLID, color: 'F5F5F5' } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Monthly', bold: true })], alignment: AlignmentType.RIGHT })], shading: { type: ShadingType.SOLID, color: 'F5F5F5' } }),
          ],
        })

        const dataRows = items.map(
          (item) =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.name, bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ text: item.description || '—' })] }),
                new TableCell({ children: [new Paragraph({ text: item.setup_fee > 0 ? formatCurrency(item.setup_fee) : '—', alignment: AlignmentType.RIGHT })] }),
                new TableCell({ children: [new Paragraph({ text: item.monthly_fee > 0 ? `${formatCurrency(item.monthly_fee)}/mo` : '—', alignment: AlignmentType.RIGHT })] }),
              ],
            })
        )

        const footerRow = new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total Investment', bold: true })] })], columnSpan: 2, shading: { type: ShadingType.SOLID, color: 'F5F5F5' } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(totalSetup), bold: true })], alignment: AlignmentType.RIGHT })], shading: { type: ShadingType.SOLID, color: 'F5F5F5' } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${formatCurrency(totalMonthly)}/mo`, bold: true })], alignment: AlignmentType.RIGHT })], shading: { type: ShadingType.SOLID, color: 'F5F5F5' } }),
          ],
        })

        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows, footerRow],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: `Setup: ${formatCurrency(totalSetup)}  |  Monthly: ${formatCurrency(totalMonthly)}/mo  |  Annual Value: ${formatCurrency(totalSetup + totalMonthly * 12)}`, bold: true })] }),
        )
      }
    } else {
      if (section.content) {
        // Split by newlines for multi-paragraph content
        const paragraphs = section.content.split('\n')
        for (const para of paragraphs) {
          children.push(new Paragraph({ text: para || '' }))
        }
      }
    }

    children.push(new Paragraph({ text: '' }))
  }

  // Footer
  children.push(
    new Paragraph({ text: '' }),
    new Paragraph({
      children: [new TextRun({ text: 'Appdoers · appdoers.co.nz', color: '888888', size: 18 })],
      alignment: AlignmentType.CENTER,
    }),
  )

  return new Document({
    sections: [{ children }],
    creator: 'Appdoers Hub',
    title,
    description: `Proposal for ${clientName}`,
  })
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
    const doc = buildDocx(proposal.title, clientName, sections)
    const buffer = await Packer.toBuffer(doc)
    const filename = `${proposal.title.replace(/[^a-z0-9]/gi, '_')}_v${proposal.version}.docx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('DOCX generation error:', err)
    return NextResponse.json({ error: 'DOCX generation failed' }, { status: 500 })
  }
}
