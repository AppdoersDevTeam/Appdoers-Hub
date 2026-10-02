import { AppdoersLogo } from '@/components/brand/appdoers-logo'
import { ReviewWizard } from '@/components/website-review/review-wizard'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTeamAccess } from '@/lib/supabase/route-access'
import { findReviewByToken, loadPublicReview } from '@/lib/website-review/public'
import { notifyReviewOpened } from '@/lib/website-review/notify'

export const dynamic = 'force-dynamic'

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <AppdoersLogo variant="full" />
      <h1 className="mt-6 text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-base text-slate-600">{body}</p>
    </div>
  )
}

export default async function PublicReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { token } = await params
  const { preview } = await searchParams
  const db = await createServiceClient()

  const raw = await findReviewByToken(db, token, { allowDraft: true })
  if (!raw) {
    return <Message title="Link not found" body="This review link is not valid any more. Please ask Appdoers for a new one." />
  }

  // Team members can preview any review (including drafts) without it counting as the client opening it.
  const team = preview === '1' || raw.status === 'draft' ? await requireTeamAccess() : null
  const isPreview = Boolean(team?.ok)
  if (raw.status === 'draft' && !isPreview) {
    return <Message title="Not ready yet" body="This review has not been sent yet. Appdoers will email you when it's ready." />
  }

  if (!isPreview && !raw.first_opened_at) {
    const { data: stamped } = await db
      .from('website_reviews')
      .update({ first_opened_at: new Date().toISOString() })
      .eq('id', raw.id)
      .is('first_opened_at', null)
      .select('id')
    const client = Array.isArray(raw.clients) ? raw.clients[0] : raw.clients
    if (stamped?.length) {
      try {
        await notifyReviewOpened({
          reviewId: raw.id,
          clientId: raw.client_id,
          companyName: client?.company_name ?? 'Client',
          roundNumber: raw.round_number,
          ownerId: raw.owner_id,
          createdBy: raw.created_by,
        })
      } catch (err) {
        console.error('[Website review] open notify failed:', err)
      }
    }
  }

  const review = await loadPublicReview(db, token, { allowDraft: isPreview })
  if (!review) return <Message title="Link not found" body="This review link is not valid any more." />

  return <ReviewWizard token={token} review={review} preview={isPreview} />
}
