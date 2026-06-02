'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/format'

const CURRENCIES = ['NGN','USD']
const PALETTE     = ['#3B82F6','#8B5CF6','#F59E0B','#EF4444','#10B981','#06B6D4','#F97316','#EC4899']

const PROJ_STATUS: Record<string,{label:string;color:string;bg:string}> = {
  active:    { label:'Active',    color:'#10B981', bg:'rgba(16,185,129,0.1)' },
  completed: { label:'Completed', color:'#3B82F6', bg:'rgba(59,130,246,0.1)' },
  on_hold:   { label:'On Hold',   color:'#F59E0B', bg:'rgba(245,158,11,0.1)' },
}
const ESG_COLOR: Record<string,string> = { E:'#10B981', S:'#3B82F6', G:'#8B5CF6', Other:'#6B7280' }

function stats(contracts: any[]) {
  const committed = contracts.reduce((s,c)=>s+(c.contract_amount||c.contract_tranches||[]).reduce
    ? s+(c.contract_amount||0)
    : s,0)
  // Use contract_amount as the committed value; fall back to summing tranches
  const totalCommitted = contracts.reduce((s,c)=>{
    const byAmount = c.contract_amount || 0
    const byTranches = (c.contract_tranches||[]).reduce((ts:number,t:any)=>ts+(t.amount||0),0)
    return s + (byAmount || byTranches)
  },0)
  const paid      = contracts.reduce((s,c)=>s+(c.contract_tranches||[]).filter((t:any)=>t.status==='paid').reduce((ts:number,t:any)=>ts+(t.amount||0),0),0)
  const scheduled = contracts.reduce((s,c)=>s+(c.contract_tranches||[]).filter((t:any)=>t.status==='scheduled').reduce((ts:number,t:any)=>ts+(t.amount||0),0),0)
  const invoices  = contracts.reduce((s,c)=>s+(c.invoices||[]).length,0)
  const pending   = contracts.reduce((s,c)=>s+(c.invoices||[]).filter((i:any)=>!['approved','rejected'].includes(i.status)).length,0)
  const pct       = totalCommitted>0 ? Math.round((paid/totalCommitted)*100) : 0
  // Detect dominant currency (use contract currency, not section currency)
  const ccySet = new Set(contracts.map(c=>c.currency).filter(Boolean))
  const dominantCcy = ccySet.size === 1 ? Array.from(ccySet)[0] : null
  return { committed:totalCommitted, paid, scheduled, invoices, pending, pct, dominantCcy }
}

