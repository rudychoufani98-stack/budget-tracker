'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const C = { card: '#222A42', border: '#323D5E', blue: '#3B82F6', muted: '#6B7280' }
const TRANCHE_NAMES = ['T1','T2','T3','T4','One-Shot']

export default function NewContractPage() {
  const router = useRouter()
  const [providers, setProviders] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ contract_name:'', service_provider_id:'', project:'', category:'E', description:'', currency:'EUR', start_date:'', end_date:'', status:'active', notes:'' })
  const [tranches, setTranches] = useState<{ name:string; amount:string; date:string }[]>([])

  useEffect(() => { fetch('/api/providers').then(r=>r.json()).then(setProviders) }, [])

  function addTranche() {
    const used = tranches.map(t=>t.name)
    const next = TRANCHE_NAMES.find(n=>!used.includes(n))
    if (next) setTranches(p=>[...p, { name:next, amount:'', date:'' }])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    const totalAmount = tranches.reduce((s,t)=>s+(parseFloat(t.amount)||0),0)
    const res = await fetch('/api/contracts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...form, contract_amount: totalAmount }) })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed'); setSaving(false); return }
    for (const t of tranches) {
      if (t.amount) await fetch('/api/tranches', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contract_id:data.id, tranche_name:t.name, amount:parseFloat(t.amount)||0, scheduled_date:t.date||null }) })
    }
    router.push(`/contracts/${data.id}`)
  }

  const inp = "w-full px-3 py-2.5 text-sm rounded-xl"
  const inpStyle = { background:'#323D5E', border:'1px solid #404F74', color:'#F9FAFB' }

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/contracts" className="text-sm" style={{ color: C.muted }}>Contracts</Link>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        <span className="text-sm" style={{ color: '#F9FAFB' }}>New Contract</span>
      </div>
      <div className="rounded-2xl p-6" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <h1 className="text-lg font-medium mb-6" style={{ color: '#F9FAFB' }}>New Contract</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: C.muted }}>Contract Name *</label>
              <input className={inp} style={inpStyle} value={form.contract_name} onChange={e=>setForm(p=>({...p,contract_name:e.target.value}))} required placeholder="e.g. Environmental Assessment 2025" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: C.muted }}>Service Provider</label>
              <select className={inp} style={inpStyle} value={form.service_provider_id} onChange={e=>setForm(p=>({...p,service_provider_id:e.target.value}))}>
                <option value="">Select provider...</option>
                {providers.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: C.muted }}>ESG Category</label>
              <select className={inp} style={inpStyle} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                {['E','S','G','Other'].map(c=><option key={c} value={c}>{c === 'E' ? 'E — Environmental' : c === 'S' ? 'S — Social' : c === 'G' ? 'G — Governance' : 'Other'}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: C.muted }}>Project</label>
              <input className={inp} style={inpStyle} value={form.project} onChange={e=>setForm(p=>({...p,project:e.target.value}))} placeholder="Project name" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: C.muted }}>Currency</label>
              <select className={inp} style={inpStyle} value={form.currency} onChange={e=>setForm(p=>({...p,currency:e.target.value}))}>
                {['EUR','USD','GBP','CHF','MAD','XOF','NGN'].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: C.muted }}>Start Date</label>
              <input type="date" className={inp} style={inpStyle} value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: C.muted }}>End Date</label>
              <input type="date" className={inp} style={inpStyle} value={form.end_date} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: C.muted }}>Description</label>
              <textarea className={inp} style={inpStyle} rows={3} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Contract scope and description..." />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium" style={{ color: '#F9FAFB' }}>Payment Tranches</p>
              <button type="button" onClick={addTranche} className="text-xs px-3 py-1.5 rounded-lg" style={{ background:'rgba(59,130,246,0.15)', color: C.blue }}>+ Add Tranche</button>
            </div>
            {tranches.length === 0 && <p className="text-sm" style={{ color: '#5A6A8A' }}>No tranches added. Click above to add payment schedule.</p>}
            <div className="space-y-2">
              {tranches.map((t,i) => (
                <div key={i} className="grid grid-cols-3 gap-3 p-3 rounded-xl" style={{ background:'#2A3354', border:'1px solid #323D5E' }}>
                  <select className={inp} style={inpStyle} value={t.name} onChange={e=>setTranches(p=>p.map((x,j)=>j===i?{...x,name:e.target.value}:x))}>
                    {TRANCHE_NAMES.map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                  <input type="number" className={inp} style={inpStyle} placeholder="Amount" value={t.amount} onChange={e=>setTranches(p=>p.map((x,j)=>j===i?{...x,amount:e.target.value}:x))} />
                  <div className="flex gap-2">
                    <input type="date" className="flex-1 px-3 py-2.5 text-sm rounded-xl" style={inpStyle} value={t.date} onChange={e=>setTranches(p=>p.map((x,j)=>j===i?{...x,date:e.target.value}:x))} />
                    <button type="button" onClick={()=>setTranches(p=>p.filter((_,j)=>j!==i))} className="px-2 text-red-400 hover:text-red-300">x</button>
                  </div>
                </div>
              ))}
            </div>
            {tranches.length > 0 && (
              <p className="text-sm mt-2" style={{ color: C.muted }}>Total: <span style={{ color:'#F9FAFB', fontWeight:500 }}>{tranches.reduce((s,t)=>s+(parseFloat(t.amount)||0),0).toLocaleString()} {form.currency}</span></p>
            )}
          </div>

          {error && <p className="text-sm px-4 py-3 rounded-xl" style={{ background:'rgba(239,68,68,0.1)', color:'#EF4444' }}>{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-50" style={{ background: C.blue, color: '#fff' }}>{saving ? 'Creating...' : 'Create Contract'}</button>
            <Link href="/contracts" className="px-5 py-3 rounded-xl text-sm" style={{ background:'#323D5E', color: C.muted }}>Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
