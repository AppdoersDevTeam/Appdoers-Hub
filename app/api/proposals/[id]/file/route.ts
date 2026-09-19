import { handleDocumentDownload } from '@/lib/documents/http'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return handleDocumentDownload(id, 'proposal')
}
