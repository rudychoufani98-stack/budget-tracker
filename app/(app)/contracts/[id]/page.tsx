'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/format'

const C = { card:'#111827', card2:'#1A2235', border:'#1F2937', border2:'#374151', green:'#10B981', amber:'#F59E0B', red:'#EF4444', blue:'#3B82F6', muted:'#6B7280', muted2:'#9CA3AF', text:'#F9FAFB' }

const TRANCHE_ORDER = ['T1','T2','T3','T4','One-Shot']

const STATUS_COLORS: Record<string,{bg:string;color:string}> = {
  unpaid:    { bg:'rgba(107,114,128,0.15)', color:'#6B7280' },
  scheduled: { bg:'rgba(245,158,11,0.15)',  color:'#F59E0B' },
  paid:      { bg:'rgba(16,185,129,0.15)',  color:'#10B981' },
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [contract, setContract] = useState<any>(null)
  const [tranches, setTranches] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [popRefs, setPopRefs] = useState<Record<string,string>>({})
  const [marking, setMarking] = useState<string|null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    const res = await fetch(`/api/contracts/${id}`)
    const data = await res.json()
    setContract(data)
    const sorted = [...(data.contract_tranches || [])].sort((a,b) =>
      TRANCHE_ORDER.indexOf(a.tranche_name) - TRANCHE_ORDER.indexOf(b.tranche_name)
    )
    setTranches(sorted)
    setInvoices(data.invoices || [])
    const refs: Record<string,string> = {}
    sorted.forEach((t:any) => { refs[t.id] = t.pop_reference || '' })
    setPopRefs(refs)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function markPaid(trancheId: string) {
    setMarking(trancheId)
    await fetch(`/api/tranches/${trancheId}/mark-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pop_reference: popRefs[trancheId] || null }),
    })
    await load()
    setMarking(null)
  }

  async function handleDelete() {
    if (!confirm('Delete this contract and all its tranches? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/contracts/${id}`, { method: 'DELETE' })
    router.push('/contracts')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: '#0A0F1E' }}>
      <p className="text-sm" style={{ color: C.muted }}>Loading…</p>
    </div>
  )

  if (!contract) return (
    <div className="p-8 text-sm" style={{ color: C.red }}>Contract not found.</div>
  )

  const totalCommitted = tranches.reduce((s:number, t:any) => s + (t.amount || 0), 0)
  const totalPaid      = tranches.filter((t:any) => t.status === 'paid').reduce((s:number, t:any) => s + (t.amount || 0), 0)
  const balance        = totalCommitted - totalPaid
  const pct            = totalCommitted > 0 ? Math.round((totalPaid / totalCommitted) * 100) : 0

  const ESG_COLORS: Record<string,string> = { E:'#10B981', S:'#3B82F6', G:'#8B5CF6', Other:'#6B7280' }
  const catColor = ESG_COLORS[contract.category] || ESG_COLORS.Other

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: C.muted }}>
        <Link href="/contracts" className="hover:text-blue-400 transition-colors">Contracts</Link>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        <span style={{ color: C.text }}>{contract.contract_name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-medium" style={{ color: C.text }}>{contract.contract_name}</h1>
            {contract.category && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background:`${catColor}20`, color: catColor }}>{contract.category}</span>
            )}
          </div>
          <p className="text-sm" style={{ color: C.muted }}>
            {contract.service_providers?.name || contract.client_name || '—'}
            {contract.project && <span> · {contract.project}</span>}
          </p>
        </div>
        <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors" style={{ color:'#EF4444', border:'1px solid rgba(239,68,68,0.3)' }}
          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(239,68,68,0.08)'}
          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
          {deleting ? 'Deleting…' : 'Delete Contract'}
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label:'Contract Value', value: formatCurrency(totalCommitted), color: C.blue },
          { label:'Total Paid',     value: formatCurrency(totalPaid),      color: C.green },
          { label:'Balance',        value: formatCurrency(balance),        color: balance > 0 ? C.amber : C.green },
          { label:'Payment Rate',   value: `${pct}%`,                     color: pct >= 80 ? C.green : pct >= 40 ? C.amber : C.red },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-2xl p-5" style={{ background: C.card, border:`1px solid ${C.border}` }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: C.muted }}>{kpi.label}</p>
            <p className="text-2xl font-semibold" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: C.card, border:`1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium" style={{ color: C.muted }}>Payment progress</p>
          <p className="text-xs font-medium" style={{ color: C.green }}>{pct}%</p>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: C.border2 }}>
          <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background: C.green }} />
        </div>
      </div>

      {/* Tranches */}
      <div className="rounded-2xl overflow-hidden mb-6" style={{ background: C.card, border:`1px solid ${C.border}` }}>
        <div className="px-6 py-4" style={{ borderBottom:`1px solid ${C.border}` }}>
          <h2 className="text-sm font-semibold" style={{ color: C.text }}>Payment Tranches</h2>
        </div>
        {tranches.length === 0 ? (
          <p className="text-sm text-center py-10" style={{ color: C.muted }}>No tranches yet.</p>
        ) : (
          <div>
            {tranches.map((t: any) => {
              const sc = STATUS_COLORS[t.status] || STATUS_COLORS.unpaid
              return (
                <div key={t.id} className="px-6 py-4 flex items-center gap-4" style={{ borderBottom:`1px solid ${C.border}` }}>
                  <div className="w-16 shrink-0">
                    <span className="text-sm font-semibold" style={{ color: C.text }}>{t.tranche_name}</span>
                  </div>
                  <div className="w-32 shrink-0">
                    <p className="text-sm font-medium" style={{ color: C.text }}>{formatCurrency(t.amount)}</p>
                    {t.scheduled_date && <p className="text-xs mt-0.5" style={{ color: C.muted }}>{formatDate(t.scheduled_date)}</p>}
                  </div>
                  <div className="flex-1">
                    {t.status === 'paid' ? (
                      <div>
                        <p className="text-xs" style={{ color: C.muted }}>POP: {t.pop_reference || '—'}</p>
                        <p className="text-xs mt-0.5" style={{ color: C.muted }}>Paid {formatDate(t.paid_date)}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={popRefs[t.id] || ''}
                          onChange={e => setPopRefs(p => ({ ...p, [t.id]: e.target.value }))}
                          placeholder="POP reference…"
                          className="text-xs px-3 py-1.5 rounded-lg w-48"
                          style={{ background:'#1F2937', color: C.text, border:`1px solid ${C.border2}` }}
                        />
                        <button
                          onClick={() => markPaid(t.id)}
                          disabled={marking === t.id || t.status === 'paid'}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                          style={{ background:'rgba(16,185,129,0.15)', color:'#10B981', border:'1px solid rgba(16,185,129,0.3)' }}
                        >
                          {marking === t.id ? '…' : '✓ Mark Paid'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium capitalize" style={{ background: sc.bg, color: sc.color }}>
                      {t.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Linked invoices */}
      {invoices.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border:`1px solid ${C.border}` }}>
          <div className="px-6 py-4" style={{ borderBottom:`1px solid ${C.border}` }}>
            <h2 className="text-sm font-semibold" style={{ color: C.text }}>Linked Invoices</h2>
          </div>
          <div>
            {invoices.map((inv: any) => (
              <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-white/5 transition-colors" style={{ borderBottom:`1px solid ${C.border}` }}>
                <div>
                  <p className="text-sm" style={{ color: C.text }}>{inv.subcontractor_name || '—'}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>{inv.invoice_number || '—'} · {formatDate(inv.invoice_date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: C.text }}>{formatCurrency(inv.amount_ttc)}</p>
                  <p className="text-xs mt-0.5 capitalize" style={{ color: C.muted }}>{inv.status?.replace(/_/g,' ')}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}