import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const { searchParams } = new URL(req.url)
  const project_id = searchParams.get('project_id')
  let query = supabaseAdmin.from('outcomes').select('*, contract_outcomes(contract_id, contracts(id, contract_name, contract_amount, currency, fx_rate_at_signing, status, service_providers(name)))')
  if (project_id) query = query.eq('project_id', project_id)
  const { data, error } = await query.order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const body = await req.json()
  const { name, description, project_id } = body
  const { data, error } = await supabaseAdmin.from('outcomes').insert({ name, description, project_id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
