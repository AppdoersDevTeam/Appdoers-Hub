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

export interface BillingCycleSplit {
  cycle: string
  count: number
  monthlySpend: number
}

export interface FinanceAnalytics {
  // Cost side
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
  billingCycleSplit: BillingCycleSplit[]

  // Revenue side
  mrr: number
  yearlyRevenue: number
  payingClientCount: number
  avgRevenuePerPayingClient: number | null

  // Profit
  monthlyProfit: number
  yearlyProfit: number

  // Unit economics
  costPerPayingClient: number | null
  marginPerPayingClient: number | null
  grossMarginPercent: number | null
  toolCostAsPercentOfRevenue: number | null
}
