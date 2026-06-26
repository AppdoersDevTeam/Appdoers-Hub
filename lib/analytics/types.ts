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
  monthly: number
  percentOfSpend: number
}

export interface BillingCycleSplit {
  cycle: 'monthly' | 'yearly'
  count: number
  monthlySpend: number
}

export interface FinanceAnalytics {
  // Cost side
  monthlySpend: number
  yearlyProjected: number
  activeToolCount: number
  spendByCategory: CategorySpend[]
  topToolsByCost: TopToolByCost[]
  billingCycleSplit: BillingCycleSplit[]

  // Revenue side
  mrr: number
  payingClientCount: number
  avgRevenuePerPayingClient: number | null

  // Unit economics
  costPerPayingClient: number | null
  marginPerPayingClient: number | null
  grossMarginPercent: number | null
  toolCostAsPercentOfRevenue: number | null

  // Invoice health
  outstandingTotal: number
  overdueTotal: number
  overdueCount: number
  paidThisMonth: number
}
