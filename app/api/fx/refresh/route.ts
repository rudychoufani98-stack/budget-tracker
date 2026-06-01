import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Currencies used in the app
const CURRENCIES = ['EUR','GBP','CHF','MAD','XOF','NGN','CAD','AED','JPY']

export async function GET() {
  const key = process.env.OPEN_EXCHANGE_RATES_KEY
  if (!key) return NextResponse.json({ error: 'Missing OPEN_EXCHANGE_RATES_KEY' }, { status: 500 })

  // Fetch latest rates — base is USD (free plan only supports USD base)
  const res = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${key}&symbols=${CURRENCIES.join(',')}`, { cache: 'no-store' })
  if (!res.ok) return NextResponse.json({ error: 'OXR fetch failed' }, { status: 502 })

  const data = await res.json()
  const rates: { base: string; currency: string; rate: number; fetched_at: string }[] = []
  const now = new Date().toISOString()

  for (const [currency, rate] of Object.entries(data.rates as Record<string, number>)) {
    rates.push({ base: 'USD', currency, rate, fetched_at: now })
  }
  // Also store USD itself as 1
  rates.push({ base: 'USD', currency: 'USD', rate: 1, fetched_at: now })

  const { error } = await supabaseAdmin
    .from('exchange_rates')
    .upsert(rates, { onConflict: 'base,currency' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, updated: rates.length, timestamp: now })
}