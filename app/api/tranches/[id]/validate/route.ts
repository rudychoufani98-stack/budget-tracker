import { getApiUser, unauthorized, forbidden } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { writeAudit } from '@/lib/audit'

const NEXT_STATUS: Record<string, string> = {
  pending_review:  'pending_placide',
  pending_placide: 'pending_dani',
  pending_dani:    'pending_fares',
  pending_fares:   'paid',
}

const allowedRoles: Record<string, string[]> = {
  pending_review:  ['rudy', 'admin'],
  pending_placide: ['placide', 'admin'],
  pending_dani:    ['hitech', 'admin'],
  pending_fares:   ['fares', 'admin'],
}

const roleDisplayName: Record<string, string> = {
  rudy: 'Rudy', admin: 'Rudy', placide: 'Placide', hitech: 'Dany', fares: 'Accountant',
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const apiUser = await getApiUser(req)
  if (!apiUser) return unauthorized()

  const { decision, comment } = await req.json()
  if (!decision) return NextResponse.json({ error: 'decision is required' }, { status: 400 })

  const { data: tranche, error: fetchErr } = await supabaseAdmin
    .from('contract_tranches').select('*').eq('id', params.id).single()
  if (fetchErr || !tranche) return NextResponse.json({ error: 'Tranche not found' }, { status: 404 })

  if (!NEXT_STATUS[tranche.status]) return NextResponse.json({ error: 'Tranche not in validation pipeline' }, { status: 400 })

  // Enforce correct role for this step
  const allowed = allowedRoles[tranche.status] || []
  if (!allowed.includes(apiUser.role)) return forbidden()

  const validator_name = roleDisplayName[apiUser.role] || apiUser.name || apiUser.email

  const newStatus = decision === 'approved' ? NEXT_STATUS[tranche.status] : 'scheduled'
  const extra = newStatus === 'paid' ? { paid_date: new Date().toISOString().split('T')[0] } : {}

  const { error: updateErr } = await supabaseAdmin
    .from('contract_tranches').update({ status: newStatus, ...extra }).eq('id', params.id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  try {
    await writeAudit('tranche_validated', 'tranche', params.id, null, { decision, validator_name, newStatus, comment: comment || null })
  } catch { /* non-blocking */ }

  return NextResponse.json({ success: true, newStatus })
}