export default function ProjectDetailPage({ params }: { params: { name: string } }) {
  const projectId = params.name
  const router    = useRouter()

  const [project,    setProject]    = useState<any>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [editing,    setEditing]    = useState(false)
  const [editData,   setEditData]   = useState<any>({})
  const [saving,     setSaving]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [providers,  setProviders]  = useState<any[]>([])

  // Section modal
  const [showAddSection, setShowAddSection]   = useState(false)
  const [sectionForm,    setSectionForm]      = useState({ name:'', description:'', budget:'', currency:'NGN', start_date:'', end_date:'', status:'active' })
  const [addingSection,  setAddingSection]    = useState(false)
  const [sectionError,   setSectionError]     = useState('')

  // Contract modal
  const [showAddContract, setShowAddContract] = useState(false)
  const [contractSectionId, setContractSectionId] = useState('')
  const [contractForm, setContractForm] = useState({ contract_name:'', service_provider_id:'', category:'E', currency:'NGN', description:'' })
  const [addingContract, setAddingContract]   = useState(false)

  function reload() {
    return fetch(`/api/projects/${projectId}`).then(r=>r.json()).then(d=>{ if(!d.error) setProject(d) })
  }

  useEffect(() => {
    fetch('/api/providers').then(r=>r.json()).then(d=>setProviders(d||[]))
    fetch(`/api/projects/${projectId}`).then(r=>r.json()).then(d=>{
      if (d.error) { setError(d.error); setLoading(false); return }
      setProject(d)
      setEditData({ name:d.name||'', description:d.description||'', budget:d.budget||'', currency:d.currency||'NGN', start_date:d.start_date||'', end_date:d.end_date||'', status:d.status||'active' })
      setLoading(false)
    }).catch(()=>{ setError('Failed to load'); setLoading(false) })
  }, [projectId])

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/projects/${projectId}`, { method:'PATCH', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ ...editData, budget:editData.budget?parseFloat(editData.budget):null, start_date:editData.start_date||null, end_date:editData.end_date||null }) })
    const d = await res.json()
    if (!d.error) { setProject((p:any)=>({...p,...d})); setEditing(false) }
    setSaving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/projects/${projectId}`, { method:'DELETE' })
    router.push('/projects')
  }

  async function handleAddSection(e: React.FormEvent) {
    e.preventDefault()
    setSectionError('')
    setAddingSection(true)
    const res = await fetch('/api/sections', { method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ ...sectionForm, project_id:projectId, budget:sectionForm.budget?parseFloat(sectionForm.budget):null, start_date:sectionForm.start_date||null, end_date:sectionForm.end_date||null }) })
    const data = await res.json()
    setAddingSection(false)
    if (!res.ok || data.error) { setSectionError(data.error || 'Failed to create section'); return }
    setShowAddSection(false)
    setSectionForm({ name:'', description:'', budget:'', currency:'NGN', start_date:'', end_date:'', status:'active' })
    setSectionError('')
    await reload()
  }

  async function handleAddContract(e: React.FormEvent) {
    e.preventDefault(); setAddingContract(true)
    const res = await fetch('/api/contracts', { method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ ...contractForm, project_id:projectId, project:project?.name||'', section_ids: contractSectionId ? [contractSectionId] : [], status:'active', contract_amount:0 }) })
    const data = await res.json()
    setAddingContract(false)
    if (!res.ok || data.error) { alert(data.error || 'Failed to create contract'); return }
    setShowAddContract(false)
    setContractForm({ contract_name:'', service_provider_id:'', category:'E', currency:'NGN', description:'' })
    setContractSectionId('')
    await reload()
  }

  async function deleteSection(sectionId: string) {
    if (!confirm('Delete this section? Contracts in it will be unlinked.')) return
    await fetch(`/api/sections/${sectionId}`, { method:'DELETE' })
    reload()
  }

  if (loading) return <div className="flex items-center justify-center" style={{ minHeight:'60vh' }}><div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"/></div>
  if (error||!project) return <div className="px-6 py-8"><p style={{ color:'#EF4444' }}>{error||'Not found'}</p><Link href="/projects" style={{ color:'#3B82F6' }}>Back</Link></div>

  const sections       = project.sections || []
  const directContracts = project.directContracts || []
  const allContracts   = project.allContracts || []
  const global         = stats(allContracts)
  const ps             = PROJ_STATUS[project.status] || PROJ_STATUS.active
  const ccy            = project.currency || 'NGN'
  const inp            = 'w-full px-3.5 py-2.5 text-sm rounded-xl outline-none'
  const inpSt          = { background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:'#0F172A' }

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color:'#64748B' }}>
        <Link href="/projects" className="hover:text-blue-500">Projects</Link>
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
                    {global.pending>0 && <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:'rgba(245,158,11,0.1)', color:'#F59E0B' }}>{global.pending} pending invoices</span>}
                  </div>
                  {project.description && <p className="text-sm mb-1" style={{ color:'#64748B' }}>{project.description}</p>}
                  <p className="text-xs" style={{ color:'#94A3B8' }}>
                    {sections.length} section{sections.length!==1?'s':''}
                    {' · '}{directContracts.length} direct contract{directContracts.length!==1?'s':''}
                    {' · '}{global.invoices} invoice{global.invoices!==1?'s':''}
                    {project.budget && ` · Budget: ${formatCurrency(project.budget, ccy)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>setEditing(true)} className="text-sm px-3.5 py-2 rounded-xl font-medium" style={{ background:'#F1F5F9', color:'#475569' }}>Edit</button>
                  {confirmDel ? (
                    <div className="flex items-center gap-2">
                      <button onClick={handleDelete} disabled={deleting} className="text-xs px-3 py-2 rounded-xl font-medium disabled:opacity-50" style={{ background:'#EF4444', color:'#fff' }}>{deleting?'...':'Confirm'}</button>
                      <button onClick={()=>setConfirmDel(false)} className="text-xs px-3 py-2 rounded-xl" style={{ background:'#F1F5F9', color:'#64748B' }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={()=>setConfirmDel(true)} className="text-sm px-3.5 py-2 rounded-xl font-medium" style={{ background:'rgba(239,68,68,0.08)', color:'#EF4444' }}>Delete</button>
                  )}
                </div>
              </div>

              {/* Global KPIs */}
              {(() => { const gCcy = global.dominantCcy || ccy; return (
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label:'Committed',    value:formatCurrency(global.committed, gCcy), color:'#3B82F6', bg:'#EFF6FF' },
                  { label:'Paid',         value:formatCurrency(global.paid,      gCcy), color:'#10B981', bg:'#F0FDF4' },
                  { label:'Scheduled',    value:formatCurrency(global.scheduled, gCcy), color:'#F59E0B', bg:'#FFFBEB' },
                  { label:'Payment Rate', value:`${global.pct}%`, color:global.pct>=80?'#10B981':global.pct>=40?'#F59E0B':'#EF4444', bg:global.pct>=80?'#F0FDF4':global.pct>=40?'#FFFBEB':'#FEF2F2' },
                ].map(k=>(
                  <div key={k.label} className="rounded-xl px-4 py-3.5" style={{ background:k.bg }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:'#94A3B8' }}>{k.label}</p>
                    <p className="text-xl font-bold" style={{ color:k.color }}>{k.value}</p>
                  </div>
                ))}
              </div>
              )})()}
              <div className="h-3 rounded-full overflow-hidden" style={{ background:'#F1F5F9' }}>
                <div className="h-full rounded-full" style={{ width:`${global.pct}%`, background:'linear-gradient(90deg,#3B82F6,#8B5CF6)' }}/>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Name</label><input className={inp} style={inpSt} value={editData.name} onChange={e=>setEditData((p:any)=>({...p,name:e.target.value}))}/></div>
                <div><label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Status</label>
                  <select className={inp} style={inpSt} value={editData.status} onChange={e=>setEditData((p:any)=>({...p,status:e.target.value}))}>
                    <option value="active">Active</option><option value="completed">Completed</option><option value="on_hold">On Hold</option>
                  </select>
                </div>
                <div className="col-span-2"><label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Description</label><input className={inp} style={inpSt} value={editData.description} onChange={e=>setEditData((p:any)=>({...p,description:e.target.value}))}/></div>
                <div><label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Budget</label><input type="number" className={inp} style={inpSt} value={editData.budget} onChange={e=>setEditData((p:any)=>({...p,budget:e.target.value}))}/></div>
                <div><label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Currency</label>
                  <select className={inp} style={inpSt} value={editData.currency} onChange={e=>setEditData((p:any)=>({...p,currency:e.target.value}))}>
                    {CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Start Date</label><input type="date" className={inp} style={inpSt} value={editData.start_date} onChange={e=>setEditData((p:any)=>({...p,start_date:e.target.value}))}/></div>
                <div><label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>End Date</label><input type="date" className={inp} style={inpSt} value={editData.end_date} onChange={e=>setEditData((p:any)=>({...p,end_date:e.target.value}))}/></div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background:'#3B82F6', color:'#fff' }}>{saving?'Saving...':'Save'}</button>
                <button onClick={()=>setEditing(false)} className="px-5 py-2.5 rounded-xl text-sm" style={{ background:'#F1F5F9', color:'#64748B' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. SECTIONS ── */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold" style={{ color:'#0F172A' }}>Sections</h2>
          <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>Groupings within this project — each has its own budget and contracts</p>
        </div>
        <button onClick={()=>setShowAddSection(true)} className="text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2" style={{ background:'#8B5CF6', color:'#fff' }}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Section
        </button>
      </div>

      {sections.length === 0 && (
        <div className="rounded-2xl p-8 text-center mb-6" style={{ background:'#FFFFFF', border:'1px dashed #E2E8F0' }}>
          <p className="text-sm" style={{ color:'#64748B' }}>No sections yet.</p>
          <p className="text-xs mt-1" style={{ color:'#94A3B8' }}>Create sections to group contracts by phase, location, or theme.</p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        {sections.map((sec:any, si:number) => {
          const secStats = stats(sec.contracts || [])
          const secColor = PALETTE[(si+1) % PALETTE.length]
          const secStatus = PROJ_STATUS[sec.status] || PROJ_STATUS.active
          return (
            <div key={sec.id} className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
              <div style={{ height:4, background:secColor }}/>
              <div className="p-5">
                {/* Section header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-base font-bold" style={{ color:'#0F172A' }}>{sec.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:secStatus.bg, color:secStatus.color }}>{secStatus.label}</span>
                    </div>
                    {sec.description && <p className="text-xs mb-1" style={{ color:'#64748B' }}>{sec.description}</p>}
                    <p className="text-xs" style={{ color:'#94A3B8' }}>
                      {(sec.contracts||[]).length} contract{(sec.contracts||[]).length!==1?'s':''}
                      {sec.budget && ` · Budget: ${formatCurrency(sec.budget, sec.currency||'NGN')}`}
                      {sec.start_date && ` · ${new Date(sec.start_date).toLocaleDateString('en-GB',{month:'short',year:'numeric'})} → ${new Date(sec.end_date||sec.start_date).toLocaleDateString('en-GB',{month:'short',year:'numeric'})}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-2xl font-bold" style={{ color:secColor }}>{secStats.pct}%</p>
                      <p className="text-xs" style={{ color:'#94A3B8' }}>paid</p>
                    </div>
                    <button onClick={()=>deleteSection(sec.id)} className="text-xs px-2 py-1.5 rounded-lg" style={{ color:'#EF4444', background:'rgba(239,68,68,0.08)' }}>Delete</button>
                  </div>
                </div>

                {/* Section KPIs — use the contracts' actual currency */}
                {(() => { const displayCcy = secStats.dominantCcy || ccy; return (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label:'Committed', value:formatCurrency(secStats.committed, displayCcy), color:'#3B82F6' },
                    { label:'Paid',      value:formatCurrency(secStats.paid,      displayCcy), color:'#10B981' },
                    { label:'Balance',   value:formatCurrency(secStats.committed-secStats.paid, displayCcy), color:'#F59E0B' },
                  ].map(k=>(
                    <div key={k.label} className="rounded-lg px-3 py-2.5" style={{ background:'#F8FAFC' }}>
                      <p className="text-xs mb-0.5" style={{ color:'#94A3B8' }}>{k.label}</p>
                      <p className="text-sm font-bold" style={{ color:k.color }}>{k.value}</p>
                    </div>
                  ))}
                </div>
                )})()}

                {/* Section progress bar */}
                <div className="h-2 rounded-full overflow-hidden mb-4" style={{ background:'#F1F5F9' }}>
                  <div style={{ width:`${secStats.pct}%`, height:'100%', background:secColor, borderRadius:4 }}/>
                </div>

                {/* Contracts in this section */}
                {(sec.contracts||[]).length > 0 && (
                  <div className="space-y-2">
                    {(sec.contracts||[]).map((c:any) => {
                      const cs = stats([c])
                      const catC = ESG_COLOR[c.category] || ESG_COLOR.Other
                      return (
                        <Link key={c.id} href={`/contracts/${c.id}`} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-blue-50/50 transition-colors" style={{ background:'#F8FAFC', border:'1px solid #F1F5F9' }}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            {c.category && <span className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0" style={{ background:`${catC}18`, color:catC }}>{c.category}</span>}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color:'#0F172A' }}>{c.contract_name}</p>
                              <p className="text-xs truncate" style={{ color:'#94A3B8' }}>{c.service_providers?.name||'No consultant'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0 ml-4">
                            <div className="text-right">
                              <p className="text-sm font-semibold" style={{ color:'#0F172A' }}>{formatCurrency(cs.committed, c.currency||ccy)}</p>
                              <p className="text-xs" style={{ color:'#94A3B8' }}>{cs.pct}% paid</p>
                            </div>
                            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background:'#E2E8F0' }}>
                              <div style={{ width:`${cs.pct}%`, height:'100%', background:secColor }}/>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}

                {/* Add contract to this section */}
                <button
                  onClick={()=>{ setContractSectionId(sec.id); setShowAddContract(true) }}
                  className="mt-3 w-full py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-slate-100"
                  style={{ border:`1px dashed ${secColor}40`, color:secColor }}
                >
                  + Add Contract to this section
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── 3. DIRECT CONTRACTS ── */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold" style={{ color:'#0F172A' }}>Direct Contracts</h2>
          <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>Contracts linked directly to this project (no section)</p>
        </div>
        <button
          onClick={()=>{ setContractSectionId(''); setShowAddContract(true) }}
          className="text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2"
          style={{ background:'#3B82F6', color:'#fff' }}
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Contract
        </button>
      </div>

      {directContracts.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background:'#FFFFFF', border:'1px dashed #E2E8F0' }}>
          <p className="text-sm" style={{ color:'#64748B' }}>No direct contracts yet.</p>
          <p className="text-xs mt-1" style={{ color:'#94A3B8' }}>Add a contract directly to this project, or use sections to group them.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {directContracts.map((c:any, ci:number) => {
            const cs    = stats([c])
            const col   = PALETTE[ci % PALETTE.length]
            const catC  = ESG_COLOR[c.category] || ESG_COLOR.Other
            return (
              <div key={c.id} className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
                <div style={{ height:4, background:col }}/>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        {c.category && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:`${catC}18`, color:catC }}>{c.category}</span>}
                        <p className="text-sm font-bold truncate" style={{ color:'#0F172A' }}>{c.contract_name}</p>
                      </div>
                      <p className="text-xs" style={{ color:'#94A3B8' }}>{c.service_providers?.name||'No consultant'}</p>
                      <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>{(c.invoices||[]).length} invoice{(c.invoices||[]).length!==1?'s':''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold" style={{ color:col }}>{cs.pct}%</p>
                      <p className="text-xs" style={{ color:'#94A3B8' }}>paid</p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background:'#F1F5F9' }}>
                    <div style={{ width:`${cs.pct}%`, height:'100%', background:col, borderRadius:4 }}/>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label:'Committed', value:formatCurrency(cs.committed, c.currency||ccy), color:'#0F172A' },
                      { label:'Paid',      value:formatCurrency(cs.paid,      c.currency||ccy), color:'#10B981' },
                      { label:'Balance',   value:formatCurrency(cs.committed-cs.paid, c.currency||ccy), color:'#F59E0B' },
                    ].map(s=>(
                      <div key={s.label} className="rounded-lg px-2.5 py-2" style={{ background:'#F8FAFC' }}>
                        <p className="text-xs mb-0.5" style={{ color:'#94A3B8' }}>{s.label}</p>
                        <p className="text-xs font-bold" style={{ color:s.color }}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <Link href={`/contracts/${c.id}`} className="flex items-center justify-between px-3 py-2 rounded-xl transition-colors hover:bg-slate-50" style={{ border:'1px solid #F1F5F9' }}>
                    <span className="text-xs font-semibold" style={{ color:'#3B82F6' }}>View invoices & tranches</span>
                    <svg width="13" height="13" fill="none" stroke="#3B82F6" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── ADD SECTION MODAL ── */}
      {showAddSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.5)' }} onClick={()=>setShowAddSection(false)}>
          <div className="rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl" style={{ background:'#FFFFFF' }} onClick={e=>e.stopPropagation()}>
            <div style={{ height:4, background:'linear-gradient(90deg,#8B5CF6,#3B82F6)' }}/>
            <div className="p-6">
              <h3 className="text-lg font-bold mb-5" style={{ color:'#0F172A' }}>Add Section</h3>
              <form onSubmit={handleAddSection} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Section Name *</label>
                  <input className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none" style={inpSt} placeholder="e.g. Phase 1 - Environmental" value={sectionForm.name} onChange={e=>setSectionForm(p=>({...p,name:e.target.value}))} required/>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Description</label>
                  <textarea rows={2} className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none resize-none" style={inpSt} placeholder="Brief scope..." value={sectionForm.description} onChange={e=>setSectionForm(p=>({...p,description:e.target.value}))}/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Budget</label>
                    <input type="number" className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none" style={inpSt} placeholder="500000" value={sectionForm.budget} onChange={e=>setSectionForm(p=>({...p,budget:e.target.value}))}/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Currency</label>
                    <select className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none" style={inpSt} value={sectionForm.currency} onChange={e=>setSectionForm(p=>({...p,currency:e.target.value}))}>
                      {CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Start Date</label>
                    <input type="date" className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none" style={inpSt} value={sectionForm.start_date} onChange={e=>setSectionForm(p=>({...p,start_date:e.target.value}))}/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>End Date</label>
                    <input type="date" className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none" style={inpSt} value={sectionForm.end_date} onChange={e=>setSectionForm(p=>({...p,end_date:e.target.value}))}/>
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  {sectionError && <p className="text-xs px-3 py-2 rounded-xl col-span-2" style={{ background:'rgba(239,68,68,0.08)', color:'#EF4444', border:'1px solid rgba(239,68,68,0.2)' }}>{sectionError}</p>}
                  <button type="submit" disabled={addingSection} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background:'#8B5CF6', color:'#fff' }}>{addingSection?'Creating...':'Create Section'}</button>
                  <button type="button" onClick={()=>setShowAddSection(false)} className="px-5 py-3 rounded-xl text-sm" style={{ background:'#F1F5F9', color:'#64748B' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD CONTRACT MODAL ── */}
      {showAddContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.5)' }} onClick={()=>setShowAddContract(false)}>
          <div className="rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl" style={{ background:'#FFFFFF' }} onClick={e=>e.stopPropagation()}>
            <div style={{ height:4, background:'linear-gradient(90deg,#3B82F6,#10B981)' }}/>
            <div className="p-6">
              <h3 className="text-lg font-bold mb-1" style={{ color:'#0F172A' }}>Add Contract</h3>
              <p className="text-xs mb-5" style={{ color:'#94A3B8' }}>
                {contractSectionId
                  ? `Adding to: ${sections.find((s:any)=>s.id===contractSectionId)?.name}`
                  : 'Adding directly to the project'}
              </p>
              <form onSubmit={handleAddContract} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Contract Name *</label>
                  <input className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none" style={inpSt} placeholder="e.g. Environmental Assessment Phase 1" value={contractForm.contract_name} onChange={e=>setContractForm(p=>({...p,contract_name:e.target.value}))} required/>
                </div>
                {sections.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Section (optional)</label>
                    <select className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none" style={inpSt} value={contractSectionId} onChange={e=>setContractSectionId(e.target.value)}>
                      <option value="">Direct to project (no section)</option>
                      {sections.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Consultant</label>
                    <select className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none" style={inpSt} value={contractForm.service_provider_id} onChange={e=>setContractForm(p=>({...p,service_provider_id:e.target.value}))}>
                      <option value="">Select...</option>
                      {providers.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>ESG Category</label>
                    <select className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none" style={inpSt} value={contractForm.category} onChange={e=>setContractForm(p=>({...p,category:e.target.value}))}>
                      <option value="E">E - Environmental</option>
                      <option value="S">S - Social</option>
                      <option value="G">G - Governance</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={addingContract} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background:'#3B82F6', color:'#fff' }}>{addingContract?'Creating...':'Create Contract'}</button>
                  <button type="button" onClick={()=>setShowAddContract(false)} className="px-5 py-3 rounded-xl text-sm" style={{ background:'#F1F5F9', color:'#64748B' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
