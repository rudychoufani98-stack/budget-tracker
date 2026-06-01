import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select(`
      id, name, description, budget, currency, start_date, end_date, status, created_at,
      contracts(
        id,
        contract_tranches(amount, status),
        invoices(id, status)
      )
    `)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, description, budget, currency, start_date, end_date, status } = body
  if (!name?.trim()) return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('projects')
    .insert({
      name:        name.trim(),
      description: description || null,
      budget:      budget     || null,
      currency:    currency   || 'NGN',
      start_date:  start_date || null,
      end_date:    end_date   || null,
      status:      status     || 'active',
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
