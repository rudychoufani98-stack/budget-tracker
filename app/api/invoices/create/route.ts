import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoice, line_items } = body

    // Insert invoice using admin client (bypasses schema cache issues)
    const { data: inv, error: invErr } = await supabaseAdmin
      .from('invoices')
      .insert(invoice)
      .select()
      .single()

    if (invErr) {
      console.error('Invoice insert error:', invErr)
      return NextResponse.json({ error: invErr.message }, { status: 500 })
    }

    // Insert line items if any
    if (line_items && line_items.length > 0) {
      const { error: lineErr } = await supabaseAdmin
        .from('invoice_line_items')
        .insert(line_items.map((item: object) => ({ ...item, invoice_id: inv.id })))

      if (lineErr) {
        console.error('Line items insert error:', lineErr)
        // Non-fatal — invoice still saved
      }
    }

    return NextResponse.json({ id: inv.id })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Create invoice error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
