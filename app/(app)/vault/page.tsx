'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const C = { card:'#222A42', card2:'#2A3354', border:'#323D5E', green:'#10B981', amber:'#F59E0B', red:'#EF4444', blue:'#3B82F6', muted:'#6B7280' }

const FILE_TYPE_COLORS: Record<string,string> = {
  invoice:'#3B82F6', proof_of_payment:'#10B981', contract:'#F59E0B', other:'#6B7280'
}

export default function VaultPage() {
  const [docs, setDocs]         = useState<any[]>([])
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [preview, setPreview]   = useState<any|null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({ file:'', filename:'', file_type:'invoice', contract_id:'', notes:'' })
  const [showUpload, setShowUpload] = useState(false)
  const [contracts, setContracts] = useState<any[]>([])

  async function load() {
    const url = `/api/documents${search ? `?search=${encodeURIComponent(search)}` : ''}`
    const [docsRes, cRes] = await Promise.all([fetch(url), fetch('/api/contracts')])
    setDocs(await docsRes.json())
    setContracts(await cRes.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [search])

  async function uploadDoc(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadForm.file) return
    setUploading(true)
    const fileInput = document.getElementById('vault-file') as HTMLInputElement
    if (!fileInput?.files?.[0]) { setUploading(false); return }
    const fd = new FormData()
    fd.append('file', fileInput.files[0])
    const res = await fetch('/api/storage/upload', { method:'POST', body: fd })
    const { signedUrl } = await res.json()
    await fetch('/api/documents', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ filename: fileInput.files[0].name, file_url: signedUrl, file_type: uploadForm.file_type, contract_id: uploadForm.contract_id||null }),
    })
    setShowUpload(false)
    setUploading(false)
    await load()
  }

  const grouped: Record<string, any[]> = {}
  for (const d of docs) {
    const key = d.contracts?.contract_name || 'Unlinked'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(d)
  }

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color:C.muted }}>Storage</p>
          <h1 className="text-2xl font-medium" style={{ color:'#F9FAFB' }}>Document Vault</h1>
        </div>
        <div className="flex gap-3">
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search files..." className="text-sm px-4 py-2 rounded-xl" style={{ background:'#323D5E', border:'1px solid #404F74', color:'#F9FAFB', width:240 }} />
          <button onClick={()=>setShowUpload(true)} className="text-sm font-medium px-4 py-2 rounded-xl" style={{ background:C.blue, color:'#fff' }}>+ Upload</button>
        </div>
      </div>

      {showUpload && (
        <div className="rounded-2xl p-5 mb-6" style={{ background:C.card, border:`1px solid ${C.border}` }}>
          <h2 className="text-sm font-medium mb-4" style={{ color:'#F9FAFB' }}>Upload Document</h2>
          <form onSubmit={uploadDoc} className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium mb-1.5 block" style={{ color:C.muted }}>File</label>
              <input id="vault-file" type="file" accept=".pdf,.png,.jpg,.docx,.xlsx" required className="w-full text-sm px-3 py-2 rounded-xl" style={{ background:'#323D5E', border:'1px solid #404F74', color:'#F9FAFB' }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color:C.muted }}>Type</label>
              <select className="w-full text-sm px-3 py-2.5 rounded-xl" style={{ background:'#323D5E', border:'1px solid #404F74', color:'#F9FAFB' }} value={uploadForm.file_type} onChange={e=>setUploadForm(p=>({...p,file_type:e.target.value}))}>
                <option value="invoice">Invoice</option>
                <option value="proof_of_payment">Proof of Payment</option>
                <option value="contract">Contract</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color:C.muted }}>Link to Contract</label>
              <select className="w-full text-sm px-3 py-2.5 rounded-xl" style={{ background:'#323D5E', border:'1px solid #404F74', color:'#F9FAFB' }} value={uploadForm.contract_id} onChange={e=>setUploadForm(p=>({...p,contract_id:e.target.value}))}>
                <option value="">None</option>
                {contracts.map((c:any)=><option key={c.id} value={c.id}>{c.contract_name}</option>)}
              </select>
            </div>
            <div className="col-span-2 flex gap-3 items-end">
              <button type="submit" disabled={uploading} className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50" style={{ background:C.blue, color:'#fff' }}>{uploading?'Uploading...':'Upload'}</button>
              <button type="button" onClick={()=>setShowUpload(false)} className="px-4 py-2.5 rounded-xl text-sm" style={{ background:'#323D5E', color:C.muted }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {loading ? <p className="text-sm" style={{ color:C.muted }}>Loading...</p> : 
           Object.keys(grouped).length === 0 ? <p className="text-sm text-center py-12" style={{ color:C.muted }}>No documents yet.</p> :
           Object.entries(grouped).map(([contractName, contractDocs]) => (
            <div key={contractName} className="rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
              <div className="px-5 py-3" style={{ borderBottom:`1px solid ${C.border}`, background:'#161B30' }}>
                <p className="text-xs font-medium uppercase tracking-widest" style={{ color:C.muted }}>{contractName}</p>
              </div>
              {contractDocs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/5 cursor-pointer" style={{ borderBottom:`1px solid ${C.border}` }}
                  onClick={()=>setPreview(doc)}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium" style={{ background:`${FILE_TYPE_COLORS[doc.file_type]||C.muted}20`, color:FILE_TYPE_COLORS[doc.file_type]||C.muted }}>
                      PDF
                    </div>
                    <div>
                      <p className="text-sm" style={{ color:'#F9FAFB' }}>{doc.filename}</p>
                      <p className="text-xs mt-0.5" style={{ color:C.muted }}>{new Date(doc.uploaded_at).toLocaleDateString('fr-FR')} · {doc.file_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg" style={{ color:C.blue, border:`1px solid rgba(59,130,246,0.3)` }} onClick={e=>e.stopPropagation()}>Open</a>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {preview && (
          <div className="rounded-2xl overflow-hidden sticky top-6 self-start" style={{ background:C.card, border:`1px solid ${C.border}` }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom:`1px solid ${C.border}` }}>
              <p className="text-sm font-medium truncate" style={{ color:'#F9FAFB' }}>{preview.filename}</p>
              <button onClick={()=>setPreview(null)} style={{ color:C.muted }}>x</button>
            </div>
            <div>
              <p className="text-xs px-4 py-2" style={{ color:C.muted }}>{preview.file_type} · {new Date(preview.uploaded_at).toLocaleDateString()}</p>
              <iframe src={preview.file_url} className="w-full" style={{ height:'calc(100vh - 300px)', minHeight:400 }} title="Preview" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}