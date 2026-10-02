import React from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { registerPdfFonts } from '@/lib/pdf/fonts'
import { renderPdfToBuffer } from '@/lib/pdf/render-to-buffer'
import { DOCUMENT_BUCKET } from '@/lib/documents'
import { readImageSize } from './image-size'
import { ReviewRecordPDFDocument, type RecordImage, type ReviewRecordItem } from './record-pdf-document'
import { countReview, normalizeItemRow, reviewStoragePrefix, roundLabel } from './types'

type RecordResult = { ok: true; clientId: string; fileId: string } | { ok: false; error: string }

async function loadImage(db: SupabaseClient, path: string | null): Promise<RecordImage | null> {
  if (!path) return null
  const { data } = await db.storage.from(DOCUMENT_BUCKET).download(path)
  if (!data) return null
  const buf = Buffer.from(await data.arrayBuffer())
  const size = readImageSize(buf)
  return size ? { data: buf, ...size } : null
}

/** Renders the submitted review as a dated PDF and stores it in the client's files ("website_reviews" folder). */
export async function generateReviewRecordPdf(
  db: SupabaseClient,
  reviewId: string,
  performedBy: string | null
): Promise<RecordResult> {
  const { data: review } = await db
    .from('website_reviews')
    .select('id, client_id, project_id, round_number, staging_url, general_notes, submitted_at, submitted_by_name, clients(company_name)')
    .eq('id', reviewId)
    .single()
  if (!review) return { ok: false, error: 'Review not found' }
  if (!review.submitted_at) return { ok: false, error: 'The client has not sent this review yet.' }

  const { data: rawItems } = await db.from('website_review_items').select('*').eq('review_id', reviewId).order('sort_order')
  const items = (rawItems ?? []).map((row) => normalizeItemRow(row as Record<string, unknown>))

  const recordItems: ReviewRecordItem[] = []
  for (const item of items) {
    const hasMobilePins = item.pins.some((p) => p.view === 'mobile')
    recordItems.push({
      page_name: item.page_name,
      section_name: item.section_name,
      kind: item.kind,
      team_note: item.team_note,
      client_status: item.client_status,
      client_comment: item.client_comment,
      pins: item.pins,
      attachments: item.client_attachments.map((a) => a.name),
      desktop: await loadImage(db, item.screenshot_path),
      mobile: hasMobilePins || !item.screenshot_path ? await loadImage(db, item.screenshot_mobile_path) : null,
    })
  }

  const client = Array.isArray(review.clients) ? review.clients[0] : review.clients
  const clientName = client?.company_name ?? 'Client'
  const submitted = new Date(review.submitted_at)
  const label = roundLabel(review.round_number)

  registerPdfFonts()
  const buffer = await renderPdfToBuffer(
    React.createElement(ReviewRecordPDFDocument, {
      clientName,
      roundLabel: label,
      submittedAt: submitted.toLocaleString('en-NZ', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Pacific/Auckland' }),
      submittedBy: review.submitted_by_name,
      stagingUrl: review.staging_url,
      generalNotes: review.general_notes,
      counts: countReview(items),
      items: recordItems,
    })
  )

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const storagePath = `${reviewStoragePrefix(review.client_id, reviewId)}records/${stamp}.pdf`
  const { error: uploadError } = await db.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false })
  if (uploadError) return { ok: false, error: uploadError.message }

  const datePart = submitted.toISOString().slice(0, 10)
  const { data: file, error: fileError } = await db
    .from('files')
    .insert({
      client_id: review.client_id,
      project_id: review.project_id,
      name: `Website feedback - Round ${review.round_number} - ${datePart}.pdf`,
      storage_path: storagePath,
      size: buffer.length,
      mime_type: 'application/pdf',
      folder: 'website_reviews',
      is_client_visible: false,
      uploaded_by: performedBy,
    })
    .select('id')
    .single()
  if (fileError || !file) return { ok: false, error: fileError?.message ?? 'Could not save the PDF record' }

  await db.from('website_reviews').update({ record_file_id: file.id }).eq('id', reviewId)
  return { ok: true, clientId: review.client_id, fileId: file.id }
}
