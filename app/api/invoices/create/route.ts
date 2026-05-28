import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoice, line_items } = body
    const currency = invoice.currency || 'EUR'

    // Remove currency from invoice object — stored separately to avoid schema cache issues
    const { currency: _c, ...invoiceWithoutCurrency } = invoice

    // Insert invoice (without currency column)
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
