import { AppdoersLogo } from '@/components/brand/appdoers-logo'
import { IntakeForm } from '@/components/intake/intake-form'
import { createServiceClient } from '@/lib/supabase/server'
import { hashIntakeToken } from '@/lib/intake/token'
import { mergeIntakeAnswers } from '@/lib/intake/types'

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <AppdoersLogo variant="full" />
      <h1 className="mt-6 text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  )
}

export default async function PublicIntakePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const service = await createServiceClient()

  const { data: intake } = await service
    .from('client_intakes')
    .select('status, answers, clients(company_name, location, website)')
    .eq('token_hash', hashIntakeToken(token))
    .maybeSingle()

  if (!intake) {
    return (
      <Message
        title="Link not found"
        body="This intake link is invalid or has been replaced. Please ask Appdoers for a new one."
      />
    )
  }

  if (intake.status === 'locked') {
    return (
      <Message
        title="This form is closed"
        body="Thanks — Appdoers has locked this intake. If you need to make a change, get in touch with the team."
      />
    )
  }

  const client = Array.isArray(intake.clients) ? intake.clients[0] : intake.clients
  const answers = mergeIntakeAnswers(intake.answers)
  if (!answers.people.company_name) answers.people.company_name = client?.company_name ?? ''
  if (!answers.people.location) answers.people.location = client?.location ?? ''
  if (!answers.domain.current_site && client?.website) {
    answers.domain.current_site = client.website
    answers.domain.has_current_site = 'yes'
  }

  return (
    <IntakeForm
      token={token}
      initialAnswers={answers}
      alreadySubmitted={intake.status === 'submitted' || intake.status === 'updated'}
    />
  )
}
