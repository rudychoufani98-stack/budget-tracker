'use client'
import { useState, useEffect, useMemo } from 'react'
import { formatCurrency } from '@/lib/format'
import Link from 'next/link'

const TRANCHES = ['T1','T2','T3','T4','One-Shot']
const ESG: Record<string,string> = { E:'#10B981', S:'#3B82F6', G:'#8B5CF6', Other:'#6B7280' }
const TRANCHE_STATUS: Record<string,{label:string;color:string}> = {
  unpaid:          { label:'Unpaid',             color:'#94A3B8' },
  scheduled:       { label:'Scheduled',          color:'#F59E0B' },
  pending_payment: { label:'Sent to Accounting', color:'#3B82F6' },
  paid:            { label:'Paid',               color:'#10B981' },
}

function tranche(tranches: any[], name: string) {
  return tranches.find((t:any) => t.tranche_name === name) || null
}

function TrancheCell({ t, ccy, saving, onSave }: { t: any|null; ccy: string; saving: boolean; onSave: (field:string,val:string)=>void }) {
  const [pop, setPop] = useState(t?.pop_reference || '')
  if (!t) return <td className="px-3 py-3 text-center"><span style={{ color:'#E2E8F0' }}>-</span></td>
  const st = TRANCHE_STATUS[t.status] || TRANCHE_STATUS.unpaid
  return (
    <td className="px-3 py-3 text-center" style={{ borderLeft:'1px solid #F1F5F9' }}>
      <p className="text-xs font-bold mb-0.5" style={{ color:st.color }}>{formatCurrency(t.amount, ccy)}</p>
      {t.scheduled_date && <p className="text-xs" style={{ color:'#94A3B8' }}>{t.scheduled_date.slice(5)}</p>}
      <div className="mt-1 flex items-center justify-center gap-1">
        <div className="w-2 h-2 rounded-full" style={{ background:st.color }}/>
        <span className="text-xs" style={{ color:st.color }}>{st.label}</span>
      </div>
    </td>
  )
}

