'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/format'

const CURRENCIES = ['EUR','USD','GBP','CHF','MAD','XOF','NGN','CAD']

const INV_STATUS: Record<string,{ label:string; color:string; bg:string }> = {
  pending_review:  { label:'Awaiting Rudy',    color:'#F97316', bg:'rgba(249,115,22,0.1)'  },
  pending_placide: { label:'Awaiting Placide', color:'#D97706', bg:'rgba(217,119,6,0.1)'   },
  pending_hitech:  { label:'Awaiting Dani',    color:'#7C3AED', bg:'rgba(124,58,237,0.1)'  },
  approved:        { label:'Approved',          color:'#10B981', bg:'rgba(16,185,129,0.1)'  },
  rejected:        { label:'Rejected',          color:'#EF4444', bg:'rgba(239,68,68,0.1)'   },
}
const PROJ_STATUS: Record<string,{ label:string; color:string; bg:string }> = {
  active:    { label:'Active',    color:'#10B981', bg:'rgba(16,185,129,0.1)' },
  completed: { label:'Completed', color:'#3B82F6', bg:'rgba(59,130,246,0.1)' },
  on_hold:   { label:'On Hold',   color:'#F59E0B', bg:'rgba(245,158,11,0.1)' },
}
const ESG_COLOR: Record<string,string> = { E:'#10B981', S:'#3B82F6', G:'#8B5CF6', Other:'#6B7280' }

function getMonths(start: string, end: string) {
  const months: Date[] = []
  const d = new Date(start); d.setDate(1)
  const endD = new Date(end)
  while (d <= endD) { months.push(new Date(d)); d.setMonth(d.getMonth()+1) }
  return months
}

