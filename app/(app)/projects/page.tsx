import { supabaseAdmin } from '@/lib/supabase'
import { formatCurrency } from '@/lib/format'
import Link from 'next/link'

export const revalidate = 0

const PALETTE = ['#3B82F6','#8B5CF6','#F59E0B','#EF4444','#10B981','#06B6D4','#F97316','#EC4899']

const STATUS_META: Record<string,{ label:string; color:string; bg:string }> = {
  active:    { label:'Active',    color:'#10B981', bg:'rgba(16,185,129,0.1)' },
  completed: { label:'Completed', color:'#3B82F6', bg:'rgba(59,130,246,0.1)' },
  on_hold:   { label:'On Hold',   color:'#F59E0B', bg:'rgba(245,158,11,0.1)' },
}

async function getProjects() {
  // Try the proper projects table first
  const { data: projData, error: projErr } = await supabaseAdmin
    .from('projects')
    .select('id, name, description, budget, currency, start_date, end_date, status, created_at')
    .order('created_at', { ascending: false })

  // Get all contracts with tranche + invoice data (always needed)
  const { data: contractData } = await supabaseAdmin
    .from('contracts')
    .select('id, contract_name, project, project_id, contract_amount, contract_tranches(amount, status), invoices(id, status)')

  const contracts = contractData || []

  if (!projErr && projData && projData.length > 0) {
    // Projects table exists and has data — use it
    const projects = projData.map((p, i) => {
      const linked = contracts.filter((c:any) => c.project_id === p.id)
      const committed = linked.reduce((s:number,c:any)=>s+(c.contract_tranches||[]).reduce((ts:number,t:any)=>ts+(t.amount||0),0),0)
      const paid      = linked.reduce((s:number,c:any)=>s+(c.contract_tranches||[]).filter((t:any)=>t.status==='paid').reduce((ts:number,t:any)=>ts+(t.amount||0),0),0)
      const invoices  = linked.reduce((s:number,c:any)=>s+(c.invoices||[]).length,0)
      const pending   = linked.reduce((s:number,c:any)=>s+(c.invoices||[]).filter((i:any)=>!['approved','rejected'].includes(i.status)).length,0)
      const pct       = committed>0 ? Math.round((paid/committed)*100) : 0
      const sections  = linked.map((c:any) => ({ id:c.id, name:c.contract_name }))
      return { id:p.id, name:p.name, description:p.description, budget:p.budget, currency:p.currency,
               start_date:p.start_date, end_date:p.end_date, status:p.status,
               contractCount:linked.length, committed, paid, invoices, pending, pct, sections,
               color:PALETTE[i%PALETTE.length], isReal:true }
    })
    return { projects, useIdLinks: true }
  }

  // Fallback: group contracts by project text field
  const map: Record<string,any[]> = {}
  for (const c of contracts) {
    const key = (c as any).project?.trim() || 'Unassigned'
    if (!map[key]) map[key] = []
    map[key].push(c)
  }
  const projects = Object.entries(map).map(([name, ctrs], i) => {
    const committed = ctrs.reduce((s,c)=>s+(c.contract_tranches||[]).reduce((ts:number,t:any)=>ts+(t.amount||0),0),0)
    const paid      = ctrs.reduce((s,c)=>s+(c.contract_tranches||[]).filter((t:any)=>t.status==='paid').reduce((ts:number,t:any)=>ts+(t.amount||0),0),0)
    const invoices  = ctrs.reduce((s,c)=>s+(c.invoices||[]).length,0)
    const pending   = ctrs.reduce((s,c)=>s+(c.invoices||[]).filter((i:any)=>!['approved','rejected'].includes(i.status)).length,0)
    const pct       = committed>0 ? Math.round((paid/committed)*100) : 0
    const sections  = ctrs.map((c:any) => ({ id:c.id, name:c.contract_name }))
    return { id: encodeURIComponent(name), name, description:null, budget:null, currency:'USD',
             start_date:null, end_date:null, status:'active',
             contractCount:ctrs.length, committed, paid, invoices, pending, pct, sections,
             color:PALETTE[i%PALETTE.length], isReal:false }
  }).sort((a,b)=>b.committed-a.committed)
  return { projects, useIdLinks: false }
}

