import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('exchange_rates')
    .select('currency, rate, fetched_at')
    .eq('base', 'USD')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rates: Record<string, number> = {}
  let fetchedAt = ''
  for (const row of data || []) {
    rates[row.currency] = row.rate
    if (!fetchedAt) fetchedAt = row.fetched_at
  }

  return NextResponse.json({ base: 'USD', rates, fetched_at: fetchedAt })
}