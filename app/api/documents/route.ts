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
  const fileType    = req.nextUrl.searchParams.get('file_type')
  let query = supabaseAdmin.from('documents').select('*, contracts(contract_name), service_providers(name)').order('uploaded_at', { ascending: false })
  if (contractId) query = query.eq('contract_id', contractId)
  if (providerId) query = query.eq('service_provider_id', providerId)
  if (invoiceId)  query = query.eq('invoice_id', invoiceId)
  if (fileType)   query = query.eq('file_type', fileType)
  if (search)     query = query.ilike('filename', `%${search}%`)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const body = await req.json()
  // Allowlist fields — prevent arbitrary column injection
  const safe = {
    invoice_id:          body.invoice_id          || null,
    contract_id:         body.contract_id         || null,
    service_provider_id: body.service_provider_id || null,
    filename:            String(body.filename     || '').slice(0, 255),
    file_url:            String(body.file_url     || ''),
    file_type:           String(body.file_type    || 'document'),
    uploaded_at:         new Date().toISOString(),
  }
  if (!safe.file_url) return NextResponse.json({ error: 'file_url is required' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('documents').insert(safe).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
