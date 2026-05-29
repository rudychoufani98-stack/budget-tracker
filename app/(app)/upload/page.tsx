'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface ScannedData {
  subcontractor_name: string
  invoice_number: string
  invoice_date: string
  currency: string
  amount_ht: number | null
  amount_tva: number | null
  amount_ttc: number | null
  vat_rate: number | null
  category: string
  description: string
  line_items: { description: string; quantity: number|null; unit_price: number|null; total_ht: number|null; vat_rate: number|null; total_ttc: number|null }[]
}

const C = { card:'#FFFFFF', card2:'#F1F5F9', border:'#E2E8F0', border2:'#CBD5E1', green:'#10B981', amber:'#F59E0B', red:'#EF4444', blue:'#3B82F6', muted:'#6B7280' }

export const CATEGORIES: { label: string; icon: string; color: string }[] = [
  { label: 'Subcontracting', icon: '🤝', color: '#3B82F6' },
  { label: 'Consulting',     icon: '💼', color: '#8B5CF6' },
  { label: 'Travel',         icon: '✈️', color: '#06B6D4' },
  { label: 'Accommodation',  icon: '🏨', color: '#F59E0B' },
  { label: 'Meals',          icon: '🍽️', color: '#F97316' },
  { label: 'Fuel & Transport', icon: '⛽', color: '#EF4444' },
  { label: 'Equipment',      icon: '🔧', color: '#64748B' },
  { label: 'Software & IT',  icon: '💻', color: '#10B981' },
  { label: 'Security',       icon: '🛡️', color: '#1D4ED8' },
  { label: 'Logistics',      icon: '📦', color: '#D97706' },
  { label: 'Communication',  icon: '📡', color: '#7C3AED' },
  { label: 'Training',       icon: '📚', color: '#059669' },
  { label: 'Legal & Compliance', icon: '⚖️', color: '#475569' },
  { label: 'Medical & Health',   icon: '🏥', color: '#DC2626' },
  { label: 'Other',          icon: '📋', color: '#94A3B8' },
]

const CURRENCIES  = ['EUR','USD','GBP','CHF','MAD','XOF','NGN','CAD','AED','JPY']

function cs(v: number | null, currency: string) {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('fr-FR', { style:'currency', currency, minimumFractionDigits:2 }).format(v)
}

