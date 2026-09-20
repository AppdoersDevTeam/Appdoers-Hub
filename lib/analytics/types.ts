export interface CategorySpend {
  category: string
  monthly: number
  yearly: number
  toolCount: number
  percentOfSpend: number
}

export interface TopToolByCost {
  id: string
  name: string
  category: string
  assignedTo: string
  monthly: number
  percentOfSpend: number
}

export interface FinanceAnalytics {
  monthlySpend: number
  yearlyProjected: number
  activeToolCount: number
  companyMonthlySpend: number
  clientMonthlySpend: number
  companyYearlySpend: number
  clientYearlySpend: number
  companyToolCount: number
  clientToolCount: number
  spendByCategory: CategorySpend[]
  topToolsByCost: TopToolByCost[]

  mrr: number
  projectedArr: number
  payingClientCount: number
  avgMrrPerPayingClient: number | null

  runRateAfterCompanyTools: number
  toolMarginPercent: number | null
}
