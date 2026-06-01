import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireAuth(_req)
  if (deny) return deny
  const { error } = await supabaseAdmin.from('documents').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
