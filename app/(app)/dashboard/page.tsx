import { supabaseAdmin } from '@/lib/supabase'
import { formatCurrency } from '@/lib/format'
import Link from 'next/link'
import { DashboardFilters } from './DashboardFilters'

export const revalidate = 0

const ESG_COLOR: Record<string,string> = { E:'#10B981', S:'#3B82F6', G:'#8B5CF6', Other:'#6B7280' }
const TRANCHE_ORDER = ['T1','T2','T3','T4','One-Shot']

const INV_STATUS: Record<string,{label:string;color:string;bg:string}> = {
  pending_review:  { label:'Awaiting Rudy',    color:'#F97316', bg:'rgba(249,115,22,0.1)'  },
  pending_placide: { label:'Awaiting Placide', color:'#D97706', bg:'rgba(217,119,6,0.1)'   },
  pending_hitech:  { label:'Awaiting Dani',    color:'#7C3AED', bg:'rgba(124,58,237,0.1)'  },
  approved:        { label:'Approved',         color:'#10B981', bg:'rgba(16,185,129,0.1)'  },
  rejected:        { label:'Rejected',         color:'#EF4444', bg:'rgba(239,68,68,0.1)'   },
}

async function getData(projectId?: string, sectionId?: string) {
  const now = new Date()
  const in30 = new Date(now.getTime() + 30*86400000)
  const in14 = new Date(now.getTime() + 14*86400000)

  const [tranchesRes, contractsRes, invoicesRes, allInvRes, currencyRes, providersRes, projectsRes, sectionsCountRes] = await Promise.all([
    supabaseAdmin.from('contract_tranches').select('*, contracts(id, contract_name, category, currency, project_id, section_id, service_providers(id, name))').order('scheduled_date', { ascending: true }),
    supabaseAdmin.from('contracts').select('id, contract_name, category, currency, contract_amount, project_id, section_id, service_providers(id, name), contract_tranches(id, tranche_name, amount, status, scheduled_date, paid_date), invoices(id, status, submitted_at, amount_ttc)').order('created_at', { ascending: false }),
    supabaseAdmin.from('invoices').select('id, status, subcontractor_name, submitted_at, amount_ttc, contract_id, tranche_id').order('submitted_at', { ascending: false }),
    supabaseAdmin.from('invoices').select('id, status, subcontractor_name, submitted_at, amount_ttc, contract_id'),
    supabaseAdmin.from('invoice_currency').select('invoice_id, currency'),
    supabaseAdmin.from('service_providers').select('id, name'),
    supabaseAdmin.from('projects').select('id, name, status, currency'),
    supabaseAdmin.from('project_sections').select('id, project_id, name'),
  ])

  const allTranches  = tranchesRes.data  || []
  const allContracts = contractsRes.data || []
  const invoices     = invoicesRes.data  || []
  const allInv       = allInvRes.data    || []
  const providers    = providersRes.data || []
  const rawProjects  = projectsRes.data  || []
  const allSections  = sectionsCountRes.data || []

  const currencyMap: Record<string,string> = {}
  for (const c of currencyRes.data || []) currencyMap[c.invoice_id] = c.currency

  // Filter contracts by project/section
  const contracts = allContracts.filter((c: any) => {
    if (projectId && c.project_id !== projectId) return false
    if (sectionId && c.section_id !== sectionId) return false
    return true
  })

  const contractIds = new Set(contracts.map((c: any) => c.id))

  // Filter tranches to only those belonging to filtered contracts
  const tranches = allTranches.filter((t: any) => {
    const cid = (t.contracts as any)?.id
    if (!cid) return false
    if (projectId) {
      const pid = (t.contracts as any)?.project_id
      if (pid !== projectId) return false
    }
    if (sectionId) {
      const sid = (t.contracts as any)?.section_id
      if (sid !== sectionId) return false
    }
    return true
  })

  // Compute per-project stats for the filter cards
  const sectionCountByProject: Record<string, number> = {}
  for (const s of allSections) {
    sectionCountByProject[s.project_id] = (sectionCountByProject[s.project_id] || 0) + 1
  }

  const projectsWithStats = rawProjects.map((p: any) => {
    const pContracts = allContracts.filter((c: any) => c.project_id === p.id)
    const pTranches = allTranches.filter((t: any) => (t.contracts as any)?.project_id === p.id)
    const committed = pTranches.reduce((s: number, t: any) => s + (t.amount || 0), 0)
    const paid = pTranches.filter((t: any) => t.status === 'paid').reduce((s: number, t: any) => s + (t.amount || 0), 0)
    const pct = committed > 0 ? Math.round((paid / committed) * 100) : 0
    return {
      id: p.id,
      name: p.name,
      status: p.status || 'active',
      committed,
      paid,
      pct,
      contractCount: pContracts.length,
      sectionCount: sectionCountByProject[p.id] || 0,
      currency: p.currency || 'USD',
    }
  })

  // Row 1 metrics (filtered)
  const totalCommitted = tranches.reduce((s:number,t:any) => s + (t.amount||0), 0)
  const totalPaid      = tranches.filter((t:any) => t.status === 'paid').reduce((s:number,t:any) => s + (t.amount||0), 0)

  const pipeline30 = tranches.filter((t:any) => {
    if (t.status !== 'scheduled' && t.status !== 'unpaid') return false
    if (!t.scheduled_date) return false
    const d = new Date(t.scheduled_date)
    return d >= now && d <= in30
  }).reduce((s:number,t:any) => s + (t.amount||0), 0)

  const overdueTranches = tranches.filter((t:any) => {
    if (t.status === 'paid') return false
    if (!t.scheduled_date) return false
    return new Date(t.scheduled_date) < now
  })
  const overdueAmount = overdueTranches.reduce((s:number,t:any) => s + (t.amount||0), 0)

  // Build invoice lookup
  const invoiceByTranche: Record<string,any> = {}
  const invoiceByContract: Record<string,any[]> = {}
  for (const inv of invoices) {
    if ((inv as any).tranche_id) invoiceByTranche[(inv as any).tranche_id] = inv
    const cid = (inv as any).contract_id
    if (cid) {
      if (!invoiceByContract[cid]) invoiceByContract[cid] = []
      invoiceByContract[cid].push(inv)
    }
  }

  // Contract advancement (filtered)
  const contractAdvancement = contracts.map((c:any) => {
    const ts: any[] = c.contract_tranches || []
    const total = ts.reduce((s:number,t:any) => s + (t.amount||0), 0)
    const paid  = ts.filter((t:any) => t.status === 'paid').reduce((s:number,t:any) => s + (t.amount||0), 0)
    const pct   = total > 0 ? Math.round((paid/total)*100) : 0
    const ccy   = c.currency || 'USD'

    const upcoming = ts
      .filter((t:any) => t.status !== 'paid' && t.scheduled_date)
      .sort((a:any,b:any) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
    const nextDeadline = upcoming[0] || null
    const nextDate = nextDeadline?.scheduled_date ? new Date(nextDeadline.scheduled_date) : null
    const daysToNext = nextDate ? Math.floor((nextDate.getTime() - now.getTime()) / 86400000) : null
    const currentTranche = upcoming[0] || ts[ts.length - 1] || null

    return { id:c.id, name:c.contract_name, provider:c.service_providers?.name||'',
             category:c.category||'Other', total, paid, pct, ccy,
             nextDeadline:nextDeadline?.scheduled_date||null, daysToNext,
             trancheStatus:currentTranche?.status||'unpaid' }
  }).filter((c:any) => c.total > 0)

  // Timeline (filtered)
  const timeline = tranches
    .filter((t:any) => t.scheduled_date)
    .map((t:any) => {
      const d = new Date(t.scheduled_date)
      const daysAway = Math.floor((d.getTime() - now.getTime()) / 86400000)
      const isOverdue = t.status !== 'paid' && d < now
      const isDueSoon = !isOverdue && daysAway <= 14
      const inv = invoiceByTranche[t.id] || null
      let invStatus = 'no_invoice'
      if (inv) invStatus = inv.status
      return {
        trancheId: t.id,
        contractId: (t.contracts as any)?.id,
        contractName: (t.contracts as any)?.contract_name || '',
        provider: (t.contracts as any)?.service_providers?.name || '',
        trancheName: t.tranche_name,
        scheduledDate: t.scheduled_date,
        amount: t.amount || 0,
        currency: (t.contracts as any)?.currency || 'USD',
        status: t.status,
        isOverdue,
        isDueSoon,
        daysAway,
        invId: inv?.id || null,
        invStatus,
      }
    })
    .sort((a:any, b:any) => {
      if (a.isOverdue && !b.isOverdue) return -1
      if (!a.isOverdue && b.isOverdue) return 1
      return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    })
    .slice(0, 20)

  // Provider tracker (filtered)
  const providerMap: Record<string, any> = {}
  for (const c of contracts) {
    const pid = (c as any).service_providers?.id
    const pname = (c as any).service_providers?.name
    if (!pid) continue
    if (!providerMap[pid]) providerMap[pid] = { id:pid, name:pname, contracts:[] }
    const ts: any[] = (c as any).contract_tranches || []
    const tranchesByName: Record<string,any> = {}
    for (const t of ts) tranchesByName[t.tranche_name] = t
    const totalPaidP = ts.filter((t:any) => t.status==='paid').reduce((s:number,t:any)=>s+(t.amount||0),0)
    const totalAllP  = ts.reduce((s:number,t:any)=>s+(t.amount||0),0)
    providerMap[pid].contracts.push({
      contractId: (c as any).id,
      contractName: (c as any).contract_name,
      ccy: (c as any).currency || 'USD',
      tranches: tranchesByName,
      totalPaid: totalPaidP,
      balance: totalAllP - totalPaidP,
    })
  }
  const providerRows = Object.values(providerMap).slice(0, 12)

  // Alerts (use unfiltered allInv for global alerts, but filtered tranches for overdue/upcoming)
  const alerts: any[] = []

  for (const t of overdueTranches.slice(0,5)) {
    const daysOver = Math.floor((now.getTime() - new Date(t.scheduled_date).getTime()) / 86400000)
    alerts.push({
      color:'red', priority:0,
      title:`Overdue: ${(t.contracts as any)?.contract_name || 'Contract'}`,
      sub:`${t.tranche_name} - ${daysOver} day${daysOver!==1?'s':''} overdue`,
      href:`/contracts/${(t.contracts as any)?.id}`,
    })
  }

  for (const inv of allInv.filter((i:any) => ['pending_review','pending_placide','pending_hitech'].includes(i.status))) {
    if (!(inv as any).submitted_at) continue
    const daysStuck = Math.floor((now.getTime() - new Date((inv as any).submitted_at).getTime()) / 86400000)
    if (daysStuck > 3) {
      alerts.push({
        color:'red', priority:1,
        title:`Stuck: ${(inv as any).subcontractor_name || 'Invoice'}`,
        sub:`In validation ${daysStuck} days - ${INV_STATUS[(inv as any).status]?.label||'Pending'}`,
        href:`/invoices/${(inv as any).id}`,
      })
    }
  }

  const dueSoon = tranches.filter((t:any) => {
    if (t.status === 'paid') return false
    if (!t.scheduled_date) return false
    const d = new Date(t.scheduled_date)
    return d >= now && d <= in14
  })
  for (const t of dueSoon.slice(0,4)) {
    const daysAway = Math.floor((new Date(t.scheduled_date).getTime() - now.getTime()) / 86400000)
    alerts.push({
      color:'amber', priority:2,
      title:`Due soon: ${(t.contracts as any)?.contract_name || 'Contract'}`,
      sub:`${t.tranche_name} due in ${daysAway} day${daysAway!==1?'s':''}`,
      href:`/contracts/${(t.contracts as any)?.id}`,
    })
  }

  const awaitingRudy = allInv.filter((i:any) => i.status === 'pending_review').length
  if (awaitingRudy > 0) {
    alerts.push({
      color:'amber', priority:3,
      title:`${awaitingRudy} invoice${awaitingRudy!==1?'s':''} awaiting Rudy review`,
      sub:'Validation chain blocked at step 1',
      href:'/validations',
    })
  }

  for (const c of contractAdvancement.filter((c:any) => c.pct >= 80 && c.pct < 100)) {
    alerts.push({
      color:'amber', priority:4,
      title:`Budget warning: ${c.name}`,
      sub:`${c.pct}% of contract budget consumed`,
      href:`/contracts/${c.id}`,
    })
  }

  for (const t of tranches.filter((t:any) => {
    if (t.status === 'paid') return false
    if (!t.scheduled_date) return false
    const d = new Date(t.scheduled_date)
    return d > in14 && d <= in30
  }).slice(0,4)) {
    const hasInv = !!invoiceByTranche[t.id]
    if (!hasInv) {
      alerts.push({
        color:'blue', priority:5,
        title:`No invoice: ${(t.contracts as any)?.contract_name || 'Contract'}`,
        sub:`${t.tranche_name} due ${new Date(t.scheduled_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})} - no invoice uploaded yet`,
        href:`/contracts/${(t.contracts as any)?.id}`,
      })
    }
  }

  alerts.sort((a,b) => a.priority - b.priority)

  return {
    totalCommitted, totalPaid, pipeline30, overdueAmount,
    overdueCount: overdueTranches.length,
    contractAdvancement,
    timeline,
    providerRows,
    invoiceByTranche,
    alerts: alerts.slice(0, 12),
    projects: projectsWithStats,
    currentProject: projectId || '',
    currentSection: sectionId || '',
  }
}

function fmtDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
}

