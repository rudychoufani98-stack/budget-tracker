import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { ContractsClient } from './ContractsClient'

export const revalidate = 0

export default async function ContractsPage() {
  const [contractsRes, projectsRes] = await Promise.all([
    supabaseAdmin
      .from('contracts')
      .select('*, service_providers(name), contract_tranches(*), projects(id, name), project_sections(id, name)')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('projects')
      .select('id, name')
      .order('name', { ascending: true }),
  ])

  const contracts = contractsRes.data || []
  const projects  = projectsRes.data  || []

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

      <ContractsClient contracts={contracts} projects={projects} initialProject="" initialSection="" />
    </div>
  )
}