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

export interface RecapPreviousMonth {
  tasksCompleted: number
  hoursLogged: number
}

export interface RecapYearToDate {
  tasksCompleted: number
  hoursLogged: number
  /** Full plan only: non-billable hours this year x hourly rate. */
  savings: number | null
}

export interface RecapDomain {
  domain: string
  sslStatus: string | null
}

export interface RecapAccount {
  planName: string | null
  renewalDate: string | null
  monthsRemaining: number | null
  addOns: string[]
  domains: RecapDomain[]
}

export interface RecapTurnaround {
  /** Average hours from task creation to completion, for tasks completed in the month. */
  averageHours: number
  fastestHours: number
  fastestTitle: string
  count: number
}

export interface RecapTrendMonth {
  label: string
  hours: number
  tasks: number
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
  /** Previous calendar month totals; null when there was no activity to compare. */
  previous: RecapPreviousMonth | null
  /** 1 January to the end of the recap month. */
  ytd: RecapYearToDate | null
  account: RecapAccount | null
  turnaround: RecapTurnaround | null
  /** Last six months, oldest first, ending with the recap month. */
  trend: RecapTrendMonth[]
}
