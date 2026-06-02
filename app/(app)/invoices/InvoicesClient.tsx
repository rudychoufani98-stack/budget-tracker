'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/format'

function getFX(inv: any): number {
  return inv.contracts?.fx_rate_at_signing || 0
}

const STATUS_MAP: Record<string,{label:string;color:string;bg:string}> = {
  pending_review:  { label:'Awaiting Rudy',    color:'#F97316', bg:'rgba(249,115,22,0.1)'  },
  pending_placide: { label:'Awaiting Placide', color:'#8B5CF6', bg:'rgba(139,92,246,0.1)'  },
  pending_dani:    { label:'Awaiting Dani',    color:'#3B82F6', bg:'rgba(59,130,246,0.1)'  },
  pending_fares:   { label:'Awaiting Payment', color:'#0EA5E9', bg:'rgba(14,165,233,0.1)'  },
  approved:        { label:'Paid',             color:'#10B981', bg:'rgba(16,185,129,0.1)'  },
  rejected:        { label:'Rejected',         color:'#EF4444', bg:'rgba(239,68,68,0.1)'   },
}

const VALIDATION_STATUSES = ['pending_review','pending_placide','pending_dani']

export function InvoicesClient({ invoices }: { invoices: any[] }) {
  const [tab,             setTab]             = useState<'invoices'|'payments'>('invoices')
  const [selectedStatus,  setSelectedStatus]  = useState('ALL')
  const [selectedProject, setSelectedProject] = useState('ALL')
  const [search,          setSearch]          = useState('')
  const [paidTranches,    setPaidTranches]    = useState<any[]>([])
  const [view, setView] = useState<'native'|'ngn'|'usd'>('native')

  function toView(amount: number, ccy: string, inv: any): string {
    const rate = getFX(inv)
    if (view === 'ngn') return formatCurrency(ccy === 'USD' ? (rate ? amount * rate : 0) : amount, 'NGN')
    if (view === 'usd') return formatCurrency(ccy === 'NGN' ? (rate ? amount / rate : 0) : amount, 'USD')
    return formatCurrency(amount, ccy)
  }

  useEffect(() => {
    fetch('/api/tranches?status=paid')
      .then(r => r.ok ? r.json() : [])
      .then(d => setPaidTranches(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  const projects = useMemo(() => {
    const set = new Set(invoices.map(i => i.contracts?.projects?.name).filter(Boolean))
    return Array.from(set).sort() as string[]
  }, [invoices])

  const filtered = useMemo(() => {
    return invoices.filter(i => {
      const statOk =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'validation' && VALIDATION_STATUSES.includes(i.status)) ||
        i.status === selectedStatus
      const projOk = selectedProject === 'ALL' || (i.contracts?.projects?.name || '') === selectedProject
      const srchOk = !search || [
        i.invoice_number, i.subcontractor_name,
        i.service_providers?.name, i.contracts?.contract_name,
      ].some(v => v?.toLowerCase().includes(search.toLowerCase()))
      return statOk && projOk && srchOk
    })
  }, [invoices, selectedStatus, selectedProject, search])

  function sumByCcy(list: any[]) {
    if (view === 'ngn') {
      const total = list.reduce((s, i) => {
        const amt = i.amount_ttc || 0
        const rate = getFX(i)
        return s + (i.currency === 'USD' ? (rate ? amt * rate : 0) : amt)
      }, 0)
      return formatCurrency(total, 'NGN')
    }
    if (view === 'usd') {
      const total = list.reduce((s, i) => {
        const amt = i.amount_ttc || 0
        const rate = getFX(i)
        return s + (i.currency === 'NGN' ? (rate ? amt / rate : 0) : amt)
      }, 0)
      return formatCurrency(total, 'USD')
    }
    const map: Record<string,number> = {}
    list.forEach(i => { const c = i.currency||'NGN'; map[c]=(map[c]||0)+(i.amount_ttc||0) })
    return Object.entries(map).map(([c,v])=>formatCurrency(v,c)).join(' + ') || '--'
  }

  const stats = [
    {
      key:'ALL', label:'All Invoices', icon:'#',
      count: invoices.length,
      amount: sumByCcy(invoices),
      color:'#3B82F6', bg:'#EFF6FF', border:'#BFDBFE',
    },
    {
      key:'validation', label:'In Validation', icon:'V',
      count: invoices.filter(i=>VALIDATION_STATUSES.includes(i.status)).length,
      amount: sumByCcy(invoices.filter(i=>VALIDATION_STATUSES.includes(i.status))),
      color:'#F59E0B', bg:'#FFFBEB', border:'#FDE68A',
    },
    {
      key:'pending_fares', label:'Awaiting Payment', icon:'P',
      count: invoices.filter(i=>i.status==='pending_fares').length,
      amount: sumByCcy(invoices.filter(i=>i.status==='pending_fares')),
      color:'#0EA5E9', bg:'#F0F9FF', border:'#BAE6FD',
    },
    {
      key:'approved', label:'Paid', icon:'OK',
      count: invoices.filter(i=>i.status==='approved').length,
      amount: sumByCcy(invoices.filter(i=>i.status==='approved')),
      color:'#10B981', bg:'#F0FDF4', border:'#A7F3D0',
    },
    {
      key:'rejected', label:'Rejected', icon:'X',
      count: invoices.filter(i=>i.status==='rejected').length,
      amount: '--',
      color:'#EF4444', bg:'#FEF2F2', border:'#FECACA',
    },
  ]

  const hasFilter = selectedStatus !== 'ALL' || selectedProject !== 'ALL' || search !== ''

  // Payment ledger — paid tranches + approved invoices merged and sorted by date
  const paymentLedger = useMemo(() => {
    const trancheRows = paidTranches.map((t: any) => ({
      _id: t.id,
      _type: 'tranche',
      _date: t.paid_date || t.scheduled_date || '',
      _displayName: t.contracts?.service_providers?.name || t.contracts?.contract_name || 'Payment',
      _contract: t.contracts?.contract_name || '',
      _ref: t.pop_reference || '',
      _amount: t.amount,
      _currency: t.contracts?.currency || 'NGN',
      _trancheName: t.tranche_name,
      _href: `/contracts/${t.contracts?.id}`,
      _pdfUrl: null,
    }))
    const invoiceRows = invoices
      .filter((i: any) => i.status === 'approved')
      .map((i: any) => ({
        _id: i.id,
        _type: 'invoice',
        _date: i.paid_date || i.submitted_at || '',
        _displayName: i.subcontractor_name || i.service_providers?.name || 'Invoice',
        _contract: i.contracts?.contract_name || '',
        _ref: i.invoice_number || '',
        _amount: i.amount_ttc,
        _currency: i.currency || 'NGN',
        _trancheName: '',
        _href: `/invoices/${i.id}`,
        _pdfUrl: i.pdf_url || null,
      }))
    return [...trancheRows, ...invoiceRows].sort((a, b) =>
      new Date(b._date || 0).getTime() - new Date(a._date || 0).getTime()
    )
  }, [paidTranches, invoices])

  const paymentTotal = useMemo(() => {
    const map: Record<string, number> = {}
    paymentLedger.forEach(p => { map[p._currency] = (map[p._currency] || 0) + (p._amount || 0) })
    return Object.entries(map).map(([c, v]) => formatCurrency(v, c)).join(' + ') || '--'
  }, [paymentLedger])

  return (
    <>
      {/* Tab switcher */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => setTab('invoices')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={tab === 'invoices'
            ? { background:'#0F172A', color:'#fff' }
            : { background:'#F1F5F9', color:'#64748B' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          Invoices ({invoices.length})
        </button>
        <button onClick={() => setTab('payments')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={tab === 'payments'
            ? { background:'#10B981', color:'#fff' }
            : { background:'#F1F5F9', color:'#64748B' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          Payments ({paymentLedger.length})
        </button>
      </div>

      {/* ── PAYMENTS TAB ── */}
      {tab === 'payments' && (
        <div>
          {/* Summary bar */}
          <div className="rounded-2xl px-6 py-4 mb-5 flex items-center justify-between" style={{ background:'#F0FDF4', border:'1px solid #A7F3D0' }}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color:'#059669' }}>Total Payments Confirmed</p>
              <p className="text-2xl font-bold" style={{ color:'#065F46' }}>{paymentTotal}</p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color:'#059669' }}>{paymentLedger.length} payment{paymentLedger.length !== 1 ? 's' : ''} recorded</p>
              <p className="text-xs mt-0.5" style={{ color:'#6EE7B7' }}>
                {paidTranches.length} tranche{paidTranches.length !== 1 ? 's' : ''} + {invoices.filter(i => i.status === 'approved').length} invoice{invoices.filter(i => i.status === 'approved').length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {paymentLedger.length === 0 ? (
            <div className="rounded-2xl p-16 text-center" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
              <div className="text-4xl mb-3">💳</div>
              <p className="text-sm font-semibold mb-1" style={{ color:'#0F172A' }}>No confirmed payments yet</p>
              <p className="text-sm" style={{ color:'#94A3B8' }}>Approved invoices and paid tranches will appear here.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
              {/* Header */}
              <div className="grid px-6 py-3 text-xs font-bold uppercase tracking-widest"
                style={{ color:'#94A3B8', borderBottom:'2px solid #F1F5F9', background:'#FAFBFC',
                         gridTemplateColumns:'0.5fr 1.6fr 1.4fr 1fr 1fr 1fr 0.8fr' }}>
                <div>Date</div>
                <div>Payee</div>
                <div>Contract</div>
                <div>Reference / POP</div>
                <div>Type</div>
                <div>Amount</div>
                <div>Proof</div>
              </div>

              {paymentLedger.map((p, idx) => {
                const isInvoice = p._type === 'invoice'
                const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC'
                return (
                  <div key={p._id} className="grid px-6 py-4 items-center"
                    style={{ borderBottom:'1px solid #F1F5F9', background:rowBg,
                             gridTemplateColumns:'0.5fr 1.6fr 1.4fr 1fr 1fr 1fr 0.8fr' }}>

                    {/* Date */}
                    <div>
                      <p className="text-xs font-semibold" style={{ color:'#0F172A' }}>
                        {p._date ? new Date(p._date).toLocaleDateString('en-GB', { day:'2-digit', month:'short' }) : '—'}
                      </p>
                      <p className="text-xs" style={{ color:'#94A3B8' }}>
                        {p._date ? new Date(p._date).getFullYear() : ''}
                      </p>
                    </div>

                    {/* Payee */}
                    <div className="min-w-0 pr-3">
                      <Link href={p._href} className="text-sm font-semibold hover:text-blue-600 transition-colors truncate block" style={{ color:'#0F172A' }}>
                        {p._displayName}
                      </Link>
                      {p._trancheName && <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>{p._trancheName}</p>}
                    </div>

                    {/* Contract */}
                    <div className="text-sm truncate pr-3" style={{ color:'#64748B' }}>{p._contract || '—'}</div>

                    {/* Reference */}
                    <div>
                      {p._ref ? (
                        <span className="text-xs font-mono px-2 py-1 rounded-lg" style={{ background:'#F1F5F9', color:'#64748B' }}>
                          {p._ref}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color:'#CBD5E1' }}>No ref</span>
                      )}
                    </div>

                    {/* Type badge */}
                    <div>
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={
                        isInvoice
                          ? { background:'rgba(59,130,246,0.1)', color:'#3B82F6' }
                          : { background:'rgba(139,92,246,0.1)', color:'#8B5CF6' }
                      }>
                        {isInvoice ? 'Invoice' : 'Tranche'}
                      </span>
                    </div>

                    {/* Amount */}
                    <div>
                      <p className="text-sm font-bold" style={{ color:'#10B981' }}>{formatCurrency(p._amount, p._currency)}</p>
                    </div>

                    {/* Proof link */}
                    <div>
                      {p._pdfUrl ? (
                        <a href={p._pdfUrl} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
                          style={{ background:'rgba(59,130,246,0.1)', color:'#3B82F6' }}>
                          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          PDF
                        </a>
                      ) : (
                        <span className="text-xs" style={{ color:'#CBD5E1' }}>—</span>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Footer total */}
              <div className="grid px-6 py-3 items-center" style={{ background:'#F8FAFC', borderTop:'2px solid #F1F5F9', gridTemplateColumns:'0.5fr 1.6fr 1.4fr 1fr 1fr 1fr 0.8fr' }}>
                <div className="col-span-5 text-xs font-bold uppercase tracking-widest" style={{ color:'#94A3B8' }}>
                  Total ({paymentLedger.length})
                </div>
                <div className="text-sm font-bold" style={{ color:'#10B981' }}>{paymentTotal}</div>
                <div/>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── INVOICES TAB ── */}
      {tab === 'invoices' && <>
      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {stats.map(s => {
          const active = selectedStatus === s.key
          return (
            <button key={s.key} onClick={() => setSelectedStatus(active ? 'ALL' : s.key)}
              className="rounded-2xl p-4 text-left transition-all hover:shadow-sm"
              style={{
                background: '#FFFFFF',
                border: active ? `2px solid ${s.color}` : '1px solid #E2E8F0',
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color:'#94A3B8' }}>{s.label}</p>
              <p className="text-2xl font-bold mb-1" style={{ color: s.color }}>{s.count}</p>
              <p className="text-xs truncate" style={{ color:'#94A3B8' }}>{s.amount}</p>
            </button>
          )
        })}
      </div>

      {/* Currency toggle */}
      <div className="flex items-center gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background:'#F1F5F9' }}>
        <button onClick={() => setView('native')}
          className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
          style={view === 'native' ? { background:'#0F172A', color:'#fff' } : { color:'#64748B' }}>
          As uploaded
        </button>
        <button onClick={() => setView('ngn')}
          className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
          style={view === 'ngn' ? { background:'#0F172A', color:'#fff' } : { color:'#64748B' }}>
          ₦ NGN
        </button>
        <button onClick={() => setView('usd')}
          className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
          style={view === 'usd' ? { background:'#0F172A', color:'#fff' } : { color:'#64748B' }}>
          $ USD
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" fill="none" stroke="#94A3B8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search by invoice #, consultant, contract..."
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none"
            style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', color:'#0F172A' }}
          />
        </div>
        {projects.length > 0 && (
          <select value={selectedProject} onChange={e=>setSelectedProject(e.target.value)}
            className="text-sm px-3 py-2.5 rounded-xl outline-none"
            style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', color:'#0F172A' }}>
            <option value="ALL">All Projects</option>
            {projects.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
        )}
        {hasFilter && (
          <button onClick={()=>{setSelectedStatus('ALL');setSelectedProject('ALL');setSearch('')}}
            className="text-sm px-3 py-2.5 rounded-xl font-medium"
            style={{ background:'#FEF2F2', color:'#EF4444', border:'1px solid rgba(239,68,68,0.2)' }}>
            Clear
          </button>
        )}
        <p className="text-xs ml-auto" style={{ color:'#94A3B8' }}>
          {filtered.length} invoice{filtered.length!==1?'s':''}
          {hasFilter ? ' (filtered)' : ''}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
        <div className="grid px-6 py-3 text-xs font-bold uppercase tracking-widest"
          style={{ color:'#94A3B8', borderBottom:'1px solid #F1F5F9', background:'#FAFBFC',
                   gridTemplateColumns:'0.8fr 1.8fr 1fr 1.2fr 0.6fr 1fr 1fr 1.4fr' }}>
          <div>Invoice #</div>
          <div>Consultant</div>
          <div>Project</div>
          <div>Contract</div>
          <div>Cat</div>
          <div>Amount HT</div>
          <div>Total TTC</div>
          <div>Status</div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background:'#EFF6FF' }}>
              <svg width="24" height="24" fill="none" stroke="#3B82F6" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color:'#0F172A' }}>No invoices found</p>
            <p className="text-sm mb-4" style={{ color:'#94A3B8' }}>
              {hasFilter ? 'Try changing the filters above' : 'Upload your first invoice to get started'}
            </p>
            {!hasFilter && (
              <Link href="/upload" className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl" style={{ background:'#3B82F6', color:'#fff' }}>
                + Upload Invoice
              </Link>
            )}
          </div>
        ) : filtered.map((inv, idx) => {
          const st  = STATUS_MAP[inv.status] || STATUS_MAP.pending_review
          const ccy = inv.currency || 'NGN'
          const name = inv.service_providers?.name || inv.subcontractor_name || '--'
          const initial = (name[0] || '?').toUpperCase()
          const avatarColor = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#0EA5E9','#F97316'][idx % 7]
          const projectName = inv.contracts?.projects?.name || inv.contracts?.project || '--'

          return (
            <Link key={inv.id} href={`/invoices/${inv.id}`}
              className="grid px-0 py-0 items-center transition-colors hover:bg-blue-50/40 group"
              style={{ borderBottom:'1px solid #F8FAFC', gridTemplateColumns:'0.8fr 1.8fr 1fr 1.2fr 0.6fr 1fr 1fr 1.4fr' }}
            >
              {/* Colored left border based on status */}
              <div className="flex items-center px-6 py-4">
                <div className="font-mono text-xs px-2 py-1 rounded-lg" style={{ background:'#F1F5F9', color:'#64748B' }}>
                  {inv.invoice_number || '--'}
                </div>
              </div>

              <div className="flex items-center gap-2.5 min-w-0 py-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 text-white" style={{ background: avatarColor }}>
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate group-hover:text-blue-600 transition-colors" style={{ color:'#0F172A' }}>{name}</p>
                  <p className="text-xs truncate" style={{ color:'#94A3B8' }}>{formatDate(inv.invoice_date || inv.submitted_at)}</p>
                </div>
              </div>

              <div className="text-sm truncate py-4 pr-3" style={{ color:'#64748B' }}>{projectName}</div>
              <div className="text-sm truncate py-4 pr-3" style={{ color:'#64748B' }}>{inv.contracts?.contract_name || '--'}</div>

              <div className="py-4 pr-3">
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background:'#F1F5F9', color:'#64748B' }}>
                  {(inv.category || 'OT').slice(0,3).toUpperCase()}
                </span>
              </div>

              <div className="text-sm py-4 pr-3" style={{ color:'#64748B' }}>{toView(inv.amount_ht, ccy, inv)}</div>

              <div className="text-sm font-bold py-4 pr-3" style={{ color:'#0F172A' }}>{toView(inv.amount_ttc, ccy, inv)}</div>

              <div className="py-4 pr-6">
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold inline-block" style={{ background:st.bg, color:st.color }}>
                  {st.label}
                </span>
              </div>
            </Link>
          )
        })}

        {/* Footer totals */}
        {filtered.length > 0 && (
          <div className="grid px-6 py-3 items-center" style={{ background:'#FAFBFC', borderTop:'2px solid #F1F5F9', gridTemplateColumns:'0.8fr 1.8fr 1fr 1.2fr 0.6fr 1fr 1fr 1.4fr' }}>
            <div className="col-span-5 text-xs font-bold uppercase tracking-widest" style={{ color:'#94A3B8' }}>
              Total ({filtered.length})
            </div>
            <div className="text-sm font-bold" style={{ color:'#64748B' }}>{sumByCcy(filtered.filter(i=>i.status!=='rejected'))}</div>
            <div className="text-sm font-bold" style={{ color:'#0F172A' }}>{sumByCcy(filtered)}</div>
            <div/>
          </div>
        )}
      </div>
      </>}
    </>
  )
}