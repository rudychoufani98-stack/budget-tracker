'use client'
import { useState, useEffect } from 'react'

const C = { card:'#222A42', card2:'#2A3354', border:'#323D5E', border2:'#404F74', green:'#10B981', amber:'#F59E0B', red:'#EF4444', blue:'#3B82F6', muted:'#6B7280' }
const ROLES = ['admin','rudy','placide','hitech','viewer']
const ROLE_COLORS: Record<string,string> = { admin:'#3B82F6', rudy:'#F97316', placide:'#D97706', hitech:'#FACC15', viewer:'#6B7280' }

export default function SettingsPage() {
  const [tab, setTab] = useState<'users'|'notifications'|'categories'|'validation'>('users')
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'viewer' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleting, setDeleting] = useState<string|null>(null)

  async function loadUsers() {
    setLoading(true)
    const res = await fetch('/api/users')
    setUsers(await res.json())
    setLoading(false)
  }
  useEffect(() => { loadUsers() }, [])

  async function createUser(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('')
    const res = await fetch('/api/users', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setError(data.error||'Failed'); setSaving(false); return }
    setSuccess(`Account created for ${form.name}`)
    setForm({ name:'', email:'', password:'', role:'viewer' })
    setShowForm(false)
    await loadUsers()
    setSaving(false)
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return
    setDeleting(id)
    await fetch('/api/users', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) })
    await loadUsers()
    setDeleting(null)
  }

  const inp = "w-full px-3 py-2.5 text-sm rounded-xl"
  const inpStyle = { background:'#323D5E', border:'1px solid #404F74', color:'#F9FAFB' }

  const tabs = [
    { key:'users', label:'User Management' },
    { key:'notifications', label:'Notifications' },
    { key:'categories', label:'Categories' },
    { key:'validation', label:'Validation Chain' },
  ]

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color:C.muted }}>Administration</p>
        <h1 className="text-2xl font-medium" style={{ color:'#F9FAFB' }}>Settings</h1>
      </div>

      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background:'#222A42', border:'1px solid #323D5E' }}>
        {tabs.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key as any)} className="flex-1 py-2 text-xs font-medium rounded-lg transition-all" style={tab===t.key ? { background:'#323D5E', color:'#F9FAFB' } : { color:C.muted }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm" style={{ color:C.muted }}>{users.length} accounts</p>
            <button onClick={()=>{ setShowForm(true); setError(''); setSuccess('') }} className="text-sm font-medium px-4 py-2 rounded-xl" style={{ background:C.blue, color:'#fff' }}>+ Add User</button>
          </div>
          {success && <div className="mb-4 text-sm px-4 py-3 rounded-xl" style={{ background:'rgba(16,185,129,0.1)', color:C.green, border:'1px solid rgba(16,185,129,0.2)' }}>{success}</div>}
          {showForm && (
            <div className="rounded-2xl p-5 mb-4" style={{ background:C.card, border:`1px solid ${C.border}` }}>
              <h2 className="text-sm font-medium mb-4" style={{ color:'#F9FAFB' }}>New Account</h2>
              <form onSubmit={createUser} className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium mb-1.5 block" style={{ color:C.muted }}>Full Name</label><input className={inp} style={inpStyle} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required placeholder="Full name" /></div>
                <div><label className="text-xs font-medium mb-1.5 block" style={{ color:C.muted }}>Email</label><input type="email" className={inp} style={inpStyle} value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} required placeholder="user@skykapital.com" /></div>
                <div><label className="text-xs font-medium mb-1.5 block" style={{ color:C.muted }}>Password</label><input type="text" className={inp} style={inpStyle} value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} required minLength={6} placeholder="Min 6 characters" /></div>
                <div><label className="text-xs font-medium mb-1.5 block" style={{ color:C.muted }}>Role</label>
                  <select className={inp} style={inpStyle} value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}>
                    {ROLES.map(r=><option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                  </select>
                </div>
                {error && <div className="col-span-2 text-sm px-4 py-3 rounded-xl" style={{ background:'rgba(239,68,68,0.1)', color:C.red }}>{error}</div>}
                <div className="col-span-2 flex gap-3">
                  <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-50" style={{ background:C.blue, color:'#fff' }}>{saving?'Creating...':'Create Account'}</button>
                  <button type="button" onClick={()=>setShowForm(false)} className="px-5 py-3 rounded-xl text-sm" style={{ background:'#323D5E', color:C.muted }}>Cancel</button>
                </div>
              </form>
            </div>
          )}
          <div className="rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
            {loading ? <p className="text-sm text-center py-8" style={{ color:C.muted }}>Loading...</p> :
              users.map(u => {
                const rc = ROLE_COLORS[u.role] || C.muted
                const initials = u.name.split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2)
                return (
                  <div key={u.id} className="flex items-center justify-between px-5 py-3" style={{ borderBottom:`1px solid ${C.border}` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ background:'#323D5E', color:'#F9FAFB' }}>{initials||'?'}</div>
                      <div>
                        <p className="text-sm font-medium" style={{ color:'#F9FAFB' }}>{u.name||'—'}</p>
                        <p className="text-xs" style={{ color:C.muted }}>{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background:`${rc}20`, color:rc }}>{u.role}</span>
                      <button onClick={()=>deleteUser(u.id,u.name)} disabled={deleting===u.id} className="text-xs px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ color:C.red, border:'1px solid rgba(239,68,68,0.2)' }}>Delete</button>
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="rounded-2xl p-6" style={{ background:C.card, border:`1px solid ${C.border}` }}>
          <p className="text-sm font-medium mb-4" style={{ color:'#F9FAFB' }}>Email Notification Preferences</p>
          <div className="space-y-4">
            {[
              { label:'New invoice uploaded', sub:'Notify Rudy when a new invoice is submitted', enabled:true },
              { label:'Validation step completed', sub:'Notify next validator when approved', enabled:true },
              { label:'Invoice rejected', sub:'Notify Rudy when invoice is rejected', enabled:true },
              { label:'Final approval', sub:'Notify Rudy and subcontractor when fully approved', enabled:true },
              { label:'Budget alert (80%)', sub:'Notify Rudy when contract reaches 80% of budget', enabled:true },
              { label:'Tranche reminder (7 days)', sub:'Remind Rudy 7 days before scheduled tranche', enabled:true },
            ].map(n=>(
              <div key={n.label} className="flex items-center justify-between py-3" style={{ borderBottom:`1px solid ${C.border}` }}>
                <div>
                  <p className="text-sm" style={{ color:'#F9FAFB' }}>{n.label}</p>
                  <p className="text-xs mt-0.5" style={{ color:C.muted }}>{n.sub}</p>
                </div>
                <div className="w-10 h-5 rounded-full flex items-center px-0.5" style={{ background:n.enabled?C.blue:'#404F74' }}>
                  <div className="w-4 h-4 rounded-full bg-white" style={{ marginLeft:n.enabled?20:0, transition:'margin 0.2s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'categories' && (
        <div className="rounded-2xl p-6" style={{ background:C.card, border:`1px solid ${C.border}` }}>
          <p className="text-sm font-medium mb-4" style={{ color:'#F9FAFB' }}>ESG Categories & Invoice Types</p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium mb-3 uppercase tracking-widest" style={{ color:C.muted }}>ESG Categories</p>
              {['E — Environmental','S — Social','G — Governance','Other'].map(c=>(
                <div key={c} className="flex items-center gap-2 py-2" style={{ borderBottom:`1px solid ${C.border}` }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background:c.startsWith('E')?'#10B981':c.startsWith('S')?'#3B82F6':c.startsWith('G')?'#F59E0B':'#6B7280' }} />
                  <span className="text-sm" style={{ color:'#F9FAFB' }}>{c}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium mb-3 uppercase tracking-widest" style={{ color:C.muted }}>Invoice Categories</p>
              {['Subcontracting','Travel','Accommodation','Meals','Equipment','Other'].map(c=>(
                <div key={c} className="py-2 text-sm" style={{ borderBottom:`1px solid ${C.border}`, color:'#F9FAFB' }}>{c}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'validation' && (
        <div className="rounded-2xl p-6" style={{ background:C.card, border:`1px solid ${C.border}` }}>
          <p className="text-sm font-medium mb-4" style={{ color:'#F9FAFB' }}>Validation Chain Configuration</p>
          <div className="space-y-3">
            {[
              { step:1, role:'rudy/admin',  label:'Step 1 — Rudy',    desc:'Checks invoice accuracy and matching with contract', color:'#F97316' },
              { step:2, role:'placide',     label:'Step 2 — Placide', desc:'Manager approval and budget verification',            color:'#D97706' },
              { step:3, role:'hitech',      label:'Step 3 — Dani',    desc:'Final financial approval before payment release',    color:'#FACC15' },
            ].map(s=>(
              <div key={s.step} className="flex items-center gap-4 p-4 rounded-xl" style={{ background:C.card2, border:`1px solid ${C.border}` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0" style={{ background:`${s.color}20`, color:s.color }}>{s.step}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color:'#F9FAFB' }}>{s.label}</p>
                  <p className="text-xs mt-0.5" style={{ color:C.muted }}>{s.desc}</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ background:`${s.color}20`, color:s.color }}>{s.role}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-xl text-sm" style={{ background:'rgba(16,185,129,0.05)', border:'1px solid rgba(16,185,129,0.15)', color:C.muted }}>
            Full approval automatically marks the linked tranche as paid and sends confirmation emails.
          </div>
        </div>
      )}
    </div>
  )
}