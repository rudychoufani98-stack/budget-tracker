import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireAuth(_)
  if (deny) return deny
  // Fetch project + sections + all contracts in parallel
  const [projRes, sectionsRes, contractsRes] = await Promise.all([
    supabaseAdmin.from('projects').select('*').eq('id', params.id).single(),
    supabaseAdmin.from('project_sections').select('*').eq('project_id', params.id).order('created_at'),
    supabaseAdmin.from('contracts').select(`
      id, contract_name, category, start_date, end_date, contract_amount, currency, section_id, project_id, project,
      service_providers(name),
      contract_tranches(id, tranche_name, amount, status, scheduled_date, paid_date),
      invoices(id, invoice_number, subcontractor_name, invoice_date, amount_ht, amount_ttc, status, category)
    `).or(`project_id.eq.${params.id},project.eq.${encodeURIComponent('placeholder')}`).order('created_at'),
  ])

  if (projRes.error || !projRes.data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const project = projRes.data

  // Also fetch contracts matched by project name text (for pre-migration contracts)
  const { data: contractsByName } = await supabaseAdmin
    .from('contracts')
    .select(`
      id, contract_name, category, start_date, end_date, contract_amount, currency, section_id, project_id, project,
      service_providers(name),
      contract_tranches(id, tranche_name, amount, status, scheduled_date, paid_date),
      invoices(id, invoice_number, subcontractor_name, invoice_date, amount_ht, amount_ttc, status, category)
    `)
    .eq('project', project.name)
    .order('created_at')

  // Merge contracts by ID (deduplicate)
  const contractMap = new Map()
  for (const c of [...(contractsRes.data||[]), ...(contractsByName||[])]) {
    if (c.project_id === params.id || c.project === project.name) contractMap.set(c.id, c)
  }
  const allContracts = Array.from(contractMap.values())

  // Also fetch junction table so contracts linked to multiple sections show in each
  const contractIds = allContracts.map((c:any) => c.id)
  const { data: junctionRows } = contractIds.length
    ? await supabaseAdmin.from('contract_sections').select('contract_id, section_id').in('contract_id', contractIds)
    : { data: [] }

  // Build a set of section_id → contract_ids from the junction table
  const junctionMap: Record<string, Set<string>> = {}
  for (const row of (junctionRows || [])) {
    if (!junctionMap[row.section_id]) junctionMap[row.section_id] = new Set()
    junctionMap[row.section_id].add(row.contract_id)
  }

  const sections = (sectionsRes.data || []).map(s => ({
    ...s,
    contracts: allContracts.filter((c:any) =>
      c.section_id === s.id || junctionMap[s.id]?.has(c.id)
    ),
  }))
  const directContracts = allContracts.filter((c:any) => !c.section_id)

  return NextResponse.json({ ...project, sections, directContracts, allContracts })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireAuth(req)
  if (deny) return deny
  const body = await req.json()
  const { data, error } = await supabaseAdmin
    .from('projects')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireAuth(_)
  if (deny) return deny
  await supabaseAdmin.from('contracts').update({ project_id: null }).eq('project_id', params.id)
  const { error } = await supabaseAdmin.from('projects').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
