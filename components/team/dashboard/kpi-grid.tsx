import type { LucideIcon } from 'lucide-react'

export interface KpiCardData {
  label: string
  value: string
  sub?: string
  icon: LucideIcon
  color: string
  bg: string
  highlight?: boolean
}

interface SectionProps {
  title: string
  description?: string
  cards: KpiCardData[]
}

export function KpiSection({ title, description, cards }: SectionProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${
                card.highlight ? 'border-l-4 border-l-red-500' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`shrink-0 rounded-lg p-2.5 ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500">{card.label}</p>
                  <p className="mt-0.5 text-xl font-semibold tracking-tight text-slate-900">
                    {card.value}
                  </p>
                  {card.sub && (
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2">
                      {card.sub}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
