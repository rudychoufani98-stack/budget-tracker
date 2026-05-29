import { supabaseAdmin } from '@/lib/supabase'
import { formatCurrency } from '@/lib/format'
import Link from 'next/link'

export const revalidate = 0
const C = { card:'#222A42', border:'#323D5E', green:'#10B981', amber:'#F59E0B', red:'#EF4444', blue:'#3B82F6', muted:'#6B7280' }

export default async function ProvidersPage() {
  const { data: providers } = await supabaseAdmin.from('service_providers').select('*').order('name')
  const { data: tranches }  = await supabaseAdmin.from('contract_tranches').select('amount, status, contracts(service_provider_id)')

  const stats: Record<string,{ contracted:number; paid:number; contracts:Set<string> }> = {}
  for (const t of (tranches||[])) {
    const spid = (t.contracts as any)?.service_provider_id
    if (!spid) continue
    if (!stats[spid]) stats[spid] = { contracted:0, paid:0, contracts:new Set() }
    stats[spid].contracted += t.amount||0
    if (t.status==='paid') stats[spid].paid += t.amount||0
  }

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color:C.muted }}>Directory</p>
          <h1 className="text-2xl font-medium" style={{ color:'#F9FAFB' }}>Service Providers</h1>
        </div>
        <Link href="/providers/new" className="text-sm font-medium px-4 py-2 rounded-xl" style={{ background:C.blue, color:'#fff' }}>+ Add Provider</Link>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
        <div className="grid px-6 py-3 text-xs font-medium uppercase tracking-widest" style={{ color:C.muted, borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr' }}>
          <div>Provider</div><div>Country</div><div>Category</div><div>Contracted</div><div>Paid</div><div>Balance</div>
        </div>
        {(providers||[]).length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color:C.muted }}>No service providers yet.</p>
        ) : (providers||[]).map((p:any) => {
          const s = stats[p.id] || { contracted:0, paid:0 }
          const balance = s.contracted - s.paid
          return (
            <Link key={p.id} href={`/providers/${p.id}`} className="grid px-6 py-4 hover:bg-white/5 items-center" style={{ borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr' }}>
              <div>
                <p className="text-sm font-medium" style={{ color:'#F9FAFB' }}>{p.name}</p>
                <p className="text-xs mt-0.5" style={{ color:C.muted }}>{p.email||'—'}</p>
              </div>
              <p className="text-sm" style={{ color:'#D1D5DB' }}>{p.country||'—'}</p>
              <p className="text-sm" style={{ color:'#D1D5DB' }}>{p.category||'—'}</p>
              <p className="text-sm font-medium" style={{ color:'#F9FAFB' }}>{formatCurrency(s.contracted)}</p>
              <p className="text-sm" style={{ color:C.green }}>{formatCurrency(s.paid)}</p>
              <p className="text-sm" style={{ color:balance>0?C.amber:C.muted }}>{formatCurrency(balance)}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}