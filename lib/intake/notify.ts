import {
  buildSlackAlert,
  hubClientIntakeUrl,
  postToSlackChannel,
  sendToChannel,
  slackOpenHub,
} from '@/lib/slack'
import { moodById, paletteById, pairingById } from './brand-options'
import { tldLabel } from './domain-suggestions'
import { industryLabel } from '@/lib/industries'
import type { IntakeAnswers } from './types'

export async function notifyIntakeSubmitted(input: {
  clientId: string
  companyName: string
  slackChannelId: string | null
  answers: IntakeAnswers
  isUpdate: boolean
}) {
  const palette = paletteById(input.answers.brand.palette_id)
  const pairing = pairingById(input.answers.brand.pairing_id)
  const mood = moodById(input.answers.brand.mood_id)
  const domainStatus =
    input.answers.domain.status === 'own'
      ? `Owns ${input.answers.domain.domain_name || 'a domain'}`
      : input.answers.domain.status === 'buy'
        ? `Needs domain${input.answers.domain.domain_name ? ` (${input.answers.domain.domain_name})` : ''}`
        : 'Domain not sure yet'
  const domainTld =
    input.answers.domain.tld_preference !== 'unsure'
      ? ` · prefer ${tldLabel(input.answers.domain.tld_preference)}`
      : ''

  const colorLabel =
    input.answers.brand.color_mode === 'palette'
      ? palette?.name ?? 'Palette'
      : input.answers.brand.color_mode === 'custom'
        ? 'Custom colours'
        : 'Appdoers to choose'
  const fontLabel =
    input.answers.brand.font_mode === 'pairing'
      ? pairing?.name ?? 'Pairing'
      : input.answers.brand.font_mode === 'custom'
        ? `${input.answers.brand.custom_heading_font || 'Custom'} / ${input.answers.brand.custom_body_font || 'custom'}`
        : 'Appdoers to choose'
  const launch = input.answers.features.no_deadline ? 'No deadline' : input.answers.features.launch_date || 'Not set'

  const title = input.isUpdate
    ? `Intake updated — ${input.companyName}`
    : `Intake received — ${input.companyName}`
  const text = input.isUpdate
    ? `${input.companyName} updated their kickoff intake.`
    : `${input.companyName} submitted their kickoff intake.`

  const blocks = buildSlackAlert({
    text,
    title,
    fields: [
      { label: 'Domain', value: `${domainStatus}${domainTld}` },
      {
        label: 'Type',
        value: industryLabel(input.answers.people.company_type) ?? 'Not set',
      },
      {
        label: 'Plan',
        value:
          input.answers.features.plan_interest === 'full'
            ? 'Full Website'
            : input.answers.features.plan_interest === 'basic'
              ? 'Basic Website'
              : 'Not sure',
      },
      { label: 'Colours', value: colorLabel },
      { label: 'Fonts', value: fontLabel },
      { label: 'Style', value: mood?.name ?? 'Appdoers to choose' },
      { label: 'Launch', value: launch },
      {
        label: 'Logo',
        value: input.answers.brand.logo_path ? 'Uploaded' : input.answers.brand.logo_mode.replaceAll('_', ' '),
      },
    ],
    action: slackOpenHub(hubClientIntakeUrl(input.clientId)),
  })

  if (input.slackChannelId) {
    const posted = await postToSlackChannel(input.slackChannelId, text, blocks)
    if (posted.ok) return
  }

  await sendToChannel('general', text, blocks)
}
