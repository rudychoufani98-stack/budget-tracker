import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { Resend } from 'resend'
import type { InvoiceStatus } from '@/lib/types'

const resend = new Resend(process.env.RESEND_API_KEY)

// Maps each current status to the next status on approval
const nextStatusOnApproval: Record<string, InvoiceStatus> = {
  pending_review: 'pending_placide',
  pending_placide: 'pending_hitech',
  pending_hitech: 'approved',
}

// Who to notify when the invoice moves to each next stage
const notifyOnApproval: Record<string, { email: string; name: string }> = {
  pending_placide: {
    email: process.env.PLACIDE_EMAIL || '',
    name: 'Placide',
  },
  pending_hitech: {
    email: process.env.HITECH_EMAIL || '',
    name: 'Hitech',
  },
  approved: {
    email: process.env.RUDY_EMAIL || '',
    name: 'Rudy',
  },
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { decision, comment, validator_name } = await request.json()

    if (!decision || !validator_name) {
      return NextResponse.json(
        { error: 'decision and validator_name are required' },
        { status: 400 }
      )
    }

    // Fetch the invoice
    const { data: invoice, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Determine validator role from current status
    const roleMap: Record<string, string> = {
      pending_review: 'rudy',
      pending_placide: 'placide',
      pending_hitech: 'hitech',
    }
    const validator_role = roleMap[invoice.status]

    if (!validator_role) {
      return NextResponse.json(
        { error: 'Invoice is not in a state that can be validated' },
        { status: 400 }
      )
    }

    // Determine new status
    const newStatus: InvoiceStatus =
      decision === 'approved'
        ? nextStatusOnApproval[invoice.status]
        : 'rejected'

    // Update invoice status
    await supabaseAdmin
      .from('invoices')
      .update({ status: newStatus })
      .eq('id', params.id)

    // Record the validation
    await supabaseAdmin.from('validations').insert({
      invoice_id: params.id,
      validator_name,
      validator_role,
      decision,
      comment: comment || null,
      validated_at: new Date().toISOString(),
    })

    const invoiceLink = `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${params.id}`
    const subcontractor = invoice.subcontractor_name || 'sous-traitant'

    // Send email notifications
    if (decision === 'approved' && newStatus !== 'approved') {
      // Notify next validator
      const next = notifyOnApproval[newStatus]
      if (next.email) {
        await resend.emails.send({
          from: 'ESG Tracker <onboarding@resend.dev>',
          to: next.email,
          subject: `Facture en attente de votre validation — ${subcontractor}`,
          html: emailTemplate({
            title: `Action requise — ${next.name}`,
            body: `La facture de <strong>${subcontractor}</strong> a été approuvée par ${validator_name} et est maintenant en attente de votre validation.`,
            comment,
            link: invoiceLink,
            linkLabel: 'Valider la facture →',
          }),
        })
      }
    } else if (decision === 'approved' && newStatus === 'approved') {
      // Final approval — notify Rudy
      if (process.env.RUDY_EMAIL) {
        await resend.emails.send({
          from: 'ESG Tracker <onboarding@resend.dev>',
          to: process.env.RUDY_EMAIL,
          subject: `✓ Facture approuvée — ${subcontractor}`,
          html: emailTemplate({
            title: 'Facture approuvée définitivement',
            body: `La facture de <strong>${subcontractor}</strong> a reçu toutes les validations et est maintenant enregistrée dans le budget.`,
            comment,
            link: invoiceLink,
            linkLabel: 'Voir la facture →',
          }),
        })
      }
    } else if (decision === 'rejected') {
      // Notify Rudy of the rejection
      if (process.env.RUDY_EMAIL) {
        await resend.emails.send({
          from: 'ESG Tracker <onboarding@resend.dev>',
          to: process.env.RUDY_EMAIL,
          subject: `✗ Facture rejetée — ${subcontractor}`,
          html: emailTemplate({
            title: 'Facture rejetée',
            body: `La facture de <strong>${subcontractor}</strong> a été rejetée par ${validator_name}.`,
            comment,
            link: invoiceLink,
            linkLabel: 'Voir la facture →',
          }),
        })
      }
    }

    // Budget alert: if newly approved, check if contract reached 80%
    if (newStatus === 'approved' && invoice.contract_id) {
      await checkBudgetAlert(invoice.contract_id, invoice.amount_ttc || 0)
    }

    return NextResponse.json({ success: true, newStatus })
  } catch (error) {
    console.error('Validation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function checkBudgetAlert(contractId: string, newAmount: number) {
  const { data: contract } = await supabaseAdmin
    .from('contracts')
    .select('contract_name, total_budget, client_name')
    .eq('id', contractId)
    .single()

  if (!contract) return

  const { data: approved } = await supabaseAdmin
    .from('invoices')
    .select('amount_ttc')
    .eq('contract_id', contractId)
    .eq('status', 'approved')

  const totalSpent = (approved || []).reduce((s, i) => s + (i.amount_ttc || 0), 0)
  const pct = (totalSpent / contract.total_budget) * 100

  if (pct >= 80 && pct - (newAmount / contract.total_budget) * 100 < 80) {
    // Just crossed the 80% threshold — send alert
    if (process.env.RUDY_EMAIL) {
      await resend.emails.send({
        from: 'ESG Tracker <onboarding@resend.dev>',
        to: process.env.RUDY_EMAIL,
        subject: `⚠️ Alerte budget — ${contract.contract_name} à ${Math.round(pct)}%`,
        html: emailTemplate({
          title: `Alerte budget : ${Math.round(pct)}% consommé`,
          body: `Le contrat <strong>${contract.contract_name}</strong> (${contract.client_name}) a atteint <strong>${Math.round(pct)}%</strong> de son budget total.`,
          link: `${process.env.NEXT_PUBLIC_APP_URL}/contracts/${contractId}`,
          linkLabel: 'Voir le contrat →',
        }),
      })
    }
  }
}

function emailTemplate({
  title,
  body,
  comment,
  link,
  linkLabel,
}: {
  title: string
  body: string
  comment?: string
  link: string
  linkLabel: string
}) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1e3a5f;margin-bottom:8px">${title}</h2>
      <p style="color:#4b5563;margin-bottom:16px">${body}</p>
      ${
        comment
          ? `<div style="background:#f3f4f6;border-left:4px solid #d1d5db;padding:10px 14px;border-radius:4px;margin-bottom:16px">
               <p style="margin:0;color:#374151;font-style:italic">"${comment}"</p>
             </div>`
          : ''
      }
      <a href="${link}"
         style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
        ${linkLabel}
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:28px">ESG Budget Tracker — Skykapital</p>
    </div>
  `
}
