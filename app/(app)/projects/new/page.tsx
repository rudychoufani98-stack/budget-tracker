'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const CURRENCIES = ['NGN','USD']

export default function NewProjectPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name:'', description:'', budget:'', currency:'NGN',
    start_date:'', end_date:'', status:'active',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Project name is required'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        budget:     form.budget     ? parseFloat(form.budget) : null,
        start_date: form.start_date || null,
        end_date:   form.end_date   || null,
      }),
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setSaving(false); return }
    router.push(`/projects/${data.id}`)
  }

  const inp = 'w-full px-3.5 py-2.5 text-sm rounded-xl outline-none transition-all'
  const inpStyle = { background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:'#0F172A' }
  const focusStyle = { border:'1.5px solid #3B82F6', boxShadow:'0 0 0 3px rgba(59,130,246,0.12)' }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color:'#64748B' }}>
        <Link href="/projects" className="hover:text-blue-500 transition-colors">Projects</Link>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        <span style={{ color:'#0F172A' }}>New Project</span>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
        {/* Colored stripe */}
        <div style={{ height:4, background:'linear-gradient(90deg,#3B82F6,#8B5CF6)' }}/>

        <div className="p-6">
          <h1 className="text-xl font-semibold mb-6" style={{ color:'#0F172A' }}>Create a new project</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Project Name *</label>
              <input
                className={inp} style={inpStyle}
                placeholder="e.g. Kosovo ESG Program"
                value={form.name} onChange={e=>f('name',e.target.value)}
                onFocus={e=>Object.assign((e.target as HTMLElement).style,focusStyle)}
                onBlur={e=>Object.assign((e.target as HTMLElement).style,inpStyle)}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Description</label>
              <textarea
                rows={3} className={inp} style={inpStyle}
                placeholder="Brief overview of this project..."
                value={form.description} onChange={e=>f('description',e.target.value)}
                onFocus={e=>Object.assign((e.target as HTMLElement).style,focusStyle)}
                onBlur={e=>Object.assign((e.target as HTMLElement).style,inpStyle)}
              />
            </div>

            {/* Budget + Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Budget</label>
                <input
                  type="number" className={inp} style={inpStyle}
                  placeholder="500000"
                  value={form.budget} onChange={e=>f('budget',e.target.value)}
                  onFocus={e=>Object.assign((e.target as HTMLElement).style,focusStyle)}
                  onBlur={e=>Object.assign((e.target as HTMLElement).style,inpStyle)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Currency</label>
                <select className={inp} style={inpStyle} value={form.currency} onChange={e=>f('currency',e.target.value)}>
                  {CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Start Date</label>
                <input
                  type="date" className={inp} style={inpStyle}
                  value={form.start_date} onChange={e=>f('start_date',e.target.value)}
                  onFocus={e=>Object.assign((e.target as HTMLElement).style,focusStyle)}
                  onBlur={e=>Object.assign((e.target as HTMLElement).style,inpStyle)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>End Date</label>
                <input
                  type="date" className={inp} style={inpStyle}
                  value={form.end_date} onChange={e=>f('end_date',e.target.value)}
                  onFocus={e=>Object.assign((e.target as HTMLElement).style,focusStyle)}
                  onBlur={e=>Object.assign((e.target as HTMLElement).style,inpStyle)}
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Status</label>
              <div className="flex gap-3">
                {[
                  { value:'active',    label:'Active',     color:'#10B981' },
                  { value:'on_hold',   label:'On Hold',    color:'#F59E0B' },
                  { value:'completed', label:'Completed',  color:'#3B82F6' },
                ].map(opt=>(
                  <button
                    key={opt.value} type="button"
                    onClick={()=>f('status',opt.value)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={form.status===opt.value
                      ? { background:`${opt.color}18`, border:`2px solid ${opt.color}`, color:opt.color }
                      : { background:'#F8FAFC', border:'2px solid #E2E8F0', color:'#64748B' }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm" style={{ background:'rgba(239,68,68,0.08)', color:'#EF4444', border:'1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit" disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
                style={{ background:'#3B82F6', color:'#fff' }}
              >
                {saving ? 'Creating...' : 'Create Project'}
              </button>
              <Link href="/projects" className="px-6 py-3 rounded-xl text-sm font-medium" style={{ background:'#F1F5F9', color:'#64748B' }}>
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
