'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/format'

const C = { card:'#FFFFFF', card2:'#F1F5F9', border:'#E2E8F0', border2:'#CBD5E1', green:'#10B981', amber:'#F59E0B', red:'#EF4444', blue:'#3B82F6', muted:'#6B7280' }
const TRANCHES = ['T1','T2','T3','T4','One-Shot']
const ESG_COLORS: Record<string,string> = { E:'#10B981', S:'#3B82F6', G:'#F59E0B', Other:'#6B7280' }

function trancheByName(tranches: any[], name: string) {
  return tranches.find(t=>t.tranche_name===name) || null
}

export default function PaymentRegisterPage() {
  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string|null>(null)
  const [edits, setEdits] = useState<Record<string,Record<string,string>>>({})

  async function load() {
    const res = await fetch('/api/contracts')
    const data = await res.json()
    setContracts(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function saveCell(trancheId: string, field: string, value: string) {
    setSaving(trancheId)
    await fetch(`/api/tranches/${trancheId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ [field]: value || null }) })
    await load()
    setSaving(null)
  }

  function exportCSV() {
    const rows = [['Provider','Project','Category','Contract','T1 Amt','T1 Date','T1 POP','T2 Amt','T2 Date','T2 POP','T3 Amt','T3 Date','T3 POP','T4 Amt','T4 Date','T4 POP','One-Shot Amt','One-Shot Date','One-Shot POP','Total Paid','Balance','%','Status']]
    for (const c of contracts) {
      const t = c.contract_tranches || []
      const budget = c.contract_amount || c.total_budget || 0
      const paid = t.filter((x:any)=>x.status==='paid').reduce((s:number,x:any)=>s+x.amount,0)
      const row = [
        c.service_providers?.name || c.client_name || '',
        c.project || '', c.category || '', c.contract_name || '',
        ...TRANCHES.flatMap(name => { const tr=trancheByName(t,name); return tr ? [tr.amount,tr.scheduled_date||'',tr.pop_reference||''] : ['','',''] }),
        paid, budget-paid, budget>0?Math.round((paid/budget)*100)+'%':'0%', c.status,
      ]
      rows.push(row.map(String))
    }
    const csv = rows.map(r=>r.map(v=>`"${v.replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download='payment-register.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const cellEdit = (cid:string, field:string) => (e:React.ChangeEvent<HTMLInputElement>) =>
    setEdits(p=>({...p,[cid]:{...(p[cid]||{}),[field]:e.target.value}}))

  const cellBlur = (trancheId:string, field:string, value:string) => () => saveCell(trancheId, field, value)

  if (loading) return <div className="flex items-center justify-center h-screen" style={{ color:C.muted }}>Loading...</div>

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color:C.muted }}>Finance</p>
          <h1 className="text-2xl font-medium" style={{ color:'#0F172A' }}>Payment Register</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl" style={{ background:'#E2E8F0', border:'1px solid #CBD5E1', color:'#0F172A' }}>
            Export CSV
          </button>
          <button onClick={()=>window.print()} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl" style={{ background:'#E2E8F0', border:'1px solid #CBD5E1', color:'#0F172A' }}>
            Print / PDF
          </button>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth:1600 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${C.border}`, background:'#F1F5F9' }}>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest" style={{ color:C.muted, width:180 }}>Provider</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest" style={{ color:C.muted, width:100 }}>Cat</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest" style={{ color:C.muted, width:160 }}>Contract</th>
                {TRANCHES.map(t=>(
                  <th key={t} colSpan={3} className="px-4 py-2 text-center text-xs font-medium uppercase tracking-widest" style={{ color:C.muted, borderLeft:`1px solid ${C.border}` }}>{t}</th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-widest" style={{ color:C.muted }}>Paid</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-widest" style={{ color:C.muted }}>Balance</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-widest" style={{ color:C.muted }}>%</th>
              </tr>
              <tr style={{ borderBottom:`2px solid ${C.border}`, background:'#F1F5F9' }}>
                <th colSpan={3} />
                {TRANCHES.map(t=>(
                  <th key={t} colSpan={1} className="px-2 py-2 text-left text-xs" style={{ color:'#94A3B8', borderLeft:`1px solid ${C.border}` }}>Amt</th>
                ))}
                <th colSpan={2} /><th />
              </tr>
            </thead>
            <tbody>
              {contracts.length === 0 && (
                <tr><td colSpan={20} className="px-6 py-12 text-center text-sm" style={{ color:C.muted }}>No contracts yet. Create your first contract.</td></tr>
              )}
              {contracts.map((c:any) => {
                const t = c.contract_tranches || []
                const budget = c.contract_amount || c.total_budget || 0
                const paid = t.filter((x:any)=>x.status==='paid').reduce((s:number,x:any)=>s+x.amount,0)
                const balance = budget-paid
                const rate = budget>0?Math.round((paid/budget)*100):0
                const rowBg = c.status==='active'?'transparent':c.status==='completed'?'rgba(16,185,129,0.03)':'transparent'
                return (
                  <tr key={c.id} style={{ borderBottom:`1px solid ${C.border}`, background:rowBg }} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p style={{ color:'#0F172A' }}>{c.service_providers?.name || c.client_name || '—'}</p>
                      <p className="text-xs mt-0.5" style={{ color:C.muted }}>{c.contract_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      {c.category && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background:`${ESG_COLORS[c.category]||C.muted}20`, color:ESG_COLORS[c.category]||C.muted }}>{c.category}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color:'#374151' }}>{c.project || '—'}</td>
                    {TRANCHES.map(name => {
                      const tr = trancheByName(t, name)
                      const isPaid = tr?.status === 'paid'
                      return (
                        <td key={name} colSpan={1} className="px-2 py-3" style={{ borderLeft:`1px solid ${C.border}` }}>
                          {tr ? (
                            <div>
                              <p className="text-xs font-medium" style={{ color: isPaid?C.green:tr.status==='scheduled'?C.amber:C.muted }}>{formatCurrency(tr.amount)}</p>
                              <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>{tr.scheduled_date||'—'}</p>
                              {tr.pop_reference && <p className="text-xs mt-0.5 font-mono" style={{ color:'#94A3B8' }}>{tr.pop_reference}</p>}
                              <span className="text-xs" style={{ color: isPaid?C.green:tr.status==='scheduled'?C.amber:'#94A3B8' }}>{isPaid?'✓ Paid':tr.status==='scheduled'?'Sched':'Unpaid'}</span>
                            </div>
                          ) : <span style={{ color:'#2D3748' }}>—</span>}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-right font-medium" style={{ color:C.green }}>{formatCurrency(paid)}</td>
                    <td className="px-4 py-3 text-right" style={{ color:balance>0?C.amber:C.muted }}>{formatCurrency(balance)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium" style={{ color:rate>=80?C.green:rate>=40?C.amber:C.muted }}>{rate}%</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}