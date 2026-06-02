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
  const [sections,     setSections]     = useState<any[]>([])
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [form, setForm] = useState({
    contract_name:'', service_provider_id:'', project_id:'', project:'',
    contract_type:'ESG', category:'E', description:'', currency:'NGN', contract_amount:'',
    start_date:'', end_date:'', status:'active',
    fx_rate_at_signing: ''
  })

  // Payment at signature
  const [sigMode,   setSigMode]   = useState<'amount'|'percent'>('percent')
  const [sigValue,  setSigValue]  = useState('')
  const [sigDate,   setSigDate]   = useState('')

  // Future payments
  const [payments, setPayments] = useState<{ label:string; amount:string; pct:string; mode:'amount'|'percent'; date:string }[]>([])

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
    setSections([])
    setSelectedSections([])
    if (projectId) {
      fetch(`/api/sections?project_id=${projectId}`).then(r=>r.json()).then(d=>setSections(Array.isArray(d)?d:[]))
    }
  }

  function toggleSection(id: string) {
    setSelectedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  function addPayment() {
    const n = payments.length + 2
    setPayments(p => [...p, { label: `Payment ${n}`, amount: '', pct: '', mode: 'percent', date: '' }])
  }

  const contractAmount = parseFloat(form.contract_amount) || 0

  // Resolve amount from value + mode + contractAmount
  function resolveAmount(value: string, mode: 'amount'|'percent'): number {
    const v = parseFloat(value) || 0
    if (mode === 'percent') return contractAmount > 0 ? Math.round(contractAmount * v / 100) : 0
    return v
  }

  const sigAmount    = resolveAmount(sigValue, sigMode)
  const futureTotal  = payments.reduce((s,p) => s + resolveAmount(p.mode === 'percent' ? p.pct : p.amount, p.mode), 0)
  const scheduledTotal = sigAmount + futureTotal
  const remaining    = contractAmount - scheduledTotal

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')

    const finalAmount = contractAmount || scheduledTotal
    const res = await fetch('/api/contracts', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        ...form,
        contract_amount: finalAmount,
        section_ids: selectedSections,
        fx_rate_at_signing: form.fx_rate_at_signing ? parseFloat(form.fx_rate_at_signing) : null,
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to create contract'); setSaving(false); return }

    // Create payment at signature
    if (sigValue) {
      await fetch('/api/tranches', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          contract_id:    data.id,
          tranche_name:   'Advance',
          amount:         sigAmount,
          scheduled_date: sigDate || null,
        })
      })
    }

    // Create future payments
    for (const p of payments) {
      const amt = resolveAmount(p.mode === 'percent' ? p.pct : p.amount, p.mode)
      if (amt || p.date) {
        await fetch('/api/tranches', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            contract_id:    data.id,
            tranche_name:   p.label || `Payment ${payments.indexOf(p) + 2}`,
            amount:         amt,
            scheduled_date: p.date || null,
          })
        })
      }
    }
    router.push(`/contracts/${data.id}`)
  }

  const inp = 'w-full px-3 py-2.5 text-sm rounded-xl outline-none'
  const inpStyle = { background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:'#0F172A' }
  const modeBtn  = (active: boolean) => ({
    padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    background: active ? '#3B82F6' : 'transparent',
    color: active ? '#fff' : '#94A3B8',
    border: 'none',
  })

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

              <div className="col-span-2">
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: C.muted }}>Contract Name *</label>
                <input className={inp} style={inpStyle} value={form.contract_name}
                  onChange={e=>setForm(p=>({...p,contract_name:e.target.value}))}
                  required placeholder="e.g. Environmental Assessment 2025" />
              </div>

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

              {/* Sections — multi-select checkboxes */}
              {form.project_id && (
                <div className="col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: C.muted }}>
                    Sections
                    <span className="ml-1.5 text-xs font-normal" style={{ color:'#94A3B8' }}>— select one or more (optional)</span>
                  </label>
                  {sections.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {sections.map((s:any) => {
                        const checked = selectedSections.includes(s.id)
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleSection(s.id)}
                            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left transition-all"
                            style={{
                              background: checked ? 'rgba(59,130,246,0.08)' : '#F8FAFC',
                              border: checked ? '1.5px solid #3B82F6' : '1.5px solid #E2E8F0',
                            }}
                          >
                            {/* Checkbox */}
                            <div className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ background: checked ? '#3B82F6' : '#fff', border: checked ? '2px solid #3B82F6' : '2px solid #CBD5E1' }}>
                              {checked && (
                                <svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              )}
                            </div>
                            <span className="text-sm font-medium" style={{ color: checked ? '#1D4ED8' : '#0F172A' }}>{s.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="px-3 py-2.5 rounded-xl text-sm" style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:'#94A3B8' }}>
                      No sections in this project —{' '}
                      <Link href={`/projects/${form.project_id}`} className="underline" style={{ color:'#3B82F6' }}>
                        add one in the project page
                      </Link>
                    </div>
                  )}
                  {selectedSections.length > 0 && (
                    <p className="text-xs mt-2" style={{ color:'#3B82F6' }}>
                      {selectedSections.length} section{selectedSections.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: C.muted }}>Consultant</label>
                <select className={inp} style={inpStyle} value={form.service_provider_id} onChange={e=>setForm(p=>({...p,service_provider_id:e.target.value}))}>
                  <option value="">Select consultant...</option>
                  {providers.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: C.muted }}>Contract Type</label>
                <select className={inp} style={inpStyle} value={form.contract_type} onChange={e=>setForm(p=>({...p,contract_type:e.target.value}))}>
                  <option value="ESG">ESG</option>
                  <option value="Deployment">Deployment</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: C.muted }}>ESG Category</label>
                <select className={inp} style={inpStyle} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                  <option value="E">E - Environmental</option>
                  <option value="S">S - Social</option>
                  <option value="G">G - Governance</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: C.muted }}>Currency</label>
                <select className={inp} style={inpStyle} value={form.currency} onChange={e=>setForm(p=>({...p,currency:e.target.value}))}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: C.muted }}>Total Contract Amount *</label>
                <input type="number" className={inp} style={inpStyle}
                  value={form.contract_amount}
                  onChange={e=>setForm(p=>({...p,contract_amount:e.target.value}))}
                  placeholder="e.g. 50000000" step="0.01" required />
                {contractAmount > 0 && (
                  <p className="text-xs mt-1 font-medium" style={{ color:'#3B82F6' }}>
                    {contractAmount.toLocaleString()} {form.currency}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>Rate at Signing (1 USD = &#8358; X)</label>
                <p className="text-xs mb-2" style={{ color:'#94A3B8' }}>Auto-fetched. Edit if different.</p>
                <input type="number" className={inp} style={inpStyle} value={form.fx_rate_at_signing}
                  onChange={e=>setForm(p=>({...p,fx_rate_at_signing:e.target.value}))}
                  placeholder="e.g. 1580" step="0.01" />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: C.muted }}>Start Date *</label>
                <input type="date" className={inp} style={inpStyle} value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))} required />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: C.muted }}>
                  End Date
                  <span className="ml-1.5 text-xs font-normal" style={{ color:'#94A3B8' }}>(optional)</span>
                </label>
                <input type="date" className={inp} style={inpStyle} value={form.end_date} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))} />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: C.muted }}>Description</label>
                <textarea className={inp} style={inpStyle} rows={2}
                  value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}
                  placeholder="Contract scope and description..." />
              </div>
            </div>

            {/* ── PAYMENT AT SIGNATURE ── */}
            <div className="rounded-2xl overflow-hidden" style={{ border:'1px solid #E2E8F0' }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background:'linear-gradient(90deg,rgba(16,185,129,0.08),rgba(16,185,129,0.03))', borderBottom:'1px solid #E2E8F0' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:'rgba(16,185,129,0.15)' }}>
                  <svg width="13" height="13" fill="none" stroke="#10B981" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <p className="text-sm font-semibold" style={{ color:'#0F172A' }}>Payment at Signature</p>
                <p className="text-xs ml-auto" style={{ color:'#94A3B8' }}>First payment due on contract signing</p>
              </div>
              <div className="p-4">
                <div className="grid gap-3" style={{ gridTemplateColumns:'1fr 1.4fr 1fr' }}>
                  {/* Mode toggle + value */}
                  <div>
                    <div className="flex items-center gap-1 mb-2 p-1 rounded-lg w-fit" style={{ background:'#F1F5F9' }}>
                      <button type="button" style={modeBtn(sigMode==='percent')} onClick={()=>setSigMode('percent')}>%</button>
                      <button type="button" style={modeBtn(sigMode==='amount')} onClick={()=>setSigMode('amount')}>Amount</button>
                    </div>
                    <input
                      type="number" className={inp} style={inpStyle}
                      value={sigValue}
                      onChange={e=>setSigValue(e.target.value)}
                      placeholder={sigMode==='percent' ? 'e.g. 30' : 'e.g. 15000000'}
                      step={sigMode==='percent' ? '1' : '0.01'}
                      min="0" max={sigMode==='percent' ? '100' : undefined}
                    />
                  </div>
                  {/* Computed amount */}
                  <div className="flex items-end pb-1">
                    {sigValue && contractAmount > 0 ? (
                      <div className="w-full px-3 py-2.5 rounded-xl" style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)' }}>
                        <p className="text-xs mb-0.5" style={{ color:'#64748B' }}>
                          {sigMode==='percent' ? `${sigValue}% of contract` : 'Fixed amount'}
                        </p>
                        <p className="text-sm font-bold" style={{ color:'#10B981' }}>
                          {sigAmount.toLocaleString()} {form.currency}
                        </p>
                      </div>
                    ) : (
                      <div className="w-full px-3 py-2.5 rounded-xl" style={{ background:'#F8FAFC', border:'1px solid #E2E8F0' }}>
                        <p className="text-xs" style={{ color:'#CBD5E1' }}>Enter value on the left</p>
                      </div>
                    )}
                  </div>
                  {/* Date */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: C.muted }}>Signature Date</label>
                    <input type="date" className={inp} style={inpStyle} value={sigDate} onChange={e=>setSigDate(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── FUTURE PAYMENTS ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Future Payments</p>
                  <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>Remaining scheduled payments after signature</p>
                </div>
                <button type="button" onClick={addPayment} className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background:'rgba(59,130,246,0.1)', color: C.blue }}>
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add Payment
                </button>
              </div>

              {payments.length === 0 && (
                <div className="text-center py-5 rounded-xl" style={{ border:'1px dashed #E2E8F0', background:'#F8FAFC' }}>
                  <p className="text-sm" style={{ color:'#94A3B8' }}>No future payments yet.</p>
                  <p className="text-xs mt-1" style={{ color:'#CBD5E1' }}>Click "Add Payment" to schedule future payments.</p>
                </div>
              )}

              <div className="space-y-2">
                {payments.map((p, i) => {
                  const resolvedAmt = resolveAmount(p.mode==='percent' ? p.pct : p.amount, p.mode)
                  return (
                    <div key={i} className="p-3 rounded-xl" style={{ background:'#F8FAFC', border:'1px solid #E2E8F0' }}>
                      <div className="grid gap-3 items-start" style={{ gridTemplateColumns:'1.3fr 0.9fr 1.1fr 1fr auto' }}>
                        {/* Label */}
                        <div>
                          <label className="text-xs mb-1 block" style={{ color:'#94A3B8' }}>Label</label>
                          <input className={inp} style={inpStyle} placeholder="e.g. Milestone 1"
                            value={p.label}
                            onChange={e=>setPayments(prev=>prev.map((x,j)=>j===i?{...x,label:e.target.value}:x))} />
                        </div>
                        {/* Mode toggle */}
                        <div>
                          <label className="text-xs mb-1 block" style={{ color:'#94A3B8' }}>Type</label>
                          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background:'#E2E8F0' }}>
                            <button type="button" style={modeBtn(p.mode==='percent')} onClick={()=>setPayments(prev=>prev.map((x,j)=>j===i?{...x,mode:'percent'}:x))}>%</button>
                            <button type="button" style={modeBtn(p.mode==='amount')} onClick={()=>setPayments(prev=>prev.map((x,j)=>j===i?{...x,mode:'amount'}:x))}>Amt</button>
                          </div>
                        </div>
                        {/* Value */}
                        <div>
                          <label className="text-xs mb-1 block" style={{ color:'#94A3B8' }}>{p.mode==='percent' ? 'Percentage (%)' : 'Amount'}</label>
                          <input type="number" className={inp} style={inpStyle}
                            placeholder={p.mode==='percent' ? 'e.g. 40' : 'e.g. 20000000'}
                            value={p.mode==='percent' ? p.pct : p.amount}
                            onChange={e=>setPayments(prev=>prev.map((x,j)=>j===i ? (p.mode==='percent'?{...x,pct:e.target.value}:{...x,amount:e.target.value}) : x))} />
                        </div>
                        {/* Date */}
                        <div>
                          <label className="text-xs mb-1 block" style={{ color:'#94A3B8' }}>Due Date</label>
                          <input type="date" className={inp} style={inpStyle}
                            value={p.date}
                            onChange={e=>setPayments(prev=>prev.map((x,j)=>j===i?{...x,date:e.target.value}:x))} />
                        </div>
                        {/* Remove */}
                        <div className="pt-5">
                          <button type="button" onClick={()=>setPayments(prev=>prev.filter((_,j)=>j!==i))}
                            className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color:'#EF4444', background:'rgba(239,68,68,0.08)' }}>
                            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      </div>
                      {/* Show resolved amount */}
                      {resolvedAmt > 0 && p.mode==='percent' && contractAmount > 0 && (
                        <p className="text-xs mt-2 ml-1" style={{ color:'#3B82F6' }}>
                          = {resolvedAmt.toLocaleString()} {form.currency}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Summary bar */}
              {contractAmount > 0 && (sigValue || payments.length > 0) && (
                <div className="mt-4 p-4 rounded-xl" style={{ background:'#F8FAFC', border:'1px solid #E2E8F0' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color:'#94A3B8' }}>Payment Summary</p>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label:'Contract Total',  value:`${contractAmount.toLocaleString()} ${form.currency}`,    color:'#3B82F6' },
                      { label:'At Signature',    value:sigAmount > 0 ? `${sigAmount.toLocaleString()} ${form.currency}` : '—', color:'#10B981' },
                      { label:'Future Payments', value:`${futureTotal.toLocaleString()} ${form.currency}`,        color:'#8B5CF6' },
                      { label:'Unscheduled',     value:`${Math.max(0,remaining).toLocaleString()} ${form.currency}`, color: remaining < 0 ? '#EF4444' : remaining === 0 ? '#10B981' : '#F59E0B' },
                    ].map(s=>(
                      <div key={s.label} className="text-center">
                        <p className="text-xs mb-1" style={{ color:'#94A3B8' }}>{s.label}</p>
                        <p className="text-sm font-bold" style={{ color:s.color }}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Progress bar */}
                  {contractAmount > 0 && (
                    <div className="mt-3 h-2 rounded-full overflow-hidden flex" style={{ background:'#E2E8F0' }}>
                      <div style={{ width:`${Math.min(100,Math.round(sigAmount/contractAmount*100))}%`, background:'#10B981', transition:'width 0.3s' }}/>
                      <div style={{ width:`${Math.min(100-Math.round(sigAmount/contractAmount*100),Math.round(futureTotal/contractAmount*100))}%`, background:'#8B5CF6', transition:'width 0.3s' }}/>
                    </div>
                  )}
                  {remaining < 0 && (
                    <p className="text-xs mt-2" style={{ color:'#EF4444' }}>Warning: scheduled payments exceed contract total by {Math.abs(remaining).toLocaleString()} {form.currency}</p>
                  )}
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