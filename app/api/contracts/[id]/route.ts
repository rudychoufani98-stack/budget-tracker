import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { writeAudit } from '@/lib/audit'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireAuth(_req)
  if (deny) return deny
  const { data: contract } = await supabaseAdmin.from('contracts').select('*, service_providers(*), contract_tranches(*)').eq('id', params.id).single()
  if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const [{ data: invoices }, { data: currencies }] = await Promise.all([
    supabaseAdmin.from('invoices').select('*').eq('contract_id', params.id).order('created_at', { ascending: false }),
    supabaseAdmin.from('invoice_currency').select('invoice_id, currency'),
  ])
  const currencyMap: Record<string,string> = {}
  for (const c of currencies || []) currencyMap[c.invoice_id] = c.currency
  const invoicesWithCurrency = (invoices || []).map((inv: any) => ({
    ...inv, currency: currencyMap[inv.id] || inv.currency || 'NGN',
  }))
  return NextResponse.json({ ...contract, invoices: invoicesWithCurrency })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const body = await req.json()
  const { data, error } = await supabaseAdmin.from('contracts').update({ ...body, updated_at: new Date().toISOString() }).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAudit('contract_updated', 'contract', params.id, null, body)
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireAuth(_req)
  if (deny) return deny
  await supabaseAdmin.from('contract_tranches').delete().eq('contract_id', params.id)
  const { error } = await supabaseAdmin.from('contracts').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
