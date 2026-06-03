import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const { searchParams } = new URL(req.url)
  const contract_id = searchParams.get('contract_id')
  if (!contract_id) return NextResponse.json([])

  const { data: links } = await supabaseAdmin
    .from('contract_links')
    .select('contract_id_1, contract_id_2')
    .or(`contract_id_1.eq.${contract_id},contract_id_2.eq.${contract_id}`)

  if (!links?.length) return NextResponse.json([])

  const otherIds = links.map(l => l.contract_id_1 === contract_id ? l.contract_id_2 : l.contract_id_1)

  const { data: contracts } = await supabaseAdmin
    .from('contracts')
    .select('id, contract_name, contract_amount, currency, status, service_providers(name), contract_tranches(id, amount, status)')
    .in('id', otherIds)

  return NextResponse.json(contracts || [])
}

export async function POST(req: NextRequest) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const { contract_id_1, contract_id_2 } = await req.json()
  const { error } = await supabaseAdmin
    .from('contract_links')
    .upsert({ contract_id_1, contract_id_2 }, { onConflict: 'contract_id_1,contract_id_2' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const { contract_id_1, contract_id_2 } = await req.json()
  await supabaseAdmin.from('contract_links').delete()
    .or(`and(contract_id_1.eq.${contract_id_1},contract_id_2.eq.${contract_id_2}),and(contract_id_1.eq.${contract_id_2},contract_id_2.eq.${contract_id_1})`)
  return NextResponse.json({ success: true })
}
