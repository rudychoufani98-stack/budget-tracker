import { supabaseAdmin } from '@/lib/supabase'
import { formatCurrency } from '@/lib/format'
import Link from 'next/link'
import { DashboardCharts } from './DashboardCharts'

export const revalidate = 0

const C = { bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', green: '#10B981', amber: '#F59E0B', red: '#EF4444', blue: '#3B82F6', muted: '#6B7280' }

async function getData() {
  const [tranchesRes, invoicesRes, allInvRes] = await Promise.all([
    supabaseAdmin.from('contract_tranches').select('*, contracts(contract_name, id)'),
    supabaseAdmin.from('invoices').select('*').order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('invoices').select('id, status, subcontractor_name, submitted_at, amount_ttc'),
  ])
  const tranches = tranchesRes.data || []
  const invoices = invoicesRes.data || []
  const allInv   = allInvRes.data   || []

  const total_committed   = tranches.reduce((s:number, t:any) => s + (t.amount || 0), 0)
  const total_paid        = tranches.filter((t:any) => t.status === 'paid').reduce((s:number, t:any) => s + t.amount, 0)
  const total_pipeline    = tranches.filter((t:any) => t.status === 'scheduled').reduce((s:number, t:any) => s + t.amount, 0)
  const total_unscheduled = tranches.filter((t:any) => t.status === 'unpaid' && !t.scheduled_date).reduce((s:number, t:any) => s + t.amount, 0)
  const payment_rate      = total_committed > 0 ? Math.round((total_paid / total_committed) * 100) : 0
  const pending_rudy      = allInv.filter((i:any) => i.status === 'pending_review').length
  const pending_placide   = allInv.filter((i:any) => i.status === 'pending_placide').length
  const pending_hitech    = allInv.filter((i:any) => i.status === 'pending_hitech').length

  const monthly: Record<string,number> = {}
  for (const t of tranches.filter((t:any) => t.status === 'paid' && t.paid_date)) {
    const key = (t.paid_date as string).slice(0, 7)
    monthly[key] = (monthly[key] || 0) + (t.amount as number)
  }
  const monthlyData = Object.entries(monthly).sort(([a],[b])=>a.localeCompare(b)).slice(-6).map(([month,amount])=>({month,amount}))

  const now = Date.now()
  const alerts: { type: string; message: string; id?: string }[] = []
  for (const t of tranches) {
    if ((t.status as string) === 'scheduled' && t.scheduled_date) {
      const days = Math.floor((new Date(t.scheduled_date as string).getTime() - now) / 86400000)
      if (days >= 0 && days <= 7) {
        const cn = (t.contracts as any)?.contract_name || 'Contract'
        alerts.push({ type: 'upcoming', message: `${cn} - ${t.tranche_name} due in ${days}d`, id: (t.contracts as any)?.id })
      }
    }
  }
  for (const i of allInv.filter((i:any) => i.status === 'pending_review')) {
    const days = Math.floor((now - new Date((i as any).submitted_at).getTime()) / 86400000)
    if (days > 3) alerts.push({ type: 'overdue', message: `${(i as any).subcontractor_name || 'Invoice'} overdue ${days}d`, id: (i as any).id })
  }

  const trancheCounts = {
    paid:      tranches.filter((t:any) => t.status === 'paid').length,
    scheduled: tranches.filter((t:any) => t.status === 'scheduled').length,
    unpaid:    tranches.filter((t:any) => t.status === 'unpaid').length,
  }
  return { total_committed, total_paid, total_pipeline, total_unscheduled, payment_rate,
           pending_rudy, pending_placide, pending_hitech, monthlyData, trancheCounts, alerts, recentInvoices: invoices }
}

export default async function DashboardPage() {
  const d = await getData()
  const kpis = [
    { label: 'Total Committed', value: formatCurrency(d.total_committed, 'EUR'), color: C.blue,  icon: 'C', sub: `${d.trancheCounts.paid + d.trancheCounts.scheduled + d.trancheCounts.unpaid} tranches` },
    { label: 'Total Paid',      value: formatCurrency(d.total_paid,      'EUR'), color: C.green, icon: 'P', sub: `${d.trancheCounts.paid} tranches paid` },
    { label: 'Pipeline',        value: formatCurrency(d.total_pipeline,  'EUR'), color: C.amber, icon: 'S', sub: `${d.trancheCounts.scheduled} scheduled` },
    { label: 'Unscheduled',     value: formatCurrency(d.total_unscheduled,'EUR'),color: C.muted, icon: 'U', sub: `${d.trancheCounts.unpaid} not scheduled` },
  ]
  return (
    <div className="px-6 py-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: C.muted }}>Overview</p>
          <h1 className="text-2xl font-medium" style={{ color: '#0F172A' }}>Dashboard</h1>
        </div>
        <Link href="/upload" className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl" style={{ background: '#3B82F6', color: '#fff' }}>
          + Upload Invoice
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <p className="text-xs font-medium mb-3" style={{ color: C.muted }}>{k.label}</p>
            <p className="text-xl font-medium" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>{k.sub}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium" style={{ color: '#0F172A' }}>Overall Payment Rate</p>
          <p className="text-2xl font-medium" style={{ color: d.payment_rate >= 80 ? C.green : d.payment_rate >= 40 ? C.amber : C.red }}>{d.payment_rate}%</p>
        </div>
        <div className="h-2 rounded-full" style={{ background: '#E2E8F0' }}>
          <div className="h-2 rounded-full" style={{ width: `${d.payment_rate}%`, background: d.payment_rate >= 80 ? C.green : d.payment_rate >= 40 ? C.amber : C.red }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <p className="text-sm font-medium mb-4" style={{ color: '#0F172A' }}>Monthly Payments (last 6 months)</p>
          <DashboardCharts monthlyData={d.monthlyData} trancheCounts={d.trancheCounts} />
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <p className="text-sm font-medium mb-4" style={{ color: '#0F172A' }}>Validation Queue</p>
            <div className="space-y-3">
              {[
                { label: 'Awaiting Rudy',    count: d.pending_rudy,    color: '#F97316' },
                { label: 'Awaiting Placide', count: d.pending_placide, color: C.amber },
                { label: 'Awaiting Dani',    count: d.pending_hitech,  color: '#FACC15' },
              ].map(v => (
                <div key={v.label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: C.muted }}>{v.label}</span>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full" style={{ background: `${v.color}20`, color: v.color }}>{v.count}</span>
                </div>
              ))}
            </div>
            <Link href="/validations" className="block mt-4 text-xs text-center py-2 rounded-lg" style={{ color: C.blue, border: `1px solid #E2E8F0` }}>View all</Link>
          </div>
          {d.alerts.length > 0 && (
            <div className="rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <p className="text-sm font-medium mb-3" style={{ color: '#0F172A' }}>Alerts</p>
              <div className="space-y-2">
                {d.alerts.slice(0,4).map((a,i) => (
                  <div key={i} className="text-xs p-2.5 rounded-lg" style={{ background: a.type === 'overdue' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', color: a.type === 'overdue' ? C.red : C.amber }}>{a.message}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="px-6 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <p className="text-sm font-medium" style={{ color: '#0F172A' }}>Recent Activity</p>
        </div>
        {d.recentInvoices.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: C.muted }}>No invoices yet</p>
        ) : (
          <div>
            {d.recentInvoices.slice(0,6).map((inv:any) => {
              const sc = inv.status === 'approved' ? C.green : inv.status === 'rejected' ? C.red : C.amber
              const sl = inv.status === 'approved' ? 'Approved' : inv.status === 'rejected' ? 'Rejected' : inv.status === 'pending_review' ? 'Awaiting Rudy' : inv.status === 'pending_placide' ? 'Awaiting Placide' : 'Awaiting Dani'
              return (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-white/5 transition-colors" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <p className="text-sm" style={{ color: '#0F172A' }}>{inv.subcontractor_name || 'Unknown'}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>{new Date(inv.created_at || inv.submitted_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm" style={{ color: '#0F172A' }}>{formatCurrency(inv.amount_ttc)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${sc}20`, color: sc }}>{sl}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
        <div className="px-6 py-3">
          <Link href="/invoices" className="text-xs font-medium" style={{ color: C.blue }}>View all invoices</Link>
        </div>
      </div>
    </div>
  )
}
