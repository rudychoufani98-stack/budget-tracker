'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const C = { card: '#FFFFFF', border: '#E2E8F0', blue: '#3B82F6', muted: '#64748B' }
const TRANCHE_NAMES = ['T1','T2','T3','T4','One-Shot']
const CURRENCIES = ['NGN','USD','EUR','GBP','CHF','MAD','XOF','NGN','CAD','AED']

export default function NewContractPage() {
  const router = useRouter()
  const [providers, setProviders] = useState<any[]>([])
  const [projects,  setProjects]  = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [form, setForm] = useState({
    contract_name:'', service_provider_id:'', project_id:'', project:'',
    category:'E', description:'', currency:'NGN',
    start_date:'', end_date:'', status:'active', notes:'',
    fx_rate_at_signing: ''
  })
  const [fxLoading, setFxLoading] = useState(false)
  const [tranches, setTranches] = useState<{ name:string; amount:string; date:string }[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/providers').then(r=>r.json()),
      fetch('/api/projects').then(r=>r.json()).catch(()=>[]),
      fetch('/api/fx').then(r=>r.json()).catch(()=>null),
    ]).then(([p, proj, fx]) => {
      setProviders(p || [])
      setProjects(Array.isArray(proj) ? proj : [])
      if (fx?.rates?.NGN) setForm(f => ({ ...f, fx_rate_at_signing: String(fx.rates.NGN) }))
    })
  }, [])

  function handleProjectChange(projectId: string) {
    const proj = projects.find((p:any) => p.id === projectId)
    setForm(f => ({ ...f, project_id: projectId, project: proj?.name || '' }))
  }

  function addTranche() {
    const used = tranches.map(t => t.name)
    const next = TRANCHE_NAMES.find(n => !used.includes(n))
    if (next) setTranches(p => [...p, { name:next, amount:'', date:'' }])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    const totalAmount = tranches.reduce((s,t) => s+(parseFloat(t.amount)||0), 0)
    const res = await fetch('/api/contracts', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...form, contract_amount: totalAmount, fx_rate_at_signing: form.fx_rate_at_signing ? parseFloat(form.fx_rate_at_signing) : null })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed'); setSaving(false); return }
    for (const t of tranches) {
      if (t.amount) await fetch('/api/tranches', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contract_id:data.id, tranche_name:t.name, amount:parseFloat(t.amount)||0, scheduled_date:t.date||null })
      })
    }
    router.push(`/contracts/${data.id}`)
  }

  const inp = 'w-full px-3 py-2.5 text-sm rounded-xl outline-none'
  const inpStyle = { background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:'#0F172A' }

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/contracts" className="text-sm hover:text-blue-500 transition-colors" style={{ color: C.muted }}>Contracts</Link>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        <span className="text-sm" style={{ color: '#0F172A' }}>New Contract</span>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div style={{ height:4, background:'linear-gradient(90deg,#3B82F6,#8B5CF6)' }}/>
        <div className="p-6">
          <h1 className="text-xl font-semibold mb-6" style={{ color: '#0F172A' }}>New Contract</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">

              {/* Contract Name */}
              <div className="col-span-2">
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: C.muted }}>Contract Name *</label>
                <input className={inp} style={inpStyle} value={form.contract_name}
                  onChange={e=>setForm(p=>({...p,contract_name:e.target.value}))}
                  required placeholder="e.g. Environmental Assessment 2025" />
              </div>

              {/* Project — dropdown from Projects tab */}
              <div className="col-span-2">
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: C.muted }}>
                  Project
                  {projects.length === 0 && (
                    <span className="ml-2 text-xs font-normal" style={{ color:'#94A3B8' }}>
                      — <Link href="/projects/new" className="underline" style={{ color:'#3B82F6' }}>Create a project first</Link>
                    </span>
                  )}
                </label>
                {projects.length > 0 ? (
                  <select className={inp} style={inpStyle} value={form.project_id} onChange={e => handleProjectChange(e.target.value)}>
                    <option value="">Select project…</option>
                    {projects.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                ) : (
                  <input className={inp} style={inpStyle} value={form.project}
                    onChange={e=>setForm(p=>({...p,project:e.target.value}))}
                    placeholder="Type project name or create one in Projects tab" />
                )}
              </div>

              {/* Consultant */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: C.muted }}>Consultant</label>
                <select className={inp} style={inpStyle} value={form.service_provider_id} onChange={e=>setForm(p=>({...p,service_provider_id:e.target.value}))}>
                  <option value="">Select consultant...</option>
                  {providers.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* ESG Category */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: C.muted }}>ESG Category</label>
                <select className={inp} style={inpStyle} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                  <option value="E">E - Environmental</option>
                  <option value="S">S - Social</option>
                  <option value="G">G - Governance</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Currency */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: C.muted }}>Currency</label>
                <select className={inp} style={inpStyle} value={form.currency} onChange={e=>setForm(p=>({...p,currency:e.target.value}))}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* FX Rate at Signing */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>
                  Rate at Signing (1 USD = &#8358; X)
                </label>
                <p className="text-xs mb-2" style={{ color:'#94A3B8' }}>Auto-fetched today. Edit if contract was signed earlier.</p>
                <input type="number" className={inp} style={inpStyle} value={form.fx_rate_at_signing}
                  onChange={e=>setForm(p=>({...p,fx_rate_at_signing:e.target.value}))}
                  placeholder="e.g. 1580" step="0.01" />
              </div>

              {/* Start Date */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: C.muted }}>Start Date</label>
                <input type="date" className={inp} style={inpStyle} value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))} />
              </div>

              {/* End Date */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: C.muted }}>End Date</label>
                <input type="date" className={inp} style={inpStyle} value={form.end_date} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))} />
              </div>

              {/* Description */}
              <div className="col-span-2">
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: C.muted }}>Description</label>
                <textarea className={inp} style={inpStyle} rows={3}
                  value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}
                  placeholder="Contract scope and description..." />
              </div>
            </div>

            {/* Payment Tranches */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Payment Tranches</p>
                <button type="button" onClick={addTranche} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background:'rgba(59,130,246,0.12)', color: C.blue }}>
                  + Add Tranche
                </button>
              </div>
              {tranches.length === 0 && (
                <p className="text-sm" style={{ color: '#94A3B8' }}>No tranches added yet. Click above to add a payment schedule.</p>
              )}
              <div className="space-y-2">
                {tranches.map((t,i) => (
                  <div key={i} className="grid grid-cols-3 gap-3 p-3 rounded-xl" style={{ background:'#F8FAFC', border:'1px solid #E2E8F0' }}>
                    <select className={inp} style={inpStyle} value={t.name} onChange={e=>setTranches(p=>p.map((x,j)=>j===i?{...x,name:e.target.value}:x))}>
                      {TRANCHE_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <input type="number" className={inp} style={inpStyle} placeholder="Amount"
                      value={t.amount} onChange={e=>setTranches(p=>p.map((x,j)=>j===i?{...x,amount:e.target.value}:x))} />
                    <div className="flex gap-2">
                      <input type="date" className="flex-1 px-3 py-2.5 text-sm rounded-xl outline-none" style={inpStyle}
                        value={t.date} onChange={e=>setTranches(p=>p.map((x,j)=>j===i?{...x,date:e.target.value}:x))} />
                      <button type="button" onClick={()=>setTranches(p=>p.filter((_,j)=>j!==i))}
                        className="px-2.5 text-sm rounded-lg font-medium" style={{ color:'#EF4444', background:'rgba(239,68,68,0.08)' }}>
                        x
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {tranches.length > 0 && (
                <p className="text-sm mt-2 font-medium" style={{ color: C.muted }}>
                  Total: <span style={{ color:'#0F172A' }}>
                    {tranches.reduce((s,t)=>s+(parseFloat(t.amount)||0),0).toLocaleString()} {form.currency}
                  </span>
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm px-4 py-3 rounded-xl" style={{ background:'rgba(239,68,68,0.08)', color:'#EF4444', border:'1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background: C.blue, color: '#fff' }}>
                {saving ? 'Creating...' : 'Create Contract'}
              </button>
              <Link href="/contracts" className="px-5 py-3 rounded-xl text-sm font-medium" style={{ background:'#F1F5F9', color: C.muted }}>
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
