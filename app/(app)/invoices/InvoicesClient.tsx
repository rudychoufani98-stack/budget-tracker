'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/format'

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
  const [selectedStatus,  setSelectedStatus]  = useState('ALL')
  const [selectedProject, setSelectedProject] = useState('ALL')
  const [search,          setSearch]          = useState('')

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

  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {stats.map(s => {
          const active = selectedStatus === s.key
          return (
            <button key={s.key} onClick={() => setSelectedStatus(active ? 'ALL' : s.key)}
              className="rounded-2xl p-4 text-left transition-all hover:shadow-md"
              style={{
                background: active ? s.bg : '#FFFFFF',
                border: active ? `2px solid ${s.color}` : '1px solid #E2E8F0',
                boxShadow: active ? `0 0 0 3px ${s.color}20` : 'none',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: active ? s.color : '#94A3B8' }}>{s.label}</p>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: active ? s.color : '#F1F5F9', color: active ? '#fff' : '#94A3B8' }}>
                  {s.icon}
                </div>
              </div>
              <p className="text-3xl font-bold mb-1" style={{ color: s.color }}>{s.count}</p>
              <p className="text-xs truncate" style={{ color:'#94A3B8' }}>{s.amount}</p>
            </button>
          )
        })}
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

              <div className="text-sm py-4 pr-3" style={{ color:'#64748B' }}>{formatCurrency(inv.amount_ht, ccy)}</div>

              <div className="text-sm font-bold py-4 pr-3" style={{ color:'#0F172A' }}>{formatCurrency(inv.amount_ttc, ccy)}</div>

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
    </>
  )
}