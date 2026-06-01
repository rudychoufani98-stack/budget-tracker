import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const [tranches, invoices, providers, auditRows] = await Promise.all([
    supabaseAdmin.from('contract_tranches').select('*, contracts(contract_name, category, service_provider_id, service_providers(name))'),
    supabaseAdmin.from('invoices').select('*').eq('status', 'approved'),
    supabaseAdmin.from('service_providers').select('*'),
    supabaseAdmin.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200),
  ])

  // By provider
  const byProvider: Record<string, { name: string; total_contracted: number; total_paid: number; count: number }> = {}
  for (const t of (tranches.data || [])) {
    const c = t.contracts as Record<string, unknown>
    const sp = c?.service_providers as Record<string, unknown>
    const provName = (sp?.name as string) || 'Unknown'
    if (!byProvider[provName]) byProvider[provName] = { name: provName, total_contracted: 0, total_paid: 0, count: 0 }
    byProvider[provName].total_contracted += t.amount || 0
    if (t.status === 'paid') byProvider[provName].total_paid += t.amount || 0
    byProvider[provName].count++
  }

  // By category
  const byCategory: Record<string, { category: string; total: number; paid: number }> = {}
  for (const t of (tranches.data || [])) {
    const c = t.contracts as Record<string, unknown>
    const cat = (c?.category as string) || 'Other'
    if (!byCategory[cat]) byCategory[cat] = { category: cat, total: 0, paid: 0 }
    byCategory[cat].total += t.amount || 0
    if (t.status === 'paid') byCategory[cat].paid += t.amount || 0
  }

  // Monthly payments (last 12 months, from approved invoices)
  const monthly: Record<string, number> = {}
  for (const inv of (invoices.data || [])) {
    const d = inv.invoice_date || inv.created_at
    if (!d) continue
    const key = d.slice(0, 7) // YYYY-MM
    monthly[key] = (monthly[key] || 0) + (inv.amount_ttc || 0)
  }
  const monthlyData = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, amount]) => ({ month, amount }))

  // VAT summary
  const totalHT  = (invoices.data || []).reduce((s, i) => s + (i.amount_ht  || 0), 0)
  const totalTVA = (invoices.data || []).reduce((s, i) => s + (i.amount_tva || 0), 0)
  const totalTTC = (invoices.data || []).reduce((s, i) => s + (i.amount_ttc || 0), 0)

  return NextResponse.json({
    byProvider:  Object.values(byProvider).sort((a, b) => b.total_contracted - a.total_contracted),
    byCategory:  Object.values(byCategory),
    monthlyData,
    vatSummary:  { totalHT, totalTVA, totalTTC },
    auditLog:    auditRows.data || [],
  })
}
