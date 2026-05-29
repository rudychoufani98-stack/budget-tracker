'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const C = { card:'#FFFFFF', border:'#E2E8F0', blue:'#3B82F6', muted:'#6B7280' }
const inp = "w-full px-3 py-2.5 text-sm rounded-xl"
const inpStyle = { background:'#E2E8F0', border:'1px solid #CBD5E1', color:'#0F172A' }

export default function NewProviderPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name:'', email:'', country:'', category:'' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const res = await fetch('/api/providers', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setError(data.error||'Failed'); setSaving(false); return }
    router.push(`/providers/${data.id}`)
  }

  return (
    <div className="px-6 py-8 max-w-lg mx-auto">
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color:C.muted }}>
        <Link href="/providers" style={{ color:C.muted }}>Providers</Link>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        <span style={{ color:'#0F172A' }}>New Provider</span>
      </div>
      <div className="rounded-2xl p-6" style={{ background:C.card, border:`1px solid ${C.border}` }}>
        <h1 className="text-lg font-medium mb-5" style={{ color:'#0F172A' }}>Add Service Provider</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="text-xs font-medium mb-1.5 block" style={{ color:C.muted }}>Name *</label><input className={inp} style={inpStyle} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required placeholder="Company name" /></div>
          <div><label className="text-xs font-medium mb-1.5 block" style={{ color:C.muted }}>Email</label><input type="email" className={inp} style={inpStyle} value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="contact@company.com" /></div>
          <div><label className="text-xs font-medium mb-1.5 block" style={{ color:C.muted }}>Country</label><input className={inp} style={inpStyle} value={form.country} onChange={e=>setForm(p=>({...p,country:e.target.value}))} placeholder="France" /></div>
          <div><label className="text-xs font-medium mb-1.5 block" style={{ color:C.muted }}>Category</label><input className={inp} style={inpStyle} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} placeholder="e.g. Environmental Consulting" /></div>
          {error && <p className="text-sm px-3 py-2 rounded-xl" style={{ background:'rgba(239,68,68,0.1)', color:'#EF4444' }}>{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-50" style={{ background:C.blue, color:'#fff' }}>{saving?'Adding...':'Add Provider'}</button>
            <Link href="/providers" className="px-5 py-3 rounded-xl text-sm text-center" style={{ background:'#E2E8F0', color:C.muted }}>Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}