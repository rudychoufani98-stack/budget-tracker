'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/format'

const STATUS_MAP: Record<string,{label:string;color:string;bg:string}> = {
  pending_review:  { label:'Awaiting Rudy',    color:'#F97316', bg:'rgba(249,115,22,0.1)'  },
  pending_placide: { label:'Awaiting Placide', color:'#D97706', bg:'rgba(217,119,6,0.1)'   },
  pending_dani:  { label:'Awaiting Dani',    color:'#7C3AED', bg:'rgba(124,58,237,0.1)'  },
  approved:        { label:'Approved',         color:'#10B981', bg:'rgba(16,185,129,0.1)'  },
  rejected:        { label:'Rejected',         color:'#EF4444', bg:'rgba(239,68,68,0.1)'   },
}

const CAT_ICONS: Record<string,string> = {
  Subcontracting:'SC', Consulting:'CO', Travel:'TR', Accommodation:'AC', Meals:'ML',
  'Fuel & Transport':'FT', Equipment:'EQ', 'Software & IT':'IT', Security:'SE',
  Logistics:'LG', Communication:'CM', Training:'TN', 'Legal & Compliance':'LC',
  'Medical & Health':'MH', Other:'OT',
}

export function InvoicesClient({ invoices }: { invoices: any[] }) {
  const [selectedCurrency, setSelectedCurrency] = useState('ALL')
  const [selectedStatus,   setSelectedStatus]   = useState('ALL')
  const [selectedProject,  setSelectedProject]  = useState('ALL')

  const currencies = useMemo(() => {
    const set = new Set(invoices.map(i => i.currency || 'NGN'))
    return ['ALL', ...Array.from(set).sort()]
  }, [invoices])

  const projects = useMemo(() => {
    const set = new Set(
      invoices
        .map(i => i.contracts?.projects?.name)
        .filter(Boolean)
    )
    return Array.from(set).sort() as string[]
  }, [invoices])

  const filtered = useMemo(() => {
    return invoices.filter(i => {
      const currOk = selectedCurrency === 'ALL' || (i.currency || 'NGN') === selectedCurrency
      const statOk = selectedStatus  === 'ALL'
        || (selectedStatus === 'pending' && ['pending_review','pending_placide','pending_dani'].includes(i.status))
        || i.status === selectedStatus
      const projOk = selectedProject === 'ALL' || (i.contracts?.projects?.name || '') === selectedProject
      return currOk && statOk && projOk
    })
  }, [invoices, selectedCurrency, selectedStatus, selectedProject])

  const counts = {
    all:      filtered.length,
    pending:  filtered.filter(i=>['pending_review','pending_placide','pending_dani'].includes(i.status)).length,
    approved: filtered.filter(i=>i.status==='approved').length,
    rejected: filtered.filter(i=>i.status==='rejected').length,
  }

  const currencyTotals = useMemo(() => {
    const map: Record<string,number> = {}
    filtered.forEach(i => {
      const c = i.currency || 'NGN'
      map[c] = (map[c] || 0) + (i.amount_ttc || 0)
    })
    return Object.entries(map)
  }, [filtered])

  const totalLabel = currencyTotals.map(([c, v]) => formatCurrency(v, c)).join(' + ')

  const paidTotal = useMemo(() => {
    const map: Record<string,number> = {}
    filtered.filter(i=>i.status==='approved').forEach(i => {
      const c = i.currency || 'NGN'
      map[c] = (map[c] || 0) + (i.amount_ttc || 0)
    })
    return Object.entries(map).map(([c,v]) => formatCurrency(v,c)).join(' + ') || '--'
  }, [filtered])

  const pendingTotal = useMemo(() => {
    const map: Record<string,number> = {}
    filtered.filter(i=>['pending_review','pending_placide','pending_dani'].includes(i.status)).forEach(i => {
      const c = i.currency || 'NGN'
      map[c] = (map[c] || 0) + (i.amount_ttc || 0)
    })
    return Object.entries(map).map(([c,v]) => formatCurrency(v,c)).join(' + ') || '--'
  }, [filtered])

  return (
    <>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {currencies.length > 2 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color:'#94A3B8' }}>CCY</span>
            {currencies.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCurrency(c)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                style={selectedCurrency === c
                  ? { background:'#0F172A', color:'#fff' }
                  : { background:'#F1F5F9', color:'#64748B' }
                }
              >
                {c === 'ALL' ? 'All' : c}
              </button>
            ))}
          </div>
        )}

        {projects.length > 0 && (
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg ml-auto"
            style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', color:'#0F172A', outline:'none' }}
          >
            <option value="ALL">All Projects</option>
            {projects.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label:'All Invoices', count:counts.all,      value:totalLabel||'--',  color:'#3B82F6', status:'ALL' },
          { label:'Pending',      count:counts.pending,  value:pendingTotal,       color:'#F59E0B', status:'pending' },
          { label:'Approved',     count:counts.approved, value:paidTotal,          color:'#10B981', status:'approved' },
          { label:'Rejected',     count:counts.rejected, value:'not processed',    color:'#EF4444', status:'rejected' },
        ].map(s=>(
          <button
            key={s.label}
            onClick={() => setSelectedStatus(selectedStatus === s.status ? 'ALL' : s.status)}
            className="rounded-2xl px-5 py-4 text-left transition-all hover:shadow-md"
            style={{
              background:'#FFFFFF',
              border: selectedStatus === s.status ? `2px solid ${s.color}` : '1px solid #E2E8F0',
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:'#94A3B8' }}>{s.label}</p>
            <p className="text-2xl font-bold mb-0.5" style={{ color:s.color }}>{s.count}</p>
            <p className="text-xs truncate" style={{ color:'#94A3B8' }}>{s.value}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
        <div className="grid px-6 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color:'#94A3B8', borderBottom:'1px solid #F1F5F9', background:'#FAFBFC', gridTemplateColumns:'0.8fr 1.6fr 1.2fr 1.2fr 0.7fr 0.7fr 1fr 1fr 1.4fr' }}>
          <div>Invoice #</div>
          <div>Consultant</div>
          <div>Project</div>
          <div>Contract</div>
          <div>Cat</div>
          <div>CCY</div>
          <div>HT</div>
          <div>TTC</div>
          <div>Status</div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium mb-1" style={{ color:'#0F172A' }}>No invoices found</p>
            <p className="text-sm" style={{ color:'#94A3B8' }}>
              {selectedCurrency !== 'ALL' || selectedStatus !== 'ALL' || selectedProject !== 'ALL'
                ? 'Try changing the filters above'
                : 'Upload your first invoice to get started'}
            </p>
            {selectedCurrency === 'ALL' && selectedStatus === 'ALL' && selectedProject === 'ALL' && (
              <Link href="/upload" className="inline-flex mt-4 text-sm font-semibold px-4 py-2 rounded-xl" style={{ background:'#3B82F6', color:'#fff' }}>
                + Upload Invoice
              </Link>
            )}
          </div>
        ) : filtered.map(inv => {
          const st      = STATUS_MAP[inv.status] || STATUS_MAP.pending_review
          const catIcon = CAT_ICONS[inv.category || 'Other'] || 'OT'
          const ccy     = inv.currency || 'NGN'
          const initial = ((inv.service_providers?.name || inv.subcontractor_name || '?')[0] || '?').toUpperCase()
          const projectName = inv.contracts?.projects?.name || inv.contracts?.project || '--'

          return (
            <Link
              key={inv.id} href={`/invoices/${inv.id}`}
              className="grid px-6 py-4 items-center transition-colors hover:bg-slate-50"
              style={{ borderBottom:'1px solid #F8FAFC', gridTemplateColumns:'0.8fr 1.6fr 1.2fr 1.2fr 0.7fr 0.7fr 1fr 1fr 1.4fr' }}
            >
              <div className="font-mono text-xs px-2 py-1 rounded-lg inline-block" style={{ background:'#F1F5F9', color:'#64748B' }}>
                {inv.invoice_number || '--'}
              </div>

              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0" style={{ background:'rgba(59,130,246,0.1)', color:'#3B82F6' }}>
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color:'#0F172A' }}>{inv.service_providers?.name || inv.subcontractor_name || '--'}</p>
                  <p className="text-xs truncate" style={{ color:'#94A3B8' }}>{formatDate(inv.invoice_date || inv.submitted_at)}</p>
                </div>
              </div>

              <div className="text-sm truncate" style={{ color:'#64748B' }}>{projectName}</div>
              <div className="text-sm truncate" style={{ color:'#64748B' }}>{inv.contracts?.contract_name || '--'}</div>

              <div className="text-xs font-bold px-1.5 py-0.5 rounded text-center" style={{ background:'#F1F5F9', color:'#64748B' }}>{catIcon}</div>

              <div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background:'#F1F5F9', color:'#475569' }}>{ccy}</span>
              </div>

              <div className="text-sm font-medium" style={{ color:'#0F172A' }}>{formatCurrency(inv.amount_ht, ccy)}</div>
              <div className="text-sm font-bold" style={{ color:'#0F172A' }}>{formatCurrency(inv.amount_ttc, ccy)}</div>

              <div>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold inline-block" style={{ background:st.bg, color:st.color }}>{st.label}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}