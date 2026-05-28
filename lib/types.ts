export type ContractType = 'ESG' | 'Deployment' | 'Other'
export type ContractStatus = 'active' | 'closed'
export type InvoiceStatus =
  | 'pending_review'
  | 'pending_placide'
  | 'pending_hitech'
  | 'approved'
  | 'rejected'
export type InvoiceCategory =
  | 'Subcontracting'
  | 'Travel'
  | 'Accommodation'
  | 'Meals'
  | 'Equipment'
  | 'Other'
export type ValidatorRole = 'rudy' | 'placide' | 'hitech'
export type ValidationDecision = 'approved' | 'rejected'

export interface Contract {
  id: string
  contract_name: string
  client_name: string
  contract_type: ContractType
  total_budget: number
  currency: string
  start_date: string
  end_date: string
  status: ContractStatus
  created_at: string
}

export interface ContractWithSpend extends Contract {
  spent: number
}

export interface Invoice {
  id: string
  contract_id: string | null
  subcontractor_name: string | null
  invoice_number: string | null
  invoice_date: string | null
  currency: string | null
  amount_ht: number | null
  amount_tva: number | null
  amount_ttc: number | null
  vat_rate: number | null
  category: InvoiceCategory | null
  description: string | null
  pdf_url: string | null
  status: InvoiceStatus
  submitted_at: string
  created_at: string
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  description: string | null
  quantity: number | null
  unit_price: number | null
  total_ht: number | null
  vat_rate: number | null
  total_ttc: number | null
}

export interface Validation {
  id: string
  invoice_id: string
  validator_name: string
  validator_role: ValidatorRole
  decision: ValidationDecision
  comment: string | null
  validated_at: string
}

export interface DashboardStats {
  totalBudget: number
  totalSpent: number
  totalRemaining: number
  pendingRudy: number
  pendingPlacide: number
  pendingHitech: number
  topSubcontractors: { name: string; amount: number }[]
  monthlyData: { month: string; amount: number }[]
  vatSummary: { totalHT: number; totalTVA: number; totalTTC: number }
}
