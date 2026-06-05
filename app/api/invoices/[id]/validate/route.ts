import { getApiUser, unauthorized, forbidden } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { writeAudit } from '@/lib/audit'
import type { InvoiceStatus } from '@/lib/types'

const nextStatusOnApproval: Record<string, InvoiceStatus> = {
  pending_review:  'pending_placide',
  pending_placide: 'pending_dani',
  pending_dani:    'pending_fares',
  pending_fares:   'approved',
}

// Which roles are allowed to act at each status
const allowedRoles: Record<string, string[]> = {
  pending_review:  ['rudy', 'admin'],
  pending_placide: ['placide', 'admin'],
  pending_dani:    ['hitech', 'dani', 'admin'],
  pending_fares:   ['fares', 'admin'],
}

// Display name for audit log (derived from session, not request body)
const roleDisplayName: Record<string, string> = {
  rudy: 'Rudy', admin: 'Rudy', placide: 'Placide', hitech: 'Dany', dani: 'Dany', fares: 'Accountant',
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const apiUser = await getApiUser(req)
  if (!apiUser) return unauthorized()

  try {
    const { decision, comment } = await req.json()
    if (!decision) return NextResponse.json({ error: 'decision is required' }, { status: 400 })

    const { data: invoice, error: fetchError } = await supabaseAdmin.from('invoices').select('*').eq('id', params.id).single()
    if (fetchError || !invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    // Enforce that the caller has the correct role for this step
    const allowed = allowedRoles[invoice.status] || []
    if (!allowed.includes(apiUser.role)) return forbidden()

    const validator_name = roleDisplayName[apiUser.role] || apiUser.name || apiUser.email
    const validator_role = apiUser.role

    const newStatus: InvoiceStatus = decision === 'approved' ? nextStatusOnApproval[invoice.status] : 'rejected'

    const { error: updateErr } = await supabaseAdmin.from('invoices').update({ status: newStatus }).eq('id', params.id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    await supabaseAdmin.from('validations').insert({
      invoice_id: params.id, validator_name, validator_role, decision,
      comment: comment || null, validated_at: new Date().toISOString(),
    })

    try { await writeAudit('invoice_validated', 'invoice', params.id, null, { decision, validator_name, validator_role, newStatus }) } catch {}

    // Auto-mark tranche as paid on final approval
    if (decision === 'approved' && newStatus === 'approved') {
      try {
        if (invoice.tranche_id) {
          await supabaseAdmin.from('contract_tranches')
            .update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] })
            .eq('id', invoice.tranche_id)
        }
        if (invoice.contract_id) await checkBudgetAlert(invoice.contract_id, invoice.amount_ttc || 0)
      } catch { /* non-blocking */ }
    }

    return NextResponse.json({ success: true, newStatus })
  } catch (err) {
    console.error('Validation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function checkBudgetAlert(contractId: string, newAmount: number) {
  const { data: contract } = await supabaseAdmin.from('contracts').select('contract_name, total_budget, contract_amount').eq('id', contractId).single()
  if (!contract) return
  const budget = contract.total_budget || contract.contract_amount || 0
  if (!budget) return
  const { data: approved } = await supabaseAdmin.from('invoices').select('amount_ttc').eq('contract_id', contractId).eq('status', 'approved')
  const totalSpent = (approved || []).reduce((s, i) => s + (i.amount_ttc || 0), 0)
  const pct = (totalSpent / budget) * 100
  const prevPct = ((totalSpent - newAmount) / budget) * 100
  void pct; void prevPct
}
