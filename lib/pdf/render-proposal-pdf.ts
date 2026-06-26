import React from 'react'
import { ProposalPDFDocument } from '@/lib/proposals/proposal-pdf-document'
import type { ProposalSection } from '@/lib/proposals/proposal-pdf-document'
import type { ServiceCatalogEntry } from '@/lib/proposals/service-guide'
import { renderPdfToBuffer } from '@/lib/pdf/render-to-buffer'

export interface ProposalPdfRenderProps {
  title: string
  clientName: string
  contactName?: string | null
  sections: ProposalSection[]
  catalog: ServiceCatalogEntry[]
  version: number
}

export async function renderProposalPdfToBuffer(props: ProposalPdfRenderProps): Promise<Buffer> {
  return renderPdfToBuffer(React.createElement(ProposalPDFDocument, props))
}
