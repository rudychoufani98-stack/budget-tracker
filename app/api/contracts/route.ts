import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const { data, error } = await supabaseAdmin
    .from('contracts')
    .select('*, service_providers(*), contract_tranches(*), projects(id, name), project_sections(id, name)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const body = await req.json()
  const { contract_name, client_name, service_provider_id, project, project_id, section_id, category,
          description, contract_amount, currency, start_date, end_date, status, notes, fx_rate_at_signing } = body
  if (!contract_name) return NextResponse.json({ error: 'Contract name required' }, { status: 400 })

  // Auto-fetch NGN/USD rate if not provided
  let signingRate = fx_rate_at_signing || null
  if (!signingRate) {
    try {
      const key = process.env.OPEN_EXCHANGE_RATES_KEY
      if (key) {
        const fxRes = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${key}&symbols=NGN`, { cache: 'no-store' })
        const fxData = await fxRes.json()
        signingRate = fxData.rates?.NGN || null
      }
    } catch { signingRate = null }
  }

  const { data, error } = await supabaseAdmin.from('contracts').insert({
    contract_name, client_name, service_provider_id,
    project, project_id: project_id || null, section_id: section_id || null, category,
    description, contract_amount: contract_amount || 0,
    total_budget: contract_amount || 0,
    currency: currency || 'NGN',
    start_date, end_date, status: status || 'active', notes,
    fx_rate_at_signing: signingRate,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}