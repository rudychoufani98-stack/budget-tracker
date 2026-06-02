'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const C = { card: '#FFFFFF', border: '#E2E8F0', blue: '#3B82F6', muted: '#64748B' }
const CURRENCIES = ['NGN','USD','EUR','GBP','CHF','MAD','XOF','CAD','AED']

export default function NewContractPage() {
  const router = useRouter()
  const [providers, setProviders] = useState<any[]>([])
  const [projects,  setProjects]  = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [form, setForm] = useState({
    contract_name:'', service_provider_id:'', project_id:'', project:'',
    category:'E', description:'', currency:'NGN', contract_amount:'',
    start_date:'', end_date:'', status:'active', notes:'',
    fx_rate_at_signing: ''
  })
  const [payments, setPayments] = useState<{ label:string; amount:string; date:string }[]>([])

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

  function addPayment() {
    const n = payments.length + 1
    setPayments(p => [...p, { label: `Payment ${n}`, amount: '', date: '' }])
  }

  const totalPayments = payments.reduce((s,p) => s + (parseFloat(p.amount)||0), 0)
  const contractAmount = parseFloat(form.contract_amount) || 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')

    // Use direct contract amount if provided, otherwise sum of payments
    const finalAmount = contractAmount || totalPayments

    const res = await fetch('/api/contracts', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        ...form,
        contract_amount: finalAmount,
        fx_rate_at_signing: form.fx_rate_at_signing ? parseFloat(form.fx_rate_at_signing) : null,
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to create contract'); setSaving(false); return }

    // Create payment schedule entries as tranches
    for (const p of payments) {
      if (p.amount || p.date) {
        await fetch('/api/tranches', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            contract_id:    data.id,
            tranche_name:   p.label || 'Payment',
            amount:         parseFloat(p.amount) || 0,
            scheduled_date: p.date || null,
          })
        })
      }
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

              {/* Project */}
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
                    <option value="">Select project...</option>
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

              {/* Total Contract Amount */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: C.muted }}>
                  Total Contract Amount
                </label>
                <input
                  type="number" className={inp} style={inpStyle}
                  value={form.contract_amount}
                  onChange={e=>setForm(p=>({...p,contract_amount:e.target.value}))}
                  placeholder={totalPayments > 0 ? `Auto: ${totalPayments.toLocaleString()}` : 'e.g. 5000000'}
                  step="0.01"
                />
                <p className="text-xs mt-1" style={{ color:'#94A3B8' }}>
                  {totalPayments > 0 && !form.contract_amount
                    ? `Will use sum of payments below: ${totalPayments.toLocaleString()} ${form.currency}`
                    : 'Enter the total value of this contract'}
                </p>
              </div>

              {/* FX Rate */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>
                  Rate at Signing (1 USD = &#8358; X)
                </label>
                <p className="text-xs mb-2" style={{ color:'#94A3B8' }}>Auto-fetched today. Edit if different.</p>
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

            {/* Payment Schedule */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Payment Schedule</p>
                  <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>Add expected payment dates and amounts</p>
                </div>
                <button type="button" onClick={addPayment} className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background:'rgba(59,130,246,0.1)', color: C.blue }}>
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add Payment
                </button>
              </div>

              {payments.length === 0 && (
                <div className="text-center py-6 rounded-xl" style={{ border:'1px dashed #E2E8F0', background:'#F8FAFC' }}>
                  <p className="text-sm" style={{ color:'#94A3B8' }}>No payments scheduled yet.</p>
                  <p className="text-xs mt-1" style={{ color:'#CBD5E1' }}>Click "Add Payment" to schedule payment dates.</p>
                </div>
              )}

              <div className="space-y-2">
                {payments.map((p, i) => (
                  <div key={i} className="grid gap-3 p-3 rounded-xl items-center" style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', gridTemplateColumns:'1.2fr 1fr 1.2fr auto' }}>
                    {/* Label */}
                    <input className={inp} style={inpStyle} placeholder="e.g. Advance, Final..."
                      value={p.label}
                      onChange={e=>setPayments(prev=>prev.map((x,j)=>j===i?{...x,label:e.target.value}:x))} />
                    {/* Amount */}
                    <input type="number" className={inp} style={inpStyle} placeholder="Amount"
                      value={p.amount}
                      onChange={e=>setPayments(prev=>prev.map((x,j)=>j===i?{...x,amount:e.target.value}:x))} />
                    {/* Date */}
                    <input type="date" className={inp} style={inpStyle}
                      value={p.date}
                      onChange={e=>setPayments(prev=>prev.map((x,j)=>j===i?{...x,date:e.target.value}:x))} />
                    {/* Remove */}
                    <button type="button" onClick={()=>setPayments(prev=>prev.filter((_,j)=>j!==i))}
                      className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color:'#EF4444', background:'rgba(239,68,68,0.08)' }}>
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Totals summary */}
              {(payments.length > 0 || contractAmount > 0) && (
                <div className="mt-3 px-4 py-3 rounded-xl flex items-center justify-between" style={{ background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.15)' }}>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs" style={{ color:'#64748B' }}>Contract total</p>
                      <p className="text-sm font-bold" style={{ color:'#0F172A' }}>
                        {(contractAmount || totalPayments).toLocaleString()} {form.currency}
                      </p>
                    </div>
                    {payments.length > 0 && contractAmount > 0 && (
                      <div>
                        <p className="text-xs" style={{ color:'#64748B' }}>Scheduled</p>
                        <p className="text-sm font-semibold" style={{ color: totalPayments > contractAmount ? '#EF4444' : '#10B981' }}>
                          {totalPayments.toLocaleString()} {form.currency}
                          {totalPayments > contractAmount && ' (exceeds total!)'}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs" style={{ color:'#94A3B8' }}>{payments.length} payment{payments.length!==1?'s':''} scheduled</p>
                </div>
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
              <Link href="/contracts" className="px-5 py-3 rounded-xl text-sm font-medium flex items-center" style={{ background:'#F1F5F9', color: C.muted }}>
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}