export default function UploadPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep]     = useState<1|2|3>(1)
  const [file, setFile]     = useState<File|null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned]   = useState<ScannedData|null>(null)
  const [scanError, setScanError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [providers, setProviders]   = useState<any[]>([])
  const [contracts, setContracts]   = useState<any[]>([])
  const [tranches, setTranches]     = useState<any[]>([])
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedContract, setSelectedContract] = useState('')
  const [selectedTranche, setSelectedTranche]   = useState('')

  useEffect(() => {
    Promise.all([fetch('/api/providers').then(r=>r.json()), fetch('/api/contracts').then(r=>r.json())])
      .then(([p,c]) => { setProviders(p||[]); setContracts(c||[]) })
  }, [])

  useEffect(() => {
    if (!selectedContract) { setTranches([]); return }
    const c = contracts.find((x:any)=>x.id===selectedContract)
    setTranches(c?.contract_tranches || [])
  }, [selectedContract, contracts])

  async function handleScan() {
    if (!file) return
    setScanning(true); setScanError('')
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/invoices/scan', { method:'POST', body: fd })
    const data = await res.json()
    if (!res.ok || data.error) { setScanError(data.error || 'Scan failed'); setScanning(false); return }
    setScanned(data)
    setScanning(false)
    setStep(2)
  }

  async function handleSubmit() {
    if (!scanned) return
    setSubmitting(true); setSubmitError('')
    const uploadFd = new FormData()
    uploadFd.append('file', file!)
    uploadFd.append('path', `invoices/${Date.now()}_${file!.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`)
    const uploadRes = await fetch('/api/storage/upload', { method:'POST', body: uploadFd })
    const { signedUrl, error: uploadErr } = await uploadRes.json()
    if (uploadErr) { setSubmitError(`Upload failed: ${uploadErr}`); setSubmitting(false); return }
    const { line_items, ...invoiceFields } = scanned
    const invoiceBody = {
      invoice: {
        ...invoiceFields,
        pdf_url: signedUrl,
        service_provider_id: selectedProvider || null,
        contract_id: selectedContract || null,
        tranche_id: selectedTranche || null,
      },
      line_items: line_items || [],
    }
    const createRes = await fetch('/api/invoices/create', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(invoiceBody) })
    const createData = await createRes.json()
    if (!createRes.ok) { setSubmitError(createData.error || 'Failed to create invoice'); setSubmitting(false); return }
    setStep(3)
    setTimeout(() => router.push(`/invoices/${createData.id}`), 1500)
  }

  const inp = "w-full px-3 py-2.5 text-sm rounded-xl"
  const inpStyle = { background:'#E2E8F0', border:'1px solid #CBD5E1', color:'#0F172A' }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color:C.muted }}>New Invoice</p>
        <h1 className="text-2xl font-medium" style={{ color:'#0F172A' }}>Upload Invoice</h1>
      </div>

      {/* Step tracker */}
      <div className="flex items-center gap-2 mb-8">
        {['Upload & Scan','Review','Done'].map((label,i)=>{
          const done = i+1 < step; const active = i+1 === step
          return (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium" style={done ? { background:C.green, color:'#fff' } : active ? { background:C.blue, color:'#fff' } : { background:'#E2E8F0', color:C.muted }}>
                  {done ? '✓' : i+1}
                </div>
                <span className="text-sm" style={{ color:active?'#F9FAFB':done?C.green:C.muted }}>{label}</span>
              </div>
              {i < 2 && <div className="flex-1 h-px mx-2" style={{ background: done?C.green:'#E2E8F0' }} />}
            </div>
          )
        })}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-2xl p-6" style={{ background:C.card, border:`1px solid ${C.border}` }}>
            <p className="text-sm font-medium mb-4" style={{ color:'#0F172A' }}>PDF Invoice</p>
            <div
              className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer mb-4"
              style={{ borderColor:'#CBD5E1', minHeight:200, background:'#F1F5F9' }}
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="text-center">
                  <div className="text-2xl mb-2">📄</div>
                  <p className="text-sm font-medium" style={{ color:'#0F172A' }}>{file.name}</p>
                  <p className="text-xs mt-1" style={{ color:C.muted }}>{(file.size/1024).toFixed(0)} KB</p>
                </div>
              ) : (
                <div className="text-center p-6">
                  <svg width="36" height="36" fill="none" stroke="#CBD5E1" strokeWidth="1.5" viewBox="0 0 24 24" className="mx-auto mb-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <p className="text-sm" style={{ color:C.muted }}>Click to select PDF</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(f) setFile(f) }} />
            {scanError && <p className="text-sm px-3 py-2 rounded-xl mb-3" style={{ background:'rgba(239,68,68,0.1)', color:C.red }}>{scanError}</p>}
            <button onClick={handleScan} disabled={!file||scanning} className="w-full py-3 rounded-xl text-sm font-medium disabled:opacity-50" style={{ background:C.blue, color:'#fff' }}>
              {scanning ? 'Scanning with AI...' : 'Scan Invoice'}
            </button>
          </div>
          <div className="rounded-2xl p-6" style={{ background:C.card, border:`1px solid ${C.border}` }}>
            <p className="text-sm font-medium mb-4" style={{ color:'#0F172A' }}>Link to Contract</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color:C.muted }}>Service Provider</label>
                <select className={inp} style={inpStyle} value={selectedProvider} onChange={e=>setSelectedProvider(e.target.value)}>
                  <option value="">Select provider...</option>
                  {providers.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color:C.muted }}>Contract</label>
                <select className={inp} style={inpStyle} value={selectedContract} onChange={e=>setSelectedContract(e.target.value)}>
                  <option value="">Select contract...</option>
                  {contracts.map((c:any)=><option key={c.id} value={c.id}>{c.contract_name} ({c.service_providers?.name||c.client_name})</option>)}
                </select>
              </div>
              {selectedContract && tranches.length > 0 && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color:C.muted }}>Tranche</label>
                  <select className={inp} style={inpStyle} value={selectedTranche} onChange={e=>setSelectedTranche(e.target.value)}>
                    <option value="">Select tranche...</option>
                    {tranches.map((t:any)=><option key={t.id} value={t.id}>{t.tranche_name} — {t.amount?.toLocaleString()} ({t.status})</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="mt-6 p-4 rounded-xl" style={{ background:'#F1F5F9', border:'1px solid #E2E8F0' }}>
              <p className="text-xs font-medium mb-2" style={{ color:C.muted }}>How it works</p>
              <ul className="text-xs space-y-1.5" style={{ color:'#94A3B8' }}>
                <li>1. Upload the PDF invoice</li>
                <li>2. AI extracts all data automatically</li>
                <li>3. Review and correct if needed</li>
                <li>4. Submit — Rudy receives an email to validate</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {step === 2 && scanned && (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-5">
            <div className="rounded-2xl p-6" style={{ background:C.card, border:`1px solid ${C.border}` }}>
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm font-medium" style={{ color:'#0F172A' }}>Extracted Data</p>
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ background:'rgba(16,185,129,0.1)', color:C.green }}>AI Scanned</span>
              </div>
              <div className="space-y-3">
                {[
                  { label:'Subcontractor', key:'subcontractor_name' },
                  { label:'Invoice #', key:'invoice_number' },
                  { label:'Invoice Date', key:'invoice_date', type:'date' },
                ].map(f=>(
                  <div key={f.key}>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color:C.muted }}>{f.label}</label>
                    <input type={f.type||'text'} className={inp} style={inpStyle} value={(scanned as any)[f.key]||''} onChange={e=>setScanned(p=>p?{...p,[f.key]:e.target.value}:p)} />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color:C.muted }}>Currency</label>
                  <select className={inp} style={inpStyle} value={scanned.currency||'EUR'} onChange={e=>setScanned(p=>p?{...p,currency:e.target.value}:p)}>
                    {CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color:C.muted }}>Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map(cat => {
                      const selected = (scanned.category||'Other') === cat.label
                      return (
                        <button
                          key={cat.label}
                          type="button"
                          onClick={() => setScanned(p => p ? {...p, category: cat.label} : p)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
                          style={selected
                            ? { background: `${cat.color}18`, border: `2px solid ${cat.color}`, color: cat.color }
                            : { background: '#F8FAFC', border: '2px solid #E2E8F0', color: '#64748B' }
                          }
                        >
                          <span className="text-base leading-none">{cat.icon}</span>
                          <span className="text-xs leading-tight">{cat.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label:`Amount HT (${scanned.currency||'EUR'})`, key:'amount_ht' },
                    { label:'VAT %', key:'vat_rate' },
                    { label:`Total TTC (${scanned.currency||'EUR'})`, key:'amount_ttc' },
                  ].map(f=>(
                    <div key={f.key}>
                      <label className="text-xs font-medium mb-1.5 block" style={{ color:C.muted }}>{f.label}</label>
                      <input type="number" className={inp} style={inpStyle} value={(scanned as any)[f.key]??''} onChange={e=>{
                        const v = e.target.value===''?null:parseFloat(e.target.value)
                        setScanned(p=>{ if(!p)return p; const n={...p,[f.key]:v}; if(f.key==='amount_ht'||f.key==='vat_rate'){ const ht=f.key==='amount_ht'?v??0:n.amount_ht??0; const vr=f.key==='vat_rate'?v??0:n.vat_rate??0; n.amount_tva=Math.round(ht*(vr/100)*100)/100; n.amount_ttc=Math.round((ht+n.amount_tva)*100)/100 } return n })
                      }} />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color:C.muted }}>Description</label>
                  <textarea rows={2} className={inp} style={inpStyle} value={scanned.description||''} onChange={e=>setScanned(p=>p?{...p,description:e.target.value}:p)} />
                </div>
              </div>
            </div>
            {submitError && <p className="text-sm px-4 py-3 rounded-xl" style={{ background:'rgba(239,68,68,0.1)', color:C.red }}>{submitError}</p>}
            <div className="flex gap-3">
              <button onClick={()=>setStep(1)} className="px-5 py-3 rounded-xl text-sm" style={{ background:'#E2E8F0', color:C.muted }}>Back</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-50" style={{ background:C.green, color:'#fff' }}>
                {submitting ? 'Submitting...' : 'Submit Invoice'}
              </button>
            </div>
          </div>
          <div className="rounded-2xl p-5" style={{ background:C.card, border:`1px solid ${C.border}` }}>
            <p className="text-sm font-medium mb-3" style={{ color:'#0F172A' }}>Summary</p>
            <div className="space-y-2.5">
              {[
                { label:'Amount HT', value: cs(scanned.amount_ht, scanned.currency||'EUR') },
                { label:`VAT (${scanned.vat_rate||0}%)`, value: cs(scanned.amount_tva, scanned.currency||'EUR') },
              ].map(r=>(
                <div key={r.label} className="flex justify-between text-sm">
                  <span style={{ color:C.muted }}>{r.label}</span>
                  <span style={{ color:'#0F172A' }}>{r.value}</span>
                </div>
              ))}
              <div className="flex justify-between pt-3" style={{ borderTop:`1px solid ${C.border}` }}>
                <span className="text-sm font-medium" style={{ color:'#0F172A' }}>Total TTC</span>
                <span className="text-xl font-medium" style={{ color:C.green }}>{cs(scanned.amount_ttc, scanned.currency||'EUR')}</span>
              </div>
            </div>
            {scanned.line_items?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium mb-2 uppercase tracking-widest" style={{ color:C.muted }}>Line Items ({scanned.line_items.length})</p>
                {scanned.line_items.slice(0,5).map((li,i)=>(
                  <div key={i} className="flex justify-between text-xs py-1.5" style={{ borderBottom:`1px solid ${C.border}` }}>
                    <span className="truncate mr-4" style={{ color:'#374151' }}>{li.description||'—'}</span>
                    <span style={{ color:C.muted }}>{cs(li.total_ht, scanned.currency||'EUR')}</span>
                  </div>
                ))}
              </div>
            )}
            {file && (
              <div className="mt-4">
                <p className="text-xs font-medium mb-2 uppercase tracking-widest" style={{ color:C.muted }}>PDF Preview</p>
                <iframe src={URL.createObjectURL(file)} className="w-full rounded-xl" style={{ height:300 }} title="PDF" />
              </div>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-4" style={{ background:'rgba(16,185,129,0.15)' }}>✓</div>
          <h2 className="text-xl font-medium mb-2" style={{ color:'#0F172A' }}>Invoice Submitted!</h2>
          <p className="text-sm" style={{ color:C.muted }}>Redirecting to invoice detail...</p>
        </div>
      )}
    </div>
  )
}