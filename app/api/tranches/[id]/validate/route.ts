import { getApiUser, unauthorized } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { writeAudit } from '@/lib/audit'

const NEXT_STATUS: Record<string, string> = {
  pending_review:  'pending_placide',
  pending_placide: 'pending_dani',
  pending_dani:    'pending_fares',
  pending_fares:   'paid',
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const apiUser = await getApiUser(req)
  if (!apiUser) return unauthorized()

  const { decision, comment, validator_name } = await req.json()
  if (!decision || !validator_name) return NextResponse.json({ error: 'decision and validator_name are required' }, { status: 400 })

  const { data: tranche, error: fetchErr } = await supabaseAdmin
    .from('contract_tranches').select('*').eq('id', params.id).single()
  if (fetchErr || !tranche) return NextResponse.json({ error: 'Tranche not found' }, { status: 404 })

  if (!NEXT_STATUS[tranche.status]) return NextResponse.json({ error: 'Tranche not in validation pipeline' }, { status: 400 })

  const newStatus = decision === 'approved' ? NEXT_STATUS[tranche.status] : 'scheduled'
  const extra = newStatus === 'paid' ? { paid_date: new Date().toISOString().split('T')[0] } : {}

  const { error: updateErr } = await supabaseAdmin
    .from('contract_tranches').update({ status: newStatus, ...extra }).eq('id', params.id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  try {
    await writeAudit('tranche_validated', 'tranche', params.id, null, { decision, validator_name, newStatus })
  } catch { /* audit failure is non-blocking */ }

  return NextResponse.json({ success: true, newStatus })
}
