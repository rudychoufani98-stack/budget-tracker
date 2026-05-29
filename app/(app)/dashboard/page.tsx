import { supabaseAdmin } from '@/lib/supabase'
import { formatCurrency } from '@/lib/format'
import Link from 'next/link'
import { DashboardCharts } from './DashboardCharts'

export const revalidate = 0

async function getData() {
  const [tranchesRes, invoicesRes, allInvRes, currencyRes, contractsRes] = await Promise.all([
    supabaseAdmin.from('contract_tranches').select('*, contracts(contract_name, id, project, service_providers(name))'),
    supabaseAdmin.from('invoices').select('*').order('created_at', { ascending: false }).limit(8),
    supabaseAdmin.from('invoices').select('id, status, subcontractor_name, submitted_at, amount_ttc'),
    supabaseAdmin.from('invoice_currency').select('invoice_id, currency'),
    supabaseAdmin.from('contracts').select('id, contract_name, project, status, contract_amount, service_providers(name), contract_tranches(amount, status)').order('created_at', { ascending: false }).limit(6),
  ])
  const tranches  = tranchesRes.data  || []
  const currencyMap: Record<string,string> = {}
  for (const c of currencyRes.data || []) currencyMap[c.invoice_id] = c.currency
  const invoices  = (invoicesRes.data || []).map((inv: any) => ({
    ...inv, currency: currencyMap[inv.id] || inv.currency || 'USD',
  }))
  const allInv    = allInvRes.data    || []
  const contracts = contractsRes.data || []

  const total_committed   = tranches.reduce((s:number,t:any)=>s+(t.amount||0),0)
  const total_paid        = tranches.filter((t:any)=>t.status==='paid').reduce((s:number,t:any)=>s+t.amount,0)
  const total_pipeline    = tranches.filter((t:any)=>t.status==='scheduled').reduce((s:number,t:any)=>s+t.amount,0)
  const payment_rate      = total_committed>0 ? Math.round((total_paid/total_committed)*100) : 0
  const pending_rudy      = allInv.filter((i:any)=>i.status==='pending_review').length
  const pending_placide   = allInv.filter((i:any)=>i.status==='pending_placide').length
  const pending_hitech    = allInv.filter((i:any)=>i.status==='pending_hitech').length
  const total_pending     = pending_rudy + pending_placide + pending_hitech
  const total_approved    = allInv.filter((i:any)=>i.status==='approved').length

  const monthly: Record<string,number> = {}
  for (const t of tranches.filter((t:any)=>t.status==='paid'&&t.paid_date)) {
    const key = (t.paid_date as string).slice(0,7)
    monthly[key] = (monthly[key]||0)+(t.amount as number)
  }
  const monthlyData = Object.entries(monthly).sort(([a],[b])=>a.localeCompare(b)).slice(-6).map(([month,amount])=>({month,amount}))

  const now = Date.now()
  const alerts: { type:string; message:string; severity:string; id?:string }[] = []
  for (const t of tranches) {
    if ((t.status as string)==='scheduled' && t.scheduled_date) {
      const days = Math.floor((new Date(t.scheduled_date as string).getTime()-now)/86400000)
      if (days>=0 && days<=7) {
        const cn = (t.contracts as any)?.contract_name||'Contract'
        const sev = days<=2?'high':days<=5?'medium':'low'
        alerts.push({ type:'upcoming', severity:sev, message:`${cn} — tranche due in ${days}d`, id:(t.contracts as any)?.id })
      }
    }
  }
  for (const i of allInv.filter((i:any)=>i.status==='pending_review')) {
    const days = Math.floor((now-new Date((i as any).submitted_at).getTime())/86400000)
    if (days>3) alerts.push({ type:'overdue', severity:days>7?'high':'medium', message:`${(i as any).subcontractor_name||'Invoice'} pending ${days}d`, id:(i as any).id })
  }

  const trancheCounts = {
    paid:      tranches.filter((t:any)=>t.status==='paid').length,
    scheduled: tranches.filter((t:any)=>t.status==='scheduled').length,
    unpaid:    tranches.filter((t:any)=>t.status==='unpaid').length,
  }

  // Build contract cards
  const contractCards = contracts.map((c:any) => {
    const ts = (c.contract_tranches||[]) as any[]
    const total = ts.reduce((s:number,t:any)=>s+(t.amount||0),0)
    const paid  = ts.filter((t:any)=>t.status==='paid').reduce((s:number,t:any)=>s+(t.amount||0),0)
    const pct   = total>0 ? Math.round((paid/total)*100) : 0
    return { ...c, total, paid, pct }
  })

  return { total_committed, total_paid, total_pipeline, payment_rate,
           total_pending, total_approved, pending_rudy, pending_placide, pending_hitech,
           monthlyData, trancheCounts, alerts, recentInvoices: invoices, contractCards }
}

