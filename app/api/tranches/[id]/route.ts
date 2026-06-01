import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { writeAudit } from '@/lib/audit'
import { requireAuth } from '@/lib/auth-guard'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const body = await req.json()
  if (body.scheduled_date && !body.status) body.status = 'scheduled'
  const { data, error } = await supabaseAdmin.from('contract_tranches').update(body).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAudit('tranche_updated', 'tranche', params.id, null, body)
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireAuth(_req)
  if (deny) return deny
  const { error } = await supabaseAdmin.from('contract_tranches').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
