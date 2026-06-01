import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const contractId  = req.nextUrl.searchParams.get('contract_id')
  const providerId  = req.nextUrl.searchParams.get('provider_id')
  const invoiceId   = req.nextUrl.searchParams.get('invoice_id')
  const search      = req.nextUrl.searchParams.get('search')
  let query = supabaseAdmin.from('documents').select('*, contracts(contract_name), service_providers(name)').order('uploaded_at', { ascending: false })
  if (contractId) query = query.eq('contract_id', contractId)
  if (providerId) query = query.eq('service_provider_id', providerId)
  if (invoiceId)  query = query.eq('invoice_id', invoiceId)
  if (search)     query = query.ilike('filename', `%${search}%`)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const body = await req.json()
  const { data, error } = await supabaseAdmin.from('documents').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