const INV_STATUS: Record<string,{label:string;color:string;bg:string}> = {
  pending_review:  { label:'Awaiting Rudy',    color:'#F97316', bg:'rgba(249,115,22,0.1)'  },
  pending_placide: { label:'Awaiting Placide', color:'#D97706', bg:'rgba(217,119,6,0.1)'   },
  pending_hitech:  { label:'Awaiting Dani',    color:'#7C3AED', bg:'rgba(124,58,237,0.1)'  },
  approved:        { label:'Approved',         color:'#10B981', bg:'rgba(16,185,129,0.1)'  },
  rejected:        { label:'Rejected',         color:'#EF4444', bg:'rgba(239,68,68,0.1)'   },
}

export default async function DashboardPage() {
  const d = await getData()

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:'#64748B' }}>Overview</p>
          <h1 className="text-2xl font-bold" style={{ color:'#0F172A' }}>Dashboard</h1>
        </div>
        <Link href="/upload" className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl" style={{ background:'#3B82F6', color:'#fff' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Upload Invoice
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:'Total Committed', value:formatCurrency(d.total_committed), sub:`${d.trancheCounts.paid+d.trancheCounts.scheduled+d.trancheCounts.unpaid} tranches`, color:'#3B82F6', bg:'#EFF6FF', icon:'💰' },
          { label:'Total Paid',      value:formatCurrency(d.total_paid),      sub:`${d.trancheCounts.paid} tranches paid`,                                             color:'#10B981', bg:'#F0FDF4', icon:'✅' },
          { label:'Pipeline',        value:formatCurrency(d.total_pipeline),   sub:`${d.trancheCounts.scheduled} scheduled`,                                           color:'#F59E0B', bg:'#FFFBEB', icon:'📅' },
          { label:'Pending Invoices',value:String(d.total_pending),           sub:`${d.total_approved} approved total`,                                               color:d.total_pending>0?'#EF4444':'#94A3B8', bg:d.total_pending>0?'#FEF2F2':'#F8FAFC', icon:'🧾' },
        ].map(k=>(
          <div key={k.label} className="rounded-2xl px-5 py-5" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color:'#94A3B8' }}>{k.label}</p>
              <span className="text-lg">{k.icon}</span>
            </div>
            <p className="text-2xl font-bold mb-1" style={{ color:k.color }}>{k.value}</p>
            <p className="text-xs" style={{ color:'#94A3B8' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Payment rate bar */}
      <div className="rounded-2xl px-6 py-5" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold" style={{ color:'#0F172A' }}>Overall Payment Rate</p>
            <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>{formatCurrency(d.total_paid)} paid of {formatCurrency(d.total_committed)} committed</p>
          </div>
          <p className="text-3xl font-bold" style={{ color:d.payment_rate>=80?'#10B981':d.payment_rate>=40?'#F59E0B':'#EF4444' }}>{d.payment_rate}%</p>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background:'#F1F5F9' }}>
          <div className="h-full rounded-full transition-all" style={{ width:`${d.payment_rate}%`, background:d.payment_rate>=80?'linear-gradient(90deg,#10B981,#34D399)':d.payment_rate>=40?'linear-gradient(90deg,#F59E0B,#FCD34D)':'linear-gradient(90deg,#EF4444,#F87171)' }}/>
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs" style={{ color:'#94A3B8' }}>0%</span>
          <span className="text-xs" style={{ color:'#94A3B8' }}>100%</span>
        </div>
      </div>

      {/* Recent contracts */}
      {d.contractCards.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid #F1F5F9' }}>
            <p className="text-sm font-semibold" style={{ color:'#0F172A' }}>Active Contracts</p>
            <Link href="/contracts" className="text-xs font-semibold" style={{ color:'#3B82F6' }}>View all →</Link>
          </div>
          <div className="grid grid-cols-3 gap-0 divide-x divide-[#F1F5F9]">
            {d.contractCards.slice(0,3).map((c:any,i:number)=>{
              const colors = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#06B6D4']
              const col = colors[i % colors.length]
              return (
                <Link key={c.id} href={`/contracts/${c.id}`} className="p-5 hover:bg-slate-50 transition-colors block">
                  <div style={{ height:3, background:col, borderRadius:2, marginBottom:12 }}/>
                  <p className="text-sm font-semibold mb-0.5 truncate" style={{ color:'#0F172A' }}>{c.contract_name}</p>
                  <p className="text-xs mb-3 truncate" style={{ color:'#94A3B8' }}>{c.service_providers?.name||c.project||'—'}</p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color:col }}>{c.pct}%</span>
                    <span className="text-xs" style={{ color:'#94A3B8' }}>{formatCurrency(c.total)}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'#F1F5F9' }}>
                    <div style={{ width:`${c.pct}%`, height:'100%', background:col, borderRadius:4 }}/>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Charts + Sidebar */}
      <div className="grid grid-cols-3 gap-5">
        {/* Chart */}
        <div className="col-span-2 rounded-2xl p-5" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
          <p className="text-sm font-semibold mb-4" style={{ color:'#0F172A' }}>Monthly Payments — last 6 months</p>
          <DashboardCharts monthlyData={d.monthlyData} trancheCounts={d.trancheCounts} />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Validation queue */}
          <div className="rounded-2xl p-5" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color:'#0F172A' }}>Validation Queue</p>
              {(d.pending_rudy+d.pending_placide+d.pending_hitech)>0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background:'rgba(239,68,68,0.1)', color:'#EF4444' }}>
                  {d.pending_rudy+d.pending_placide+d.pending_hitech}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {[
                { label:'Awaiting Rudy',    count:d.pending_rudy,    color:'#F97316', bg:'rgba(249,115,22,0.1)' },
                { label:'Awaiting Placide', count:d.pending_placide, color:'#D97706', bg:'rgba(217,119,6,0.1)'  },
                { label:'Awaiting Dani',    count:d.pending_hitech,  color:'#7C3AED', bg:'rgba(124,58,237,0.1)' },
              ].map(v=>(
                <div key={v.label} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background:v.count>0?v.bg:'#F8FAFC' }}>
                  <span className="text-xs font-medium" style={{ color:v.count>0?v.color:'#94A3B8' }}>{v.label}</span>
                  <span className="text-sm font-bold" style={{ color:v.count>0?v.color:'#94A3B8' }}>{v.count}</span>
                </div>
              ))}
            </div>
            <Link href="/validations" className="mt-4 block text-center text-xs font-semibold py-2.5 rounded-xl transition-colors hover:bg-blue-50" style={{ color:'#3B82F6', border:'1px solid #E2E8F0' }}>
              Go to Validations →
            </Link>
          </div>

          {/* Alerts */}
          {d.alerts.length > 0 && (
            <div className="rounded-2xl p-5" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
              <p className="text-sm font-semibold mb-3" style={{ color:'#0F172A' }}>⚡ Alerts</p>
              <div className="space-y-2">
                {d.alerts.slice(0,4).map((a,i)=>{
                  const isHigh = a.severity==='high'
                  const isMed  = a.severity==='medium'
                  const color  = isHigh?'#EF4444':isMed?'#F59E0B':'#3B82F6'
                  const bg     = isHigh?'rgba(239,68,68,0.08)':isMed?'rgba(245,158,11,0.08)':'rgba(59,130,246,0.08)'
                  return (
                    <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-xs" style={{ background:bg }}>
                      <span style={{ color, flexShrink:0 }}>{isHigh?'🔴':isMed?'🟡':'🔵'}</span>
                      <span style={{ color }}>{a.message}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent invoices */}
      <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid #F1F5F9' }}>
          <p className="text-sm font-semibold" style={{ color:'#0F172A' }}>Recent Invoices</p>
          <Link href="/invoices" className="text-xs font-semibold" style={{ color:'#3B82F6' }}>View all →</Link>
        </div>
        {d.recentInvoices.length===0 ? (
          <p className="text-sm text-center py-10" style={{ color:'#94A3B8' }}>No invoices yet</p>
        ) : (
          d.recentInvoices.slice(0,6).map((inv:any)=>{
            const st = INV_STATUS[inv.status] || INV_STATUS.pending_review
            return (
              <Link key={inv.id} href={`/invoices/${inv.id}`}
                className="flex items-center justify-between px-6 py-3.5 transition-colors hover:bg-slate-50"
                style={{ borderBottom:'1px solid #F8FAFC' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm" style={{ background:`${st.color}15` }}>
                    🧾
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color:'#0F172A' }}>{inv.subcontractor_name||'Unknown'}</p>
                    <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>{new Date(inv.created_at||inv.submitted_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold" style={{ color:'#0F172A' }}>{formatCurrency(inv.amount_ttc)}</span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:st.bg, color:st.color }}>{st.label}</span>
                  <svg width="14" height="14" fill="none" stroke="#CBD5E1" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </Link>
            )
          })
        )}
      </div>

    </div>
  )
}
