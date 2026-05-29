import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { formatCurrency } from '@/lib/format'
import type { ContractTranche } from '@/lib/types'

export const revalidate = 0

const ESG_COLORS: Record<string,{ color:string; bg:string }> = {
  E: { color:'#10B981', bg:'rgba(16,185,129,0.1)'  },
  S: { color:'#3B82F6', bg:'rgba(59,130,246,0.1)'  },
  G: { color:'#8B5CF6', bg:'rgba(139,92,246,0.1)'  },
  Other: { color:'#6B7280', bg:'rgba(107,114,128,0.1)' },
}

const CONTRACT_STATUS: Record<string,{ label:string; color:string; bg:string }> = {
  active:    { label:'Active',    color:'#10B981', bg:'rgba(16,185,129,0.1)' },
  completed: { label:'Completed', color:'#3B82F6', bg:'rgba(59,130,246,0.1)' },
  cancelled: { label:'Cancelled', color:'#EF4444', bg:'rgba(239,68,68,0.1)'  },
}

const PALETTE = ['#3B82F6','#8B5CF6','#F59E0B','#EF4444','#10B981','#06B6D4','#F97316','#EC4899']

export default async function ContractsPage() {
  const { data } = await supabaseAdmin
    .from('contracts')
    .select('*, service_providers(name), contract_tranches(*)')
    .order('created_at', { ascending: false })
  const contracts = data || []

  const totalValue   = contracts.reduce((s:number,c:any)=>s+(c.contract_amount||c.total_budget||0),0)
  const totalPaid    = contracts.reduce((s:number,c:any)=>{
    const ts = (c.contract_tranches||[]) as ContractTranche[]
    return s+ts.filter(t=>t.status==='paid').reduce((ss,t)=>ss+t.amount,0)
  },0)
  const activeCount  = contracts.filter((c:any)=>c.status==='active').length

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:'#64748B' }}>Finance</p>
          <h1 className="text-2xl font-bold" style={{ color:'#0F172A' }}>Contracts</h1>
          <p className="text-sm mt-0.5" style={{ color:'#64748B' }}>{contracts.length} contract{contracts.length!==1?'s':''} · {activeCount} active</p>
        </div>
        <Link href="/contracts/new" className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl" style={{ background:'#3B82F6', color:'#fff' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Contract
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label:'Total Value',    value:formatCurrency(totalValue), sub:`${contracts.length} contracts`,   color:'#3B82F6', bg:'#EFF6FF' },
          { label:'Total Paid',     value:formatCurrency(totalPaid),  sub:'across all tranches',              color:'#10B981', bg:'#F0FDF4' },
          { label:'Balance',        value:formatCurrency(totalValue-totalPaid), sub:'remaining to pay',      color:'#F59E0B', bg:'#FFFBEB' },
        ].map(k=>(
          <div key={k.label} className="rounded-2xl px-5 py-4" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color:'#94A3B8' }}>{k.label}</p>
            <p className="text-xl font-bold mb-0.5" style={{ color:k.color }}>{k.value}</p>
            <p className="text-xs" style={{ color:'#94A3B8' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Contracts table */}
      <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
        {/* Header */}
        <div className="grid px-6 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color:'#94A3B8', borderBottom:'1px solid #F1F5F9', background:'#FAFBFC', gridTemplateColumns:'2.2fr 1.4fr 0.6fr 1fr 1fr 1fr 1.4fr 0.5fr' }}>
          <div>Contract</div>
          <div>Project</div>
          <div>Cat</div>
          <div>Value</div>
          <div>Paid</div>
          <div>Balance</div>
          <div>Progress</div>
          <div></div>
        </div>

        {contracts.length===0 ? (
          <div className="py-16 text-center">
            <div className="text-3xl mb-3">📄</div>
            <p className="text-sm font-medium mb-1" style={{ color:'#0F172A' }}>No contracts yet</p>
            <p className="text-sm mb-4" style={{ color:'#94A3B8' }}>Create your first contract to start tracking payments</p>
            <Link href="/contracts/new" className="inline-flex text-sm font-semibold px-4 py-2 rounded-xl" style={{ background:'#3B82F6', color:'#fff' }}>+ New Contract</Link>
          </div>
        ) : contracts.map((c:any, i:number)=>{
          const tranches: ContractTranche[] = c.contract_tranches||[]
          const budget   = c.contract_amount||c.total_budget||0
          const paid     = tranches.filter(t=>t.status==='paid').reduce((s,t)=>s+t.amount,0)
          const scheduled = tranches.filter(t=>t.status==='scheduled').reduce((s,t)=>s+t.amount,0)
          const balance  = budget - paid
          const rate     = budget>0 ? Math.round((paid/budget)*100) : 0
          const esg      = ESG_COLORS[c.category] || ESG_COLORS.Other
          const cs       = CONTRACT_STATUS[c.status] || CONTRACT_STATUS.active
          const barColor = PALETTE[i % PALETTE.length]

          return (
            <Link
              key={c.id} href={`/contracts/${c.id}`}
              className="grid px-6 py-4 items-center transition-colors hover:bg-slate-50"
              style={{ borderBottom:'1px solid #F8FAFC', gridTemplateColumns:'2.2fr 1.4fr 0.6fr 1fr 1fr 1fr 1.4fr 0.5fr' }}
            >
              {/* Contract name + provider */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-1 h-8 rounded-full shrink-0" style={{ background:barColor }}/>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color:'#0F172A' }}>{c.contract_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs truncate" style={{ color:'#94A3B8' }}>{c.service_providers?.name||c.client_name||'—'}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold shrink-0" style={{ background:cs.bg, color:cs.color }}>{cs.label}</span>
                  </div>
                </div>
              </div>

              {/* Project */}
              <div className="text-sm truncate" style={{ color:'#64748B' }}>{c.project||'—'}</div>

              {/* Category */}
              <div>
                {c.category && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:esg.bg, color:esg.color }}>{c.category}</span>
                )}
              </div>

              {/* Value */}
              <div className="text-sm font-semibold" style={{ color:'#0F172A' }}>{formatCurrency(budget)}</div>

              {/* Paid */}
              <div className="text-sm font-semibold" style={{ color:'#10B981' }}>{formatCurrency(paid)}</div>

              {/* Balance */}
              <div className="text-sm font-semibold" style={{ color:balance>0?'#F59E0B':'#94A3B8' }}>{formatCurrency(balance)}</div>

              {/* Progress */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold" style={{ color:barColor }}>{rate}%</span>
                  {scheduled>0 && <span className="text-xs" style={{ color:'#94A3B8' }}>+{Math.round(scheduled/budget*100)}% sched.</span>}
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'#F1F5F9' }}>
                  <div style={{ width:`${rate}%`, height:'100%', background:barColor, borderRadius:4 }}/>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-end">
                <svg width="16" height="16" fill="none" stroke="#CBD5E1" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
