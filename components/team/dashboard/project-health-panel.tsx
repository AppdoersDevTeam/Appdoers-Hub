import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import { ActionPanel } from './action-panel'
import type { ProjectHealthItem } from '@/lib/dashboard/types'

interface Props {
  items: ProjectHealthItem[]
}

export function ProjectHealthPanel({ items }: Props) {
  return (
    <ActionPanel
      title="Over Budget"
      count={items.length}
      viewAllHref="/app/projects"
      borderAccent="border-l-orange-500"
      icon={<TrendingUp className="h-4 w-4 text-orange-600" />}
      emptyMessage="All projects within budget"
      isEmpty={items.length === 0}
    >
      {items.map((project) => (
        <div key={project.id} className="flex items-center justify-between py-2">
          <div className="min-w-0">
            <Link
              href="/app/projects"
              className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
            >
              {project.name}
            </Link>
            <p className="text-xs text-slate-500 mt-0.5">
              {project.clientName} · {project.loggedHours}h / {project.estimatedHours}h est.
            </p>
          </div>
          <span className="shrink-0 text-xs font-semibold text-orange-600">
            +{project.overByHours}h
          </span>
        </div>
      ))}
    </ActionPanel>
  )
}
