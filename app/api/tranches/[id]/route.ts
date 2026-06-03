import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { writeAudit } from '@/lib/audit'
import { requireAuth, requireRole } from '@/lib/auth-guard'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const body = await req.json()
  // Allowlist safe fields only — prevent mass assignment
  const safe: Record<string, any> = {}
  if (body.tranche_name   !== undefined) safe.tranche_name   = body.tranche_name
  if (body.amount         !== undefined) safe.amount         = Number(body.amount)
  if (body.scheduled_date !== undefined) safe.scheduled_date = body.scheduled_date || null
  if (body.notes          !== undefined) safe.notes          = body.notes || null
  if (body.status         !== undefined) safe.status         = body.status
  if (body.pop_reference  !== undefined) safe.pop_reference  = body.pop_reference || null
  // Auto-set scheduled if a date is provided and tranche isn't paid
  if (safe.scheduled_date && !safe.status) {
    const { data: existing } = await supabaseAdmin.from('contract_tranches').select('status').eq('id', params.id).single()
    if (existing && existing.status !== 'paid') safe.status = 'scheduled'
  }
  const { data, error } = await supabaseAdmin.from('contract_tranches').update(safe).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAudit('tranche_updated', 'tranche', params.id, null, safe)
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireRole(_req, ['admin', 'rudy', 'placide'])
  if (deny) return deny
  const { error } = await supabaseAdmin.from('contract_tranches').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
