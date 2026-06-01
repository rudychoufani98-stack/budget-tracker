// ─── Enums ───────────────────────────────────────────────────────────────────

export type ContractStatus  = 'active' | 'completed' | 'cancelled'
export type TrancheStatus   = 'unpaid' | 'scheduled' | 'paid'
export type InvoiceStatus   = 'pending_review' | 'pending_placide' | 'pending_dani' | 'pending_fares' | 'approved' | 'rejected'
export type InvoiceCategory =
  | 'Subcontracting'
  | 'Consulting'
  | 'Travel'
  | 'Accommodation'
  | 'Meals'
  | 'Fuel & Transport'
  | 'Equipment'
  | 'Software & IT'
  | 'Security'
  | 'Logistics'
  | 'Communication'
  | 'Training'
  | 'Legal & Compliance'
  | 'Medical & Health'
  | 'Other'
export type ValidatorRole   = 'rudy' | 'placide' | 'dani' | 'fares'
export type ValidationDecision = 'approved' | 'rejected'
export type EsgCategory     = 'E' | 'S' | 'G' | 'Other'
export type TrancheName     = 'T1' | 'T2' | 'T3' | 'T4' | 'One-Shot'
export type FileType        = 'invoice' | 'proof_of_payment' | 'contract' | 'other'

// ─── Core entities ────────────────────────────────────────────────────────────

export interface ServiceProvider {
  id: string
  name: string
  email: string | null
  country: string | null
  category: string | null
  created_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  budget: number | null
  currency: string
  start_date: string | null
  end_date: string | null
  status: 'active' | 'completed' | 'on_hold'
  created_at: string
  updated_at: string | null
}

export interface Contract {
  id: string
  contract_name: string
  client_name: string
  service_provider_id: string | null
  project: string | null
  project_id: string | null
  category: EsgCategory | null
  description: string | null
  contract_amount: number | null
  total_budget: number | null
  currency: string
  start_date: string | null
  end_date: string | null
  status: ContractStatus
  notes: string | null
  created_at: string
  updated_at: string | null
}

export interface ContractTranche {
  id: string
  contract_id: string
  tranche_name: TrancheName
  amount: number
  scheduled_date: string | null
  paid_date: string | null
  status: TrancheStatus
  pop_reference: string | null
  invoice_id: string | null
  notes: string | null
  created_at: string
}

export interface Invoice {
  id: string
  contract_id: string | null
  service_provider_id: string | null
  tranche_id: string | null
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

export interface Document {
  id: string
  contract_id: string | null
  service_provider_id: string | null
  invoice_id: string | null
  filename: string
  file_url: string
  file_type: FileType | null
  uploaded_at: string
  uploaded_by: string | null
}

export interface AuditLog {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  actor: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export interface ContractWithStats extends Contract {
  tranches: ContractTranche[]
  total_committed: number
  total_paid: number
  total_scheduled: number
  total_unpaid: number
  payment_rate: number
  service_provider?: ServiceProvider | null
}

export interface ProviderWithStats extends ServiceProvider {
  contract_count: number
  total_contracted: number
  total_paid: number
  balance: number
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

export interface Alert {
  type: 'overdue_invoice' | 'upcoming_tranche' | 'no_invoice' | 'budget_80'
  message: string
  contract_id?: string
  invoice_id?: string
  tranche_id?: string
  days?: number
}

export type ContractType = 'ESG' | 'Deployment' | 'Other'
export interface ContractWithSpend extends Contract { spent: number }
