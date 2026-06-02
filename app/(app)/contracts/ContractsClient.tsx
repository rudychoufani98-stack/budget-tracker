'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/format'
import type { ContractTranche } from '@/lib/types'

const ESG_COLORS: Record<string,{ color:string; bg:string }> = {
  E:     { color:'#10B981', bg:'rgba(16,185,129,0.1)'  },
  S:     { color:'#3B82F6', bg:'rgba(59,130,246,0.1)'  },
  G:     { color:'#8B5CF6', bg:'rgba(139,92,246,0.1)'  },
  Other: { color:'#6B7280', bg:'rgba(107,114,128,0.1)' },
}

const CONTRACT_STATUS: Record<string,{ label:string; color:string; bg:string }> = {
  active:    { label:'Active',    color:'#10B981', bg:'rgba(16,185,129,0.1)' },
  completed: { label:'Completed', color:'#3B82F6', bg:'rgba(59,130,246,0.1)' },
  cancelled: { label:'Cancelled', color:'#EF4444', bg:'rgba(239,68,68,0.1)'  },
}

const PALETTE = ['#3B82F6','#8B5CF6','#F59E0B','#EF4444','#10B981','#06B6D4','#F97316','#EC4899']

interface Props {
  contracts: any[]
  projects: { id: string; name: string }[]
  initialProject: string
  initialSection: string
}

