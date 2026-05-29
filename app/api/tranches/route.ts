import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const contractId = req.nextUrl.searchParams.get('contract_id')
  let query = supabaseAdmin.from('contract_tranches').select('*').order('tranche_name')
  if (contractId) query = query.eq('contract_id', contractId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { contract_id, tranche_name, amount, scheduled_date, notes } = body
  if (!contract_id || !tranche_name) return NextResponse.json({ error: 'contract_id and tranche_name required' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('contract_tranches').insert({
    contract_id, tranche_name, amount: amount || 0,
    scheduled_date: scheduled_date || null,
    status: scheduled_date ? 'scheduled' : 'unpaid',
    notes,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
