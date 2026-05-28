import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// DELETE — remove an invoice and all related data
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  // Delete related records first
  await supabaseAdmin.from('validations').delete().eq('invoice_id', id)
  await supabaseAdmin.from('invoice_line_items').delete().eq('invoice_id', id)
  await supabaseAdmin.from('invoice_currency').delete().eq('invoice_id', id)

  // Delete the invoice itself
  const { error } = await supabaseAdmin.from('invoices').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
