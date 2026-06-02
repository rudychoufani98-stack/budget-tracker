import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// One-time migration: add parent_section_id to project_sections
export async function POST(_req: NextRequest) {
  const { error } = await supabaseAdmin.rpc('exec_sql' as any, {
    sql: `ALTER TABLE project_sections ADD COLUMN IF NOT EXISTS parent_section_id uuid REFERENCES project_sections(id) ON DELETE SET NULL;`
  })
  if (error) {
    // Try direct query if rpc not available
    const { error: e2 } = await supabaseAdmin
      .from('project_sections')
      .select('parent_section_id')
      .limit(1)
    if (!e2) return NextResponse.json({ ok: true, note: 'column already exists' })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
