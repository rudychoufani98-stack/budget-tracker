import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, requireRole } from '@/lib/auth-guard'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const body = await req.json()
  const { name, description } = body
  const { data, error } = await supabaseAdmin.from('outcomes').update({ name, description }).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireRole(_req, ['admin', 'rudy', 'placide'])
  if (deny) return deny
  await supabaseAdmin.from('contract_outcomes').delete().eq('outcome_id', params.id)
  const { error } = await supabaseAdmin.from('outcomes').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