export default async function ProjectsPage() {
  const { projects, useIdLinks } = await getProjects()

  const totalBudget    = projects.reduce((s,p)=>s+(p.budget||0),0)
  const totalCommitted = projects.reduce((s,p)=>s+p.committed,0)
  const totalPaid      = projects.reduce((s,p)=>s+p.paid,0)
  const globalPct      = totalCommitted>0 ? Math.round((totalPaid/totalCommitted)*100) : 0
  const pendingAll     = projects.reduce((s,p)=>s+p.pending,0)

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:'#64748B' }}>Finance</p>
          <h1 className="text-2xl font-bold" style={{ color:'#0F172A' }}>Projects</h1>
          <p className="text-sm mt-0.5" style={{ color:'#64748B' }}>{projects.length} project{projects.length!==1?'s':''} · {globalPct}% paid overall</p>
        </div>
        <Link href="/projects/new" className="text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2" style={{ background:'#3B82F6', color:'#fff' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Project
        </Link>
      </div>

      {/* KPI cards */}
      {projects.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label:'Total Budget',    value:formatCurrency(totalBudget),    sub:`${projects.length} projects`,               color:'#3B82F6' },
            { label:'Total Committed', value:formatCurrency(totalCommitted), sub:'across all contracts',                      color:'#8B5CF6' },
            { label:'Total Paid',      value:formatCurrency(totalPaid),      sub:`${globalPct}% payment rate`,                color:'#10B981' },
            { label:'Pending Review',  value:String(pendingAll),              sub:`invoice${pendingAll!==1?'s':''} waiting`,  color:pendingAll>0?'#F59E0B':'#94A3B8' },
          ].map(k=>(
            <div key={k.label} className="rounded-2xl px-5 py-4" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
              <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color:'#94A3B8' }}>{k.label}</p>
              <p className="text-xl font-bold mb-0.5" style={{ color:k.color }}>{k.value}</p>
              <p className="text-xs" style={{ color:'#94A3B8' }}>{k.sub}</p>
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
              {projects.map(p=>(
                <div key={p.id} className="flex items-center gap-1.5">
                  <div style={{ width:10, height:10, background:p.color, borderRadius:3 }}/>
                  <span className="text-xs" style={{ color:'#64748B' }}>{p.name} ({totalCommitted>0?Math.round(p.committed/totalCommitted*100):0}%)</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden" style={{ gap:2 }}>
            {projects.filter(p=>p.committed>0).map(p=>(
              <div key={p.id} style={{ flex:p.committed, background:p.color }}/>
            ))}
          </div>
        </div>
      )}

      {/* Project cards */}
      {projects.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background:'#EFF6FF' }}>
            <svg width="24" height="24" fill="none" stroke="#3B82F6" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h3l2 3h9a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          </div>
          <p className="text-base font-semibold mb-2" style={{ color:'#0F172A' }}>No projects yet</p>
          <p className="text-sm mb-6" style={{ color:'#64748B' }}>Create your first project to track budgets and payments.</p>
          <Link href="/projects/new" className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl" style={{ background:'#3B82F6', color:'#fff' }}>
            + New Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {projects.map(proj => {
            const sm = STATUS_META[proj.status] || STATUS_META.active
            const href = useIdLinks ? `/projects/${proj.id}` : `/projects/${proj.id}`
            return (
              <Link key={proj.id} href={href} className="block group">
                <div className="rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
                  <div style={{ height:4, background:proj.color }}/>
                  <div className="px-6 pt-5 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h2 className="text-base font-semibold group-hover:text-blue-600 transition-colors" style={{ color:'#0F172A' }}>{proj.name}</h2>
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:sm.bg, color:sm.color }}>{sm.label}</span>
                          {proj.pending>0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:'rgba(245,158,11,0.1)', color:'#F59E0B' }}>
                              {proj.pending} pending
                            </span>
                          )}
                        </div>
                        {proj.description && <p className="text-sm truncate" style={{ color:'#64748B' }}>{proj.description}</p>}
                        <p className="text-xs mt-1" style={{ color:'#94A3B8' }}>
                          {proj.contractCount} contract{proj.contractCount!==1?'s':''} · {proj.invoices} invoice{proj.invoices!==1?'s':''}
                          {proj.start_date && ` · ${new Date(proj.start_date).toLocaleDateString('en-GB',{month:'short',year:'numeric'})}`}
                          {proj.end_date && ` → ${new Date(proj.end_date).toLocaleDateString('en-GB',{month:'short',year:'numeric'})}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold" style={{ color:proj.color }}>{proj.pct}%</p>
                        {proj.budget
                          ? <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>of {formatCurrency(proj.budget, proj.currency||'USD')}</p>
                          : <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>paid</p>
                        }
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden mb-1" style={{ background:'#F1F5F9' }}>
                      <div className="h-full rounded-full" style={{ width:`${proj.pct}%`, background:proj.color }}/>
                    </div>
                    <p className="text-xs" style={{ color:'#94A3B8' }}>{proj.pct}% payment progress</p>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-[#F1F5F9]" style={{ borderTop:'1px solid #F1F5F9', background:'#FAFBFC' }}>
                    {[
                      { label:'Committed', value:formatCurrency(proj.committed, proj.currency||'USD'), color:'#0F172A' },
                      { label:'Paid',      value:formatCurrency(proj.paid,      proj.currency||'USD'), color:'#10B981' },
                      { label:'Balance',   value:formatCurrency(proj.committed-proj.paid, proj.currency||'USD'), color:proj.committed-proj.paid>0?'#F59E0B':'#94A3B8' },
                    ].map(s=>(
                      <div key={s.label} className="px-4 py-3">
                        <p className="text-xs mb-0.5" style={{ color:'#94A3B8' }}>{s.label}</p>
                        <p className="text-sm font-semibold" style={{ color:s.color }}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Contracts (contracts) */}
                  {proj.sections && proj.sections.length > 0 && (
                    <div className="px-5 py-3" style={{ borderTop:'1px solid #F1F5F9', background:'#FAFBFC' }}>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color:'#94A3B8' }}>Contracts</p>
                      <div className="flex flex-wrap gap-1.5">
                        {proj.sections.slice(0,5).map((s:any)=>(
                          <span key={s.id} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background:`${proj.color}12`, color:proj.color, border:`1px solid ${proj.color}30` }}>
                            {s.name}
                          </span>
                        ))}
                        {proj.sections.length > 5 && (
                          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background:'#F1F5F9', color:'#94A3B8' }}>
                            +{proj.sections.length - 5} more
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
    </div>
  )
}
