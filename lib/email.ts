import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = 'ESG Tracker <onboarding@resend.dev>'
const APP    = process.env.NEXT_PUBLIC_APP_URL || ''

function tpl({ title, body, comment, link, linkLabel }: {
  title: string; body: string; comment?: string; link: string; linkLabel: string
}) {
  return `
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0A0F1E;color:#F9FAFB;border-radius:12px">
    <div style="background:#111827;border-radius:8px;padding:24px">
      <h2 style="color:#F9FAFB;margin:0 0 8px">${title}</h2>
      <p style="color:#9CA3AF;margin:0 0 16px">${body}</p>
      ${comment ? `<div style="background:#1F2937;border-left:3px solid #3B82F6;padding:10px 14px;border-radius:4px;margin-bottom:16px"><p style="margin:0;color:#D1D5DB;font-style:italic">"${comment}"</p></div>` : ''}
      <a href="${link}" style="display:inline-block;background:#3B82F6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;font-size:14px">${linkLabel}</a>
    </div>
    <p style="color:#4B5563;font-size:12px;margin-top:20px;text-align:center">ESG Budget Tracker — SkyKapital Europe</p>
  </div>`
}

export async function sendNewInvoiceEmail(invoiceId: string, subcontractor: string) {
  if (!process.env.RUDY_EMAIL) return
  await resend.emails.send({
    from: FROM, to: process.env.RUDY_EMAIL,
    subject: `New invoice uploaded — ${subcontractor}`,
    html: tpl({ title: 'New Invoice for Review', body: `A new invoice from <strong>${subcontractor}</strong> has been uploaded and is awaiting your review.`, link: `${APP}/invoices/${invoiceId}`, linkLabel: 'Review Invoice →' }),
  })
}

export async function sendValidationEmail(invoiceId: string, subcontractor: string, nextStage: string, validatorName: string, comment?: string) {
  const targets: Record<string, { email: string; name: string }> = {
    pending_placide: { email: process.env.PLACIDE_EMAIL || '', name: 'Placide' },
    pending_hitech:  { email: process.env.HITECH_EMAIL  || '', name: 'Dani'   },
    approved:        { email: process.env.RUDY_EMAIL    || '', name: 'Rudy'   },
  }
  const target = targets[nextStage]
  if (!target?.email) return
  await resend.emails.send({
    from: FROM, to: target.email,
    subject: `Invoice pending your validation — ${subcontractor}`,
    html: tpl({ title: `Action required — ${target.name}`, body: `The invoice from <strong>${subcontractor}</strong> was approved by ${validatorName} and is now awaiting your validation.`, comment, link: `${APP}/invoices/${invoiceId}`, linkLabel: 'Validate Invoice →' }),
  })
}

export async function sendRejectionEmail(invoiceId: string, subcontractor: string, rejectorName: string, comment?: string) {
  if (!process.env.RUDY_EMAIL) return
  await resend.emails.send({
    from: FROM, to: process.env.RUDY_EMAIL,
    subject: `Invoice rejected — ${subcontractor}`,
    html: tpl({ title: 'Invoice Rejected', body: `The invoice from <strong>${subcontractor}</strong> was rejected by ${rejectorName}.`, comment, link: `${APP}/invoices/${invoiceId}`, linkLabel: 'View Invoice →' }),
  })
}

export async function sendFinalApprovalEmail(invoiceId: string, subcontractor: string) {
  if (!process.env.RUDY_EMAIL) return
  await resend.emails.send({
    from: FROM, to: process.env.RUDY_EMAIL,
    subject: `✓ Invoice fully approved — ${subcontractor}`,
    html: tpl({ title: 'Invoice Approved', body: `The invoice from <strong>${subcontractor}</strong> has received all three validations and is now approved.`, link: `${APP}/invoices/${invoiceId}`, linkLabel: 'View Invoice →' }),
  })
}

export async function sendBudgetAlertEmail(contractId: string, contractName: string, pct: number) {
  if (!process.env.RUDY_EMAIL) return
  await resend.emails.send({
    from: FROM, to: process.env.RUDY_EMAIL,
    subject: `⚠️ Budget alert — ${contractName} at ${Math.round(pct)}%`,
    html: tpl({ title: `Budget Alert: ${Math.round(pct)}% consumed`, body: `Contract <strong>${contractName}</strong> has reached <strong>${Math.round(pct)}%</strong> of its total budget.`, link: `${APP}/contracts/${contractId}`, linkLabel: 'View Contract →' }),
  })
}

export async function sendTrancheReminderEmail(contractName: string, trancheName: string, amount: number, daysUntil: number, contractId: string) {
  if (!process.env.RUDY_EMAIL) return
  await resend.emails.send({
    from: FROM, to: process.env.RUDY_EMAIL,
    subject: `⏰ Tranche payment due in ${daysUntil} days — ${contractName}`,
    html: tpl({ title: `Upcoming Tranche Payment`, body: `Tranche <strong>${trancheName}</strong> of contract <strong>${contractName}</strong> (${amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}) is due in <strong>${daysUntil} days</strong>.`, link: `${APP}/contracts/${contractId}`, linkLabel: 'View Contract →' }),
  })
}
