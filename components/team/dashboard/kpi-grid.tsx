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

interface Props {
  cards: KpiCardData[]
}

export function KpiGrid({ cards }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-8">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className={`hub-card flex flex-col gap-3 ${card.highlight ? 'border-l-4 border-l-red-500' : ''}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {card.label}
              </p>
              <div className={`rounded-md p-1.5 ${card.bg}`}>
                <Icon className={`h-3.5 w-3.5 ${card.color}`} />
              </div>
            </div>
            <p className="text-2xl font-semibold text-slate-900">{card.value}</p>
            {card.sub && <p className="text-xs text-slate-500">{card.sub}</p>}
          </div>
        )
      })}
    </div>
  )
}