export default function ProjectDetailPage({ params }: { params: { name: string } }) {
  const projectId = params.name   // folder is [name] but holds a UUID
  const router = useRouter()

  const [project, setProject]   = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [editing, setEditing]   = useState(false)
  const [editData, setEditData] = useState<any>({})
  const [saving, setSaving]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setProject(d)
        setEditData({
          name:        d.name         || '',
          description: d.description  || '',
          budget:      d.budget       || '',
          currency:    d.currency     || 'EUR',
          start_date:  d.start_date   || '',
          end_date:    d.end_date     || '',
          status:      d.status       || 'active',
        })
        setLoading(false)
      })
      .catch(() => { setError('Failed to load project'); setLoading(false) })
  }, [projectId])

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editData,
        budget:     editData.budget     ? parseFloat(editData.budget) : null,
        start_date: editData.start_date || null,
        end_date:   editData.end_date   || null,
      }),
    })
    const d = await res.json()
    if (!d.error) { setProject((p: any) => ({ ...p, ...d })); setEditing(false) }
    setSaving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/projects/${projectId}`, { method:'DELETE' })
    router.push('/projects')
  }

  if (loading) return (
    <div className="flex items-center justify-center" style={{ minHeight:'60vh' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"/>
        <p className="text-sm" style={{ color:'#64748B' }}>Loading project…</p>
      </div>
    </div>
  )

  if (error || !project) return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <p className="text-sm mb-3" style={{ color:'#EF4444' }}>{error || 'Project not found'}</p>
      <Link href="/projects" className="text-sm" style={{ color:'#3B82F6' }}>← Back to projects</Link>
    </div>
  )

  const contracts = project.contracts || []

  // Stats
  const totalCommitted = contracts.reduce((s:number,c:any)=>s+(c.contract_tranches||[]).reduce((ts:number,t:any)=>ts+(t.amount||0),0),0)
  const totalPaid      = contracts.reduce((s:number,c:any)=>s+(c.contract_tranches||[]).filter((t:any)=>t.status==='paid').reduce((ts:number,t:any)=>ts+(t.amount||0),0),0)
  const totalScheduled = contracts.reduce((s:number,c:any)=>s+(c.contract_tranches||[]).filter((t:any)=>t.status==='scheduled').reduce((ts:number,t:any)=>ts+(t.amount||0),0),0)
  const pct            = totalCommitted>0 ? Math.round((totalPaid/totalCommitted)*100) : 0
  const allInvoices    = contracts.flatMap((c:any)=>(c.invoices||[]))
  const pendingInvs    = allInvoices.filter((i:any)=>!['approved','rejected'].includes(i.status))

  // Timeline bounds
  const allDates = contracts.flatMap((c:any)=>[c.start_date,c.end_date].filter(Boolean)).sort()
  const tStart   = project.start_date || allDates[0]   || null
  const tEnd     = project.end_date   || allDates[allDates.length-1] || null
  const hasDates = !!(tStart && tEnd)

  const tsMs = tStart ? new Date(tStart).getTime() : 0
  const teMs = tEnd   ? new Date(tEnd).getTime()   : 0
  const totalMs = teMs - tsMs

  function pct2(dateStr: string) {
    if (!totalMs) return 0
    return Math.max(0, Math.min(100, (new Date(dateStr).getTime() - tsMs) / totalMs * 100))
  }

  const months     = hasDates ? getMonths(tStart!, tEnd!) : []
  const labelStep  = Math.max(1, Math.ceil(months.length / 10))
  const monthLabels = months.filter((_,i) => i % labelStep === 0)

  const ps = PROJ_STATUS[project.status] || PROJ_STATUS.active

  const inp = 'w-full px-3.5 py-2.5 text-sm rounded-xl outline-none'
  const inpSt = { background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:'#0F172A' }

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color:'#64748B' }}>
        <Link href="/projects" className="hover:text-blue-500 transition-colors">Projects</Link>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        <span style={{ color:'#0F172A' }}>{project.name}</span>
      </div>

      {/* Project header card */}
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
                    {pendingInvs.length>0 && (
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:'rgba(245,158,11,0.1)', color:'#F59E0B' }}>
                        {pendingInvs.length} pending invoice{pendingInvs.length!==1?'s':''}
                      </span>
                    )}
                  </div>
                  {project.description && <p className="text-sm mb-1" style={{ color:'#64748B' }}>{project.description}</p>}
                  <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color:'#94A3B8' }}>
                    {project.start_date && <span>📅 {formatDate(project.start_date)} → {formatDate(project.end_date)}</span>}
                    {project.budget && <span>💰 Budget: {formatCurrency(project.budget, project.currency||'EUR')}</span>}
                    <span>📋 {contracts.length} contract{contracts.length!==1?'s':''}</span>
                    <span>🧾 {allInvoices.length} invoice{allInvoices.length!==1?'s':''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={()=>setEditing(true)} className="text-sm px-3.5 py-2 rounded-xl font-medium transition-all hover:bg-slate-100" style={{ background:'#F1F5F9', color:'#475569' }}>
                    ✏️ Edit
                  </button>
                  {confirmDel ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color:'#64748B' }}>Delete project?</span>
                      <button onClick={handleDelete} disabled={deleting} className="text-xs px-3 py-2 rounded-xl font-medium disabled:opacity-50" style={{ background:'#EF4444', color:'#fff' }}>
                        {deleting?'Deleting…':'Confirm'}
                      </button>
                      <button onClick={()=>setConfirmDel(false)} className="text-xs px-3 py-2 rounded-xl" style={{ background:'#F1F5F9', color:'#64748B' }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={()=>setConfirmDel(true)} className="text-sm px-3.5 py-2 rounded-xl font-medium transition-all" style={{ background:'rgba(239,68,68,0.08)', color:'#EF4444' }}>
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label:'Committed',    value:formatCurrency(totalCommitted,project.currency||'EUR'), color:'#3B82F6', bg:'#EFF6FF' },
                  { label:'Paid',         value:formatCurrency(totalPaid,project.currency||'EUR'),      color:'#10B981', bg:'#F0FDF4' },
                  { label:'Scheduled',    value:formatCurrency(totalScheduled,project.currency||'EUR'), color:'#F59E0B', bg:'#FFFBEB' },
                  { label:'Payment Rate', value:`${pct}%`, color:pct>=80?'#10B981':pct>=40?'#F59E0B':'#EF4444', bg:pct>=80?'#F0FDF4':pct>=40?'#FFFBEB':'#FEF2F2' },
                ].map(k=>(
                  <div key={k.label} className="rounded-xl px-4 py-3.5" style={{ background:k.bg }}>
                    <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color:'#94A3B8' }}>{k.label}</p>
                    <p className="text-xl font-bold" style={{ color:k.color }}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Overall progress bar */}
              <div className="mt-4">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs" style={{ color:'#94A3B8' }}>Overall payment progress</span>
                  <span className="text-xs font-semibold" style={{ color:'#3B82F6' }}>{pct}%</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background:'#F1F5F9' }}>
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
                  {saving?'Saving…':'Save Changes'}
                </button>
                <button onClick={()=>setEditing(false)} className="px-5 py-2.5 rounded-xl text-sm" style={{ background:'#F1F5F9', color:'#64748B' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── PAYMENT TIMELINE ── */}
      <div className="rounded-2xl overflow-hidden mb-6" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid #F1F5F9' }}>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color:'#0F172A' }}>Payment Timeline</h2>
            {!hasDates && <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>Add start/end dates to the project or contracts to see the Gantt chart</p>}
          </div>
          {hasDates && (
            <div className="flex items-center gap-4">
              {[
                { color:'#10B981', label:'Paid' },
                { color:'#F59E0B', label:'Scheduled' },
                { color:'#E2E8F0', label:'Remaining' },
                { color:'#3B82F6', label:'Invoice', dot:true },
              ].map(l=>(
                <div key={l.label} className="flex items-center gap-1.5">
                  <div style={{ width:l.dot?9:14, height:l.dot?9:8, background:l.color, borderRadius:l.dot?'50%':3, border:l.dot?'1.5px solid #fff':undefined, boxShadow:l.dot?'0 0 0 1.5px #3B82F6':undefined }}/>
                  <span className="text-xs" style={{ color:'#64748B' }}>{l.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-5">
          {!hasDates ? (
            <div className="py-8">
              {contracts.map((c:any) => {
                const cTotal = (c.contract_tranches||[]).reduce((s:number,t:any)=>s+(t.amount||0),0)
                const cPaid  = (c.contract_tranches||[]).filter((t:any)=>t.status==='paid').reduce((s:number,t:any)=>s+(t.amount||0),0)
                const cSched = (c.contract_tranches||[]).filter((t:any)=>t.status==='scheduled').reduce((s:number,t:any)=>s+(t.amount||0),0)
                const cp     = cTotal>0 ? cPaid/cTotal : 0
                const cs     = cTotal>0 ? cSched/cTotal : 0
                return (
                  <div key={c.id} className="flex items-center gap-4 mb-3">
                    <div style={{ width:160, minWidth:160 }}>
                      <Link href={`/contracts/${c.id}`} className="text-xs font-medium hover:text-blue-500 transition-colors truncate block" style={{ color:'#0F172A' }}>{c.contract_name}</Link>
                      <p className="text-xs truncate" style={{ color:'#94A3B8' }}>{c.service_providers?.name||'—'}</p>
                    </div>
                    <div className="flex-1 h-7 rounded-lg overflow-hidden relative" style={{ background:'#F1F5F9' }}>
                      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${cp*100}%`, background:'#10B981' }}/>
                      <div style={{ position:'absolute', left:`${cp*100}%`, top:0, bottom:0, width:`${cs*100}%`, background:'#F59E0B' }}/>
                    </div>
                    <div style={{ width:90, textAlign:'right', minWidth:90 }}>
                      <p className="text-xs font-semibold" style={{ color:'#0F172A' }}>{Math.round(cp*100)}%</p>
                      <p className="text-xs" style={{ color:'#94A3B8' }}>{formatCurrency(cTotal, c.currency||'EUR')}</p>
                    </div>
                  </div>
                )
              })}
              {contracts.length===0 && <p className="text-sm text-center" style={{ color:'#94A3B8' }}>No contracts linked to this project.</p>}
            </div>
          ) : (
            <>
              {/* Month axis */}
              <div style={{ marginLeft:170, marginRight:100, position:'relative', height:24, marginBottom:4 }}>
                {monthLabels.map((m,i)=>(
                  <div key={i} style={{ position:'absolute', left:`${pct2(m.toISOString().slice(0,10))}%`, transform:'translateX(-50%)', whiteSpace:'nowrap' }}>
                    <span className="text-xs font-medium" style={{ color:'#94A3B8' }}>
                      {m.toLocaleDateString('en-US',{month:'short',year:'2-digit'})}
                    </span>
                  </div>
                ))}
              </div>

              {/* Grid lines (vertical, per month label) */}
              <div style={{ marginLeft:170, marginRight:100, position:'relative', pointerEvents:'none', marginBottom:8 }}>
                {monthLabels.map((m,i)=>(
                  <div key={i} style={{
                    position:'absolute', left:`${pct2(m.toISOString().slice(0,10))}%`,
                    top:-4, bottom:0, width:1, background:'#F1F5F9',
                    height: `${contracts.length * 44 + 8}px`
                  }}/>
                ))}
              </div>

              {/* Contract rows */}
              <div className="space-y-2">
                {contracts.map((c:any) => {
                  const cTotal  = (c.contract_tranches||[]).reduce((s:number,t:any)=>s+(t.amount||0),0)
                  const cPaid   = (c.contract_tranches||[]).filter((t:any)=>t.status==='paid').reduce((s:number,t:any)=>s+(t.amount||0),0)
                  const cSched  = (c.contract_tranches||[]).filter((t:any)=>t.status==='scheduled').reduce((s:number,t:any)=>s+(t.amount||0),0)
                  const barL    = c.start_date ? pct2(c.start_date) : 0
                  const barR    = c.end_date   ? pct2(c.end_date)   : 100
                  const barW    = barR - barL
                  const paidW   = barW * (cTotal>0?cPaid/cTotal:0)
                  const schedW  = barW * (cTotal>0?cSched/cTotal:0)
                  const invDots = (c.invoices||[]).filter((i:any)=>i.invoice_date)
                  const catC    = ESG_COLOR[c.category] || ESG_COLOR.Other

                  return (
                    <div key={c.id} className="flex items-center" style={{ height:40 }}>
                      {/* Label */}
                      <div style={{ width:170, minWidth:170, paddingRight:12 }}>
                        <div className="flex items-center gap-1.5">
                          {c.category && <div style={{ width:6, height:6, borderRadius:'50%', background:catC, flexShrink:0 }}/>}
                          <Link href={`/contracts/${c.id}`} className="text-xs font-medium hover:text-blue-500 transition-colors truncate" style={{ color:'#0F172A' }}>
                            {c.contract_name}
                          </Link>
                        </div>
                        <p className="text-xs truncate" style={{ color:'#94A3B8', paddingLeft: c.category ? 10 : 0 }}>
                          {c.service_providers?.name||'—'}
                        </p>
                      </div>

                      {/* Timeline bar */}
                      <div className="flex-1 relative" style={{ height:40 }}>
                        {/* Track background */}
                        <div style={{ position:'absolute', left:`${barL}%`, width:`${barW}%`, top:10, height:20, background:'#F1F5F9', borderRadius:6 }}/>
                        {/* Paid (green) */}
                        {paidW > 0 && <div style={{ position:'absolute', left:`${barL}%`, width:`${paidW}%`, top:10, height:20, background:'#10B981', borderRadius:6 }}/>}
                        {/* Scheduled (amber) */}
                        {schedW > 0 && (
                          <div style={{ position:'absolute', left:`${barL+paidW}%`, width:`${schedW}%`, top:10, height:20, background:'#F59E0B', borderRadius:paidW===0?6:0 }}/>
                        )}
                        {/* Invoice dots */}
                        {invDots.map((inv:any) => (
                          <div
                            key={inv.id}
                            title={`${inv.invoice_number||'Invoice'} · ${formatCurrency(inv.amount_ttc)} · ${inv.status}`}
                            style={{ position:'absolute', left:`${pct2(inv.invoice_date)}%`, top:4, width:10, height:10, background:'#3B82F6', borderRadius:'50%', border:'2px solid #fff', boxShadow:'0 0 0 1.5px #3B82F6', transform:'translateX(-50%)', zIndex:10, cursor:'pointer' }}
                          />
                        ))}
                      </div>

                      {/* Amount label */}
                      <div style={{ width:100, minWidth:100, paddingLeft:12, textAlign:'right' }}>
                        <p className="text-xs font-semibold" style={{ color:'#0F172A' }}>{cTotal>0?Math.round(cPaid/cTotal*100):0}%</p>
                        <p className="text-xs" style={{ color:'#94A3B8' }}>{formatCurrency(cTotal, c.currency||'EUR')}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {contracts.length===0 && (
                <p className="text-sm text-center py-8" style={{ color:'#94A3B8' }}>No contracts linked to this project.</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── CONTRACTS & INVOICES ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color:'#64748B' }}>Sub-sections & Invoices</h2>
          {pendingInvs.length>0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:'rgba(245,158,11,0.1)', color:'#F59E0B' }}>
              {pendingInvs.length} pending
            </span>
          )}
        </div>

        <div className="space-y-3">
          {contracts.map((c:any) => {
            const cPaid  = (c.contract_tranches||[]).filter((t:any)=>t.status==='paid').reduce((s:number,t:any)=>s+(t.amount||0),0)
            const cTotal = (c.contract_tranches||[]).reduce((s:number,t:any)=>s+(t.amount||0),0)
            const cPct   = cTotal>0 ? Math.round((cPaid/cTotal)*100) : 0
            const catC   = ESG_COLOR[c.category] || ESG_COLOR.Other
            return (
              <div key={c.id} className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
                <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom:(c.invoices||[]).length>0?'1px solid #F1F5F9':'none' }}>
                  <div className="flex items-center gap-3">
                    {c.category && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background:`${catC}18`, color:catC }}>{c.category}</span>
                    )}
                    <div>
                      <Link href={`/contracts/${c.id}`} className="text-sm font-semibold hover:text-blue-500 transition-colors" style={{ color:'#0F172A' }}>{c.contract_name}</Link>
                      <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>{c.service_providers?.name||'—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <p className="text-sm font-semibold" style={{ color:'#0F172A' }}>{formatCurrency(cTotal, c.currency||'EUR')}</p>
                      <p className="text-xs" style={{ color:'#94A3B8' }}>{formatCurrency(cPaid, c.currency||'EUR')} paid · {cPct}%</p>
                    </div>
                    <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background:'#F1F5F9' }}>
                      <div className="h-full rounded-full" style={{ width:`${cPct}%`, background:cPct>=80?'#10B981':cPct>=40?'#F59E0B':'#3B82F6' }}/>
                    </div>
                  </div>
                </div>

                {(c.invoices||[]).length > 0 && (
                  <div style={{ background:'#FAFBFC' }}>
                    <div className="grid px-5 py-2 text-xs font-semibold uppercase tracking-widest" style={{ color:'#94A3B8', borderBottom:'1px solid #F1F5F9', gridTemplateColumns:'0.6fr 1.5fr 0.8fr 1fr 1fr 1.2fr' }}>
                      <div>#</div><div>Subcontractor</div><div>Category</div><div>HT</div><div>TTC</div><div>Status</div>
                    </div>
                    {(c.invoices||[]).map((inv:any)=>{
                      const st = INV_STATUS[inv.status] || INV_STATUS.pending_review
                      return (
                        <Link key={inv.id} href={`/invoices/${inv.id}`} className="grid px-5 py-3 items-center text-sm transition-colors" style={{ borderBottom:'1px solid #F1F5F9', gridTemplateColumns:'0.6fr 1.5fr 0.8fr 1fr 1fr 1.2fr' }}
                          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#EFF6FF'}
                          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}
                        >
                          <span className="font-mono text-xs" style={{ color:'#94A3B8' }}>{inv.invoice_number||'—'}</span>
                          <div>
                            <p style={{ color:'#0F172A' }}>{inv.subcontractor_name||'—'}</p>
                            <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>{formatDate(inv.invoice_date)}</p>
                          </div>
                          <span className="text-xs" style={{ color:'#64748B' }}>{inv.category||'—'}</span>
                          <span style={{ color:'#0F172A' }}>{formatCurrency(inv.amount_ht)}</span>
                          <span className="font-semibold" style={{ color:'#0F172A' }}>{formatCurrency(inv.amount_ttc)}</span>
                          <span className="text-xs px-2 py-1 rounded-full font-medium inline-block" style={{ background:st.bg, color:st.color }}>{st.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
                {(c.invoices||[]).length===0 && (
                  <div className="px-5 py-3 text-xs" style={{ background:'#FAFBFC', color:'#94A3B8' }}>No invoices for this contract yet.</div>
                )}
              </div>
            )
          })}
          {contracts.length===0 && (
            <div className="rounded-2xl p-10 text-center" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
              <p className="text-sm" style={{ color:'#64748B' }}>No contracts linked to this project.</p>
              <p className="text-xs mt-1" style={{ color:'#94A3B8' }}>When editing a contract, select this project to link it here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
