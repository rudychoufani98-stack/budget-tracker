import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { writeAudit } from '@/lib/audit'
import { requireAuth, requireRole } from '@/lib/auth-guard'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireAuth(_req)
  if (deny) return deny
  const { data: contract } = await supabaseAdmin.from('contracts').select('*, service_providers(*), contract_tranches(id, tranche_name, amount, status, scheduled_date, paid_date, pop_reference, notes)').eq('id', params.id).single()
  if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const [{ data: invoices }, { data: currencies }] = await Promise.all([
    supabaseAdmin.from('invoices').select('id, invoice_number, subcontractor_name, invoice_date, amount_ht, amount_tva, amount_ttc, vat_rate, status, category, tranche_id, pdf_url, submitted_at, created_at').eq('contract_id', params.id).order('created_at', { ascending: false }),
    supabaseAdmin.from('invoice_currency').select('invoice_id, currency').in('invoice_id',
      (await supabaseAdmin.from('invoices').select('id').eq('contract_id', params.id)).data?.map((i:any) => i.id) || []
    ),
  ])
  const currencyMap: Record<string,string> = {}
  for (const c of currencies || []) currencyMap[c.invoice_id] = c.currency
  const invoicesWithCurrency = (invoices || []).map((inv: any) => ({
    ...inv, currency: currencyMap[inv.id] || inv.currency || 'NGN',
  }))
  return NextResponse.json({ ...contract, invoices: invoicesWithCurrency })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  // Only Rudy/admin/Placide can edit contracts
  const deny = await requireRole(req, ['admin', 'rudy', 'placide'])
  if (deny) return deny
  const body = await req.json()
  // Allowlist only safe fields — prevent mass assignment
  const safe = {
    contract_name:       body.contract_name,
    description:         body.description,
    contract_amount:     body.contract_amount,
    currency:            body.currency,
    category:            body.category,
    status:              body.status,
    start_date:          body.start_date,
    end_date:            body.end_date,
    payment_type:        body.payment_type,
    fx_rate_at_signing:  body.fx_rate_at_signing,
    service_provider_id: body.service_provider_id,
    project_id:          body.project_id,
    section_id:          body.section_id,
    updated_at:          new Date().toISOString(),
  }
  // Remove undefined keys
  const update = Object.fromEntries(Object.entries(safe).filter(([, v]) => v !== undefined))
  const { data, error } = await supabaseAdmin.from('contracts').update(update).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAudit('contract_updated', 'contract', params.id, null, update)
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  // Only Rudy/admin can delete contracts
  const deny = await requireRole(_req, ['admin', 'rudy'])
  if (deny) return deny
  await supabaseAdmin.from('contract_tranches').delete().eq('contract_id', params.id)
  const { error } = await supabaseAdmin.from('contracts').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
