import { NextRequest } from 'next/server'
import { handleDocumentUpload } from '@/lib/documents/http'

export async function POST(req: NextRequest) {
  return handleDocumentUpload(req, 'contract')
}
