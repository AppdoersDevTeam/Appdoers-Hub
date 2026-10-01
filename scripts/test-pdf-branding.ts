/**
 * Quick smoke test for PDF rendering — run with: npx tsx scripts/test-pdf-branding.ts
 */
import fs from 'fs'
import path from 'path'
import { renderInvoicePdfToBuffer } from '../lib/pdf/render-invoice-pdf'
import { renderProposalPdfToBuffer } from '../lib/pdf/render-proposal-pdf'
import { renderRecapPdfToBuffer } from '../lib/pdf/render-recap-pdf'
import { buildRecapStats } from '../lib/recaps/stats'
import { APPDOERS_BILLING_DEFAULTS, APPDOERS_COMPANY_DEFAULTS } from '../lib/pdf/company-defaults'

const outDir = path.join(process.cwd(), '.tmp-pdf-test')

async function main() {
  fs.mkdirSync(outDir, { recursive: true })

  const invoice = await renderInvoicePdfToBuffer({
    invoiceNumber: 'APD-TEST-001',
    status: 'sent',
    issueDate: '2026-06-01',
    dueDate: '2026-06-15',
    type: 'monthly',
    lines: [
      { description: 'Full Website — monthly hosting & support', quantity: 1, unit_price: 349, amount: 349 },
    ],
    subtotal: 303.48,
    gstAmount: 45.52,
    total: 349,
    notes: 'Thank you for your business.',
    paidAt: null,
    paymentReference: null,
    clientName: 'Test Client Ltd',
    contactName: 'Jane Smith',
    contactEmail: 'jane@testclient.co.nz',
    projectName: 'Website Project',
    company: {
      ...APPDOERS_COMPANY_DEFAULTS,
      gstNumber: '123-456-789',
    },
    billing: {
      ...APPDOERS_BILLING_DEFAULTS,
      bank_name: 'ANZ',
      account_name: 'Appdoers Limited',
      bank_account: '01-1234-5678901-00',
      invoice_footer: 'Please include the reference on your payment.',
    },
  })

  const proposal = await renderProposalPdfToBuffer({
    title: 'Website Build Quote',
    clientName: 'Test Client Ltd',
    contactName: 'Jane Smith',
    version: 1,
    catalog: [],
    sections: [
      {
        id: 'scope',
        title: 'Project Scope',
        content: 'We will design and build a **Full Website** for your organisation.',
      },
      {
        id: 'investment',
        title: 'Investment',
        content: '',
        pricing_items: [
          {
            name: 'Full Website',
            description: '12-month plan',
            setup_fee: 2999,
            monthly_fee: 349,
          },
        ],
      },
    ],
  })

  const recap = await renderRecapPdfToBuffer({
    clientName: 'Test Client Ltd',
    month: 6,
    year: 2026,
    introText: 'A productive month with several key deliverables completed.',
    workCompleted: [
      { description: 'Launched new homepage design', category: 'Design' },
      { description: 'Improved mobile page speed', category: 'Development' },
    ],
    performanceNotes: 'Site load time improved by 40%.',
    comingNext: 'Member portal rollout in July.',
    sentAt: '2026-06-25T10:00:00Z',
    stats: null,
  })

  const sampleTasks = [
    { id: 't1', title: 'New homepage hero and booking button', type: 'design', status: 'closed', isBillable: false, projectName: 'Website' },
    { id: 't2', title: 'Fix contact form not sending on mobile', type: 'bug', status: 'closed', isBillable: false, projectName: 'Website' },
    { id: 't3', title: 'Add online shop product filters', type: 'feature', status: 'awaiting_review', isBillable: true, projectName: 'Shop' },
    { id: 't4', title: 'Write About Us page copy', type: 'content', status: 'closed', isBillable: false, projectName: 'Website' },
    { id: 't5', title: 'Monthly check-in call', type: 'admin', status: 'closed', isBillable: false, projectName: 'Website' },
    { id: 't6', title: 'Speed up image loading', type: 'revision', status: 'in_progress', isBillable: false, projectName: 'Website' },
  ]
  const sampleEntries = [
    { taskId: 't1', hours: 4.5, date: '2026-06-03', isBillable: false },
    { taskId: 't2', hours: 1.5, date: '2026-06-09', isBillable: false },
    { taskId: 't3', hours: 6, date: '2026-06-12', isBillable: true },
    { taskId: 't4', hours: 2, date: '2026-06-18', isBillable: false },
    { taskId: 't5', hours: 0.75, date: '2026-06-22', isBillable: false },
    { taskId: 't6', hours: 3, date: '2026-06-29', isBillable: false },
    { taskId: null, hours: 1, date: '2026-06-15', isBillable: false },
  ]
  const recapFull = await renderRecapPdfToBuffer({
    clientName: 'Test Client Ltd',
    month: 6,
    year: 2026,
    introText:
      'Hi Sam,\n\nWhat a month! The new homepage is live and bookings are already easier for your customers.',
    workCompleted: [],
    performanceNotes: 'Mobile page speed improved from 72 to 91.',
    comingNext: "Here's what we're focusing on next:\n\n• Launch shop filters\n• Finish image speed-ups",
    sentAt: null,
    stats: buildRecapStats({
      month: 6,
      year: 2026,
      plan: 'full',
      tasksCompleted: 4,
      phasesCompleted: ['launch (Website)'],
      tasks: sampleTasks,
      entries: sampleEntries,
    }),
  })
  fs.writeFileSync(path.join(outDir, 'recap-full-test.pdf'), recapFull)

  fs.writeFileSync(path.join(outDir, 'invoice-test.pdf'), invoice)
  fs.writeFileSync(path.join(outDir, 'proposal-test.pdf'), proposal)
  fs.writeFileSync(path.join(outDir, 'recap-test.pdf'), recap)

  console.log('PDF smoke test passed — files written to', outDir)
  console.log('Sizes:', {
    invoice: invoice.length,
    proposal: proposal.length,
    recap: recap.length,
  })
}

main().catch((err) => {
  console.error('PDF smoke test failed:', err)
  process.exit(1)
})
