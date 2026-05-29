import { supabaseAdmin } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/format'
import Link from 'next/link'

export const revalidate = 0

const C = { card:'#FFFFFF', card2:'#F1F5F9', border:'#E2E8F0', border2:'#CBD5E1', green:'#10B981', amber:'#F59E0B', red:'#EF4444', blue:'#3B82F6', muted:'#64748B', text:'#0F172A' }

const STATUS: Record<string,{label:string;color:string;bg:string}> = {
  pending_review:  { label:'Awaiting Rudy',    color:'#F97316', bg:'rgba(249,115,22,0.1)'  },
  pending_placide: { label:'Awaiting Placide', color:'#D97706', bg:'rgba(217,119,6,0.1)'   },
  pending_hitech:  { label:'Awaiting Dani',    color:'#FACC15', bg:'rgba(250,204,21,0.1)'  },
  approved:        { label:'Approved',          color:'#10B981', bg:'rgba(16,185,129,0.1)'  },
  rejected:        { label:'Rejected',          color:'#EF4444', bg:'rgba(239,68,68,0.1)'   },
}

export default async function ProjectDetailPage({ params }: { params: { name: string } }) {
  const projectName = decodeURIComponent(params.name)
  const isUnassigned = projectName === 'Unassigned'

  const { data: contracts } = await supabaseAdmin
    .from('contracts')
    .select(`
      id, contract_name, category, client_name, contract_amount,
      service_providers(name),
      contract_tranches(id, tranche_name, amount, status, scheduled_date, paid_date),
      invoices(id, invoice_number, subcontractor_name, invoice_date, amount_ht, amount_ttc, status, submitted_at, category)
    `)
    .eq(isUnassigned ? 'project' : 'project', isUnassigned ? null : projectName)

  const all = (contracts || []).filter((c:any) =>
    isUnassigned ? !c.project?.trim() : c.project?.trim() === projectName
  )

  const totalCommitted = all.reduce((s:number,c:any)=>s+(c.contract_tranches||[]).reduce((ts:number,t:any)=>ts+(t.amount||0),0),0)
  const totalPaid      = all.reduce((s:number,c:any)=>s+(c.contract_tranches||[]).filter((t:any)=>t.status==='paid').reduce((ts:number,t:any)=>ts+(t.amount||0),0),0)
  const allInvoices    = all.flatMap((c:any)=>(c.invoices||[]).map((i:any)=>({...i,contract_name:c.contract_name,contract_id:c.id})))
  const pct            = totalCommitted > 0 ? Math.round((totalPaid/totalCommitted)*100) : 0

  const ESG: Record<string,string> = { E:'#10B981', S:'#3B82F6', G:'#8B5CF6', Other:'#6B7280' }

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: C.muted }}>
        <Link href="/projects" className="hover:text-blue-500 transition-colors">Projects</Link>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        <span style={{ color: C.text }}>{projectName}</span>
      </div>

      {/* Header */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <h1 className="text-2xl font-semibold mb-1" style={{ color: C.text }}>{projectName}</h1>
        <p className="text-sm mb-4" style={{ color: C.muted }}>{all.length} contracts · {allInvoices.length} invoices</p>
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { label:'Total Committed', value: formatCurrency(totalCommitted), color: C.blue },
            { label:'Total Paid',      value: formatCurrency(totalPaid),      color: C.green },
            { label:'Balance',         value: formatCurrency(totalCommitted-totalPaid), color: C.amber },
            { label:'Payment Rate',    value: `${pct}%`, color: pct>=80?C.green:pct>=40?C.amber:C.red },
          ].map(k=>(
            <div key={k.label} className="rounded-xl p-4" style={{ background: C.card2 }}>
              <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: C.muted }}>{k.label}</p>
              <p className="text-xl font-semibold" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: C.border }}>
          <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background: pct>=80?C.green:pct>=40?C.amber:C.blue }}/>
        </div>
      </div>

      {/* Contracts with their invoices */}
      <div className="space-y-4 mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Contracts & Invoices</h2>
        {all.map((c:any) => {
          const cPaid = (c.contract_tranches||[]).filter((t:any)=>t.status==='paid').reduce((s:number,t:any)=>s+(t.amount||0),0)
          const cTotal = (c.contract_tranches||[]).reduce((s:number,t:any)=>s+(t.amount||0),0)
          const cPct = cTotal > 0 ? Math.round((cPaid/cTotal)*100) : 0
          const catColor = ESG[c.category] || ESG.Other
          return (
            <div key={c.id} className="rounded-2xl overflow-hidden" style={{ border:`1px solid ${C.border}` }}>
              {/* Contract header */}
              <div className="px-5 py-4 flex items-center justify-between" style={{ background: C.card, borderBottom: c.invoices?.length>0 ? `1px solid ${C.border}` : 'none' }}>
                <div className="flex items-center gap-3">
                  {c.category && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background:`${catColor}18`, color:catColor }}>{c.category}</span>
                  )}
                  <div>
                    <Link href={`/contracts/${c.id}`} className="text-sm font-semibold hover:text-blue-500 transition-colors" style={{ color: C.text }}>{c.contract_name}</Link>
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>{c.service_providers?.name || c.client_name || '—'}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-6">
                  <div>
                    <p className="text-sm font-medium" style={{ color: C.text }}>{formatCurrency(cTotal)}</p>
                    <p className="text-xs" style={{ color: C.muted }}>{formatCurrency(cPaid)} paid · {cPct}%</p>
                  </div>
                  <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}>
                    <div className="h-full rounded-full" style={{ width:`${cPct}%`, background: cPct>=80?C.green:cPct>=40?C.amber:C.blue }}/>
                  </div>
                </div>
              </div>

              {/* Invoices under this contract */}
              {(c.invoices||[]).length > 0 && (
                <div style={{ background: '#FAFBFC' }}>
                  <div className="grid px-5 py-2 text-xs font-medium uppercase tracking-widest" style={{ color: C.muted, borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'0.6fr 1.5fr 0.8fr 1fr 1fr 1.2fr' }}>
                    <div>#</div><div>Subcontractor</div><div>Category</div><div>Amount HT</div><div>Total TTC</div><div>Status</div>
                  </div>
                  {(c.invoices||[]).map((inv:any) => {
                    const st = STATUS[inv.status] || STATUS.pending_review
                    return (
                      <Link key={inv.id} href={`/invoices/${inv.id}`} className="grid px-5 py-3 hover:bg-blue-50/50 transition-colors items-center text-sm" style={{ borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'0.6fr 1.5fr 0.8fr 1fr 1fr 1.2fr' }}>
                        <span className="font-mono text-xs" style={{ color: C.muted }}>{inv.invoice_number || '—'}</span>
                        <div>
                          <p style={{ color: C.text }}>{inv.subcontractor_name || '—'}</p>
                          <p className="text-xs mt-0.5" style={{ color: C.muted }}>{formatDate(inv.invoice_date)}</p>
                        </div>
                        <span className="text-xs" style={{ color: C.muted }}>{inv.category || '—'}</span>
                        <span style={{ color: C.text }}>{formatCurrency(inv.amount_ht)}</span>
                        <span className="font-medium" style={{ color: C.text }}>{formatCurrency(inv.amount_ttc)}</span>
                        <span className="text-xs px-2 py-1 rounded-full inline-block" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}

              {(c.invoices||[]).length === 0 && (
                <div className="px-5 py-3 text-xs" style={{ background:'#FAFBFC', color: C.muted }}>No invoices yet for this contract.</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}