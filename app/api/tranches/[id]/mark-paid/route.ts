import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { writeAudit } from '@/lib/audit'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { pop_reference } = await req.json().catch(() => ({}))
  const { data, error } = await supabaseAdmin
    .from('contract_tranches')
    .update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0], pop_reference: pop_reference || null })
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAudit('tranche_paid', 'tranche', params.id, null, { pop_reference })
  return NextResponse.json(data)
}
