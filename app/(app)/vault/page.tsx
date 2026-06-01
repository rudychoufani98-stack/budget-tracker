'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const TYPE_META: Record<string,{label:string;color:string;bg:string;icon:string}> = {
  invoice:          { label:'Invoice',          color:'#3B82F6', bg:'#EFF6FF', icon:'INV' },
  proof_of_payment: { label:'Proof of Payment', color:'#10B981', bg:'#F0FDF4', icon:'POP' },
  contract:         { label:'Contract',         color:'#F59E0B', bg:'#FFFBEB', icon:'CTR' },
  other:            { label:'Other',            color:'#6B7280', bg:'#F8FAFC', icon:'DOC' },
}

export default function VaultPage() {
  const [docs,       setDocs]       = useState<any[]>([])
  const [search,     setSearch]     = useState('')
  const [loading,    setLoading]    = useState(true)
  const [preview,    setPreview]    = useState<any|null>(null)
  const [uploading,  setUploading]  = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [contracts,  setContracts]  = useState<any[]>([])
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [uploadForm, setUploadForm] = useState({ file_type:'invoice', contract_id:'' })

  async function load() {
    const url = `/api/documents${search ? `?search=${encodeURIComponent(search)}` : ''}`
    const [docsRes, cRes] = await Promise.all([fetch(url), fetch('/api/contracts')])
    const d = await docsRes.json(); const c = await cRes.json()
    setDocs(Array.isArray(d) ? d : [])
    setContracts(Array.isArray(c) ? c : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [search])

  async function uploadDoc(e: React.FormEvent) {
    e.preventDefault(); setUploading(true)
    const fileInput = document.getElementById('vault-file') as HTMLInputElement
    if (!fileInput?.files?.[0]) { setUploading(false); return }
    const fd = new FormData(); fd.append('file', fileInput.files[0])
    const uploadRes = await fetch('/api/storage/upload', { method:'POST', body:fd })
    const { signedUrl } = await uploadRes.json()
    await fetch('/api/documents', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ filename:fileInput.files[0].name, file_url:signedUrl, file_type:uploadForm.file_type, contract_id:uploadForm.contract_id||null }),
    })
    setShowUpload(false); setUploading(false); await load()
  }

  const filtered = docs.filter(d => typeFilter === 'ALL' || d.file_type === typeFilter)

  const counts: Record<string,number> = { ALL: docs.length }
  for (const d of docs) counts[d.file_type] = (counts[d.file_type]||0) + 1

  const grouped: Record<string,any[]> = {}
  for (const d of filtered) {
    const key = d.contracts?.contract_name || 'Unlinked Documents'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(d)
  }

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:'#64748B' }}>Storage</p>
          <h1 className="text-2xl font-bold" style={{ color:'#0F172A' }}>Document Vault</h1>
          <p className="text-sm mt-0.5" style={{ color:'#64748B' }}>{docs.length} document{docs.length!==1?'s':''}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" fill="none" stroke="#94A3B8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents..."
              className="pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', color:'#0F172A', width:220 }} />
          </div>
          <button onClick={()=>setShowUpload(v=>!v)} className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl" style={{ background:'#3B82F6', color:'#fff' }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Upload
          </button>
        </div>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="rounded-2xl overflow-hidden mb-6" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
          <div style={{ height:3, background:'linear-gradient(90deg,#3B82F6,#8B5CF6)' }}/>
          <div className="p-5">
            <h2 className="text-sm font-bold mb-4" style={{ color:'#0F172A' }}>Upload Document</h2>
            <form onSubmit={uploadDoc} className="grid grid-cols-3 gap-4">
              <div className="col-span-3">
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>File</label>
                <input id="vault-file" type="file" accept=".pdf,.png,.jpg,.docx,.xlsx" required
                  className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                  style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:'#0F172A' }} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Type</label>
                <select className="w-full text-sm px-3 py-2.5 rounded-xl outline-none" style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:'#0F172A' }}
                  value={uploadForm.file_type} onChange={e=>setUploadForm(p=>({...p,file_type:e.target.value}))}>
                  <option value="invoice">Invoice</option>
                  <option value="proof_of_payment">Proof of Payment</option>
                  <option value="contract">Contract</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Link to Contract</label>
                <select className="w-full text-sm px-3 py-2.5 rounded-xl outline-none" style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:'#0F172A' }}
                  value={uploadForm.contract_id} onChange={e=>setUploadForm(p=>({...p,contract_id:e.target.value}))}>
                  <option value="">None</option>
                  {contracts.map((c:any)=><option key={c.id} value={c.id}>{c.contract_name}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-3">
                <button type="submit" disabled={uploading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background:'#3B82F6', color:'#fff' }}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <button type="button" onClick={()=>setShowUpload(false)} className="px-4 py-2.5 rounded-xl text-sm" style={{ background:'#F1F5F9', color:'#64748B' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Type filter pills */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {(['ALL','invoice','proof_of_payment','contract','other'] as const).map(t => {
          const meta = t === 'ALL' ? { label:'All', color:'#3B82F6', bg:'#EFF6FF' } : TYPE_META[t]
          const cnt = counts[t] || 0
          const active = typeFilter === t
          return (
            <button key={t} onClick={()=>setTypeFilter(t)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={{ background: active ? meta.color : '#F1F5F9', color: active ? '#fff' : '#64748B' }}>
              {meta.label}
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs" style={{ background: active ? 'rgba(255,255,255,0.25)' : '#E2E8F0', color: active ? '#fff' : '#94A3B8' }}>
                {t === 'ALL' ? docs.length : (counts[t]||0)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"/></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background:'#F1F5F9' }}>
            <svg width="28" height="28" fill="none" stroke="#94A3B8" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <p className="text-base font-semibold mb-2" style={{ color:'#0F172A' }}>No documents yet</p>
          <p className="text-sm mb-5" style={{ color:'#94A3B8' }}>Documents are auto-saved when you upload invoices, or you can upload them manually.</p>
          <button onClick={()=>setShowUpload(true)} className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl" style={{ background:'#3B82F6', color:'#fff' }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Upload a Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 space-y-4">
            {Object.entries(grouped).map(([contractName, contractDocs]) => (
              <div key={contractName} className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
                <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom:'1px solid #F1F5F9', background:'#FAFBFC' }}>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color:'#64748B' }}>{contractName}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background:'#F1F5F9', color:'#94A3B8' }}>{contractDocs.length}</span>
                </div>
                <div className="divide-y divide-[#F8FAFC]">
                  {contractDocs.map((doc:any) => {
                    const meta = TYPE_META[doc.file_type] || TYPE_META.other
                    return (
                      <div key={doc.id}
                        className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={()=>setPreview(doc)}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0" style={{ background:meta.bg, color:meta.color }}>
                            {meta.icon}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color:'#0F172A' }}>{doc.filename}</p>
                            <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>
                              {new Date(doc.uploaded_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:meta.bg, color:meta.color }}>{meta.label}</span>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ color:'#3B82F6', background:'#EFF6FF' }}
                            onClick={e=>e.stopPropagation()}>
                            Open
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Preview panel */}
          <div>
            {preview ? (
              <div className="rounded-2xl overflow-hidden sticky top-6" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom:'1px solid #F1F5F9' }}>
                  <p className="text-sm font-semibold truncate" style={{ color:'#0F172A' }}>{preview.filename}</p>
                  <button onClick={()=>setPreview(null)} className="w-6 h-6 rounded-lg flex items-center justify-center text-xs" style={{ background:'#F1F5F9', color:'#64748B' }}>x</button>
                </div>
                <div className="px-4 py-2 flex items-center gap-2" style={{ borderBottom:'1px solid #F1F5F9' }}>
                  {(() => { const m = TYPE_META[preview.file_type]||TYPE_META.other; return <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:m.bg, color:m.color }}>{m.label}</span> })()}
                  <span className="text-xs" style={{ color:'#94A3B8' }}>{new Date(preview.uploaded_at).toLocaleDateString('en-GB')}</span>
                </div>
                <iframe src={preview.file_url} className="w-full" style={{ height:'calc(100vh - 320px)', minHeight:400 }} title="Preview" />
              </div>
            ) : (
              <div className="rounded-2xl p-8 text-center" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background:'#F1F5F9' }}>
                  <svg width="20" height="20" fill="none" stroke="#94A3B8" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color:'#0F172A' }}>Preview</p>
                <p className="text-xs" style={{ color:'#94A3B8' }}>Click a document to preview it here</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}