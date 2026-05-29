import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { formatCurrency } from '@/lib/format'
import type { ContractTranche } from '@/lib/types'

export const revalidate = 0
const C = { card: '#FFFFFF', border: '#E2E8F0', green: '#10B981', amber: '#F59E0B', red: '#EF4444', blue: '#3B82F6', muted: '#6B7280' }

const ESG_COLORS: Record<string, string> = { E: '#10B981', S: '#3B82F6', G: '#F59E0B', Other: '#6B7280' }

export default async function ContractsPage() {
  const { data } = await supabaseAdmin
    .from('contracts')
    .select('*, service_providers(name), contract_tranches(*)')
    .order('created_at', { ascending: false })
  const contracts = data || []

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: C.muted }}>Management</p>
          <h1 className="text-2xl font-medium" style={{ color: '#0F172A' }}>Contracts</h1>
        </div>
        <Link href="/contracts/new" className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl" style={{ background: '#3B82F6', color: '#fff' }}>
          + New Contract
        </Link>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="grid px-6 py-3 text-xs font-medium uppercase tracking-widest" style={{ color: C.muted, borderBottom: `1px solid ${C.border}`, gridTemplateColumns: '2fr 1.5fr 0.7fr 1fr 1fr 1fr 1.2fr 0.5fr' }}>
          <div>Provider</div><div>Project</div><div>Cat</div><div>Amount</div><div>Paid</div><div>Balance</div><div>Progress</div><div></div>
        </div>
        {contracts.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color: C.muted }}>No contracts yet. Create your first contract.</p>
        ) : (
          <div>
            {contracts.map((c: any) => {
              const tranches: ContractTranche[] = c.contract_tranches || []
              const budget   = c.contract_amount || c.total_budget || 0
              const paid     = tranches.filter(t => t.status === 'paid').reduce((s, t) => s + t.amount, 0)
              const balance  = budget - paid
              const rate     = budget > 0 ? Math.round((paid / budget) * 100) : 0
              const statusColor = c.status === 'active' ? C.green : c.status === 'completed' ? C.muted : C.red
              return (
                <Link key={c.id} href={`/contracts/${c.id}`} className="grid px-6 py-4 hover:bg-white/5 transition-colors items-center" style={{ borderBottom: `1px solid ${C.border}`, gridTemplateColumns: '2fr 1.5fr 0.7fr 1fr 1fr 1fr 1.2fr 0.5fr' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#0F172A' }}>{c.service_providers?.name || c.client_name || '—'}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>{c.contract_name}</p>
                  </div>
                  <div className="text-sm" style={{ color: '#374151' }}>{c.project || '—'}</div>
                  <div>
                    {c.category && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${ESG_COLORS[c.category] || C.muted}20`, color: ESG_COLORS[c.category] || C.muted }}>{c.category}</span>}
                  </div>
                  <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{formatCurrency(budget)}</div>
                  <div className="text-sm" style={{ color: C.green }}>{formatCurrency(paid)}</div>
                  <div className="text-sm" style={{ color: balance > 0 ? C.amber : C.muted }}>{formatCurrency(balance)}</div>
                  <div className="pr-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: '#E2E8F0' }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${rate}%`, background: rate >= 80 ? C.green : rate >= 40 ? C.amber : C.blue }} />
                      </div>
                      <span className="text-xs" style={{ color: C.muted }}>{rate}%</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <svg className="text-gray-500" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
