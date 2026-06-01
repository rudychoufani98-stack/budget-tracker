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
  line_items: { description:string; quantity:number|null; unit_price:number|null; total_ht:number|null; vat_rate:number|null; total_ttc:number|null }[]
}

const CATEGORIES: { label:string; icon:string; color:string }[] = [
  { label:'Subcontracting',    icon:'🤝', color:'#3B82F6' },
  { label:'Consulting',        icon:'💼', color:'#8B5CF6' },
  { label:'Travel',            icon:'✈️', color:'#06B6D4' },
  { label:'Accommodation',     icon:'🏨', color:'#F59E0B' },
  { label:'Meals',             icon:'🍽️', color:'#F97316' },
  { label:'Fuel & Transport',  icon:'⛽', color:'#EF4444' },
  { label:'Equipment',         icon:'🔧', color:'#64748B' },
  { label:'Software & IT',     icon:'💻', color:'#10B981' },
  { label:'Security',          icon:'🛡️', color:'#1D4ED8' },
  { label:'Logistics',         icon:'📦', color:'#D97706' },
  { label:'Communication',     icon:'📡', color:'#7C3AED' },
  { label:'Training',          icon:'📚', color:'#059669' },
  { label:'Legal & Compliance',icon:'⚖️', color:'#475569' },
  { label:'Medical & Health',  icon:'🏥', color:'#DC2626' },
  { label:'Other',             icon:'📋', color:'#94A3B8' },
]

const CURRENCIES = ['USD','EUR','GBP','CHF','MAD','XOF','NGN','CAD','AED','JPY']

function cs(v:number|null, currency:string) {
  if (v===null||v===undefined) return '-'
  return new Intl.NumberFormat('fr-FR',{style:'currency',currency,minimumFractionDigits:2}).format(v)
}

