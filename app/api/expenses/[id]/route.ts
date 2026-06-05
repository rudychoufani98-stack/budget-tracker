import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, requireRole } from '@/lib/auth-guard'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const body = await req.json()
  const safe: Record<string, any> = {}
  if (body.title        !== undefined) safe.title        = String(body.title).slice(0, 255)
  if (body.submitted_by !== undefined) safe.submitted_by = String(body.submitted_by).slice(0, 100)
  if (body.category     !== undefined) safe.category     = body.category
  if (body.amount       !== undefined) safe.amount       = Number(body.amount)
  if (body.currency     !== undefined) safe.currency     = body.currency
  if (body.expense_date !== undefined) safe.expense_date = body.expense_date || null
  if (body.description  !== undefined) safe.description  = body.description  || null
  if (body.project_id   !== undefined) safe.project_id   = body.project_id   || null
  if (body.receipt_url  !== undefined) safe.receipt_url  = body.receipt_url  || null
  if (body.status       !== undefined) safe.status       = body.status
  const { data, error } = await supabaseAdmin.from('expenses').update(safe).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireRole(_req, ['admin', 'rudy', 'placide'])
  if (deny) return deny
  const { error } = await supabaseAdmin.from('expenses').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
