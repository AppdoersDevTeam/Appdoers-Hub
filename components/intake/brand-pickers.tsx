'use client'

import { cn } from '@/lib/utils/cn'
import { COLOR_PALETTES, FONT_PAIRINGS, STYLE_MOODS } from '@/lib/intake/brand-options'
import type { IntakeAnswers } from '@/lib/intake/types'
import { Field } from './field'

function CardButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border p-3 text-left transition-all',
        selected ? 'border-blue-600 ring-2 ring-blue-100 bg-white' : 'border-slate-200 bg-white hover:border-slate-300'
      )}
    >
      {children}
    </button>
  )
}

export function ChoiceChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        selected
          ? 'border-blue-600 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
      )}
    >
      {children}
    </button>
  )
}

export function ToggleChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-3 py-2 text-sm transition-colors',
        selected
          ? 'border-blue-600 bg-blue-50 text-blue-800'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
      )}
    >
      {children}
    </button>
  )
}

export function PalettePicker({
  answers,
  onChange,
}: {
  answers: IntakeAnswers
  onChange: (next: IntakeAnswers) => void
}) {
  const brand = answers.brand
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <ChoiceChip
          selected={brand.color_mode === 'unsure'}
          onClick={() => onChange({ ...answers, brand: { ...brand, color_mode: 'unsure', palette_id: null } })}
        >
          Not sure — happy for Appdoers to choose
        </ChoiceChip>
        <ChoiceChip
          selected={brand.color_mode === 'custom'}
          onClick={() => onChange({ ...answers, brand: { ...brand, color_mode: 'custom' } })}
        >
          I have my own colours
        </ChoiceChip>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {COLOR_PALETTES.map((palette) => (
          <CardButton
            key={palette.id}
            selected={brand.color_mode === 'palette' && brand.palette_id === palette.id}
            onClick={() =>
              onChange({ ...answers, brand: { ...brand, color_mode: 'palette', palette_id: palette.id } })
            }
          >
            <div className="mb-2 flex h-10 overflow-hidden rounded-lg">
              <span className="flex-1" style={{ background: palette.colors.primary }} />
              <span className="flex-1" style={{ background: palette.colors.secondary }} />
              <span className="flex-1" style={{ background: palette.colors.accent }} />
              <span className="flex-1" style={{ background: palette.colors.background }} />
            </div>
            <p className="text-sm font-medium text-slate-900">{palette.name}</p>
            <p className="text-xs text-slate-500">{palette.description}</p>
          </CardButton>
        ))}
      </div>
      {brand.color_mode === 'custom' && (
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          {(
            [
              ['primary', 'Primary'],
              ['secondary', 'Secondary'],
              ['accent', 'Accent'],
              ['background', 'Background'],
            ] as const
          ).map(([key, label]) => (
            <Field
              key={key}
              label={label}
              help={
                key === 'primary'
                  ? 'Your main brand colour — used for buttons, links, and key highlights.'
                  : key === 'secondary'
                    ? 'A supporting colour for headings, sections, or secondary buttons.'
                    : key === 'accent'
                      ? 'A contrast colour for calls to action or small highlights.'
                      : 'The page background. Usually a light cream, off-white, or dark base.'
              }
            >
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brand.custom_colors[key]}
                  onChange={(e) =>
                    onChange({
                      ...answers,
                      brand: {
                        ...brand,
                        custom_colors: { ...brand.custom_colors, [key]: e.target.value },
                      },
                    })
                  }
                  className="h-9 w-12 cursor-pointer rounded border border-slate-200 bg-white"
                />
                <input
                  value={brand.custom_colors[key]}
                  onChange={(e) =>
                    onChange({
                      ...answers,
                      brand: {
                        ...brand,
                        custom_colors: { ...brand.custom_colors, [key]: e.target.value },
                      },
                    })
                  }
                  className="hub-input font-mono text-xs"
                />
              </div>
            </Field>
          ))}
        </div>
      )}
    </div>
  )
}

export function FontPicker({
  answers,
  onChange,
}: {
  answers: IntakeAnswers
  onChange: (next: IntakeAnswers) => void
}) {
  const brand = answers.brand
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <ChoiceChip
          selected={brand.font_mode === 'unsure'}
          onClick={() => onChange({ ...answers, brand: { ...brand, font_mode: 'unsure', pairing_id: null } })}
        >
          Not sure — happy for Appdoers to choose
        </ChoiceChip>
        <ChoiceChip
          selected={brand.font_mode === 'custom'}
          onClick={() => onChange({ ...answers, brand: { ...brand, font_mode: 'custom' } })}
        >
          I have my own fonts
        </ChoiceChip>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FONT_PAIRINGS.map((pairing) => (
          <CardButton
            key={pairing.id}
            selected={brand.font_mode === 'pairing' && brand.pairing_id === pairing.id}
            onClick={() =>
              onChange({ ...answers, brand: { ...brand, font_mode: 'pairing', pairing_id: pairing.id } })
            }
          >
            <p className="text-lg text-slate-900" style={{ fontFamily: pairing.headingFamily }}>
              {pairing.heading}
            </p>
            <p className="mt-1 text-sm text-slate-600" style={{ fontFamily: pairing.bodyFamily }}>
              {pairing.body} — The quick brown fox.
            </p>
            <p className="mt-2 text-xs text-slate-500">{pairing.description}</p>
          </CardButton>
        ))}
      </div>
      {brand.font_mode === 'custom' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Heading font"
            help="The font for titles. If you already have brand fonts, type the name here."
          >
            <input
              className="hub-input"
              value={brand.custom_heading_font}
              onChange={(e) =>
                onChange({ ...answers, brand: { ...brand, custom_heading_font: e.target.value } })
              }
              placeholder="e.g. Georgia"
            />
          </Field>
          <Field
            label="Body font"
            help="The font for paragraphs and everyday text."
          >
            <input
              className="hub-input"
              value={brand.custom_body_font}
              onChange={(e) => onChange({ ...answers, brand: { ...brand, custom_body_font: e.target.value } })}
              placeholder="e.g. Helvetica"
            />
          </Field>
        </div>
      )}
    </div>
  )
}

export function MoodPicker({
  answers,
  onChange,
}: {
  answers: IntakeAnswers
  onChange: (next: IntakeAnswers) => void
}) {
  return (
    <div className="space-y-3">
      <ChoiceChip
        selected={answers.brand.mood_id === 'unsure'}
        onClick={() => onChange({ ...answers, brand: { ...answers.brand, mood_id: 'unsure' } })}
      >
        Not sure — happy for Appdoers to choose
      </ChoiceChip>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STYLE_MOODS.map((mood) => (
          <CardButton
            key={mood.id}
            selected={answers.brand.mood_id === mood.id}
            onClick={() => onChange({ ...answers, brand: { ...answers.brand, mood_id: mood.id } })}
          >
            <p className="text-sm font-medium text-slate-900">{mood.name}</p>
            <p className="mt-1 text-xs text-slate-500">{mood.description}</p>
          </CardButton>
        ))}
      </div>
    </div>
  )
}
