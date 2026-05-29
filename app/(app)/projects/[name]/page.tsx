'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/format'

const CURRENCIES = ['USD','EUR','GBP','CHF','MAD','XOF','NGN','CAD']
const PALETTE     = ['#3B82F6','#8B5CF6','#F59E0B','#EF4444','#10B981','#06B6D4','#F97316','#EC4899']

const PROJ_STATUS: Record<string,{ label:string; color:string; bg:string }> = {
  active:    { label:'Active',    color:'#10B981', bg:'rgba(16,185,129,0.1)' },
  completed: { label:'Completed', color:'#3B82F6', bg:'rgba(59,130,246,0.1)' },
  on_hold:   { label:'On Hold',   color:'#F59E0B', bg:'rgba(245,158,11,0.1)' },
}
const ESG_COLOR: Record<string,string> = { E:'#10B981', S:'#3B82F6', G:'#8B5CF6', Other:'#6B7280' }
const ESG_BG:    Record<string,string> = { E:'rgba(16,185,129,0.1)', S:'rgba(59,130,246,0.1)', G:'rgba(139,92,246,0.1)', Other:'rgba(107,114,128,0.1)' }

export default function ProjectDetailPage({ params }: { params: { name: string } }) {
  const projectId = params.name
  const router    = useRouter()

  const [project, setProject]   = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState('')
  const [editing, setEditing]   = useState(false)
  const [editData, setEditData] = useState<any>({})
  const [saving,  setSaving]    = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [showAddSection,  setShowAddSection]  = useState(false)
  const [providers,       setProviders]       = useState<any[]>([])
  const [sectionForm,     setSectionForm]     = useState({ contract_name:'', service_provider_id:'', currency:'USD', category:'E', description:'' })
  const [addingSection,   setAddingSection]   = useState(false)

  function reload() {
    return fetch(`/api/projects/${projectId}`).then(r=>r.json()).then(d => { if (!d.error) setProject(d) })
  }

  useEffect(() => {
    fetch('/api/providers').then(r=>r.json()).then(d => setProviders(d || []))
    fetch(`/api/projects/${projectId}`).then(r=>r.json()).then(d => {
      if (d.error) { setError(d.error); setLoading(false); return }
      setProject(d)
      setEditData({
        name:        d.name        || '',
        description: d.description || '',
        budget:      d.budget      || '',
        currency:    d.currency    || 'USD',
        start_date:  d.start_date  || '',
        end_date:    d.end_date    || '',
        status:      d.status      || 'active',
      })
      setLoading(false)
    }).catch(() => { setError('Failed to load project'); setLoading(false) })
  }, [projectId])

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/projects/${projectId}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...editData, budget: editData.budget ? parseFloat(editData.budget) : null, start_date: editData.start_date||null, end_date: editData.end_date||null }),
    })
    const d = await res.json()
    if (!d.error) { setProject((p:any) => ({ ...p, ...d })); setEditing(false) }
    setSaving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/projects/${projectId}`, { method:'DELETE' })
    router.push('/projects')
  }

  async function handleAddSection(e: React.FormEvent) {
    e.preventDefault()
    if (!sectionForm.contract_name.trim()) return
    setAddingSection(true)
    await fetch('/api/contracts', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...sectionForm, project_id: projectId, project: project?.name || '', status:'active', contract_amount:0 }),
    })
    setAddingSection(false)
    setShowAddSection(false)
    setSectionForm({ contract_name:'', service_provider_id:'', currency:'USD', category:'E', description:'' })
    reload()
  }

  if (loading) return (
    <div className="flex items-center justify-center" style={{ minHeight:'60vh' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"/>
        <p className="text-sm" style={{ color:'#64748B' }}>Loading project...</p>
      </div>
    </div>
  )
  if (error || !project) return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <p className="text-sm mb-3" style={{ color:'#EF4444' }}>{error || 'Project not found'}</p>
      <Link href="/projects" className="text-sm" style={{ color:'#3B82F6' }}>Back to projects</Link>
    </div>
  )

  const contracts = project.contracts || []
  const totalCommitted = contracts.reduce((s:number,c:any) => s+(c.contract_tranches||[]).reduce((ts:number,t:any)=>ts+(t.amount||0),0), 0)
  const totalPaid      = contracts.reduce((s:number,c:any) => s+(c.contract_tranches||[]).filter((t:any)=>t.status==='paid').reduce((ts:number,t:any)=>ts+(t.amount||0),0), 0)
  const totalScheduled = contracts.reduce((s:number,c:any) => s+(c.contract_tranches||[]).filter((t:any)=>t.status==='scheduled').reduce((ts:number,t:any)=>ts+(t.amount||0),0), 0)
  const pct            = totalCommitted > 0 ? Math.round((totalPaid/totalCommitted)*100) : 0
  const allInvoices    = contracts.flatMap((c:any) => c.invoices || [])
  const pendingAll     = allInvoices.filter((i:any) => !['approved','rejected'].includes(i.status)).length
  const ps             = PROJ_STATUS[project.status] || PROJ_STATUS.active
  const inp            = 'w-full px-3.5 py-2.5 text-sm rounded-xl outline-none'
  const inpSt          = { background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:'#0F172A' }

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color:'#64748B' }}>
        <Link href="/projects" className="hover:text-blue-500 transition-colors">Projects</Link>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        <span style={{ color:'#0F172A' }}>{project.name}</span>
      </div>

      {/* ── 1. PROJECT HEADER + GLOBAL PROGRESS ── */}
      <div className="rounded-2xl overflow-hidden mb-6" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
        <div style={{ height:4, background:'linear-gradient(90deg,#3B82F6,#8B5CF6)' }}/>
        <div className="p-6">
          {!editing ? (
            <>
              <div className="flex items-start justify-between mb-5">
                <div className="flex-1 min-w-0 mr-6">
                  <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                    <h1 className="text-2xl font-bold" style={{ color:'#0F172A' }}>{project.name}</h1>
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:ps.bg, color:ps.color }}>{ps.label}</span>
                    {pendingAll > 0 && (
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:'rgba(245,158,11,0.1)', color:'#F59E0B' }}>
                        {pendingAll} pending invoice{pendingAll!==1?'s':''}
                      </span>
                    )}
                  </div>
                  {project.description && <p className="text-sm mb-1" style={{ color:'#64748B' }}>{project.description}</p>}
                  <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color:'#94A3B8' }}>
                    {project.start_date && <span>From {new Date(project.start_date).toLocaleDateString('en-GB',{month:'short',year:'numeric'})}</span>}
                    {project.end_date   && <span>to {new Date(project.end_date).toLocaleDateString('en-GB',{month:'short',year:'numeric'})}</span>}
                    {project.budget     && <span>Budget: {formatCurrency(project.budget, project.currency||'USD')}</span>}
                    <span>{contracts.length} sub-section{contracts.length!==1?'s':''}</span>
                    <span>{allInvoices.length} invoice{allInvoices.length!==1?'s':''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setEditing(true)} className="text-sm px-3.5 py-2 rounded-xl font-medium" style={{ background:'#F1F5F9', color:'#475569' }}>
                    Edit
                  </button>
                  {confirmDel ? (
                    <div className="flex items-center gap-2">
                      <button onClick={handleDelete} disabled={deleting} className="text-xs px-3 py-2 rounded-xl font-medium disabled:opacity-50" style={{ background:'#EF4444', color:'#fff' }}>
                        {deleting ? 'Deleting...' : 'Confirm'}
                      </button>
                      <button onClick={() => setConfirmDel(false)} className="text-xs px-3 py-2 rounded-xl" style={{ background:'#F1F5F9', color:'#64748B' }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDel(true)} className="text-sm px-3.5 py-2 rounded-xl font-medium" style={{ background:'rgba(239,68,68,0.08)', color:'#EF4444' }}>
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Global KPI cards */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { label:'Committed',    value:formatCurrency(totalCommitted, project.currency||'USD'), color:'#3B82F6', bg:'#EFF6FF' },
                  { label:'Paid',         value:formatCurrency(totalPaid,      project.currency||'USD'), color:'#10B981', bg:'#F0FDF4' },
                  { label:'Scheduled',    value:formatCurrency(totalScheduled, project.currency||'USD'), color:'#F59E0B', bg:'#FFFBEB' },
                  { label:'Payment Rate', value:`${pct}%`, color:pct>=80?'#10B981':pct>=40?'#F59E0B':'#EF4444', bg:pct>=80?'#F0FDF4':pct>=40?'#FFFBEB':'#FEF2F2' },
                ].map(k=>(
                  <div key={k.label} className="rounded-xl px-4 py-3.5" style={{ background:k.bg }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:'#94A3B8' }}>{k.label}</p>
                    <p className="text-xl font-bold" style={{ color:k.color }}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Global progress bar */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs font-medium" style={{ color:'#94A3B8' }}>Overall payment progress</span>
                  <span className="text-xs font-bold" style={{ color:'#3B82F6' }}>{pct}%</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background:'#F1F5F9' }}>
                  <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background:'linear-gradient(90deg,#3B82F6,#8B5CF6)' }}/>
                </div>
              </div>
            </>
          ) : (
            /* Edit form */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Project Name</label>
                  <input className={inp} style={inpSt} value={editData.name} onChange={e=>setEditData((p:any)=>({...p,name:e.target.value}))}/>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Status</label>
                  <select className={inp} style={inpSt} value={editData.status} onChange={e=>setEditData((p:any)=>({...p,status:e.target.value}))}>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Description</label>
                  <input className={inp} style={inpSt} value={editData.description} onChange={e=>setEditData((p:any)=>({...p,description:e.target.value}))}/>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Budget</label>
                  <input type="number" className={inp} style={inpSt} value={editData.budget} onChange={e=>setEditData((p:any)=>({...p,budget:e.target.value}))}/>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Currency</label>
                  <select className={inp} style={inpSt} value={editData.currency} onChange={e=>setEditData((p:any)=>({...p,currency:e.target.value}))}>
                    {CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Start Date</label>
                  <input type="date" className={inp} style={inpSt} value={editData.start_date} onChange={e=>setEditData((p:any)=>({...p,start_date:e.target.value}))}/>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>End Date</label>
                  <input type="date" className={inp} style={inpSt} value={editData.end_date} onChange={e=>setEditData((p:any)=>({...p,end_date:e.target.value}))}/>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background:'#3B82F6', color:'#fff' }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => setEditing(false)} className="px-5 py-2.5 rounded-xl text-sm" style={{ background:'#F1F5F9', color:'#64748B' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. SUB-SECTIONS ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold" style={{ color:'#0F172A' }}>Contracts</h2>
          <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>Each contract has its own budget and linked invoices</p>
        </div>
        <button
          onClick={() => setShowAddSection(true)}
          className="text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2"
          style={{ background:'#3B82F6', color:'#fff' }}
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Contract
        </button>
      </div>

      {contracts.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
          <div className="text-4xl mb-3">📂</div>
          <p className="text-sm font-semibold mb-1" style={{ color:'#0F172A' }}>No sub-sections yet</p>
          <p className="text-sm mb-5" style={{ color:'#94A3B8' }}>Add your first sub-section to start tracking budgets and invoices.</p>
          <button onClick={() => setShowAddSection(true)} className="text-sm font-semibold px-5 py-2.5 rounded-xl" style={{ background:'#3B82F6', color:'#fff' }}>
            + Add Contract
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {contracts.map((c:any, i:number) => {
            const tranches   = c.contract_tranches || []
            const cTotal     = tranches.reduce((s:number,t:any) => s+(t.amount||0), 0)
            const cPaid      = tranches.filter((t:any)=>t.status==='paid').reduce((s:number,t:any)=>s+(t.amount||0), 0)
            const cScheduled = tranches.filter((t:any)=>t.status==='scheduled').reduce((s:number,t:any)=>s+(t.amount||0), 0)
            const cPct       = cTotal > 0 ? Math.round((cPaid/cTotal)*100) : 0
            const invoices   = c.invoices || []
            const cPending   = invoices.filter((i:any)=>!['approved','rejected'].includes(i.status)).length
            const color      = PALETTE[i % PALETTE.length]
            const catC       = ESG_COLOR[c.category] || ESG_COLOR.Other
            const catBg      = ESG_BG[c.category]    || ESG_BG.Other

            return (
              <div key={c.id} className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
                {/* Color stripe */}
                <div style={{ height:4, background:color }}/>

                {/* Card body */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-base font-semibold" style={{ color:'#0F172A' }}>{c.contract_name}</h3>
                        {c.category && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:catBg, color:catC }}>{c.category}</span>
                        )}
                        {cPending > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:'rgba(245,158,11,0.1)', color:'#F59E0B' }}>
                            {cPending} pending
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color:'#94A3B8' }}>
                        {c.service_providers?.name || 'No consultant assigned'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>
                        {invoices.length} invoice{invoices.length!==1?'s':''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold" style={{ color }}>{cPct}%</p>
                      <p className="text-xs" style={{ color:'#94A3B8' }}>paid</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 rounded-full overflow-hidden mb-1" style={{ background:'#F1F5F9' }}>
                    <div style={{ width:`${cPct}%`, height:'100%', background:color, borderRadius:4 }}/>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4" style={{ borderTop:'1px solid #F8FAFC' }}>
                    {[
                      { label:'Budget',    value:formatCurrency(cTotal,     c.currency||'USD'), color:'#0F172A'  },
                      { label:'Paid',      value:formatCurrency(cPaid,      c.currency||'USD'), color:'#10B981'  },
                      { label:'Scheduled', value:formatCurrency(cScheduled, c.currency||'USD'), color:'#F59E0B' },
                    ].map(s=>(
                      <div key={s.label}>
                        <p className="text-xs mb-0.5" style={{ color:'#94A3B8' }}>{s.label}</p>
                        <p className="text-sm font-semibold" style={{ color:s.color }}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer: View Details link */}
                <Link
                  href={`/contracts/${c.id}`}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-slate-50"
                  style={{ borderTop:'1px solid #F1F5F9' }}
                >
                  <span className="text-xs font-semibold" style={{ color:'#3B82F6' }}>View invoices & tranches</span>
                  <svg width="14" height="14" fill="none" stroke="#3B82F6" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* ── ADD SUB-SECTION MODAL ── */}
      {showAddSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.5)' }} onClick={() => setShowAddSection(false)}>
          <div className="rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl" style={{ background:'#FFFFFF' }} onClick={e => e.stopPropagation()}>
            <div style={{ height:4, background:'linear-gradient(90deg,#3B82F6,#8B5CF6)' }}/>
            <div className="p-6">
              <h3 className="text-lg font-bold mb-5" style={{ color:'#0F172A' }}>Add Contract to this Project</h3>
              <form onSubmit={handleAddSection} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Contract Name *</label>
                  <input
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none"
                    style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:'#0F172A' }}
                    placeholder="e.g. Environmental Assessment Phase 1"
                    value={sectionForm.contract_name}
                    onChange={e => setSectionForm(p=>({...p, contract_name:e.target.value}))}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Consultant</label>
                    <select
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none"
                      style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:'#0F172A' }}
                      value={sectionForm.service_provider_id}
                      onChange={e => setSectionForm(p=>({...p, service_provider_id:e.target.value}))}
                    >
                      <option value="">Select consultant...</option>
                      {providers.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>ESG Category</label>
                    <select
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none"
                      style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:'#0F172A' }}
                      value={sectionForm.category}
                      onChange={e => setSectionForm(p=>({...p, category:e.target.value}))}
                    >
                      <option value="E">E - Environmental</option>
                      <option value="S">S - Social</option>
                      <option value="G">G - Governance</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Description</label>
                  <textarea
                    rows={2}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none resize-none"
                    style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:'#0F172A' }}
                    placeholder="Brief scope of this sub-section..."
                    value={sectionForm.description}
                    onChange={e => setSectionForm(p=>({...p, description:e.target.value}))}
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={addingSection} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background:'#3B82F6', color:'#fff' }}>
                    {addingSection ? 'Creating...' : 'Create Contract'}
                  </button>
                  <button type="button" onClick={() => setShowAddSection(false)} className="px-5 py-3 rounded-xl text-sm" style={{ background:'#F1F5F9', color:'#64748B' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