export default function PaymentRegisterPage() {
  const [contracts,        setContracts]        = useState<any[]>([])
  const [projects,         setProjects]         = useState<{id:string;name:string}[]>([])
  const [sections,         setSections]         = useState<{id:string;name:string}[]>([])
  const [loading,          setLoading]          = useState(true)
  const [saving,           setSaving]           = useState<string|null>(null)
  const [selectedProject,  setSelectedProject]  = useState('')
  const [selectedSection,  setSelectedSection]  = useState('')

  async function load() {
    const [cRes, pRes] = await Promise.all([
      fetch('/api/contracts').then(r=>r.json()),
      fetch('/api/projects').then(r=>r.json()),
    ])
    setContracts(Array.isArray(cRes) ? cRes : [])
    const pList = Array.isArray(pRes) ? pRes : (Array.isArray(pRes?.projects) ? pRes.projects : [])
    setProjects(pList.map((p:any) => ({ id:p.id, name:p.name })))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!selectedProject) { setSections([]); setSelectedSection(''); return }
    fetch(`/api/sections?project_id=${selectedProject}`)
      .then(r=>r.json()).then(d=>setSections(Array.isArray(d)?d:[])).catch(()=>setSections([]))
  }, [selectedProject])

  async function saveCell(trancheId: string, field: string, value: string) {
    setSaving(trancheId)
    await fetch(`/api/tranches/${trancheId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ [field]: value||null }) })
    await load(); setSaving(null)
  }

  function exportCSV() {
    const rows = [['Consultant','Project','Section','Cat','Contract','T1','T2','T3','T4','One-Shot','Paid','Balance','%']]
    for (const c of filtered) {
      const ts = c.contract_tranches || []
      const budget = c.contract_amount || 0
      const paid = ts.filter((x:any)=>x.status==='paid').reduce((s:number,x:any)=>s+x.amount,0)
      rows.push([
        c.service_providers?.name||'', c.projects?.name||c.project||'', c.project_sections?.name||'',
        c.category||'', c.contract_name||'',
        ...TRANCHES.map(n=>{ const t=tranche(ts,n); return t?String(t.amount):'' }),
        String(paid), String(budget-paid), budget>0?Math.round((paid/budget)*100)+'%':'0%',
      ])
    }
    const csv = rows.map(r=>r.map(v=>`"${v.replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv],{type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download='payment-register.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = useMemo(() => contracts.filter((c:any) => {
    if (selectedProject && c.project_id !== selectedProject) return false
    if (selectedSection && c.section_id !== selectedSection) return false
    return true
  }), [contracts, selectedProject, selectedSection])

  // Group by project for display
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

  const totalPaid    = filtered.reduce((s:number,c:any)=>{const ts=c.contract_tranches||[];return s+ts.filter((t:any)=>t.status==='paid').reduce((ss:number,t:any)=>ss+t.amount,0)},0)
  const totalBudget  = filtered.reduce((s:number,c:any)=>s+(c.contract_amount||0),0)
  const hasFilter    = !!(selectedProject || selectedSection)

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"/></div>

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:'#64748B' }}>Finance</p>
          <h1 className="text-2xl font-bold" style={{ color:'#0F172A' }}>Payment Register</h1>
          <p className="text-sm mt-0.5" style={{ color:'#64748B' }}>
            {filtered.length} contract{filtered.length!==1?'s':''} - {formatCurrency(totalPaid)} paid of {formatCurrency(totalBudget)}
          </p>
        </div>
        <div className="flex gap-2">
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
        {hasFilter && (
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
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background:'#F1F5F9' }}>
            <svg width="24" height="24" fill="none" stroke="#64748B" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
          </div>
          <p className="text-base font-semibold mb-1" style={{ color:'#0F172A' }}>No contracts yet</p>
          <p className="text-sm mb-4" style={{ color:'#94A3B8' }}>Create contracts in the Projects tab to see them here.</p>
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
                    <th key={t} className="px-3 py-3 text-center text-xs font-bold uppercase tracking-widest" style={{ color:'#94A3B8', minWidth:100, borderLeft:'1px solid #F1F5F9' }}>{t}</th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-widest" style={{ color:'#94A3B8', minWidth:90 }}>Paid</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-widest" style={{ color:'#94A3B8', minWidth:90 }}>Balance</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-widest" style={{ color:'#94A3B8', minWidth:60 }}>%</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(({ projectName, contracts: pContracts }) => (
                  <>
                    {!selectedProject && (
                      <tr key={`proj-${projectName}`} style={{ background:'#F8FAFC', borderTop:'2px solid #E2E8F0' }}>
                        <td colSpan={10} className="px-4 py-2">
                          <span className="text-xs font-bold uppercase tracking-widest" style={{ color:'#64748B' }}>{projectName}</span>
                        </td>
                      </tr>
                    )}
                    {pContracts.map((c:any) => {
                      const ts = c.contract_tranches || []
                      const budget = c.contract_amount || 0
                      const paid = ts.filter((t:any)=>t.status==='paid').reduce((s:number,t:any)=>s+t.amount,0)
                      const balance = budget - paid
                      const rate = budget > 0 ? Math.round((paid/budget)*100) : 0
                      const ccy = c.currency || 'NGN'
                      const catC = ESG[c.category] || ESG.Other

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
                          </td>
                          {TRANCHES.map(name => {
                            const t = tranche(ts, name)
                            if (!t) return <td key={name} className="px-3 py-3 text-center" style={{ borderLeft:'1px solid #F1F5F9' }}><span style={{ color:'#E2E8F0' }}>-</span></td>
                            const st = TRANCHE_STATUS[t.status] || TRANCHE_STATUS.unpaid
                            return (
                              <td key={name} className="px-3 py-3 text-center" style={{ borderLeft:'1px solid #F1F5F9' }}>
                                <p className="text-xs font-bold mb-0.5" style={{ color:st.color }}>{formatCurrency(t.amount, ccy)}</p>
                                {t.scheduled_date && <p className="text-xs" style={{ color:'#94A3B8' }}>{new Date(t.scheduled_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</p>}
                                <div className="mt-0.5 flex items-center justify-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ background:st.color }}/>
                                  <span className="text-xs" style={{ color:st.color, fontSize:10 }}>{st.label}</span>
                                </div>
                              </td>
                            )
                          })}
                          <td className="px-4 py-3 text-right font-bold text-sm" style={{ color:'#10B981' }}>{formatCurrency(paid, ccy)}</td>
                          <td className="px-4 py-3 text-right text-sm" style={{ color:balance>0?'#F59E0B':'#94A3B8' }}>{formatCurrency(balance, ccy)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs font-bold" style={{ color:rate>=80?'#10B981':rate>=40?'#F59E0B':'#64748B' }}>{rate}%</span>
                          </td>
                        </tr>
                      )
                    })}
                  </>
                ))}
                {/* Totals row */}
                <tr style={{ background:'#F8FAFC', borderTop:'2px solid #E2E8F0' }}>
                  <td colSpan={8} className="px-4 py-3 text-xs font-bold uppercase tracking-widest" style={{ color:'#94A3B8' }}>
                    Total ({filtered.length} contracts)
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold" style={{ color:'#10B981' }}>{formatCurrency(totalPaid)}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold" style={{ color:'#F59E0B' }}>{formatCurrency(totalBudget - totalPaid)}</td>
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