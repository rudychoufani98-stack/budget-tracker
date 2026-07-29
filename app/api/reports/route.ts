import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import { convertBySigningRate } from '@/lib/fx'

export async function GET(req: NextRequest) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const [tranches, invoices, invCurrencies, providers, auditRows, fxRes] = await Promise.all([
    supabaseAdmin.from('contract_tranches').select('*, contracts(contract_name, category, currency, fx_rate_at_signing, service_provider_id, service_providers(name))'),
    supabaseAdmin.from('invoices').select('*, contracts(currency, fx_rate_at_signing)').eq('status', 'approved'),
    supabaseAdmin.from('invoice_currency').select('invoice_id, currency'),
    supabaseAdmin.from('service_providers').select('*'),
    supabaseAdmin.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200),
    supabaseAdmin.from('exchange_rates').select('currency, rate').eq('base', 'USD'),
  ])

  // Live USD-based rates as fallback when a contract has no signing rate
  const fxRates: Record<string, number> = { USD: 1 }
  for (const row of fxRes.data || []) fxRates[row.currency] = row.rate

  const invCcyMap: Record<string, string> = {}
  for (const c of invCurrencies.data || []) invCcyMap[c.invoice_id] = c.currency

  // Convert a tranche amount to both NGN and USD using its contract's currency + signing rate
  function trancheBoth(t: any): { ngn: number; usd: number } {
    const c = t.contracts as Record<string, any>
    const ccy  = (c?.currency as string) || 'NGN'
    const rate = (c?.fx_rate_at_signing as number) || null
    const amt  = t.amount || 0
    return {
      ngn: convertBySigningRate(amt, ccy, 'NGN', rate, fxRates),
      usd: convertBySigningRate(amt, ccy, 'USD', rate, fxRates),
    }
  }

  // By provider (NGN + USD totals)
  const byProvider: Record<string, { name: string; contracted_ngn: number; contracted_usd: number; paid_ngn: number; paid_usd: number; count: number }> = {}
  for (const t of (tranches.data || [])) {
    const c = t.contracts as Record<string, unknown>
    const sp = c?.service_providers as Record<string, unknown>
    const provName = (sp?.name as string) || 'Unknown'
    if (!byProvider[provName]) byProvider[provName] = { name: provName, contracted_ngn: 0, contracted_usd: 0, paid_ngn: 0, paid_usd: 0, count: 0 }
    const both = trancheBoth(t)
    byProvider[provName].contracted_ngn += both.ngn
    byProvider[provName].contracted_usd += both.usd
    if (t.status === 'paid') { byProvider[provName].paid_ngn += both.ngn; byProvider[provName].paid_usd += both.usd }
    byProvider[provName].count++
  }

  // By category (NGN + USD totals)
  const byCategory: Record<string, { category: string; total_ngn: number; total_usd: number; paid_ngn: number; paid_usd: number }> = {}
  for (const t of (tranches.data || [])) {
    const c = t.contracts as Record<string, unknown>
    const cat = (c?.category as string) || 'Other'
    if (!byCategory[cat]) byCategory[cat] = { category: cat, total_ngn: 0, total_usd: 0, paid_ngn: 0, paid_usd: 0 }
    const both = trancheBoth(t)
    byCategory[cat].total_ngn += both.ngn
    byCategory[cat].total_usd += both.usd
    if (t.status === 'paid') { byCategory[cat].paid_ngn += both.ngn; byCategory[cat].paid_usd += both.usd }
  }

  // Convert an invoice amount to both NGN and USD using the invoice's own currency
  // (from invoice_currency), falling back to its contract's signing rate for NGN<->USD
  function invoiceBoth(inv: any, field: string): { ngn: number; usd: number } {
    const ccy  = invCcyMap[inv.id] || inv.currency || 'NGN'
    const rate = (inv.contracts as any)?.fx_rate_at_signing || null
    const amt  = inv[field] || 0
    return {
      ngn: convertBySigningRate(amt, ccy, 'NGN', rate, fxRates),
      usd: convertBySigningRate(amt, ccy, 'USD', rate, fxRates),
    }
  }

  // Monthly payments (last 12 months, from approved invoices)
  const monthly: Record<string, { ngn: number; usd: number }> = {}
  for (const inv of (invoices.data || [])) {
    const d = inv.invoice_date || inv.created_at
    if (!d) continue
    const key = d.slice(0, 7) // YYYY-MM
    if (!monthly[key]) monthly[key] = { ngn: 0, usd: 0 }
    const both = invoiceBoth(inv, 'amount_ttc')
    monthly[key].ngn += both.ngn
    monthly[key].usd += both.usd
  }
  const monthlyData = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
    .map(([month, v]) => ({ month, amount_ngn: v.ngn, amount_usd: v.usd }))

  // VAT summary (NGN + USD)
  const vat = { ht_ngn: 0, ht_usd: 0, tva_ngn: 0, tva_usd: 0, ttc_ngn: 0, ttc_usd: 0 }
  for (const inv of (invoices.data || [])) {
    const ht  = invoiceBoth(inv, 'amount_ht')
    const tva = invoiceBoth(inv, 'amount_tva')
    const ttc = invoiceBoth(inv, 'amount_ttc')
    vat.ht_ngn += ht.ngn;  vat.ht_usd += ht.usd
    vat.tva_ngn += tva.ngn; vat.tva_usd += tva.usd
    vat.ttc_ngn += ttc.ngn; vat.ttc_usd += ttc.usd
  }

  return NextResponse.json({
    byProvider:  Object.values(byProvider).sort((a, b) => b.contracted_ngn - a.contracted_ngn),
    byCategory:  Object.values(byCategory),
    monthlyData,
    vatSummary:  vat,
    auditLog:    auditRows.data || [],
  })
}
