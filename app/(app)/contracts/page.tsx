import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { ContractsClient } from './ContractsClient'

export const revalidate = 0

const LINK_PALETTE = ['#F59E0B','#8B5CF6','#EC4899','#06B6D4','#F97316','#6366F1','#14B8A6','#EF4444']

export default async function ContractsPage() {
  const [contractsRes, projectsRes, linksRes] = await Promise.all([
    supabaseAdmin
      .from('contracts')
      .select('*, service_providers(name), contract_tranches(*), projects(id, name), project_sections(id, name)')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('projects')
      .select('id, name')
      .order('name', { ascending: true }),
    supabaseAdmin
      .from('contract_links')
      .select('contract_id_1, contract_id_2'),
  ])

  const contracts = contractsRes.data || []
  const projects  = projectsRes.data  || []
  const links     = linksRes.data     || []

  // Build union-find groups: contracts sharing any link get the same group color
  const parent: Record<string, string> = {}
  function find(x: string): string {
    if (!parent[x]) parent[x] = x
    if (parent[x] !== x) parent[x] = find(parent[x])
    return parent[x]
  }
  function union(a: string, b: string) {
    parent[find(a)] = find(b)
  }
  links.forEach(l => union(l.contract_id_1, l.contract_id_2))

  // Assign a color to each root (only for roots that have >1 member)
  const rootMembers: Record<string, string[]> = {}
  contracts.forEach((c: any) => {
    const root = find(c.id)
    if (!rootMembers[root]) rootMembers[root] = []
    rootMembers[root].push(c.id)
  })
  const rootColor: Record<string, string> = {}
  let colorIdx = 0
  Object.entries(rootMembers).forEach(([root, members]) => {
    if (members.length > 1) rootColor[root] = LINK_PALETTE[colorIdx++ % LINK_PALETTE.length]
  })

  const linkGroupColor: Record<string, string> = {}
  contracts.forEach((c: any) => {
    const color = rootColor[find(c.id)]
    if (color) linkGroupColor[c.id] = color
  })

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:'#64748B' }}>Finance</p>
          <h1 className="text-2xl font-bold" style={{ color:'#0F172A' }}>Contracts</h1>
        </div>
        <Link href="/contracts/new" className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl" style={{ background:'#3B82F6', color:'#fff' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Contract
        </Link>
      </div>

      <ContractsClient contracts={contracts} projects={projects} initialProject="" initialSection="" linkGroupColor={linkGroupColor} />
    </div>
  )
}