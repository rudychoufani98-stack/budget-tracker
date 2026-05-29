'use client'
import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/format'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const C = { card:'#FFFFFF', border:'#E2E8F0', green:'#10B981', amber:'#F59E0B', red:'#EF4444', blue:'#3B82F6', muted:'#6B7280' }

export default function ReportsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'provider'|'category'|'monthly'|'vat'|'audit'>('provider')

  useEffect(() => {
    fetch('/api/reports').then(r=>r.json()).then(d=>{ setData(d); setLoading(false) })
  }, [])

  function exportCSV(rows: any[][], filename: string) {
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url)
  }

  const tabs = [
    { key:'provider',  label:'By Provider' },
    { key:'category',  label:'By Category' },
    { key:'monthly',   label:'Monthly Flow' },
    { key:'vat',       label:'VAT Summary' },
    { key:'audit',     label:'Audit Log' },
  ]

  if (loading) return <div className="flex items-center justify-center h-screen" style={{ color:C.muted }}>Loading...</div>

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color:C.muted }}>Analytics</p>
          <h1 className="text-2xl font-medium" style={{ color:'#0F172A' }}>Reports</h1>
        </div>
        <button onClick={()=>window.print()} className="text-sm font-medium px-4 py-2 rounded-xl" style={{ background:'#E2E8F0', border:'1px solid #CBD5E1', color:'#0F172A' }}>Print / PDF</button>
      </div>

      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
        {tabs.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key as any)} className="flex-1 py-2 text-xs font-medium rounded-lg transition-all" style={tab===t.key ? { background:'#E2E8F0', color:'#0F172A' } : { color:C.muted }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'provider' && (
        <div>
          <div className="flex justify-between mb-4">
            <p className="text-sm font-medium" style={{ color:'#0F172A' }}>Payment Summary by Provider</p>
            <button onClick={()=>exportCSV([['Provider','Contracted','Paid','Balance'],...(data.byProvider||[]).map((p:any)=>[p.name,p.total_contracted,p.total_paid,p.total_contracted-p.total_paid])],'providers.csv')} className="text-xs px-3 py-1.5 rounded-lg" style={{ background:'#E2E8F0', color:C.blue }}>Export CSV</button>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
            <div className="grid px-6 py-3 text-xs font-medium uppercase tracking-widest" style={{ color:C.muted, borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr' }}>
              <div>Provider</div><div>Contracted</div><div>Paid</div><div>Balance</div><div>Rate</div>
            </div>
            {(data.byProvider||[]).map((p:any) => {
              const rate = p.total_contracted>0?Math.round((p.total_paid/p.total_contracted)*100):0
              return (
                <div key={p.name} className="grid px-6 py-3 items-center" style={{ borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr' }}>
                  <p className="text-sm" style={{ color:'#0F172A' }}>{p.name}</p>
                  <p className="text-sm" style={{ color:'#0F172A' }}>{formatCurrency(p.total_contracted)}</p>
                  <p className="text-sm" style={{ color:C.green }}>{formatCurrency(p.total_paid)}</p>
                  <p className="text-sm" style={{ color:C.amber }}>{formatCurrency(p.total_contracted-p.total_paid)}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full" style={{ background:'#E2E8F0' }}>
                      <div className="h-1.5 rounded-full" style={{ width:`${rate}%`, background:rate>=80?C.green:rate>=40?C.amber:C.blue }} />
                    </div>
                    <span className="text-xs" style={{ color:C.muted }}>{rate}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'category' && (
        <div>
          <p className="text-sm font-medium mb-4" style={{ color:'#0F172A' }}>Payment Summary by ESG Category</p>
          <div className="rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
            <div className="grid px-6 py-3 text-xs font-medium uppercase tracking-widest" style={{ color:C.muted, borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'1fr 1fr 1fr 1fr' }}>
              <div>Category</div><div>Total</div><div>Paid</div><div>Balance</div>
            </div>
            {(data.byCategory||[]).map((c:any) => (
              <div key={c.category} className="grid px-6 py-3" style={{ borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'1fr 1fr 1fr 1fr' }}>
                <span className="text-sm font-medium" style={{ color:'#0F172A' }}>{c.category}</span>
                <span className="text-sm" style={{ color:'#0F172A' }}>{formatCurrency(c.total)}</span>
                <span className="text-sm" style={{ color:C.green }}>{formatCurrency(c.paid)}</span>
                <span className="text-sm" style={{ color:C.amber }}>{formatCurrency(c.total-c.paid)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'monthly' && (
        <div>
          <p className="text-sm font-medium mb-4" style={{ color:'#0F172A' }}>Monthly Payment Flow (approved invoices)</p>
          <div className="rounded-2xl p-6" style={{ background:C.card, border:`1px solid ${C.border}`, height:320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyData||[]} margin={{ top:4, right:4, bottom:4, left:4 }}>
                <XAxis dataKey="month" tick={{ fill:'#6B7280', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#6B7280', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={(v:number)=>v>=1000000?`${(v/1000000).toFixed(1)}M`:v>=1000?`${(v/1000).toFixed(0)}K`:String(v)} />
                <Tooltip contentStyle={{ background:'#E2E8F0', border:'1px solid #CBD5E1', borderRadius:8, color:'#0F172A' }} />
                <Bar dataKey="amount" fill="#3B82F6" radius={[4,4,0,0]} name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'vat' && (
        <div>
          <p className="text-sm font-medium mb-4" style={{ color:'#0F172A' }}>VAT Summary (all approved invoices)</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label:'Total HT',          value: formatCurrency(data.vatSummary?.totalHT),  color:C.blue },
              { label:'TVA Recoverable',   value: formatCurrency(data.vatSummary?.totalTVA), color:C.amber },
              { label:'Total TTC',         value: formatCurrency(data.vatSummary?.totalTTC), color:C.green },
            ].map(s=>(
              <div key={s.label} className="rounded-2xl p-5" style={{ background:C.card, border:`1px solid ${C.border}` }}>
                <p className="text-xs mb-2" style={{ color:C.muted }}>{s.label}</p>
                <p className="text-2xl font-medium" style={{ color:s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div>
          <p className="text-sm font-medium mb-4" style={{ color:'#0F172A' }}>Audit Log (last 200 actions)</p>
          <div className="rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
            <div className="grid px-6 py-3 text-xs font-medium uppercase tracking-widest" style={{ color:C.muted, borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'2fr 1fr 1fr 2fr' }}>
              <div>Action</div><div>Entity</div><div>Date</div><div>Details</div>
            </div>
            {(data.auditLog||[]).length===0 && <p className="text-sm text-center py-8" style={{ color:C.muted }}>No audit entries yet.</p>}
            {(data.auditLog||[]).map((a:any)=>(
              <div key={a.id} className="grid px-6 py-2.5 items-center text-sm" style={{ borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'2fr 1fr 1fr 2fr' }}>
                <span style={{ color:'#0F172A' }}>{a.action}</span>
                <span style={{ color:C.muted }}>{a.entity_type}</span>
                <span style={{ color:C.muted }}>{new Date(a.created_at).toLocaleDateString('fr-FR')}</span>
                <span className="text-xs font-mono truncate" style={{ color:'#94A3B8' }}>{a.details ? JSON.stringify(a.details).slice(0,60) : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}