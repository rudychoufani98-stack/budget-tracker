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
  pending_dani:  { label:'Awaiting Dani',    color:'#7C3AED', bg:'rgba(124,58,237,0.1)'  },
  approved:        { label:'Approved',         color:'#10B981', bg:'rgba(16,185,129,0.1)'  },
  rejected:        { label:'Rejected',         color:'#EF4444', bg:'rgba(239,68,68,0.1)'   },
}

async function getData(projectId?: string, sectionId?: string, baseCcy: string = 'NGN') {
  const now = new Date()
  const in30 = new Date(now.getTime() + 30*86400000)
  const in14 = new Date(now.getTime() + 14*86400000)

  const [tranchesRes, contractsRes, invoicesRes, allInvRes, currencyRes, providersRes, projectsRes, sectionsCountRes, fxRes] = await Promise.all([
    supabaseAdmin.from('contract_tranches').select('*, contracts(id, contract_name, category, currency, fx_rate_at_signing, project_id, section_id, service_providers(id, name))').order('scheduled_date', { ascending: true }),
    supabaseAdmin.from('contracts').select('id, contract_name, category, currency, fx_rate_at_signing, contract_amount, start_date, end_date, project_id, section_id, service_providers(id, name), contract_tranches(id, tranche_name, amount, status, scheduled_date, paid_date), invoices(id, status, submitted_at, amount_ttc)').order('created_at', { ascending: false }),
    supabaseAdmin.from('invoices').select('id, status, subcontractor_name, submitted_at, amount_ttc, contract_id, tranche_id').order('submitted_at', { ascending: false }),
    supabaseAdmin.from('invoices').select('id, status, subcontractor_name, submitted_at, amount_ttc, contract_id'),
    supabaseAdmin.from('invoice_currency').select('invoice_id, currency'),
    supabaseAdmin.from('service_providers').select('id, name'),
    supabaseAdmin.from('projects').select('id, name, status, currency'),
    supabaseAdmin.from('project_sections').select('id, project_id, name'),
    supabaseAdmin.from('exchange_rates').select('currency, rate, fetched_at').eq('base', 'USD'),
  ])

  const allTranches  = tranchesRes.data  || []
  const allContracts = contractsRes.data || []
  const invoices     = invoicesRes.data  || []
  const allInv       = allInvRes.data    || []
  const providers    = providersRes.data || []
  const rawProjects  = projectsRes.data  || []
  const allSections  = sectionsCountRes.data || []

  // FX rates (all vs USD as base)
  const fxRates: Record<string, number> = { USD: 1 }
  let fxFetchedAt = ''
  for (const row of fxRes.data || []) {
    fxRates[row.currency] = row.rate
    if (!fxFetchedAt) fxFetchedAt = row.fetched_at
  }

  // Convert any amount from its native currency to baseCcy
  function toBase(amount: number, fromCcy: string): number {
    if (!amount) return 0
    const from = fxRates[fromCcy] || 1
    const to   = fxRates[baseCcy] || 1
    return (amount / from) * to
  }

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
      currency: p.currency || 'NGN',
    }
  })

  // Row 1 metrics — convert using fx_rate_at_signing when available
  // baseCcy='NGN': NGN stays, USD*signingRate; baseCcy='USD': NGN/signingRate, USD stays
  function trancheBase(t: any): number {
    const amount = t.amount || 0
    const ccy    = (t.contracts as any)?.currency || 'NGN'
    const signingRate = (t.contracts as any)?.fx_rate_at_signing || fxRates['NGN'] || 1580

    if (baseCcy === 'NGN') {
      if (ccy === 'NGN') return amount
      if (ccy === 'USD') return amount * signingRate
      return toBase(amount, ccy) * signingRate  // other ccy -> USD -> NGN
    } else {
      // USD view
      if (ccy === 'USD') return amount
      if (ccy === 'NGN') return amount / signingRate
      return toBase(amount, ccy)  // already in USD via fxRates
    }
  }

  // Use contract_amount as committed (not just sum of tranches - avoids missing unscheduled balance)
  function contractBase(c: any): number {
    const amount = c.contract_amount || c.total_budget || 0
    const ccy    = c.currency || 'NGN'
    const rate   = c.fx_rate_at_signing || fxRates['NGN'] || 1580
    if (baseCcy === 'NGN') {
      if (ccy === 'NGN') return amount
      if (ccy === 'USD') return amount * rate
      return toBase(amount, ccy) * rate
    } else {
      if (ccy === 'USD') return amount
      if (ccy === 'NGN') return amount / rate
      return toBase(amount, ccy)
    }
  }

  const totalCommitted = contracts.reduce((s:number,c:any) => s + contractBase(c), 0)
  const totalPaid      = tranches.filter((t:any) => t.status === 'paid').reduce((s:number,t:any) => s + trancheBase(t), 0)

  const pipeline30 = tranches.filter((t:any) => {
    if (t.status !== 'scheduled' && t.status !== 'unpaid') return false
    if (!t.scheduled_date) return false
    const d = new Date(t.scheduled_date)
    return d >= now && d <= in30
  }).reduce((s:number,t:any) => s + trancheBase(t), 0)

  const VALIDATION_STATUSES = ['pending_review','pending_placide','pending_dani','pending_fares']
  const pendingPaymentTranches = tranches.filter((t:any) => VALIDATION_STATUSES.includes(t.status))
  const pendingPaymentAmount   = pendingPaymentTranches.reduce((s:number,t:any) => s + trancheBase(t), 0)

  const overdueTranches = tranches.filter((t:any) => {
    if (t.status === 'paid') return false
    if (!t.scheduled_date) return false
    return new Date(t.scheduled_date) < now
  })
  const overdueAmount = overdueTranches.reduce((s:number,t:any) => s + trancheBase(t), 0)

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

  // Helper: convert a contract amount to baseCcy using its signing rate
  function contractToBase(amount: number, ccy: string, signingRate: number | null): number {
    if (!amount) return 0
    const rate = signingRate || fxRates['NGN'] || 1580
    if (baseCcy === 'NGN') {
      if (ccy === 'NGN') return amount
      if (ccy === 'USD') return amount * rate
      return toBase(amount, ccy) * rate
    } else {
      if (ccy === 'USD') return amount
      if (ccy === 'NGN') return amount / rate
      return toBase(amount, ccy)
    }
  }

  // Contract advancement (filtered)
  const contractAdvancement = contracts.map((c:any) => {
    const ts: any[] = c.contract_tranches || []
    const signingRate = c.fx_rate_at_signing || null
    const ccy = c.currency || 'NGN'
    // Use contract_amount as the total (full contract value, not just scheduled tranches)
    const total = contractToBase(c.contract_amount || c.total_budget || 0, ccy, signingRate)
    const paid  = ts.filter((t:any) => t.status === 'paid').reduce((s:number,t:any) => s + contractToBase(t.amount||0, ccy, signingRate), 0)
    const pct   = total > 0 ? Math.round((paid/total)*100) : 0

    const upcoming = ts
      .filter((t:any) => t.status !== 'paid' && t.scheduled_date)
      .sort((a:any,b:any) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
    const nextDeadline = upcoming[0] || null
    const nextDate = nextDeadline?.scheduled_date ? new Date(nextDeadline.scheduled_date) : null
    const daysToNext = nextDate ? Math.floor((nextDate.getTime() - now.getTime()) / 86400000) : null
    const currentTranche = upcoming[0] || ts[ts.length - 1] || null

    return { id:c.id, name:c.contract_name, provider:c.service_providers?.name||'',
             category:c.category||'Other', total, paid, pct, ccy: baseCcy,
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
      const tCcy        = (t.contracts as any)?.currency || 'NGN'
      const tSignRate   = (t.contracts as any)?.fx_rate_at_signing || null
      const amountBase  = contractToBase(t.amount || 0, tCcy, tSignRate)
      return {
        trancheId: t.id,
        contractId: (t.contracts as any)?.id,
        contractName: (t.contracts as any)?.contract_name || '',
        provider: (t.contracts as any)?.service_providers?.name || '',
        trancheName: t.tranche_name,
        scheduledDate: t.scheduled_date,
        amount: amountBase,
        currency: baseCcy,
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
    const cCcy       = (c as any).currency || 'NGN'
    const cRate      = (c as any).fx_rate_at_signing || null
    const tranchesByName: Record<string,any> = {}
    for (const t of ts) tranchesByName[t.tranche_name] = t
    const totalPaidP = ts.filter((t:any) => t.status==='paid').reduce((s:number,t:any)=>s+contractToBase(t.amount||0,cCcy,cRate),0)
    const totalAllP  = ts.reduce((s:number,t:any)=>s+contractToBase(t.amount||0,cCcy,cRate),0)
    providerMap[pid].contracts.push({
      contractId: (c as any).id,
      contractName: (c as any).contract_name,
      ccy: baseCcy,
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

  for (const inv of allInv.filter((i:any) => ['pending_review','pending_placide','pending_dani'].includes(i.status))) {
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

  // Contract timeline — one row per contract with start/end dates and tranche milestones
  const today = now.getTime()
  const contractTimeline = contracts
    .filter((c:any) => (c.contract_tranches||[]).length > 0 || c.start_date || c.end_date)
    .map((c:any) => {
      const ts: any[] = c.contract_tranches || []
      const datesWithData = [
        c.start_date,
        c.end_date,
        ...ts.map((t:any) => t.scheduled_date).filter(Boolean),
      ].filter(Boolean).map((d:string) => new Date(d).getTime())
      const minDate = datesWithData.length ? Math.min(...datesWithData) : today - 30*86400000
      const maxDate = datesWithData.length ? Math.max(...datesWithData) : today + 90*86400000
      const total = ts.reduce((s:number,t:any)=>s+(t.amount||0),0)
      const paid  = ts.filter((t:any)=>t.status==='paid').reduce((s:number,t:any)=>s+(t.amount||0),0)
      const pct   = total>0 ? Math.round((paid/total)*100) : 0
      return {
        id: c.id,
        name: c.contract_name,
        provider: c.service_providers?.name || '',
        category: c.category || 'Other',
        ccy: c.currency || 'NGN',
        total, paid, pct,
        startDate: c.start_date || null,
        endDate: c.end_date || null,
        minDate, maxDate,
        tranches: ts.filter((t:any) => t.scheduled_date).map((t:any) => ({
          id: t.id,
          name: t.tranche_name,
          date: t.scheduled_date,
          amount: t.amount || 0,
          status: t.status,
          ts: new Date(t.scheduled_date).getTime(),
        })),
      }
    })
    .sort((a:any,b:any) => (a.startDate||'').localeCompare(b.startDate||''))

  return {
    totalCommitted, totalPaid, pipeline30, overdueAmount,
    overdueCount: overdueTranches.length,
    pendingPaymentTranches, pendingPaymentAmount,
    contractAdvancement,
    timeline,
    providerRows,
    invoiceByTranche,
    alerts: alerts.slice(0, 12),
    projects: projectsWithStats,
    currentProject: projectId || '',
    currentSection: sectionId || '',
    contractTimeline,
    baseCcy,
    fxRates,
    fxFetchedAt,
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

function ContractTimeline({ contracts, now }: { contracts: any[]; now: Date }) {
  if (contracts.length === 0) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
        <p className="text-sm font-semibold mb-1" style={{ color:'#0F172A' }}>Contract Timeline</p>
        <p className="text-xs" style={{ color:'#94A3B8' }}>Add contracts with start/end dates or payment tranches to see the timeline.</p>
      </div>
    )
  }

  const todayMs = now.getTime()
  const allMs = contracts.flatMap((c:any) => [c.minDate, c.maxDate])
  const windowStart = Math.min(...allMs)
  const windowEnd   = Math.max(...allMs)
  const windowLen   = Math.max(windowEnd - windowStart, 86400000)

  const todayPct = Math.min(100, Math.max(0, ((todayMs - windowStart) / windowLen) * 100))

  const months: { label: string; pct: number }[] = []
  const cursor = new Date(windowStart)
  cursor.setDate(1)
  while (cursor.getTime() <= windowEnd) {
    const pct = ((cursor.getTime() - windowStart) / windowLen) * 100
    if (pct >= 0 && pct <= 102) {
      months.push({ label: cursor.toLocaleDateString('en-GB', { month:'short', year:'2-digit' }), pct })
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }

  function pos(ts: number) {
    return Math.min(100, Math.max(0, ((ts - windowStart) / windowLen) * 100))
  }

  function dotColor(status: string, ts: number) {
    if (status === 'paid') return '#10B981'
    if (ts < todayMs) return '#EF4444'
    if (ts - todayMs < 14 * 86400000) return '#F59E0B'
    return '#3B82F6'
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid #F1F5F9' }}>
        <div>
          <p className="text-sm font-bold" style={{ color:'#0F172A' }}>Contract Timeline</p>
          <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>One row per contract - dots = payment tranches</p>
        </div>
        <div className="flex items-center gap-4 text-xs" style={{ color:'#94A3B8' }}>
          {[['#10B981','Paid'],['#EF4444','Overdue'],['#F59E0B','Due soon'],['#3B82F6','Upcoming']].map(([color,label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background:color }}/>
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 pt-4 pb-5">
        {/* Month axis */}
        <div className="flex mb-3" style={{ paddingLeft:192 }}>
          <div className="relative flex-1" style={{ height:16 }}>
            {months.map((m,i) => (
              <span key={i} className="absolute text-xs" style={{ left:`${m.pct}%`, color:'#94A3B8', transform:'translateX(-50%)', whiteSpace:'nowrap', fontSize:10 }}>
                {m.label}
              </span>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-2">
          {contracts.map((c:any) => {
            const catC     = ESG_COLOR[c.category] || ESG_COLOR.Other
            const pctColor = c.pct >= 80 ? '#EF4444' : c.pct >= 50 ? '#F59E0B' : '#10B981'
            const barL     = pos(c.startDate ? new Date(c.startDate).getTime() : c.minDate)
            const barR     = pos(c.endDate   ? new Date(c.endDate).getTime()   : c.maxDate)
            const barW     = Math.max(1, barR - barL)

            return (
              <div key={c.id} className="flex items-center gap-3" style={{ minHeight:36 }}>
                {/* Label */}
                <div className="shrink-0 flex items-center gap-2" style={{ width:184 }}>
                  <span className="text-xs px-1.5 py-0.5 rounded font-semibold shrink-0" style={{ background:`${catC}18`, color:catC }}>{c.category}</span>
                  <div className="min-w-0">
                    <Link href={`/contracts/${c.id}`} className="text-xs font-semibold block truncate hover:underline" style={{ color:'#0F172A', maxWidth:130 }}>
                      {c.name}
                    </Link>
                    <p className="text-xs truncate" style={{ color:'#94A3B8', maxWidth:130 }}>{c.provider}</p>
                  </div>
                </div>

                {/* Bar */}
                <div className="relative flex-1 h-8 rounded" style={{ background:'#F8FAFC' }}>
                  {/* Duration bar background */}
                  <div className="absolute h-full rounded overflow-hidden" style={{ left:`${barL}%`, width:`${barW}%`, background:`${catC}20`, border:`1px solid ${catC}40` }}>
                    {/* Progress fill */}
                    <div className="h-full" style={{ width:`${c.pct}%`, background:`${catC}60` }}/>
                  </div>

                  {/* % label */}
                  <div className="absolute inset-y-0 flex items-center text-xs font-bold" style={{ left:`${barL + barW / 2}%`, transform:'translateX(-50%)', color:catC, pointerEvents:'none', fontSize:11 }}>
                    {c.pct}%
                  </div>

                  {/* Today line */}
                  <div className="absolute top-0 bottom-0 w-px" style={{ left:`${todayPct}%`, background:'rgba(239,68,68,0.6)', zIndex:10 }}/>

                  {/* Tranche dots */}
                  {c.tranches.map((t:any) => (
                    <div
                      key={t.id}
                      title={`${t.name} - ${t.status} - ${fmtDate(t.date)}`}
                      className="absolute rounded-full border-2 border-white"
                      style={{ width:13, height:13, left:`${pos(t.ts)}%`, top:'50%', transform:'translate(-50%,-50%)', background:dotColor(t.status, t.ts), zIndex:20, cursor:'default' }}
                    />
                  ))}
                </div>

                {/* Right stats */}
                <div className="shrink-0 text-right" style={{ width:80 }}>
                  <p className="text-xs font-bold" style={{ color:pctColor }}>{c.pct}% paid</p>
                  <p className="text-xs" style={{ color:'#94A3B8' }}>{formatCurrency(c.paid, c.ccy)}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Today label at bottom */}
        <div className="relative mt-1" style={{ paddingLeft:192 }}>
          <div className="relative flex-1" style={{ height:14 }}>
            <span className="absolute text-xs font-semibold" style={{ left:`${todayPct}%`, transform:'translateX(-50%)', color:'#EF4444', fontSize:10 }}>Today</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { project?: string; section?: string; view?: string }
}) {
  const projectId = searchParams.project || ''
  const sectionId = searchParams.section || ''
  const view      = searchParams.view === 'usd' ? 'usd' : 'ngn'
  const baseCcy   = view === 'usd' ? 'USD' : 'NGN'
  const d = await getData(projectId || undefined, sectionId || undefined, baseCcy)
  const now = new Date()

  function viewUrl(v: string) {
    const p = new URLSearchParams()
    if (projectId) p.set('project', projectId)
    if (sectionId) p.set('section', sectionId)
    p.set('view', v)
    return '/dashboard?' + p.toString()
  }

  const fxAge = d.fxFetchedAt
    ? Math.floor((Date.now() - new Date(d.fxFetchedAt).getTime()) / 3600000)
    : null

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:'#64748B' }}>Overview</p>
          <h1 className="text-2xl font-bold" style={{ color:'#0F172A' }}>Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* NGN / USD toggle */}
          <div className="flex items-center rounded-xl overflow-hidden" style={{ border:'1px solid #E2E8F0' }}>
            <Link href={viewUrl('ngn')}
              className="px-4 py-2 text-sm font-bold transition-colors"
              style={view === 'ngn'
                ? { background:'#0F172A', color:'#fff' }
                : { background:'#FFFFFF', color:'#64748B' }}>
              &#8358; NGN
            </Link>
            <Link href={viewUrl('usd')}
              className="px-4 py-2 text-sm font-bold transition-colors"
              style={view === 'usd'
                ? { background:'#0F172A', color:'#fff' }
                : { background:'#FFFFFF', color:'#64748B' }}>
              $ USD
            </Link>
          </div>
          <Link href="/upload" className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl" style={{ background:'#3B82F6', color:'#fff' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Upload Invoice
          </Link>
        </div>
      </div>

      {/* Project filter */}
      <DashboardFilters
        projects={d.projects}
        currentProject={d.currentProject}
        currentSection={d.currentSection}
      />

      {/* ROW 1 - 5 metric cards */}
      <div className="grid grid-cols-5 gap-4">
        <Link href="/contracts" className="rounded-2xl px-5 py-5 block hover:shadow-md transition-shadow" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color:'#94A3B8' }}>Total Committed</p>
          <p className="text-2xl font-bold mb-1" style={{ color:'#3B82F6' }}>{formatCurrency(d.totalCommitted, baseCcy)}</p>
          <p className="text-xs" style={{ color:'#94A3B8' }}>across all contracts {view === 'usd' ? '(at signing rate)' : ''}</p>
        </Link>

        <Link href="/payment-register?filter=paid" className="rounded-2xl px-5 py-5 block hover:shadow-md transition-shadow" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color:'#94A3B8' }}>Total Paid</p>
          <p className="text-2xl font-bold mb-1" style={{ color:'#10B981' }}>{formatCurrency(d.totalPaid, baseCcy)}</p>
          <p className="text-xs" style={{ color:'#94A3B8' }}>confirmed payments</p>
        </Link>

        <div className="rounded-2xl px-5 py-5 block" style={{ background: d.pendingPaymentAmount > 0 ? '#EFF6FF' : '#FFFFFF', border: d.pendingPaymentAmount > 0 ? '1px solid rgba(59,130,246,0.3)' : '1px solid #E2E8F0' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: d.pendingPaymentAmount > 0 ? '#3B82F6' : '#94A3B8' }}>Pending Accounting</p>
          <p className="text-2xl font-bold mb-1" style={{ color:'#3B82F6' }}>{formatCurrency(d.pendingPaymentAmount, baseCcy)}</p>
          <p className="text-xs" style={{ color:'#3B82F6' }}>{d.pendingPaymentTranches.length} tranche{d.pendingPaymentTranches.length!==1?'s':''} awaiting payment</p>
        </div>

        <Link href="/payment-register?filter=upcoming" className="rounded-2xl px-5 py-5 block hover:shadow-md transition-shadow" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color:'#94A3B8' }}>Pipeline next 30 days</p>
          <p className="text-2xl font-bold mb-1" style={{ color:'#F59E0B' }}>{formatCurrency(d.pipeline30, baseCcy)}</p>
          <p className="text-xs" style={{ color:'#94A3B8' }}>scheduled tranches</p>
        </Link>

        <Link href="/payment-register?filter=overdue" className="rounded-2xl px-5 py-5 block hover:shadow-md transition-shadow" style={{ background: d.overdueAmount > 0 ? '#FEF2F2' : '#FFFFFF', border: d.overdueAmount > 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid #E2E8F0' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: d.overdueAmount > 0 ? '#EF4444' : '#94A3B8' }}>Overdue Payments</p>
          <p className="text-2xl font-bold mb-1" style={{ color:'#EF4444' }}>{formatCurrency(d.overdueAmount, baseCcy)}</p>
          <p className="text-xs" style={{ color:'#EF4444' }}>{d.overdueCount} tranche{d.overdueCount!==1?'s':''} overdue</p>
        </Link>
      </div>

      {/* Accounting Queue — only shown when there are pending_payment tranches */}
      {d.pendingPaymentTranches.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1.5px solid rgba(59,130,246,0.35)' }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid #EFF6FF', background:'#EFF6FF' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:'#3B82F6' }}>
                <svg width="15" height="15" fill="none" stroke="#fff" strokeWidth="2.2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color:'#1E40AF' }}>Accounting Queue</p>
                <p className="text-xs mt-0.5" style={{ color:'#3B82F6' }}>{d.pendingPaymentTranches.length} tranche{d.pendingPaymentTranches.length!==1?'s':''} sent to accounting — awaiting payment confirmation</p>
              </div>
            </div>
            <p className="text-lg font-bold" style={{ color:'#1E40AF' }}>{formatCurrency(d.pendingPaymentAmount, baseCcy)}</p>
          </div>
          <div className="divide-y divide-[#F8FAFC]">
            {d.pendingPaymentTranches.map((t:any) => {
              const c = t.contracts as any
              const catColor = ESG_COLOR[c?.category] || ESG_COLOR.Other
              return (
                <div key={t.id} className="px-6 py-3.5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {c?.category && <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background:`${catColor}18`, color:catColor }}>{c.category}</span>}
                      <Link href={`/contracts/${c?.id}`} className="text-sm font-semibold hover:underline truncate" style={{ color:'#0F172A' }}>
                        {c?.contract_name || 'Contract'}
                      </Link>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:'rgba(59,130,246,0.1)', color:'#3B82F6' }}>{t.tranche_name}</span>
                    </div>
                    <p className="text-xs" style={{ color:'#64748B' }}>{c?.service_providers?.name || ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold" style={{ color:'#0F172A' }}>{formatCurrency(t.amount, c?.currency || baseCcy)}</p>
                    {t.scheduled_date && <p className="text-xs mt-0.5" style={{ color:'#64748B' }}>Due {new Date(t.scheduled_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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

      {/* ROW 4 — Contract Timeline (Gantt) */}
      <ContractTimeline contracts={d.contractTimeline} now={now} />

    </div>
  )
}