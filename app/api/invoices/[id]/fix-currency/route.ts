import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { currency } = await req.json()
  if (!['NGN','USD'].includes(currency)) return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('invoice_currency')
    .upsert({ invoice_id: params.id, currency }, { onConflict: 'invoice_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
