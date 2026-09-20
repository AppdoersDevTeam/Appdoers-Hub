'use client'

import { Input } from '@/components/ui/input'
import { ChoiceChip } from '@/components/intake/brand-pickers'
import { Field, FieldLabel } from '@/components/intake/field'
import type { IndustryId } from '@/lib/industries'
import type { IntakeProfileDetails, SellOnline } from '@/lib/intake/types'

export function IndustryDetailsFields({
  industry,
  profile,
  onChange,
}: {
  industry: IndustryId
  profile: IntakeProfileDetails
  onChange: (next: IntakeProfileDetails) => void
}) {
  const set = <K extends keyof IntakeProfileDetails>(key: K, value: IntakeProfileDetails[K]) =>
    onChange({ ...profile, [key]: value })

  if (industry === 'churches') {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Denomination / movement"
          help="Helps us use the right language and suggest pages churches like yours usually need."
        >
          <Input
            value={profile.denomination}
            onChange={(e) => set('denomination', e.target.value)}
            placeholder="Baptist, Pentecostal, independent…"
          />
        </Field>
        <Field
          label="Typical Sunday attendance"
          help="A rough size helps us recommend features like rosters, giving, and member tools."
        >
          <Input
            value={profile.congregation_size}
            onChange={(e) => set('congregation_size', e.target.value)}
            placeholder="e.g. 80–120"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field
            label="Service times"
            help="Often shown on the homepage and contact page so visitors know when to come."
          >
            <Input
              value={profile.service_times}
              onChange={(e) => set('service_times', e.target.value)}
              placeholder="Sunday 10am, Wednesday 7pm…"
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field
            label="YouTube channel (sermons)"
            help="If you share sermons online we can link or embed them on the site."
          >
            <Input
              value={profile.youtube_url}
              onChange={(e) => set('youtube_url', e.target.value)}
              placeholder="https://youtube.com/@yourchurch"
            />
          </Field>
        </div>
      </div>
    )
  }

  if (industry === 'schools') {
    return (
      <div className="space-y-3">
        <div>
          <p className="mb-2">
            <FieldLabel help="Tells us whether this is a school, charity, or community group so we suggest the right pages.">
              Organisation kind
            </FieldLabel>
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              ['school', 'School'],
              ['nonprofit', 'Nonprofit / charity'],
              ['community', 'Community group'],
            ].map(([id, label]) => (
              <ChoiceChip
                key={id}
                selected={profile.organisation_kind === id}
                onClick={() => set('organisation_kind', id)}
              >
                {label}
              </ChoiceChip>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Roll / member count"
            help="A rough size helps us recommend a Basic or Full website and the right features."
          >
            <Input
              value={profile.community_size}
              onChange={(e) => set('community_size', e.target.value)}
              placeholder="e.g. 40 families"
            />
          </Field>
          <Field
            label="YouTube"
            help="A channel we can link or embed if you share videos, assemblies, or talks."
          >
            <Input
              value={profile.youtube_url}
              onChange={(e) => set('youtube_url', e.target.value)}
              placeholder="https://youtube.com/…"
            />
          </Field>
        </div>
      </div>
    )
  }

  if (industry === 'shops') {
    return (
      <div className="space-y-3">
        <Field
          label="What you sell"
          help="So we can talk about your products in the right way and suggest shop pages if needed."
        >
          <Input
            value={profile.product_types}
            onChange={(e) => set('product_types', e.target.value)}
            placeholder="Apparel, parts, resources, food…"
          />
        </Field>
        <div>
          <p className="mb-2">
            <FieldLabel help="Tells us whether the site needs a shop, or just enquiries and a store locator.">
              Selling online today?
            </FieldLabel>
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['yes', 'Yes, we already sell online'],
                ['planning', 'Not yet — we want to'],
                ['no', 'Enquiries / in-store only'],
              ] as const
            ).map(([id, label]) => (
              <ChoiceChip
                key={id}
                selected={profile.sell_online === id}
                onClick={() => set('sell_online', id as SellOnline)}
              >
                {label}
              </ChoiceChip>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (industry === 'trades') {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Trade / service type"
          help="So we can name your service clearly on the site and pick trade-friendly pages."
        >
          <Input
            value={profile.trade_type}
            onChange={(e) => set('trade_type', e.target.value)}
            placeholder="Builder, plumber, cleaner, tutor…"
          />
        </Field>
        <Field
          label="Years operating"
          help="Useful for About copy — visitors often trust a business that has been around."
        >
          <Input
            value={profile.years_operating}
            onChange={(e) => set('years_operating', e.target.value)}
            placeholder="e.g. 12"
          />
        </Field>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field
        label="Years operating"
        help="Useful for About copy — visitors often trust a business that has been around."
      >
        <Input
          value={profile.years_operating}
          onChange={(e) => set('years_operating', e.target.value)}
          placeholder="e.g. 8"
        />
      </Field>
      <Field
        label="YouTube or resource channel"
        help="A channel we can link or embed if you share videos or resources."
      >
        <Input
          value={profile.youtube_url}
          onChange={(e) => set('youtube_url', e.target.value)}
          placeholder="https://youtube.com/…"
        />
      </Field>
    </div>
  )
}
