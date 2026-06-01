import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { writeAudit } from '@/lib/audit'
import { sendValidationEmail, sendRejectionEmail, sendFinalApprovalEmail, sendBudgetAlertEmail } from '@/lib/email'
import type { InvoiceStatus } from '@/lib/types'

const nextStatusOnApproval: Record<string, InvoiceStatus> = {
  pending_review:  'pending_placide',
  pending_placide: 'pending_dani',
  pending_dani:    'pending_fares',
  pending_fares:   'approved',
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { decision, comment, validator_name } = await req.json()
    if (!decision || !validator_name) return NextResponse.json({ error: 'decision and validator_name are required' }, { status: 400 })

    const { data: invoice, error: fetchError } = await supabaseAdmin.from('invoices').select('*').eq('id', params.id).single()
    if (fetchError || !invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    const roleMap: Record<string, string> = { pending_review: 'rudy', pending_placide: 'placide', pending_dani: 'dani', pending_fares: 'fares' }
    const validator_role = roleMap[invoice.status]
    if (!validator_role) return NextResponse.json({ error: 'Invoice cannot be validated in its current state' }, { status: 400 })

    const newStatus: InvoiceStatus = decision === 'approved' ? nextStatusOnApproval[invoice.status] : 'rejected'

    await supabaseAdmin.from('invoices').update({ status: newStatus }).eq('id', params.id)
    await supabaseAdmin.from('validations').insert({ invoice_id: params.id, validator_name, validator_role, decision, comment: comment || null, validated_at: new Date().toISOString() })
    await writeAudit('invoice_validated', 'invoice', params.id, null, { decision, validator_name, validator_role, newStatus })

    const sub = invoice.subcontractor_name || 'Unknown'
    if (decision === 'approved') {
      if (newStatus !== 'approved') await sendValidationEmail(params.id, sub, newStatus, validator_name, comment)
      else {
        await sendFinalApprovalEmail(params.id, sub)
        // Mark linked tranche as paid if set
        if (invoice.tranche_id) {
          await supabaseAdmin.from('contract_tranches').update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] }).eq('id', invoice.tranche_id)
        }
        // Budget alert check
        if (invoice.contract_id) await checkBudgetAlert(invoice.contract_id, invoice.amount_ttc || 0)
      }
    } else {
      await sendRejectionEmail(params.id, sub, validator_name, comment)
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
  if (pct >= 80 && prevPct < 80) await sendBudgetAlertEmail(contractId, contract.contract_name, pct)
}
