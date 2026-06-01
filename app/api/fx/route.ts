import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const deny = await requireAuth(req)
  if (deny) return deny
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