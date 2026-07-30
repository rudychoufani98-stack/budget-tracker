import { supabaseAdmin } from '@/lib/supabase'
import { formatCurrency } from '@/lib/format'
import { convertBySigningRate } from '@/lib/fx'
import Link from 'next/link'

export const revalidate = 0
const C = { card:'#FFFFFF', border:'#E2E8F0', green:'#10B981', amber:'#F59E0B', red:'#EF4444', blue:'#3B82F6', muted:'#6B7280' }

export default async function ProvidersPage({ searchParams }: { searchParams?: { q?: string } }) {
  const q = (searchParams?.q || '').trim().toLowerCase()
  const [{ data: providers }, { data: tranches }, { data: fxRows }] = await Promise.all([
    supabaseAdmin.from('service_providers').select('*').order('name'),
    supabaseAdmin.from('contract_tranches').select('amount, status, contracts(service_provider_id, currency, fx_rate_at_signing)'),
    supabaseAdmin.from('exchange_rates').select('currency, rate').eq('base', 'USD'),
  ])

  const fxRates: Record<string, number> = { USD: 1 }
  for (const row of fxRows || []) fxRates[row.currency] = row.rate

  // Totals shown in NGN — convert each tranche via its contract's signing rate
  const stats: Record<string,{ contracted:number; paid:number }> = {}
  for (const t of (tranches||[])) {
    const c = t.contracts as any
    const spid = c?.service_provider_id
    if (!spid) continue
    if (!stats[spid]) stats[spid] = { contracted:0, paid:0 }
    const amt = convertBySigningRate(t.amount||0, c?.currency||'NGN', 'NGN', c?.fx_rate_at_signing||null, fxRates)
    stats[spid].contracted += amt
    if (t.status==='paid') stats[spid].paid += amt
  }

  const shown = (providers||[]).filter((p:any) =>
    !q ||
    (p.name||'').toLowerCase().includes(q) ||
    (p.email||'').toLowerCase().includes(q) ||
    (p.country||'').toLowerCase().includes(q) ||
    (p.category||'').toLowerCase().includes(q)
  )

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color:C.muted }}>Directory</p>
          <h1 className="text-2xl font-medium" style={{ color:'#0F172A' }}>Consultants</h1>
        </div>
        <div className="flex items-center gap-3">
          <form method="GET" className="relative">
            <input type="text" name="q" defaultValue={searchParams?.q || ''} placeholder="Search consultants..."
              className="pl-4 pr-4 py-2 text-sm rounded-xl outline-none"
              style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', color:'#0F172A', width:220 }} />
          </form>
          {q && (
            <Link href="/providers" className="text-sm px-3 py-2 rounded-xl font-medium" style={{ background:'#FEF2F2', color:'#EF4444', border:'1px solid rgba(239,68,68,0.2)' }}>Clear</Link>
          )}
          <Link href="/providers/new" className="text-sm font-medium px-4 py-2 rounded-xl" style={{ background:C.blue, color:'#fff' }}>+ Add Consultant</Link>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
        <div className="grid px-6 py-3 text-xs font-medium uppercase tracking-widest" style={{ color:C.muted, borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr' }}>
          <div>Provider</div><div>Country</div><div>Category</div><div>Contracted (NGN)</div><div>Paid (NGN)</div><div>Balance (NGN)</div>
        </div>
        {shown.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color:C.muted }}>
            {q ? `No consultants match "${searchParams?.q}".` : 'No consultants yet.'}
          </p>
        ) : shown.map((p:any) => {
          const s = stats[p.id] || { contracted:0, paid:0 }
          const balance = s.contracted - s.paid
          return (
            <Link key={p.id} href={`/providers/${p.id}`} className="grid px-6 py-4 hover:bg-white/5 items-center" style={{ borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr' }}>
              <div>
                <p className="text-sm font-medium" style={{ color:'#0F172A' }}>{p.name}</p>
                <p className="text-xs mt-0.5" style={{ color:C.muted }}>{p.email||'—'}</p>
              </div>
              <p className="text-sm" style={{ color:'#374151' }}>{p.country||'—'}</p>
              <p className="text-sm" style={{ color:'#374151' }}>{p.category||'—'}</p>
              <p className="text-sm font-medium" style={{ color:'#0F172A' }}>{formatCurrency(s.contracted)}</p>
              <p className="text-sm" style={{ color:C.green }}>{formatCurrency(s.paid)}</p>
              <p className="text-sm" style={{ color:balance>0?C.amber:C.muted }}>{formatCurrency(balance)}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}