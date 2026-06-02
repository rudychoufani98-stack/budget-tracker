import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// One-time fix: any invoice stored with currency=NGN but amount < 10,000
// is almost certainly a USD invoice (NGN amounts are always in millions range)
// Also fixes invoice #101 specifically which has $110,141 stored as NGN
export async function POST() {
  const { data: currencies } = await supabaseAdmin
    .from('invoice_currency')
    .select('invoice_id, currency')
    .eq('currency', 'NGN')

  if (!currencies?.length) return NextResponse.json({ fixed: 0 })

  const ids = currencies.map(c => c.invoice_id)

  const { data: invoices } = await supabaseAdmin
    .from('invoices')
    .select('id, invoice_number, amount_ttc')
    .in('id', ids)

  // NGN invoices should have amounts in the millions (1,000,000+)
  // If amount_ttc < 500,000 and currency=NGN, it's almost certainly USD
  const toFix = (invoices || []).filter(i => (i.amount_ttc || 0) < 500000)

  const results = []
  for (const inv of toFix) {
    const { error } = await supabaseAdmin
      .from('invoice_currency')
      .update({ currency: 'USD' })
      .eq('invoice_id', inv.id)
    results.push({ invoice_number: inv.invoice_number, amount_ttc: inv.amount_ttc, fixed: !error })
  }

  return NextResponse.json({ fixed: results.length, invoices: results })
}
