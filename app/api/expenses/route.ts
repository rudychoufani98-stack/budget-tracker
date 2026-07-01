import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const projectId = req.nextUrl.searchParams.get('project_id')
  const type      = req.nextUrl.searchParams.get('type')
  let query = supabaseAdmin
    .from('expenses')
    .select('*, projects(id, name)')
    .order('expense_date', { ascending: false })
  if (projectId) query = query.eq('project_id', projectId)
  if (type)      query = query.eq('type', type)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const body = await req.json()
  const safe = {
    title:        String(body.title || '').slice(0, 255),
    submitted_by: String(body.submitted_by || '').slice(0, 100),
    category:     String(body.category || 'Other'),
    amount:       Number(body.amount) || 0,
    currency:     String(body.currency || 'NGN'),
    expense_date: body.expense_date || null,
    description:  body.description  || null,
    project_id:   body.project_id   || null,
    receipt_url:  body.receipt_url  || null,
    type:         ['esg','npa'].includes(body.type) ? body.type : 'staff',
    status:       'pending',
  }
  const { data, error } = await supabaseAdmin.from('expenses').insert(safe).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
