'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/format'

const PALETTE = ['#3B82F6','#8B5CF6','#F59E0B','#EF4444','#10B981','#06B6D4','#F97316','#EC4899']
const STATUS_META: Record<string,{ label:string; color:string; bg:string }> = {
  active:    { label:'Active',    color:'#10B981', bg:'rgba(16,185,129,0.1)' },
  completed: { label:'Completed', color:'#3B82F6', bg:'rgba(59,130,246,0.1)' },
  on_hold:   { label:'On Hold',   color:'#F59E0B', bg:'rgba(245,158,11,0.1)' },
}

export default function ProjectsPage() {
  const [view,     setView]     = useState<'ngn'|'usd'>('ngn')
  const [projects, setProjects] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/contracts').then(r => r.json()),
      fetch('/api/fx').then(r => r.json()).catch(() => ({ rates: {} })),
    ]).then(([projRes, contractRes, fxRes]) => {
      const projs   = Array.isArray(projRes) ? projRes : []
      const contracts = Array.isArray(contractRes) ? contractRes : []
      const fxRates: Record<string,number> = { USD: 1, ...(fxRes?.rates || fxRes || {}) }

      function convert(amount: number, fromCcy: string, signingRate: number | null, toCcy: string): number {
        if (!amount) return 0
        if (fromCcy === toCcy) return amount
        const rate = signingRate || fxRates['NGN'] || 1580
        if (toCcy === 'NGN') {
          if (fromCcy === 'USD') return amount * rate
          // other -> USD -> NGN
          const toUsd = amount / (fxRates[fromCcy] || 1)
          return toUsd * rate
        }
        // toCcy === 'USD'
        if (fromCcy === 'NGN') return amount / rate
        return amount / (fxRates[fromCcy] || 1)
      }

      const enriched = projs.map((p: any, i: number) => {
        const linked = contracts.filter((c: any) => c.project_id === p.id)

        // Compute NGN and USD totals separately using contract currency + signing rate
        let committedNGN = 0, paidNGN = 0, committedUSD = 0, paidUSD = 0
        for (const c of linked) {
          const ccy  = c.currency || 'NGN'
          const rate = c.fx_rate_at_signing || fxRates['NGN'] || 1580
          const tranches: any[] = c.contract_tranches || []
          const cCommitted = tranches.reduce((s: number, t: any) => s + (t.amount || 0), 0)
          const cPaid      = tranches.filter((t: any) => t.status === 'paid').reduce((s: number, t: any) => s + (t.amount || 0), 0)
          committedNGN += convert(cCommitted, ccy, rate, 'NGN')
          paidNGN      += convert(cPaid,      ccy, rate, 'NGN')
          committedUSD += convert(cCommitted, ccy, rate, 'USD')
          paidUSD      += convert(cPaid,      ccy, rate, 'USD')
        }

        const invoiceCount = linked.reduce((s: number, c: any) => s + (c.invoices||[]).length, 0)
        const pending      = linked.reduce((s: number, c: any) => s + (c.invoices||[]).filter((i: any) => !['approved','rejected'].includes(i.status)).length, 0)
        const pct          = committedNGN > 0 ? Math.round((paidNGN / committedNGN) * 100) : 0
        const contractList = linked.map((c: any) => ({ id: c.id, name: c.contract_name }))

        return {
          id: p.id, name: p.name, description: p.description,
          budget: p.budget, budgetCcy: p.currency || 'NGN',
          start_date: p.start_date, end_date: p.end_date, status: p.status || 'active',
          contractCount: linked.length, invoiceCount, pending, pct,
          committedNGN, paidNGN, committedUSD, paidUSD,
          contractList,
          color: PALETTE[i % PALETTE.length],
        }
      })
      setProjects(enriched)
      setLoading(false)
    })
  }, [])

  const ccy = view === 'ngn' ? 'NGN' : 'USD'
  function committed(p: any) { return view === 'ngn' ? p.committedNGN : p.committedUSD }
  function paid(p: any)      { return view === 'ngn' ? p.paidNGN      : p.paidUSD      }

  const totalCommitted = projects.reduce((s, p) => s + committed(p), 0)
  const totalPaid      = projects.reduce((s, p) => s + paid(p), 0)
  const globalPct      = totalCommitted > 0 ? Math.round((totalPaid / totalCommitted) * 100) : 0
  const pendingAll     = projects.reduce((s, p) => s + p.pending, 0)

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:'#64748B' }}>Finance</p>
          <h1 className="text-2xl font-bold" style={{ color:'#0F172A' }}>Projects</h1>
          <p className="text-sm mt-0.5" style={{ color:'#64748B' }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''} - {globalPct}% paid overall
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* NGN / USD toggle */}
          <div className="flex items-center rounded-xl overflow-hidden" style={{ border:'1px solid #E2E8F0' }}>
            <button onClick={() => setView('ngn')} className="px-4 py-2 text-sm font-bold transition-colors"
              style={view === 'ngn' ? { background:'#0F172A', color:'#fff' } : { background:'#FFFFFF', color:'#64748B' }}>
              &#8358; NGN
            </button>
            <button onClick={() => setView('usd')} className="px-4 py-2 text-sm font-bold transition-colors"
              style={view === 'usd' ? { background:'#0F172A', color:'#fff' } : { background:'#FFFFFF', color:'#64748B' }}>
              $ USD
            </button>
          </div>
          <Link href="/projects/new" className="text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2" style={{ background:'#3B82F6', color:'#fff' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Project
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"/>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          {projects.length > 0 && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label:'Total Committed', value:formatCurrency(totalCommitted, ccy), sub:'across all contracts',                    color:'#8B5CF6' },
                { label:'Total Paid',      value:formatCurrency(totalPaid,      ccy), sub:`${globalPct}% payment rate`,              color:'#10B981' },
                { label:'Balance',         value:formatCurrency(totalCommitted - totalPaid, ccy), sub:'remaining to pay',            color:'#F59E0B' },
                { label:'Pending Review',  value:String(pendingAll),                  sub:`invoice${pendingAll!==1?'s':''} waiting`, color:pendingAll>0?'#F59E0B':'#94A3B8' },
              ].map(k => (
                <div key={k.label} className="rounded-2xl px-5 py-4" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
                  <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color:'#94A3B8' }}>{k.label}</p>
                  <p className="text-xl font-bold mb-0.5" style={{ color:k.color }}>{k.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Budget distribution bar */}
          {projects.length > 1 && totalCommitted > 0 && (
            <div className="rounded-2xl px-5 py-4 mb-6" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color:'#64748B' }}>Budget distribution</p>
                <div className="flex items-center gap-4 flex-wrap">
                  {projects.map(p => (
                    <div key={p.id} className="flex items-center gap-1.5">
                      <div style={{ width:10, height:10, background:p.color, borderRadius:3 }}/>
                      <span className="text-xs" style={{ color:'#64748B' }}>
                        {p.name} ({totalCommitted > 0 ? Math.round(committed(p) / totalCommitted * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden" style={{ gap:2 }}>
                {projects.filter(p => committed(p) > 0).map(p => (
                  <div key={p.id} style={{ flex:committed(p), background:p.color }}/>
                ))}
              </div>
            </div>
          )}

          {/* Project cards */}
          {projects.length === 0 ? (
            <div className="rounded-2xl p-16 text-center" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
              <p className="text-base font-semibold mb-2" style={{ color:'#0F172A' }}>No projects yet</p>
              <Link href="/projects/new" className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl" style={{ background:'#3B82F6', color:'#fff' }}>
                + New Project
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {projects.map(proj => {
                const sm   = STATUS_META[proj.status] || STATUS_META.active
                const com  = committed(proj)
                const pai  = paid(proj)
                const bal  = com - pai
                const pct  = com > 0 ? Math.round((pai / com) * 100) : 0
                return (
                  <Link key={proj.id} href={`/projects/${proj.id}`} className="block group">
                    <div className="rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
                      <div style={{ height:4, background:proj.color }}/>
                      <div className="px-6 pt-5 pb-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h2 className="text-base font-semibold group-hover:text-blue-600 transition-colors" style={{ color:'#0F172A' }}>{proj.name}</h2>
                              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:sm.bg, color:sm.color }}>{sm.label}</span>
                              {proj.pending > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:'rgba(245,158,11,0.1)', color:'#F59E0B' }}>
                                  {proj.pending} pending
                                </span>
                              )}
                            </div>
                            {proj.description && <p className="text-sm truncate" style={{ color:'#64748B' }}>{proj.description}</p>}
                            <p className="text-xs mt-1" style={{ color:'#94A3B8' }}>
                              {proj.contractCount} contract{proj.contractCount !== 1 ? 's' : ''}
                              {' - '}{proj.invoiceCount} invoice{proj.invoiceCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-2xl font-bold" style={{ color:proj.color }}>{pct}%</p>
                            <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>paid</p>
                          </div>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden mb-1" style={{ background:'#F1F5F9' }}>
                          <div className="h-full rounded-full" style={{ width:`${pct}%`, background:proj.color }}/>
                        </div>
                        <p className="text-xs" style={{ color:'#94A3B8' }}>{pct}% payment progress</p>
                      </div>
                      <div className="grid grid-cols-3 divide-x divide-[#F1F5F9]" style={{ borderTop:'1px solid #F1F5F9', background:'#FAFBFC' }}>
                        {[
                          { label:'Committed', value:formatCurrency(com, ccy), color:'#0F172A'  },
                          { label:'Paid',      value:formatCurrency(pai, ccy), color:'#10B981'  },
                          { label:'Balance',   value:formatCurrency(bal, ccy), color:bal > 0 ? '#F59E0B' : '#94A3B8' },
                        ].map(s => (
                          <div key={s.label} className="px-4 py-3">
                            <p className="text-xs mb-0.5" style={{ color:'#94A3B8' }}>{s.label}</p>
                            <p className="text-sm font-semibold" style={{ color:s.color }}>{s.value}</p>
                          </div>
                        ))}
                      </div>
                      {proj.contractList && proj.contractList.length > 0 && (
                        <div className="px-5 py-3" style={{ borderTop:'1px solid #F1F5F9', background:'#FAFBFC' }}>
                          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color:'#94A3B8' }}>Contracts</p>
                          <div className="flex flex-wrap gap-1.5">
                            {proj.contractList.slice(0, 5).map((c: any) => (
                              <span key={c.id} className="text-xs px-2.5 py-1 rounded-full font-medium"
                                style={{ background:`${proj.color}12`, color:proj.color, border:`1px solid ${proj.color}30` }}>
                                {c.name}
                              </span>
                            ))}
                            {proj.contractList.length > 5 && (
                              <span className="text-xs px-2.5 py-1 rounded-full" style={{ background:'#F1F5F9', color:'#94A3B8' }}>
                                +{proj.contractList.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
