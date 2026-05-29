'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/format'

const C = { card:'#111827', border:'#1F2937', green:'#10B981', amber:'#F59E0B', red:'#EF4444', blue:'#3B82F6', muted:'#6B7280' }

export default function ProviderDetailPage() {
  const { id } = useParams<{ id:string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/providers/${id}`).then(r=>r.json()).then(d=>{ setData(d); setLoading(false) })
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-screen" style={{ color:C.muted }}>Loading...</div>
  if (!data?.provider) return <div className="p-8" style={{ color:'#EF4444' }}>Provider not found.</div>

  const { provider, contracts, invoices } = data
  const allTranches = contracts.flatMap((c:any)=>c.contract_tranches||[])
  const totalContracted = allTranches.reduce((s:number,t:any)=>s+(t.amount||0),0)
  const totalPaid       = allTranches.filter((t:any)=>t.status==='paid').reduce((s:number,t:any)=>s+t.amount,0)

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color:C.muted }}>
        <Link href="/providers" style={{ color:C.muted }}>Providers</Link>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        <span style={{ color:'#F9FAFB' }}>{provider.name}</span>
      </div>
      <div className="flex items-start gap-6 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-medium mb-1" style={{ color:'#F9FAFB' }}>{provider.name}</h1>
          <p style={{ color:C.muted }}>{provider.email||'No email'} · {provider.country||'—'}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label:'Total Contracted', value: formatCurrency(totalContracted), color:C.blue },
          { label:'Total Paid',       value: formatCurrency(totalPaid),       color:C.green },
          { label:'Balance',          value: formatCurrency(totalContracted-totalPaid), color:C.amber },
        ].map(s=>(
          <div key={s.label} className="rounded-2xl p-4" style={{ background:C.card, border:`1px solid ${C.border}` }}>
            <p className="text-xs mb-2" style={{ color:C.muted }}>{s.label}</p>
            <p className="text-xl font-medium" style={{ color:s.color }}>{s.value}</p>
          </div>
        ))}
      </div>
      {contracts.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-6" style={{ background:C.card, border:`1px solid ${C.border}` }}>
          <div className="px-6 py-4" style={{ borderBottom:`1px solid ${C.border}` }}>
            <p className="text-sm font-medium" style={{ color:'#F9FAFB' }}>Contracts ({contracts.length})</p>
          </div>
          {contracts.map((c:any) => {
            const t = c.contract_tranches||[]
            const paid = t.filter((x:any)=>x.status==='paid').reduce((s:number,x:any)=>s+x.amount,0)
            const budget = c.contract_amount||c.total_budget||0
            const rate = budget>0?Math.round((paid/budget)*100):0
            return (
              <Link key={c.id} href={`/contracts/${c.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-white/5" style={{ borderBottom:`1px solid ${C.border}` }}>
                <div>
                  <p className="text-sm" style={{ color:'#F9FAFB' }}>{c.contract_name}</p>
                  <p className="text-xs mt-0.5" style={{ color:C.muted }}>{c.project||'—'} · {c.category||'—'}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium" style={{ color:'#F9FAFB' }}>{formatCurrency(budget)}</p>
                    <p className="text-xs" style={{ color:C.green }}>{formatCurrency(paid)} paid</p>
                  </div>
                  <span className="text-sm font-medium" style={{ color:rate>=80?C.green:rate>=40?C.amber:C.muted }}>{rate}%</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
      {invoices.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
          <div className="px-6 py-4" style={{ borderBottom:`1px solid ${C.border}` }}>
            <p className="text-sm font-medium" style={{ color:'#F9FAFB' }}>Invoices ({invoices.length})</p>
          </div>
          {invoices.map((inv:any) => {
            const sc = inv.status==='approved'?C.green:inv.status==='rejected'?C.red:C.amber
            return (
              <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-white/5" style={{ borderBottom:`1px solid ${C.border}` }}>
                <div>
                  <p className="text-sm" style={{ color:'#F9FAFB' }}>#{inv.invoice_number||'N/A'}</p>
                  <p className="text-xs mt-0.5" style={{ color:C.muted }}>{inv.invoice_date||'—'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm" style={{ color:'#F9FAFB' }}>{formatCurrency(inv.amount_ttc)}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background:`${sc}20`, color:sc }}>{inv.status}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}