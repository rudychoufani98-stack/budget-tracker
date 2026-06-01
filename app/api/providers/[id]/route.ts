import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireAuth(_req)
  if (deny) return deny
  const { data: provider } = await supabaseAdmin.from('service_providers').select('*').eq('id', params.id).single()
  if (!provider) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data: contracts } = await supabaseAdmin.from('contracts').select('*, contract_tranches(*)').eq('service_provider_id', params.id)
  const { data: invoices }  = await supabaseAdmin.from('invoices').select('*').eq('service_provider_id', params.id).order('created_at', { ascending: false })
  return NextResponse.json({ provider, contracts: contracts || [], invoices: invoices || [] })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const body = await req.json()
  const { data, error } = await supabaseAdmin.from('service_providers').update(body).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireAuth(_req)
  if (deny) return deny
  const { error } = await supabaseAdmin.from('service_providers').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