function trancheColor(t: any, now: Date) {
  if (!t) return '#E2E8F0'
  if (t.status === 'paid') return '#10B981'
  if (t.status === 'scheduled' || t.status === 'unpaid') {
    if (t.scheduled_date && new Date(t.scheduled_date) < now) return '#EF4444'
    if (t.scheduled_date) {
      const days = Math.floor((new Date(t.scheduled_date).getTime() - now.getTime()) / 86400000)
      if (days <= 14) return '#F59E0B'
      return '#3B82F6'
    }
    return '#94A3B8'
  }
  return '#94A3B8'
}

function invStatusLabel(status: string) {
  if (status === 'no_invoice') return { label:'No invoice', color:'#94A3B8', bg:'#F1F5F9' }
  return INV_STATUS[status] || { label:status, color:'#64748B', bg:'#F8FAFC' }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { project?: string; section?: string }
}) {
  const projectId = searchParams.project || ''
  const sectionId = searchParams.section || ''
  const d = await getData(projectId || undefined, sectionId || undefined)
  const now = new Date()

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

      {/* Project filter */}
      <DashboardFilters
        projects={d.projects}
        currentProject={d.currentProject}
        currentSection={d.currentSection}
      />

      {/* ROW 1 - 4 metric cards */}
      <div className="grid grid-cols-4 gap-4">
        <Link href="/contracts" className="rounded-2xl px-5 py-5 block hover:shadow-md transition-shadow" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color:'#94A3B8' }}>Total Committed</p>
          <p className="text-2xl font-bold mb-1" style={{ color:'#3B82F6' }}>{formatCurrency(d.totalCommitted)}</p>
          <p className="text-xs" style={{ color:'#94A3B8' }}>across all contracts</p>
        </Link>

        <Link href="/payment-register?filter=paid" className="rounded-2xl px-5 py-5 block hover:shadow-md transition-shadow" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color:'#94A3B8' }}>Total Paid</p>
          <p className="text-2xl font-bold mb-1" style={{ color:'#10B981' }}>{formatCurrency(d.totalPaid)}</p>
          <p className="text-xs" style={{ color:'#94A3B8' }}>confirmed payments</p>
        </Link>

        <Link href="/payment-register?filter=upcoming" className="rounded-2xl px-5 py-5 block hover:shadow-md transition-shadow" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color:'#94A3B8' }}>Pipeline next 30 days</p>
          <p className="text-2xl font-bold mb-1" style={{ color:'#F59E0B' }}>{formatCurrency(d.pipeline30)}</p>
          <p className="text-xs" style={{ color:'#94A3B8' }}>scheduled tranches</p>
        </Link>

        <Link href="/payment-register?filter=overdue" className="rounded-2xl px-5 py-5 block hover:shadow-md transition-shadow" style={{ background: d.overdueAmount > 0 ? '#FEF2F2' : '#FFFFFF', border: d.overdueAmount > 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid #E2E8F0' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: d.overdueAmount > 0 ? '#EF4444' : '#94A3B8' }}>Overdue Payments</p>
          <p className="text-2xl font-bold mb-1" style={{ color:'#EF4444' }}>{formatCurrency(d.overdueAmount)}</p>
          <p className="text-xs" style={{ color:'#EF4444' }}>{d.overdueCount} tranche{d.overdueCount!==1?'s':''} overdue</p>
        </Link>
      </div>

      {/* ROW 2 - Contract advancement + Timeline */}
      <div className="grid grid-cols-2 gap-5">

        {/* Left: Contract payment advancement */}
        <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid #F1F5F9' }}>
            <div>
              <p className="text-sm font-bold" style={{ color:'#0F172A' }}>Contract Payment Advancement</p>
              <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>Click any row to open the contract</p>
            </div>
            <Link href="/contracts" className="text-xs font-semibold" style={{ color:'#3B82F6' }}>View all</Link>
          </div>
          <div className="divide-y divide-[#F8FAFC]">
            {d.contractAdvancement.length === 0 && (
              <p className="text-sm text-center py-10" style={{ color:'#94A3B8' }}>No contracts yet</p>
            )}
            {d.contractAdvancement.slice(0,8).map((c:any) => {
              const catC = ESG_COLOR[c.category] || ESG_COLOR.Other
              const deadlineColor = c.daysToNext === null ? '#94A3B8'
                : c.daysToNext < 0 ? '#EF4444'
                : c.daysToNext <= 14 ? '#F59E0B'
                : '#94A3B8'
              const pctColor = c.pct >= 80 ? '#EF4444' : c.pct >= 50 ? '#F59E0B' : '#10B981'
              return (
                <Link key={c.id} href={`/contracts/${c.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background:`${catC}18`, color:catC }}>{c.category}</span>
                      <p className="text-sm font-semibold truncate" style={{ color:'#0F172A' }}>{c.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs truncate" style={{ color:'#94A3B8' }}>{c.provider}</p>
                      {c.nextDeadline && (
                        <p className="text-xs font-medium" style={{ color:deadlineColor }}>
                          {c.daysToNext !== null && c.daysToNext < 0
                            ? `${Math.abs(c.daysToNext)}d overdue`
                            : c.daysToNext !== null && c.daysToNext <= 14
                              ? `Due in ${c.daysToNext}d`
                              : fmtDate(c.nextDeadline)
                          }
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="w-28 shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold" style={{ color:pctColor }}>{c.pct}%</span>
                      <span className="text-xs" style={{ color:'#94A3B8' }}>{formatCurrency(c.paid, c.ccy)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'#F1F5F9' }}>
                      <div style={{ width:`${c.pct}%`, height:'100%', background:pctColor, borderRadius:4 }}/>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right: Payment deadline timeline */}
        <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
          <div className="px-5 py-4" style={{ borderBottom:'1px solid #F1F5F9' }}>
            <p className="text-sm font-bold" style={{ color:'#0F172A' }}>Upcoming and Overdue Deadlines</p>
            <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>Chronological - overdue first</p>
          </div>
          <div className="divide-y divide-[#F8FAFC] overflow-y-auto" style={{ maxHeight:380 }}>
            {d.timeline.length === 0 && (
              <p className="text-sm text-center py-10" style={{ color:'#94A3B8' }}>No scheduled tranches</p>
            )}
            {d.timeline.map((item:any) => {
              const dotColor = item.isOverdue ? '#EF4444' : item.isDueSoon ? '#F59E0B' : '#94A3B8'
              const st = invStatusLabel(item.invStatus)
              const href = item.invId ? `/invoices/${item.invId}` : `/contracts/${item.contractId}`
              return (
                <Link key={item.trancheId} href={href}
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="mt-1.5 shrink-0 w-2.5 h-2.5 rounded-full" style={{ background:dotColor }}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <p className="text-sm font-semibold truncate" style={{ color:'#0F172A' }}>{item.contractName}</p>
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background:'#F1F5F9', color:'#64748B' }}>{item.trancheName}</span>
                    </div>
                    <p className="text-xs truncate mb-1" style={{ color:'#94A3B8' }}>{item.provider}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium" style={{ color:dotColor }}>
                        {item.isOverdue
                          ? `${Math.abs(item.daysAway)}d overdue`
                          : item.daysAway === 0 ? 'Due today'
                          : `Due in ${item.daysAway}d`}
                      </span>
                      <span className="text-xs" style={{ color:'#94A3B8' }}>{fmtDate(item.scheduledDate)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:st.bg, color:st.color }}>{st.label}</span>
                    </div>
                  </div>
                  <p className="text-sm font-bold shrink-0" style={{ color:'#0F172A' }}>{formatCurrency(item.amount, item.currency)}</p>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* ROW 3 - Tranche tracker + Alerts */}
      <div className="grid grid-cols-2 gap-5">

        {/* Left: Tranche tracker per provider */}
        <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
          <div className="px-5 py-4" style={{ borderBottom:'1px solid #F1F5F9' }}>
            <p className="text-sm font-bold" style={{ color:'#0F172A' }}>Tranche Tracker by Consultant</p>
            <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>Green=paid, Amber=pending, Blue=upcoming, Red=overdue</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background:'#FAFBFC', borderBottom:'1px solid #F1F5F9' }}>
                  <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-widest" style={{ color:'#94A3B8' }}>Consultant</th>
                  <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-widest" style={{ color:'#94A3B8' }}>Contract</th>
                  {TRANCHE_ORDER.map(t => (
                    <th key={t} className="px-2 py-2.5 text-center font-semibold uppercase tracking-widest" style={{ color:'#94A3B8' }}>{t}</th>
                  ))}
                  <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-widest" style={{ color:'#94A3B8' }}>Paid</th>
                  <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-widest" style={{ color:'#94A3B8' }}>Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFC]">
                {d.providerRows.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-8" style={{ color:'#94A3B8' }}>No data</td></tr>
                )}
                {d.providerRows.map((prov:any) =>
                  prov.contracts.map((c:any, ci:number) => (
                    <tr key={`${prov.id}-${c.contractId}`} className="hover:bg-slate-50 transition-colors">
                      {ci === 0 ? (
                        <td className="px-4 py-2.5" rowSpan={prov.contracts.length}>
                          <Link href={`/providers/${prov.id}`} className="font-semibold hover:text-blue-600 transition-colors" style={{ color:'#0F172A' }}>
                            {prov.name}
                          </Link>
                        </td>
                      ) : null}
                      <td className="px-4 py-2.5 max-w-[120px]">
                        <Link href={`/contracts/${c.contractId}`} className="truncate block hover:text-blue-600 transition-colors" style={{ color:'#64748B' }}>
                          {c.contractName}
                        </Link>
                      </td>
                      {TRANCHE_ORDER.map(tn => {
                        const t = c.tranches[tn]
                        const col = trancheColor(t, now)
                        if (!t) return (
                          <td key={tn} className="px-2 py-2.5 text-center">
                            <div className="w-5 h-5 rounded mx-auto" style={{ background:'#F1F5F9' }}/>
                          </td>
                        )
                        const href = t.id && d.invoiceByTranche[t.id] ? `/invoices/${d.invoiceByTranche[t.id].id}` : `/contracts/${c.contractId}`
                        return (
                          <td key={tn} className="px-2 py-2.5 text-center">
                            <Link href={href} title={`${tn}: ${t.status} - ${formatCurrency(t.amount, c.ccy)}`}>
                              <div className="w-5 h-5 rounded mx-auto hover:scale-125 transition-transform" style={{ background:col }}/>
                            </Link>
                          </td>
                        )
                      })}
                      <td className="px-4 py-2.5 text-right font-semibold" style={{ color:'#10B981' }}>{formatCurrency(c.totalPaid, c.ccy)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold" style={{ color:c.balance>0?'#F59E0B':'#94A3B8' }}>{formatCurrency(c.balance, c.ccy)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Alerts */}
        <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
          <div className="px-5 py-4" style={{ borderBottom:'1px solid #F1F5F9' }}>
            <p className="text-sm font-bold" style={{ color:'#0F172A' }}>Alerts and Actions Required</p>
            <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>Auto-generated from live data, ordered by urgency</p>
          </div>
          <div className="divide-y divide-[#F8FAFC] overflow-y-auto" style={{ maxHeight:420 }}>
            {d.alerts.length === 0 && (
              <div className="py-12 text-center">
                <div className="text-2xl mb-2">OK</div>
                <p className="text-sm font-medium" style={{ color:'#10B981' }}>All clear</p>
                <p className="text-xs mt-1" style={{ color:'#94A3B8' }}>No alerts at this time</p>
              </div>
            )}
            {d.alerts.map((a:any, i:number) => {
              const isRed   = a.color === 'red'
              const isAmber = a.color === 'amber'
              const iconColor = isRed ? '#EF4444' : isAmber ? '#F59E0B' : '#3B82F6'
              const iconBg    = isRed ? 'rgba(239,68,68,0.1)' : isAmber ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)'
              const icon      = isRed ? 'R' : isAmber ? '!' : 'i'
              return (
                <Link key={i} href={a.href}
                  className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ background:iconBg, color:iconColor }}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color:'#0F172A' }}>{a.title}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color:'#94A3B8' }}>{a.sub}</p>
                  </div>
                  <svg width="14" height="14" fill="none" stroke="#CBD5E1" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0 mt-1"><polyline points="9 18 15 12 9 6"/></svg>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

    </div>
  )
}