export function ContractsClient({ contracts, projects, initialProject, initialSection }: Props) {
  const [selectedProject, setSelectedProject] = useState(initialProject)
  const [selectedSection, setSelectedSection] = useState(initialSection)
  const [sections,        setSections]        = useState<{ id: string; name: string }[]>([])
  const [view,            setView]            = useState<'ngn'|'usd'>('ngn')

  useEffect(() => {
    if (!selectedProject) { setSections([]); return }
    fetch(`/api/sections?project_id=${selectedProject}`)
      .then(r => r.json())
      .then(d => setSections(Array.isArray(d) ? d : []))
      .catch(() => setSections([]))
  }, [selectedProject])

  function handleProjectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedProject(e.target.value)
    setSelectedSection('')
  }

  // Convert a contract amount using its signing rate
  function convert(amount: number, ccy: string, signingRate: number | null): number {
    if (!amount) return 0
    const rate = signingRate || 1580
    if (view === 'ngn') {
      if (ccy === 'NGN') return amount
      if (ccy === 'USD') return amount * rate
      return amount * rate // approximate for other ccy
    } else {
      if (ccy === 'USD') return amount
      if (ccy === 'NGN') return amount / rate
      return amount / rate
    }
  }

  const baseCcy = view === 'ngn' ? 'NGN' : 'USD'

  const filtered = useMemo(() => {
    return contracts.filter((c: any) => {
      if (selectedProject && c.project_id !== selectedProject) return false
      if (selectedSection && c.section_id !== selectedSection) return false
      return true
    })
  }, [contracts, selectedProject, selectedSection])

  const totalValue = filtered.reduce((s:number,c:any) => {
    const budget = c.contract_amount || c.total_budget || 0
    return s + convert(budget, c.currency||'NGN', c.fx_rate_at_signing)
  }, 0)

  const totalPaid = filtered.reduce((s:number,c:any) => {
    const ts = (c.contract_tranches||[]) as ContractTranche[]
    const paid = ts.filter(t=>t.status==='paid').reduce((ss,t)=>ss+t.amount,0)
    return s + convert(paid, c.currency||'NGN', c.fx_rate_at_signing)
  }, 0)

  const activeCount = filtered.filter((c:any) => c.status==='active').length
  const hasFilter   = !!(selectedProject || selectedSection)

  return (
    <>
      {/* Filter bar + toggle */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select value={selectedProject} onChange={handleProjectChange}
          className="text-sm px-3 py-2 rounded-lg"
          style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', color:'#0F172A', outline:'none' }}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
          disabled={!selectedProject}
          className="text-sm px-3 py-2 rounded-lg"
          style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', color: selectedProject ? '#0F172A' : '#94A3B8', outline:'none' }}>
          <option value="">All Sections</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {hasFilter && (
          <button onClick={() => { setSelectedProject(''); setSelectedSection('') }}
            className="text-sm px-3 py-2 rounded-lg font-medium"
            style={{ background:'#FEF2F2', border:'1px solid rgba(239,68,68,0.2)', color:'#EF4444' }}>
            Clear
          </button>
        )}

        {/* NGN / USD toggle */}
        <div className="ml-auto flex items-center rounded-xl overflow-hidden" style={{ border:'1px solid #E2E8F0' }}>
          <button onClick={() => setView('ngn')}
            className="px-4 py-2 text-sm font-bold transition-colors"
            style={view==='ngn' ? { background:'#0F172A', color:'#fff' } : { background:'#FFFFFF', color:'#64748B' }}>
            &#8358; NGN
          </button>
          <button onClick={() => setView('usd')}
            className="px-4 py-2 text-sm font-bold transition-colors"
            style={view==='usd' ? { background:'#0F172A', color:'#fff' } : { background:'#FFFFFF', color:'#64748B' }}>
            $ USD
          </button>
        </div>

        <span className="text-xs" style={{ color:'#94A3B8' }}>
          {filtered.length} contract{filtered.length !== 1 ? 's' : ''} &middot; {activeCount} active
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label:'Total Value', value:formatCurrency(totalValue, baseCcy), sub:`${filtered.length} contracts`, color:'#3B82F6' },
          { label:'Total Paid',  value:formatCurrency(totalPaid,  baseCcy), sub:'across all tranches',          color:'#10B981' },
          { label:'Balance',     value:formatCurrency(totalValue-totalPaid, baseCcy), sub:'remaining to pay',   color:'#F59E0B' },
        ].map(k=>(
          <div key={k.label} className="rounded-2xl px-5 py-4" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color:'#94A3B8' }}>{k.label}</p>
            <p className="text-xl font-bold mb-0.5" style={{ color:k.color }}>{k.value}</p>
            <p className="text-xs" style={{ color:'#94A3B8' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
        <div className="grid px-6 py-3 text-xs font-semibold uppercase tracking-widest"
          style={{ color:'#94A3B8', borderBottom:'1px solid #F1F5F9', background:'#FAFBFC',
                   gridTemplateColumns:'2fr 1fr 1fr 0.5fr 1fr 1fr 1fr 1.3fr 0.4fr' }}>
          <div>Contract</div>
          <div>Project</div>
          <div>Section</div>
          <div>Cat</div>
          <div>Value ({baseCcy})</div>
          <div>Paid ({baseCcy})</div>
          <div>Balance ({baseCcy})</div>
          <div>Progress</div>
          <div></div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium mb-1" style={{ color:'#0F172A' }}>No contracts found</p>
            <p className="text-sm" style={{ color:'#94A3B8' }}>
              {hasFilter ? 'Try changing the filters above' : 'Create your first contract to start tracking payments'}
            </p>
            {!hasFilter && (
              <Link href="/contracts/new" className="inline-flex mt-4 text-sm font-semibold px-4 py-2 rounded-xl" style={{ background:'#3B82F6', color:'#fff' }}>
                + New Contract
              </Link>
            )}
          </div>
        ) : filtered.map((c:any, i:number) => {
          const tranches: ContractTranche[] = c.contract_tranches || []
          const ccy         = c.currency || 'NGN'
          const signingRate = c.fx_rate_at_signing || null
          const rawBudget   = c.contract_amount || c.total_budget || 0
          const rawPaid     = tranches.filter(t=>t.status==='paid').reduce((s,t)=>s+t.amount, 0)
          const rawSched    = tranches.filter(t=>t.status==='scheduled').reduce((s,t)=>s+t.amount, 0)
          const budget      = convert(rawBudget,  ccy, signingRate)
          const paid        = convert(rawPaid,    ccy, signingRate)
          const balance     = budget - paid
          const rate        = budget > 0 ? Math.round((paid/budget)*100) : 0
          const esg         = ESG_COLORS[c.category] || ESG_COLORS.Other
          const cs          = CONTRACT_STATUS[c.status] || CONTRACT_STATUS.active
          const barColor    = PALETTE[i % PALETTE.length]
          const projectName = c.projects?.name || c.project || ''
          // Show all linked sections (primary + junction table)
          const sectionNames: string[] = []
          if (c.project_sections?.name) sectionNames.push(c.project_sections.name)
          for (const cs of (c.contract_sections || [])) {
            const n = cs.project_sections?.name
            if (n && !sectionNames.includes(n)) sectionNames.push(n)
          }
          const sectionName = sectionNames.join(', ')

          return (
            <Link key={c.id} href={`/contracts/${c.id}`}
              className="grid px-6 py-4 items-center transition-colors hover:bg-slate-50"
              style={{ borderBottom:'1px solid #F8FAFC', gridTemplateColumns:'2fr 1fr 1fr 0.5fr 1fr 1fr 1fr 1.3fr 0.4fr' }}>

              {/* Contract + status badge on separate line */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-1 h-8 rounded-full shrink-0" style={{ background:barColor }}/>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold truncate" style={{ color:'#0F172A' }}>{c.contract_name}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold shrink-0" style={{ background:cs.bg, color:cs.color }}>{cs.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs truncate" style={{ color:'#94A3B8' }}>{c.service_providers?.name || c.client_name || '--'}</p>
                    {c.payment_type === 'milestone_based' && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold shrink-0" style={{ background:'rgba(139,92,246,0.1)', color:'#8B5CF6' }}>🎯 Milestone</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-sm truncate" style={{ color:'#64748B' }}>{projectName || '--'}</div>
              <div className="text-sm truncate" style={{ color:'#64748B' }}>{sectionName || '--'}</div>

              <div>
                {c.category && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:esg.bg, color:esg.color }}>{c.category}</span>
                )}
              </div>

              <div className="text-sm font-semibold" style={{ color:'#0F172A' }}>{formatCurrency(budget, baseCcy)}</div>
              <div className="text-sm font-semibold" style={{ color:'#10B981' }}>{formatCurrency(paid, baseCcy)}</div>
              <div className="text-sm font-semibold" style={{ color:balance>0?'#F59E0B':'#94A3B8' }}>{formatCurrency(balance, baseCcy)}</div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold" style={{ color:barColor }}>{rate}%</span>
                  {rawSched > 0 && rawBudget > 0 && (
                    <span className="text-xs" style={{ color:'#94A3B8' }}>+{Math.round(rawSched/rawBudget*100)}% sched.</span>
                  )}
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'#F1F5F9' }}>
                  <div style={{ width:`${rate}%`, height:'100%', background:barColor, borderRadius:4 }}/>
                </div>
              </div>

              <div className="flex justify-end">
                <svg width="16" height="16" fill="none" stroke="#CBD5E1" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}