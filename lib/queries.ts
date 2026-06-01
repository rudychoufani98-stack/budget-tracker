import { supabaseAdmin } from './supabase'
import type { ContractWithSpend, DashboardStats } from './types'

export async function getContracts(): Promise<ContractWithSpend[]> {
  const { data: contracts, error } = await supabaseAdmin
    .from('contracts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !contracts) return []

  const { data: approved } = await supabaseAdmin
    .from('invoices')
    .select('contract_id, amount_ttc')
    .eq('status', 'approved')
    .not('contract_id', 'is', null)

  const spendMap: Record<string, number> = {}
  for (const inv of approved || []) {
    if (inv.contract_id) {
      spendMap[inv.contract_id] = (spendMap[inv.contract_id] || 0) + (inv.amount_ttc || 0)
    }
  }

  return contracts.map((c) => ({ ...c, spent: spendMap[c.id] || 0 }))
}

export async function getContract(id: string) {
  const { data: contract, error } = await supabaseAdmin
    .from('contracts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !contract) return null

  const { data: invoices } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('contract_id', id)
    .order('created_at', { ascending: false })

  return { contract, invoices: invoices || [] }
}

export async function getInvoice(id: string) {
  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !invoice) return null

  const { data: lineItems } = await supabaseAdmin
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', id)

  const { data: validations } = await supabaseAdmin
    .from('validations')
    .select('*')
    .eq('invoice_id', id)
    .order('validated_at', { ascending: true })

  return { invoice, lineItems: lineItems || [], validations: validations || [] }
}

export async function getContractBudgets() {
  const { data: contracts } = await supabaseAdmin
    .from('contracts')
    .select('id, name, total_budget')
    .eq('status', 'active')
    .order('total_budget', { ascending: false })
    .limit(8)

  if (!contracts?.length) return []

  const { data: approved } = await supabaseAdmin
    .from('invoices')
    .select('contract_id, amount_ttc')
    .eq('status', 'approved')
    .not('contract_id', 'is', null)

  const spendMap: Record<string, number> = {}
  for (const inv of approved || []) {
    if (inv.contract_id)
      spendMap[inv.contract_id] = (spendMap[inv.contract_id] || 0) + (inv.amount_ttc || 0)
  }

  return contracts.map((c) => ({
    name: c.name,
    budget: c.total_budget,
    spent: spendMap[c.id] || 0,
  }))
}

export async function getRecentInvoices(limit = 5) {
  const { data } = await supabaseAdmin
    .from('invoices')
    .select('id, subcontractor_name, invoice_number, amount_ttc, status, submitted_at, invoice_date')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

export async function getPendingValidations() {
  const { data } = await supabaseAdmin
    .from('invoices')
    .select('id, subcontractor_name, invoice_number, amount_ttc, status, submitted_at')
    .in('status', ['pending_review', 'pending_placide', 'pending_dani'])
    .order('created_at', { ascending: false })
  return data || []
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data: contracts } = await supabaseAdmin
    .from('contracts')
    .select('total_budget')
    .eq('status', 'active')

  const totalBudget = contracts?.reduce((s, c) => s + c.total_budget, 0) || 0

  const { data: approvedInvoices } = await supabaseAdmin
    .from('invoices')
    .select('amount_ttc, amount_ht, amount_tva, subcontractor_name, submitted_at')
    .eq('status', 'approved')

  const totalSpent = approvedInvoices?.reduce((s, i) => s + (i.amount_ttc || 0), 0) || 0

  const { count: pendingRudy } = await supabaseAdmin
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending_review')

  const { count: pendingPlacide } = await supabaseAdmin
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending_placide')

  const { count: pendingHitech } = await supabaseAdmin
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending_dani')

  // Top 5 subcontractors by spend this year
  const yearStart = `${new Date().getFullYear()}-01-01`
  const { data: yearInvoices } = await supabaseAdmin
    .from('invoices')
    .select('subcontractor_name, amount_ttc')
    .eq('status', 'approved')
    .gte('submitted_at', yearStart)

  const spendBySub: Record<string, number> = {}
  for (const inv of yearInvoices || []) {
    const name = inv.subcontractor_name || 'Inconnu'
    spendBySub[name] = (spendBySub[name] || 0) + (inv.amount_ttc || 0)
  }
  const topSubcontractors = Object.entries(spendBySub)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount }))

  // Monthly spend — last 6 months
  const now = new Date()
  const monthlyMap: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleString('fr-FR', { month: 'short', year: '2-digit' })
    monthlyMap[key] = 0
  }
  for (const inv of approvedInvoices || []) {
    const d = new Date(inv.submitted_at)
    const key = d.toLocaleString('fr-FR', { month: 'short', year: '2-digit' })
    if (key in monthlyMap) monthlyMap[key] += inv.amount_ttc || 0
  }
  const monthlyData = Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount }))

  // VAT summary — current quarter
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
  const qInvoices = (approvedInvoices || []).filter((i) => new Date(i.submitted_at) >= qStart)
  const vatSummary = {
    totalHT: qInvoices.reduce((s, i) => s + (i.amount_ht || 0), 0),
    totalTVA: qInvoices.reduce((s, i) => s + (i.amount_tva || 0), 0),
    totalTTC: qInvoices.reduce((s, i) => s + (i.amount_ttc || 0), 0),
  }

  return {
    totalBudget,
    totalSpent,
    totalRemaining: totalBudget - totalSpent,
    pendingRudy: pendingRudy || 0,
    pendingPlacide: pendingPlacide || 0,
    pendingHitech: pendingHitech || 0,
    topSubcontractors,
    monthlyData,
    vatSummary,
  }
}
