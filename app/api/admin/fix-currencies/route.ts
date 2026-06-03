import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireRole } from '@/lib/auth-guard'

// Admin-only: fix invoice currencies
export async function POST(req: NextRequest) {
  const deny = await requireRole(req, ['admin', 'rudy'])
  if (deny) return deny

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
