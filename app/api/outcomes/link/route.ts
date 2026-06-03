import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST: link or unlink a contract to an outcome
export async function POST(req: NextRequest) {
  const { contract_id, outcome_id, action } = await req.json()
  if (action === 'unlink') {
    const { error } = await supabaseAdmin.from('contract_outcomes').delete()
      .eq('contract_id', contract_id).eq('outcome_id', outcome_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }
  const { error } = await supabaseAdmin.from('contract_outcomes')
    .upsert({ contract_id, outcome_id }, { onConflict: 'contract_id,outcome_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
