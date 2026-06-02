'use client'
import { useState, useEffect, useMemo } from 'react'
import { formatCurrency } from '@/lib/format'
import Link from 'next/link'

const TRANCHES = ['T1','T2','T3','T4','One-Shot']
const ESG: Record<string,string> = { E:'#10B981', S:'#3B82F6', G:'#8B5CF6', Other:'#6B7280' }
const TRANCHE_STATUS: Record<string,{label:string;color:string}> = {
  unpaid:          { label:'Unpaid',          color:'#94A3B8' },
  scheduled:       { label:'Scheduled',       color:'#F59E0B' },
  pending_review:  { label:'In Validation',   color:'#3B82F6' },
  pending_placide: { label:'In Validation',   color:'#3B82F6' },
  pending_dani:    { label:'In Validation',   color:'#3B82F6' },
  pending_fares:   { label:'Pending Payment', color:'#8B5CF6' },
  paid:            { label:'Paid',            color:'#10B981' },
}

function findTranche(tranches: any[], name: string) {
  return tranches.find((t:any) => t.tranche_name === name) || null
}

export default function PaymentRegisterPage() {
  const [contracts,       setContracts]       = useState<any[]>([])
  const [projects,        setProjects]        = useState<{id:string;name:string}[]>([])
  const [sections,        setSections]        = useState<{id:string;name:string}[]>([])
  const [fxRates,         setFxRates]         = useState<Record<string,number>>({ USD:1, NGN:1580 })
  const [loading,         setLoading]         = useState(true)
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [view,            setView]            = useState<'ngn'|'usd'>('ngn')

  const displayCcy = view === 'ngn' ? 'NGN' : 'USD'

  function convert(amount: number, fromCcy: string, signingRate: number | null): number {
    if (!amount) return 0
    const rate = signingRate || 0
    if (view === 'ngn') {
      if (fromCcy === 'NGN') return amount
      if (fromCcy === 'USD') return amount * rate
      const toUsd = amount / (fxRates[fromCcy] || 1)
      return toUsd * rate
    } else {
      if (fromCcy === 'USD') return amount
      if (fromCcy === 'NGN') return amount / rate
      return amount / (fxRates[fromCcy] || 1)
    }
  }

  async function load() {
    const [cRes, pRes, fxRes] = await Promise.all([
      fetch('/api/contracts').then(r=>r.json()),
      fetch('/api/projects').then(r=>r.json()),
      fetch('/api/fx').then(r=>r.json()).catch(()=>({ rates:{} })),
    ])
    setContracts(Array.isArray(cRes) ? cRes : [])
    const pList = Array.isArray(pRes) ? pRes : []
    setProjects(pList.map((p:any) => ({ id:p.id, name:p.name })))
    if (fxRes?.rates) setFxRates({ USD:1, ...fxRes.rates })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!selectedProject) { setSections([]); setSelectedSection(''); return }
    fetch(`/api/sections?project_id=${selectedProject}`)
      .then(r=>r.json()).then(d=>setSections(Array.isArray(d)?d:[])).catch(()=>setSections([]))
  }, [selectedProject])

  const filtered = useMemo(() => contracts.filter((c:any) => {
    if (selectedProject && c.project_id !== selectedProject) return false
    if (selectedSection && c.section_id !== selectedSection) return false
    return true
  }), [contracts, selectedProject, selectedSection])

  const grouped = useMemo(() => {
    if (selectedProject) return [{ projectName: projects.find(p=>p.id===selectedProject)?.name||'', contracts: filtered }]
    const map: Record<string,any[]> = {}
    for (const c of filtered) {
      const key = c.projects?.name || c.project || 'No Project'
      if (!map[key]) map[key] = []
      map[key].push(c)
    }
    return Object.entries(map).map(([projectName, contracts]) => ({ projectName, contracts }))
  }, [filtered, selectedProject, projects])

  // Totals always in displayCcy
  const totalPaid   = filtered.reduce((s:number,c:any) => {
    const ts  = c.contract_tranches || []
    const ccy = c.currency || 'NGN'
    const rate = c.fx_rate_at_signing || null
    return s + ts.filter((t:any)=>t.status==='paid').reduce((ss:number,t:any)=>ss+convert(t.amount||0,ccy,rate),0)
  }, 0)
  const totalBudget = filtered.reduce((s:number,c:any) =>
    s + convert(c.contract_amount||0, c.currency||'NGN', c.fx_rate_at_signing||null), 0)

  function exportCSV() {
    const rows = [['Consultant','Project','Section','Cat','Contract','Currency','T1','T2','T3','T4','One-Shot',`Paid (${displayCcy})`,`Balance (${displayCcy})`,'%']]
    for (const c of filtered) {
      const ts  = c.contract_tranches || []
      const ccy = c.currency || 'NGN'
      const rate = c.fx_rate_at_signing || null
      const budget = convert(c.contract_amount||0, ccy, rate)
      const paid   = ts.filter((x:any)=>x.status==='paid').reduce((s:number,x:any)=>s+convert(x.amount||0,ccy,rate),0)
      rows.push([
        c.service_providers?.name||'', c.projects?.name||c.project||'', c.project_sections?.name||'',
        c.category||'', c.contract_name||'', ccy,
        ...TRANCHES.map(n=>{ const t=findTranche(ts,n); return t?String(Math.round(convert(t.amount||0,ccy,rate))):'' }),
        String(Math.round(paid)), String(Math.round(budget-paid)), budget>0?Math.round((paid/budget)*100)+'%':'0%',
      ])
    }
    const csv = rows.map(r=>r.map(v=>`"${v.replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv],{type:'text/csv'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href=url; a.download='payment-register.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"/></div>

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:'#64748B' }}>Finance</p>
          <h1 className="text-2xl font-bold" style={{ color:'#0F172A' }}>Payment Register</h1>
          <p className="text-sm mt-0.5" style={{ color:'#64748B' }}>
            {filtered.length} contract{filtered.length!==1?'s':''} &mdash; {formatCurrency(totalPaid, displayCcy)} paid of {formatCurrency(totalBudget, displayCcy)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* NGN / USD toggle */}
          <div className="flex items-center rounded-xl overflow-hidden" style={{ border:'1px solid #E2E8F0' }}>
            <button onClick={()=>setView('ngn')} className="px-4 py-2 text-sm font-bold transition-colors"
              style={view==='ngn'?{background:'#0F172A',color:'#fff'}:{background:'#FFFFFF',color:'#64748B'}}>
              &#8358; NGN
            </button>
            <button onClick={()=>setView('usd')} className="px-4 py-2 text-sm font-bold transition-colors"
              style={view==='usd'?{background:'#0F172A',color:'#fff'}:{background:'#FFFFFF',color:'#64748B'}}>
              $ USD
            </button>
          </div>
          <button onClick={exportCSV} className="text-sm font-medium px-4 py-2 rounded-xl" style={{ background:'#F1F5F9', border:'1px solid #E2E8F0', color:'#0F172A' }}>Export CSV</button>
          <button onClick={()=>window.print()} className="text-sm font-medium px-4 py-2 rounded-xl" style={{ background:'#F1F5F9', border:'1px solid #E2E8F0', color:'#0F172A' }}>Print / PDF</button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select value={selectedProject} onChange={e=>{setSelectedProject(e.target.value);setSelectedSection('')}}
          className="text-sm px-3 py-2.5 rounded-xl outline-none"
          style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', color:'#0F172A' }}>
          <option value="">All Projects</option>
          {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={selectedSection} onChange={e=>setSelectedSection(e.target.value)} disabled={!selectedProject}
          className="text-sm px-3 py-2.5 rounded-xl outline-none"
          style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', color:selectedProject?'#0F172A':'#94A3B8' }}>
          <option value="">All Sections</option>
          {sections.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {(selectedProject||selectedSection) && (
          <button onClick={()=>{setSelectedProject('');setSelectedSection('')}}
            className="text-sm px-3 py-2 rounded-xl font-medium"
            style={{ background:'#FEF2F2', color:'#EF4444', border:'1px solid rgba(239,68,68,0.2)' }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
          <p className="text-base font-semibold mb-1" style={{ color:'#0F172A' }}>No contracts yet</p>
          <Link href="/projects" className="inline-flex text-sm font-semibold px-4 py-2.5 rounded-xl" style={{ background:'#3B82F6', color:'#fff' }}>Go to Projects</Link>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth:900 }}>
              <thead>
                <tr style={{ background:'#FAFBFC', borderBottom:'2px solid #F1F5F9' }}>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest" style={{ color:'#94A3B8', minWidth:160 }}>Consultant</th>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-widest" style={{ color:'#94A3B8', minWidth:80 }}>Cat</th>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-widest" style={{ color:'#94A3B8', minWidth:120 }}>Contract</th>
                  {TRANCHES.map(t=>(
                    <th key={t} className="px-3 py-3 text-center text-xs font-bold uppercase tracking-widest" style={{ color:'#94A3B8', minWidth:110, borderLeft:'1px solid #F1F5F9' }}>{t}</th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-widest" style={{ color:'#94A3B8', minWidth:100 }}>Paid ({displayCcy})</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-widest" style={{ color:'#94A3B8', minWidth:100 }}>Balance ({displayCcy})</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-widest" style={{ color:'#94A3B8', minWidth:60 }}>%</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(({ projectName, contracts: pContracts }) => (
                  <>
                    {!selectedProject && (
                      <tr key={`proj-${projectName}`} style={{ background:'#F8FAFC', borderTop:'2px solid #E2E8F0' }}>
                        <td colSpan={11} className="px-4 py-2">
                          <span className="text-xs font-bold uppercase tracking-widest" style={{ color:'#64748B' }}>{projectName}</span>
                        </td>
                      </tr>
                    )}
                    {pContracts.map((c:any) => {
                      const ts      = c.contract_tranches || []
                      const ccy     = c.currency || 'NGN'
                      const rate    = c.fx_rate_at_signing || null
                      const budget  = convert(c.contract_amount||0, ccy, rate)
                      const paid    = ts.filter((t:any)=>t.status==='paid').reduce((s:number,t:any)=>s+convert(t.amount||0,ccy,rate),0)
                      const balance = budget - paid
                      const pct     = budget > 0 ? Math.round((paid/budget)*100) : 0
                      const catC    = ESG[c.category] || ESG.Other

                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom:'1px solid #F8FAFC' }}>
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold" style={{ color:'#0F172A' }}>{c.service_providers?.name || '-'}</p>
                            <p className="text-xs mt-0.5 truncate max-w-[140px]" style={{ color:'#94A3B8' }}>{c.project_sections?.name || ''}</p>
                          </td>
                          <td className="px-3 py-3">
                            {c.category && <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background:`${catC}18`, color:catC }}>{c.category}</span>}
                          </td>
                          <td className="px-3 py-3">
                            <Link href={`/contracts/${c.id}`} className="text-sm font-medium hover:text-blue-600 transition-colors truncate max-w-[110px] block" style={{ color:'#0F172A' }}>
                              {c.contract_name}
                            </Link>
                            {ccy !== 'NGN' && <span className="text-xs" style={{ color:'#94A3B8' }}>{ccy}</span>}
                          </td>
                          {TRANCHES.map(name => {
                            const t = findTranche(ts, name)
                            if (!t) return <td key={name} className="px-3 py-3 text-center" style={{ borderLeft:'1px solid #F1F5F9' }}><span style={{ color:'#E2E8F0' }}>-</span></td>
                            const st  = TRANCHE_STATUS[t.status] || TRANCHE_STATUS.unpaid
                            const amt = convert(t.amount||0, ccy, rate)
                            return (
                              <td key={name} className="px-3 py-3 text-center" style={{ borderLeft:'1px solid #F1F5F9' }}>
                                <p className="text-xs font-bold mb-0.5" style={{ color:st.color }}>{formatCurrency(amt, displayCcy)}</p>
                                {t.scheduled_date
                                  ? <p className="text-xs" style={{ color:'#94A3B8' }}>{new Date(t.scheduled_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</p>
                                  : t.notes
                                    ? <p className="text-xs truncate max-w-[90px]" title={t.notes} style={{ color:'#8B5CF6' }}>🎯 {t.notes}</p>
                                    : null
                                }
                                <div className="mt-0.5 flex items-center justify-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ background:st.color }}/>
                                  <span className="text-xs" style={{ color:st.color, fontSize:10 }}>{st.label}</span>
                                </div>
                              </td>
                            )
                          })}
                          <td className="px-4 py-3 text-right font-bold text-sm" style={{ color:'#10B981' }}>{formatCurrency(paid, displayCcy)}</td>
                          <td className="px-4 py-3 text-right text-sm" style={{ color:balance>0?'#F59E0B':'#94A3B8' }}>{formatCurrency(balance, displayCcy)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs font-bold" style={{ color:pct>=80?'#10B981':pct>=40?'#F59E0B':'#64748B' }}>{pct}%</span>
                          </td>
                        </tr>
                      )
                    })}
                  </>
                ))}
                {/* Totals row */}
                <tr style={{ background:'#F8FAFC', borderTop:'2px solid #E2E8F0' }}>
                  <td colSpan={8} className="px-4 py-3 text-xs font-bold uppercase tracking-widest" style={{ color:'#94A3B8' }}>
                    Total ({filtered.length} contract{filtered.length!==1?'s':''})
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold" style={{ color:'#10B981' }}>{formatCurrency(totalPaid, displayCcy)}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold" style={{ color:'#F59E0B' }}>{formatCurrency(totalBudget - totalPaid, displayCcy)}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold" style={{ color:'#64748B' }}>
                    {totalBudget > 0 ? Math.round((totalPaid/totalBudget)*100) : 0}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