export default function UploadPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep]         = useState<1|2|3>(1)
  const [file, setFile]         = useState<File|null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned]   = useState<ScannedData|null>(null)
  const [scanError, setScanError]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [projects,        setProjects]        = useState<any[]>([])
  const [providers,       setProviders]       = useState<any[]>([])
  const [contracts,       setContracts]       = useState<any[]>([])
  const [sections,        setSections]        = useState<any[]>([])
  const [tranches,        setTranches]        = useState<any[]>([])
  const [useRealProjects, setUseRealProjects] = useState(false)

  const [selectedProject,  setSelectedProject]  = useState('')
  const [selectedSection,  setSelectedSection]  = useState('')
  const [selectedContract, setSelectedContract] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedTranche,  setSelectedTranche]  = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/providers').then(r=>r.json()),
      fetch('/api/contracts').then(r=>r.json()),
      fetch('/api/projects').then(r=>r.json()).catch(()=>[]),
    ]).then(([p,c,proj])=>{
      setProviders(p||[])
      setContracts(c||[])
      if (Array.isArray(proj) && proj.length > 0) {
        setProjects(proj); setUseRealProjects(true)
      } else {
        const seen = new Set<string>()
        const derived: any[] = []
        for (const contract of (c||[])) {
          const name = (contract as any).project?.trim()
          if (name && !seen.has(name)) { seen.add(name); derived.push({ id: name, name }) }
        }
        setProjects(derived); setUseRealProjects(false)
      }
    })
  },[])

  // When project changes - fetch sections + reset downstream
  function handleProjectChange(id:string) {
    setSelectedProject(id)
    setSelectedSection('')
    setSelectedContract('')
    setSelectedProvider('')
    setSelectedTranche('')
    setTranches([])
    setSections([])
    if (id) fetch(`/api/sections?project_id=${id}`).then(r=>r.json()).then(d=>setSections(Array.isArray(d)?d:[]))
  }

  // When section changes - reset contract
  function handleSectionChange(id:string) {
    setSelectedSection(id)
    setSelectedContract('')
    setSelectedTranche('')
    setTranches([])
  }

  // Filter contracts: by section if selected, else by project
  const filteredContracts = (() => {
    if (selectedSection) return contracts.filter((c:any) => c.section_id === selectedSection)
    if (selectedProject) {
      const projName = projects.find((p:any) => p.id === selectedProject)?.name || selectedProject
      return contracts.filter((c:any) => c.project_id === selectedProject || c.project?.trim() === projName)
    }
    return contracts
  })()

  // When contract changes: update tranches + auto-fill provider
  useEffect(()=>{
    if (!selectedContract) { setTranches([]); return }
    const c = contracts.find((x:any)=>x.id===selectedContract)
    setTranches(c?.contract_tranches||[])
    if (c?.service_provider_id) setSelectedProvider(c.service_provider_id)
  },[selectedContract, contracts])

  // Section is optional — invoice can be linked to the whole project or to a specific section
  const allLinked = !!selectedProject && !!selectedContract && !!selectedProvider

  async function handleScan() {
    if (!file) return
    setScanning(true); setScanError('')
    const fd = new FormData(); fd.append('file',file)
    const res  = await fetch('/api/invoices/scan',{method:'POST',body:fd})
    const data = await res.json()
    if (!res.ok||data.error) { setScanError(data.error||'Scan failed'); setScanning(false); return }
    // Pre-fill consultant name from the selected provider
    if (selectedProvider) {
      const prov = providers.find((p:any) => p.id === selectedProvider)
      if (prov) data.subcontractor_name = prov.name
    }
    setScanned(data); setScanning(false); setStep(2)
  }

  async function handleSubmit() {
    if (!scanned) return
    setSubmitting(true); setSubmitError('')
    const uploadFd = new FormData()
    uploadFd.append('file', file!)
    uploadFd.append('path', `invoices/${Date.now()}_${file!.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`)
    const uploadRes = await fetch('/api/storage/upload',{method:'POST',body:uploadFd})
    const {signedUrl, error:uploadErr} = await uploadRes.json()
    if (uploadErr) { setSubmitError(`Upload failed: ${uploadErr}`); setSubmitting(false); return }
    const {line_items,...invoiceFields} = scanned
    const body = {
      invoice: {
        ...invoiceFields,
        pdf_url:             signedUrl,
        service_provider_id: selectedProvider||null,
        contract_id:         selectedContract||null,
        tranche_id:          selectedTranche||null,
      },
      line_items: line_items||[],
    }
    const createRes  = await fetch('/api/invoices/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    const createData = await createRes.json()
    if (!createRes.ok) { setSubmitError(createData.error||'Failed to create invoice'); setSubmitting(false); return }
    setStep(3)
    setTimeout(()=>router.push(`/invoices/${createData.id}`),1500)
  }

  const inp = 'w-full px-3.5 py-2.5 text-sm rounded-xl outline-none transition-all'
  const inpSt = { background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:'#0F172A' }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:'#64748B' }}>New Invoice</p>
        <h1 className="text-2xl font-semibold" style={{ color:'#0F172A' }}>Upload Invoice</h1>
      </div>

      {/* Step tracker */}
      <div className="flex items-center gap-0 mb-8">
        {['Upload & Scan','Review & Edit','Done'].map((label,i)=>{
          const done=i+1<step; const active=i+1===step
          return (
            <div key={label} className="flex items-center flex-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={done?{background:'#10B981',color:'#fff'}:active?{background:'#3B82F6',color:'#fff'}:{background:'#F1F5F9',color:'#94A3B8'}}>
                  {done?'✓':i+1}
                </div>
                <span className="text-sm font-medium" style={{ color:active?'#0F172A':done?'#10B981':'#94A3B8' }}>{label}</span>
              </div>
              {i<2&&<div className="flex-1 h-px mx-4" style={{ background:done?'#10B981':'#E2E8F0' }}/>}
            </div>
          )
        })}
      </div>

      {/* STEP 1 */}
      {step===1 && (
        <div className="grid grid-cols-2 gap-6">
          {/* PDF upload */}
          <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
            <div style={{ height:3, background:'linear-gradient(90deg,#3B82F6,#8B5CF6)' }}/>
            <div className="p-6">
              <p className="text-sm font-semibold mb-4" style={{ color:'#0F172A' }}>PDF Invoice</p>
              <div
                className="border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer mb-4 transition-all"
                style={{ borderColor:file?'#3B82F6':'#E2E8F0', minHeight:200, background:file?'#EFF6FF':'#F8FAFC' }}
                onClick={()=>fileRef.current?.click()}
                onMouseEnter={e=>{ if(!file)(e.currentTarget as HTMLElement).style.borderColor='#CBD5E1' }}
                onMouseLeave={e=>{ if(!file)(e.currentTarget as HTMLElement).style.borderColor='#E2E8F0' }}
              >
                {file ? (
                  <div className="text-center p-4">
                    <div className="text-3xl mb-2">📄</div>
                    <p className="text-sm font-semibold" style={{ color:'#0F172A' }}>{file.name}</p>
                    <p className="text-xs mt-1" style={{ color:'#64748B' }}>{(file.size/1024).toFixed(0)} KB</p>
                    <p className="text-xs mt-2 px-2.5 py-1 rounded-full inline-block" style={{ background:'rgba(59,130,246,0.1)', color:'#3B82F6' }}>Click to change</p>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background:'#F1F5F9' }}>
                      <svg width="22" height="22" fill="none" stroke="#94A3B8" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <p className="text-sm font-medium" style={{ color:'#64748B' }}>Click to select PDF</p>
                    <p className="text-xs mt-1" style={{ color:'#94A3B8' }}>Invoice will be scanned by AI</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)setFile(f)}}/>
              {scanError && <p className="text-sm px-3 py-2 rounded-xl mb-3" style={{ background:'rgba(239,68,68,0.08)',color:'#EF4444',border:'1px solid rgba(239,68,68,0.2)' }}>{scanError}</p>}
              {!allLinked && file && (
                <p className="text-xs px-3 py-2 rounded-xl mb-3" style={{ background:'rgba(245,158,11,0.08)', color:'#D97706', border:'1px solid rgba(245,158,11,0.3)' }}>
                  Select a Project, Contract and Consultant before scanning. Section is optional.
                </p>
              )}
              <button onClick={handleScan} disabled={!file||!allLinked||scanning} className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-40 transition-all flex items-center justify-center gap-2" style={{ background:'#3B82F6',color:'#fff' }}>
                {scanning?(
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Scanning with AI...</>
                ):(
                  <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Scan Invoice</>
                )}
              </button>
            </div>
          </div>

          {/* Link panel: Project -> Section -> Contract -> Provider -> Tranche */}
          <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
            <div style={{ height:3, background:'linear-gradient(90deg,#10B981,#3B82F6)' }}/>
            <div className="p-6">
              <p className="text-sm font-semibold mb-5" style={{ color:'#0F172A' }}>Link to Project & Consultant</p>
              <div className="space-y-4">

                {/* Project */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color:'#64748B' }}>
                    <span style={{ width:6,height:6,borderRadius:'50%',background:'#3B82F6',display:'inline-block' }}/>
                    Project *
                  </label>
                  <select className={inp} style={inpSt} value={selectedProject} onChange={e=>handleProjectChange(e.target.value)}>
                    <option value="">Select project...</option>
                    {projects.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {projects.length===0 && contracts.length>0 && (
                    <p className="text-xs mt-1" style={{ color:'#94A3B8' }}>Add a project name to contracts to enable filtering</p>
                  )}
                </div>

                {/* Section */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color:'#64748B' }}>
                    <span style={{ width:6,height:6,borderRadius:'50%',background:'#8B5CF6',display:'inline-block' }}/>
                    Section (optional)
                  </label>
                  <select className={inp} style={inpSt} value={selectedSection} onChange={e=>handleSectionChange(e.target.value)} disabled={!selectedProject}>
                    <option value="">Select section...</option>
                    {sections.map((s:any)=>(
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {selectedProject && sections.length===0 && (
                    <p className="text-xs mt-1" style={{ color:'#94A3B8' }}>No sections in this project - create one in Projects tab</p>
                  )}
                  {selectedProject && sections.length>0 && !selectedSection && (
                    <p className="text-xs mt-1 px-2.5 py-1.5 rounded-lg" style={{ background:'rgba(59,130,246,0.07)', color:'#3B82F6' }}>
                      No section selected - invoice will be linked to the whole project
                    </p>
                  )}
                  {selectedProject && selectedSection && (
                    <p className="text-xs mt-1 px-2.5 py-1.5 rounded-lg" style={{ background:'rgba(139,92,246,0.07)', color:'#8B5CF6' }}>
                      Invoice will count toward this section and the overall project
                    </p>
                  )}
                </div>

                {/* Contract */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color:'#64748B' }}>
                    <span style={{ width:6,height:6,borderRadius:'50%',background:'#06B6D4',display:'inline-block' }}/>
                    Contract *
                  </label>
                  <select className={inp} style={inpSt} value={selectedContract} onChange={e=>setSelectedContract(e.target.value)} disabled={!selectedProject}>
                    <option value="">Select contract...</option>
                    {filteredContracts.map((c:any)=>(
                      <option key={c.id} value={c.id}>{c.contract_name}</option>
                    ))}
                  </select>
                  {selectedProject && filteredContracts.length===0 && (
                    <p className="text-xs mt-1" style={{ color:'#94A3B8' }}>No contracts found - add one in the Projects tab</p>
                  )}
                </div>

                {/* Consultant */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color:'#64748B' }}>
                    <span style={{ width:6,height:6,borderRadius:'50%',background:'#10B981',display:'inline-block' }}/>
                    Consultant *
                    {selectedContract && providers.find((p:any)=>p.id===selectedProvider) && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-normal" style={{ background:'rgba(16,185,129,0.1)',color:'#10B981' }}>auto-filled</span>
                    )}
                  </label>
                  <select className={inp} style={inpSt} value={selectedProvider} onChange={e=>setSelectedProvider(e.target.value)}>
                    <option value="">Select consultant...</option>
                    {providers.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                {/* Tranche */}
                {selectedContract && tranches.length>0 && (
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color:'#64748B' }}>
                      <span style={{ width:6,height:6,borderRadius:'50%',background:'#F59E0B',display:'inline-block' }}/>
                      Tranche
                    </label>
                    <select className={inp} style={inpSt} value={selectedTranche} onChange={e=>setSelectedTranche(e.target.value)}>
                      <option value="">Select tranche...</option>
                      {tranches.map((t:any)=><option key={t.id} value={t.id}>{t.tranche_name} - {t.amount?.toLocaleString()} ({t.status})</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* How it works */}
              <div className="mt-6 p-4 rounded-xl" style={{ background:'#F8FAFC', border:'1px solid #E2E8F0' }}>
                <p className="text-xs font-semibold mb-2.5" style={{ color:'#64748B' }}>How it works</p>
                {[
                  { step:'1', text:'Upload the PDF invoice' },
                  { step:'2', text:'AI extracts all data automatically' },
                  { step:'3', text:'Review and correct if needed' },
                  { step:'4', text:'Submit - Rudy receives email to validate' },
                ].map(s=>(
                  <div key={s.step} className="flex items-start gap-2.5 mb-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background:'#E2E8F0', color:'#64748B' }}>{s.step}</div>
                    <p className="text-xs" style={{ color:'#94A3B8' }}>{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step===2 && scanned && (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-5">
            <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
              <div style={{ height:3, background:'linear-gradient(90deg,#10B981,#3B82F6)' }}/>
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <p className="text-sm font-semibold" style={{ color:'#0F172A' }}>Extracted Data</p>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:'rgba(16,185,129,0.1)',color:'#10B981' }}>✓ AI Scanned</span>
                </div>
                <div className="space-y-3">
                  {/* Consultant - dropdown */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block" style={{ color:'#64748B' }}>Consultant</label>
                    <select
                      className={inp} style={inpSt}
                      value={selectedProvider}
                      onChange={e => {
                        const prov = providers.find((p:any) => p.id === e.target.value)
                        setSelectedProvider(e.target.value)
                        if (prov) setScanned(p => p ? { ...p, subcontractor_name: prov.name } : p)
                      }}
                    >
                      <option value="">Select consultant...</option>
                      {providers.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  {[
                    { label:'Invoice #',    key:'invoice_number' },
                    { label:'Invoice Date', key:'invoice_date', type:'date' },
                  ].map(f=>(
                    <div key={f.key}>
                      <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block" style={{ color:'#64748B' }}>{f.label}</label>
                      <input type={f.type||'text'} className={inp} style={inpSt} value={(scanned as any)[f.key]||''} onChange={e=>setScanned(p=>p?{...p,[f.key]:e.target.value}:p)}/>
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block" style={{ color:'#64748B' }}>Currency</label>
                    <select className={inp} style={inpSt} value={scanned.currency||'USD'} onChange={e=>setScanned(p=>p?{...p,currency:e.target.value}:p)}>
                      {CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Category</label>
                    <div className="grid grid-cols-3 gap-2">
                      {CATEGORIES.map(cat=>{
                        const sel=(scanned.category||'Other')===cat.label
                        return (
                          <button key={cat.label} type="button"
                            onClick={()=>setScanned(p=>p?{...p,category:cat.label}:p)}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
                            style={sel
                              ?{background:`${cat.color}18`,border:`2px solid ${cat.color}`,color:cat.color}
                              :{background:'#F8FAFC',border:'2px solid #E2E8F0',color:'#64748B'}
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
                      {label:`HT (${scanned.currency||'USD'})`,key:'amount_ht'},
                      {label:'VAT %',key:'vat_rate'},
                      {label:`TTC (${scanned.currency||'USD'})`,key:'amount_ttc'},
                    ].map(f=>(
                      <div key={f.key}>
                        <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block" style={{ color:'#64748B' }}>{f.label}</label>
                        <input type="number" className={inp} style={inpSt} value={(scanned as any)[f.key]??''} onChange={e=>{
                          const v=e.target.value===''?null:parseFloat(e.target.value)
                          setScanned(p=>{
                            if(!p)return p
                            const n={...p,[f.key]:v}
                            if(f.key==='amount_ht'||f.key==='vat_rate'){
                              const ht=f.key==='amount_ht'?v??0:n.amount_ht??0
                              const vr=f.key==='vat_rate'?v??0:n.vat_rate??0
                              n.amount_tva=Math.round(ht*(vr/100)*100)/100
                              n.amount_ttc=Math.round((ht+n.amount_tva)*100)/100
                            }
                            return n
                          })
                        }}/>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block" style={{ color:'#64748B' }}>Description</label>
                    <textarea rows={2} className={inp} style={inpSt} value={scanned.description||''} onChange={e=>setScanned(p=>p?{...p,description:e.target.value}:p)}/>
                  </div>
                </div>
              </div>
            </div>
            {submitError && <p className="text-sm px-4 py-3 rounded-xl" style={{ background:'rgba(239,68,68,0.08)',color:'#EF4444',border:'1px solid rgba(239,68,68,0.2)' }}>{submitError}</p>}
            <div className="flex gap-3">
              <button onClick={()=>setStep(1)} className="px-5 py-3 rounded-xl text-sm font-medium" style={{ background:'#F1F5F9',color:'#64748B' }}>Back</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2" style={{ background:'#10B981',color:'#fff' }}>
                {submitting?(<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Submitting...</>):'✓ Submit Invoice'}
              </button>
            </div>
          </div>

          {/* Right: summary + PDF */}
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
              <div style={{ height:3, background:'#10B981' }}/>
              <div className="p-5">
                <p className="text-sm font-semibold mb-4" style={{ color:'#0F172A' }}>Summary</p>
                <div className="space-y-2.5">
                  {[
                    {label:'Amount HT',          value:cs(scanned.amount_ht, scanned.currency||'USD')},
                    {label:`VAT (${scanned.vat_rate||0}%)`, value:cs(scanned.amount_tva, scanned.currency||'USD')},
                  ].map(r=>(
                    <div key={r.label} className="flex justify-between text-sm">
                      <span style={{ color:'#64748B' }}>{r.label}</span>
                      <span style={{ color:'#0F172A' }}>{r.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 mt-1" style={{ borderTop:'1px solid #F1F5F9' }}>
                    <span className="text-sm font-semibold" style={{ color:'#0F172A' }}>Total TTC</span>
                    <span className="text-xl font-bold" style={{ color:'#10B981' }}>{cs(scanned.amount_ttc, scanned.currency||'USD')}</span>
                  </div>
                </div>
                {scanned.line_items?.length>0 && (
                  <div className="mt-4 pt-4" style={{ borderTop:'1px solid #F1F5F9' }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color:'#94A3B8' }}>Line Items ({scanned.line_items.length})</p>
                    {scanned.line_items.slice(0,5).map((li,i)=>(
                      <div key={i} className="flex justify-between text-xs py-1.5" style={{ borderBottom:'1px solid #F8FAFC' }}>
                        <span className="truncate mr-4" style={{ color:'#374151' }}>{li.description||'-'}</span>
                        <span style={{ color:'#64748B' }}>{cs(li.total_ht, scanned.currency||'USD')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {file && (
              <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
                <div className="px-4 py-3" style={{ borderBottom:'1px solid #F1F5F9' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color:'#94A3B8' }}>PDF Preview</p>
                </div>
                <iframe src={URL.createObjectURL(file)} className="w-full" style={{ height:340 }} title="PDF"/>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step===3 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-5" style={{ background:'rgba(16,185,129,0.12)' }}>✓</div>
          <h2 className="text-xl font-bold mb-2" style={{ color:'#0F172A' }}>Invoice Submitted!</h2>
          <p className="text-sm" style={{ color:'#64748B' }}>Redirecting to invoice detail...</p>
        </div>
      )}
    </div>
  )
}
