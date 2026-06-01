import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

export async function POST(request: NextRequest) {
  const deny = await requireAuth(request)
  if (deny) return deny
  try {
    const body = await request.json()
    const { invoice, line_items } = body
    const currency = invoice.currency || 'NGN'

    // Remove currency — invoices table has no currency column, stored in invoice_currency
    const { currency: _c, ...invoiceWithoutCurrency } = invoice

    const { data: inv, error: invErr } = await supabaseAdmin
      .from('invoices')
      .insert(invoiceWithoutCurrency)
      .select()
      .single()

    if (invErr) {
      console.error('Invoice insert error:', invErr)
      return NextResponse.json({ error: invErr.message }, { status: 500 })
    }

    // Store currency in its own table (fresh table, always in schema cache)
    await supabaseAdmin
      .from('invoice_currency')
      .insert({ invoice_id: inv.id, currency })

    // Auto-save PDF to Document Vault
    if (invoiceWithoutCurrency.pdf_url) {
      await supabaseAdmin.from('documents').insert({
        invoice_id:          inv.id,
        contract_id:         invoiceWithoutCurrency.contract_id         || null,
        service_provider_id: invoiceWithoutCurrency.service_provider_id || null,
        filename:            `invoice_${invoiceWithoutCurrency.invoice_number || inv.id}.pdf`,
        file_url:            invoiceWithoutCurrency.pdf_url,
        file_type:           'invoice',
        uploaded_at:         new Date().toISOString(),
      })
    }

    // Insert line items if any
    if (line_items && line_items.length > 0) {
      await supabaseAdmin
        .from('invoice_line_items')
        .insert(line_items.map((item: object) => ({ ...item, invoice_id: inv.id })))
    }

    return NextResponse.json({ id: inv.id })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Create invoice error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
