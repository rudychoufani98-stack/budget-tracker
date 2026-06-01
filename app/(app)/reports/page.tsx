'use client'
import { useState, useEffect, useMemo } from 'react'
import { formatCurrency } from '@/lib/format'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const C = { card:'#FFFFFF', border:'#E2E8F0', green:'#10B981', amber:'#F59E0B', red:'#EF4444', blue:'#3B82F6', muted:'#6B7280' }

export default function ReportsPage() {
  const [data, setData]         = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'provider'|'category'|'monthly'|'project'|'project-section'|'vat'|'audit'>('provider')
  const [chartProject, setChartProject] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/reports').then(r=>r.json()),
      fetch('/api/projects').then(r=>r.json()),
    ]).then(([d, p]) => {
      setData(d)
      const pList = Array.isArray(p) ? p : (Array.isArray(p?.projects) ? p.projects : [])
      setProjects(pList)
      setLoading(false)
    })
  }, [])

  function exportCSV(rows: any[][], filename: string) {
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url)
  }

  const tabs = [
    { key:'provider',        label:'By Provider' },
    { key:'category',        label:'By Category' },
    { key:'project',         label:'By Project' },
    { key:'project-section', label:'By Project + Section' },
    { key:'monthly',         label:'Monthly Flow' },
    { key:'vat',             label:'VAT Summary' },
    { key:'audit',           label:'Audit Log' },
  ]

  // Per-project stats derived from project.contracts
  const projectStats = useMemo(() => {
    return projects.map((p: any) => {
      const contracts: any[] = p.contracts || []
      const contractCount = contracts.length
      const totalCommitted = contracts.reduce((s: number, c: any) => {
        const ts: any[] = c.contract_tranches || []
        return s + ts.reduce((ss: number, t: any) => ss + (t.amount || 0), 0)
      }, 0)
      const totalPaid = contracts.reduce((s: number, c: any) => {
        const ts: any[] = c.contract_tranches || []
        return s + ts.filter((t: any) => t.status === 'paid').reduce((ss: number, t: any) => ss + (t.amount || 0), 0)
      }, 0)
      const balance = totalCommitted - totalPaid
      const pct = totalCommitted > 0 ? Math.round((totalPaid / totalCommitted) * 100) : 0
      const invoiceCount = contracts.reduce((s: number, c: any) => s + (c.invoices?.length || 0), 0)
      return { id: p.id, name: p.name, status: p.status || 'active', contractCount, totalCommitted, totalPaid, balance, pct, invoiceCount }
    })
  }, [projects])

  // Filtered monthly data by project
  const monthlyData = useMemo(() => {
    if (!data?.monthlyData) return []
    if (!chartProject) return data.monthlyData
    // monthlyData is pre-aggregated — if project filter is selected we can't filter it server-side
    // Show note instead; for now return all data since monthlyData lacks project_id
    return data.monthlyData
  }, [data, chartProject])

  if (loading) return <div className="flex items-center justify-center h-screen" style={{ color:C.muted }}>Loading...</div>

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color:C.muted }}>Analytics</p>
          <h1 className="text-2xl font-medium" style={{ color:'#0F172A' }}>Reports</h1>
        </div>
        <button onClick={()=>window.print()} className="text-sm font-medium px-4 py-2 rounded-xl" style={{ background:'#E2E8F0', border:'1px solid #CBD5E1', color:'#0F172A' }}>Print / PDF</button>
      </div>

      <div className="flex gap-1 mb-6 p-1 rounded-xl overflow-x-auto" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
        {tabs.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key as any)} className="flex-1 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap px-2" style={tab===t.key ? { background:'#E2E8F0', color:'#0F172A' } : { color:C.muted }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'provider' && (
        <div>
          <div className="flex justify-between mb-4">
            <p className="text-sm font-medium" style={{ color:'#0F172A' }}>Payment Summary by Provider</p>
            <button onClick={()=>exportCSV([['Provider','Contracted','Paid','Balance'],...(data.byProvider||[]).map((p:any)=>[p.name,p.total_contracted,p.total_paid,p.total_contracted-p.total_paid])],'providers.csv')} className="text-xs px-3 py-1.5 rounded-lg" style={{ background:'#E2E8F0', color:C.blue }}>Export CSV</button>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
            <div className="grid px-6 py-3 text-xs font-medium uppercase tracking-widest" style={{ color:C.muted, borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr' }}>
              <div>Provider</div><div>Contracted</div><div>Paid</div><div>Balance</div><div>Rate</div>
            </div>
            {(data.byProvider||[]).map((p:any) => {
              const rate = p.total_contracted>0?Math.round((p.total_paid/p.total_contracted)*100):0
              return (
                <div key={p.name} className="grid px-6 py-3 items-center" style={{ borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr' }}>
                  <p className="text-sm" style={{ color:'#0F172A' }}>{p.name}</p>
                  <p className="text-sm" style={{ color:'#0F172A' }}>{formatCurrency(p.total_contracted)}</p>
                  <p className="text-sm" style={{ color:C.green }}>{formatCurrency(p.total_paid)}</p>
                  <p className="text-sm" style={{ color:C.amber }}>{formatCurrency(p.total_contracted-p.total_paid)}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full" style={{ background:'#E2E8F0' }}>
                      <div className="h-1.5 rounded-full" style={{ width:`${rate}%`, background:rate>=80?C.green:rate>=40?C.amber:C.blue }} />
                    </div>
                    <span className="text-xs" style={{ color:C.muted }}>{rate}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'category' && (
        <div>
          <p className="text-sm font-medium mb-4" style={{ color:'#0F172A' }}>Payment Summary by ESG Category</p>
          <div className="rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
            <div className="grid px-6 py-3 text-xs font-medium uppercase tracking-widest" style={{ color:C.muted, borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'1fr 1fr 1fr 1fr' }}>
              <div>Category</div><div>Total</div><div>Paid</div><div>Balance</div>
            </div>
            {(data.byCategory||[]).map((c:any) => (
              <div key={c.category} className="grid px-6 py-3" style={{ borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'1fr 1fr 1fr 1fr' }}>
                <span className="text-sm font-medium" style={{ color:'#0F172A' }}>{c.category}</span>
                <span className="text-sm" style={{ color:'#0F172A' }}>{formatCurrency(c.total)}</span>
                <span className="text-sm" style={{ color:C.green }}>{formatCurrency(c.paid)}</span>
                <span className="text-sm" style={{ color:C.amber }}>{formatCurrency(c.total-c.paid)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'project' && (
        <div>
          <div className="flex justify-between mb-4">
            <p className="text-sm font-medium" style={{ color:'#0F172A' }}>Payment Summary by Project</p>
            <button onClick={()=>exportCSV([['Project','Status','Contracts','Committed','Paid','Balance','%','Invoices'],...projectStats.map(p=>[p.name,p.status,p.contractCount,p.totalCommitted,p.totalPaid,p.balance,p.pct+'%',p.invoiceCount])],'projects.csv')} className="text-xs px-3 py-1.5 rounded-lg" style={{ background:'#E2E8F0', color:C.blue }}>Export CSV</button>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
            <div className="grid px-6 py-3 text-xs font-medium uppercase tracking-widest" style={{ color:C.muted, borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'2fr 0.8fr 0.8fr 1fr 1fr 1fr 0.8fr 0.8fr' }}>
              <div>Project</div><div>Status</div><div>Contracts</div><div>Committed</div><div>Paid</div><div>Balance</div><div>%</div><div>Invoices</div>
            </div>
            {projectStats.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color:C.muted }}>No projects found.</p>
            )}
            {projectStats.map(p => (
              <div key={p.id} className="grid px-6 py-3 items-center" style={{ borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'2fr 0.8fr 0.8fr 1fr 1fr 1fr 0.8fr 0.8fr' }}>
                <p className="text-sm font-medium" style={{ color:'#0F172A' }}>{p.name}</p>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: p.status==='active'?'rgba(16,185,129,0.1)':'rgba(59,130,246,0.1)', color: p.status==='active'?C.green:C.blue }}>{p.status}</span>
                <p className="text-sm" style={{ color:C.muted }}>{p.contractCount}</p>
                <p className="text-sm" style={{ color:'#0F172A' }}>{formatCurrency(p.totalCommitted)}</p>
                <p className="text-sm" style={{ color:C.green }}>{formatCurrency(p.totalPaid)}</p>
                <p className="text-sm" style={{ color:C.amber }}>{formatCurrency(p.balance)}</p>
                <p className="text-sm font-medium" style={{ color:p.pct>=80?C.green:p.pct>=40?C.amber:C.muted }}>{p.pct}%</p>
                <p className="text-sm" style={{ color:C.muted }}>{p.invoiceCount}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'project-section' && (
        <div>
          <p className="text-sm font-medium mb-4" style={{ color:'#0F172A' }}>Payment Summary by Project and Section</p>
          {projects.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color:C.muted }}>No projects found.</p>
          )}
          {projects.map((p: any) => {
            const pContracts: any[] = p.contracts || []
            // group contracts by section_id
            const secMap: Record<string, { secName: string; contracts: any[] }> = {}
            for (const c of pContracts) {
              const key = c.section_id || '__none__'
              const name = c.project_sections?.name || 'No Section'
              if (!secMap[key]) secMap[key] = { secName: name, contracts: [] }
              secMap[key].contracts.push(c)
            }
            const sections = Object.values(secMap)
            return (
              <div key={p.id} className="mb-6">
                <div className="px-5 py-3 rounded-t-xl" style={{ background:'#0F172A' }}>
                  <p className="text-sm font-bold text-white">{p.name}</p>
                  <p className="text-xs" style={{ color:'#94A3B8' }}>{p.status} &middot; {pContracts.length} contract{pContracts.length!==1?'s':''}</p>
                </div>
                <div className="rounded-b-xl overflow-hidden" style={{ border:'1px solid #E2E8F0', borderTop:'none' }}>
                  <div className="grid px-6 py-3 text-xs font-medium uppercase tracking-widest" style={{ color:C.muted, borderBottom:`1px solid ${C.border}`, background:'#FAFBFC', gridTemplateColumns:'2fr 0.8fr 1fr 1fr 1fr 0.8fr' }}>
                    <div>Section</div><div>Contracts</div><div>Committed</div><div>Paid</div><div>Balance</div><div>%</div>
                  </div>
                  {sections.length === 0 && (
                    <p className="text-sm text-center py-4" style={{ color:C.muted }}>No contracts in this project.</p>
                  )}
                  {sections.map(sec => {
                    const secCommitted = sec.contracts.reduce((s: number, c: any) => {
                      const ts: any[] = c.contract_tranches || []
                      return s + ts.reduce((ss: number, t: any) => ss + (t.amount || 0), 0)
                    }, 0)
                    const secPaid = sec.contracts.reduce((s: number, c: any) => {
                      const ts: any[] = c.contract_tranches || []
                      return s + ts.filter((t: any) => t.status === 'paid').reduce((ss: number, t: any) => ss + (t.amount || 0), 0)
                    }, 0)
                    const secBal = secCommitted - secPaid
                    const secPct = secCommitted > 0 ? Math.round((secPaid / secCommitted) * 100) : 0
                    return (
                      <div key={sec.secName} className="grid px-6 py-3 items-center" style={{ borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'2fr 0.8fr 1fr 1fr 1fr 0.8fr' }}>
                        <p className="text-sm font-medium" style={{ color:'#0F172A' }}>{sec.secName}</p>
                        <p className="text-sm" style={{ color:C.muted }}>{sec.contracts.length}</p>
                        <p className="text-sm" style={{ color:'#0F172A' }}>{formatCurrency(secCommitted)}</p>
                        <p className="text-sm" style={{ color:C.green }}>{formatCurrency(secPaid)}</p>
                        <p className="text-sm" style={{ color:C.amber }}>{formatCurrency(secBal)}</p>
                        <p className="text-sm font-medium" style={{ color:secPct>=80?C.green:secPct>=40?C.amber:C.muted }}>{secPct}%</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'monthly' && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <p className="text-sm font-medium" style={{ color:'#0F172A' }}>Monthly Payment Flow (approved invoices)</p>
            {projects.length > 0 && (
              <select
                value={chartProject}
                onChange={e => setChartProject(e.target.value)}
                className="text-sm px-3 py-2 rounded-lg ml-auto"
                style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', color:'#0F172A', outline:'none' }}
              >
                <option value="">All Projects</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
          {chartProject && (
            <p className="text-xs mb-3" style={{ color:'#94A3B8' }}>Note: monthly chart shows all projects. Per-project monthly breakdown requires server-side aggregation.</p>
          )}
          <div className="rounded-2xl p-6" style={{ background:C.card, border:`1px solid ${C.border}`, height:320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top:4, right:4, bottom:4, left:4 }}>
                <XAxis dataKey="month" tick={{ fill:'#6B7280', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#6B7280', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={(v:number)=>v>=1000000?`${(v/1000000).toFixed(1)}M`:v>=1000?`${(v/1000).toFixed(0)}K`:String(v)} />
                <Tooltip contentStyle={{ background:'#E2E8F0', border:'1px solid #CBD5E1', borderRadius:8, color:'#0F172A' }} />
                <Bar dataKey="amount" fill="#3B82F6" radius={[4,4,0,0]} name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'vat' && (
        <div>
          <p className="text-sm font-medium mb-4" style={{ color:'#0F172A' }}>VAT Summary (all approved invoices)</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label:'Total HT',          value: formatCurrency(data.vatSummary?.totalHT),  color:C.blue },
              { label:'TVA Recoverable',   value: formatCurrency(data.vatSummary?.totalTVA), color:C.amber },
              { label:'Total TTC',         value: formatCurrency(data.vatSummary?.totalTTC), color:C.green },
            ].map(s=>(
              <div key={s.label} className="rounded-2xl p-5" style={{ background:C.card, border:`1px solid ${C.border}` }}>
                <p className="text-xs mb-2" style={{ color:C.muted }}>{s.label}</p>
                <p className="text-2xl font-medium" style={{ color:s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div>
          <p className="text-sm font-medium mb-4" style={{ color:'#0F172A' }}>Audit Log (last 200 actions)</p>
          <div className="rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
            <div className="grid px-6 py-3 text-xs font-medium uppercase tracking-widest" style={{ color:C.muted, borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'2fr 1fr 1fr 2fr' }}>
              <div>Action</div><div>Entity</div><div>Date</div><div>Details</div>
            </div>
            {(data.auditLog||[]).length===0 && <p className="text-sm text-center py-8" style={{ color:C.muted }}>No audit entries yet.</p>}
            {(data.auditLog||[]).map((a:any)=>(
              <div key={a.id} className="grid px-6 py-2.5 items-center text-sm" style={{ borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'2fr 1fr 1fr 2fr' }}>
                <span style={{ color:'#0F172A' }}>{a.action}</span>
                <span style={{ color:C.muted }}>{a.entity_type}</span>
                <span style={{ color:C.muted }}>{new Date(a.created_at).toLocaleDateString('fr-FR')}</span>
                <span className="text-xs font-mono truncate" style={{ color:'#94A3B8' }}>{a.details ? JSON.stringify(a.details).slice(0,60) : '--'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}