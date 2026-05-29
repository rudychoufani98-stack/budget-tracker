import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { project_id, name, description, budget, currency, start_date, end_date, status } = body
  if (!project_id || !name?.trim()) return NextResponse.json({ error: 'project_id and name required' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('project_sections')
    .insert({ project_id, name: name.trim(), description: description||null, budget: budget||null, currency: currency||'USD', start_date: start_date||null, end_date: end_date||null, status: status||'active' })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
