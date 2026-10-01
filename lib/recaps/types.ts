export interface RecapWorkItem {
  description: string
  category: string
}

export type RecapPlanKey = 'full' | 'basic' | 'none'

export interface RecapStatsTask {
  title: string
  category: string
  status: string
  hours: number
  isBillable: boolean
  projectName: string | null
}

export interface RecapStatsCategory {
  name: string
  tasks: number
  hours: number
}

export interface RecapStatsWeek {
  label: string
  hours: number
}

export interface RecapSavings {
  nonBillableHours: number
  hourlyRate: number
  amount: number
}

/** Frozen snapshot of a recap month, stored on monthly_recaps.stats. */
export interface RecapStats {
  version: 1
  tasksCompleted: number
  hoursLogged: number
  phasesCompleted: string[]
  categories: RecapStatsCategory[]
  tasks: RecapStatsTask[]
  weeklyHours: RecapStatsWeek[]
  plan: RecapPlanKey
  savings: RecapSavings | null
}
