'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/format'

const C = { card:'#FFFFFF', border:'#E2E8F0', green:'#10B981', amber:'#F59E0B', red:'#EF4444', blue:'#3B82F6', muted:'#64748B' }
const CURRENCIES = ['USD','EUR','GBP','CHF','MAD','XOF','NGN','CAD','AED']

export default function ProviderDetailPage() {
  const { id } = useParams<{ id:string }>()
  const router  = useRouter()
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [editForm, setEditForm] = useState({ name:'', email:'', country:'', category:'' })

  useEffect(() => {
    fetch(`/api/providers/${id}`).then(r=>r.json()).then(d => {
      setData(d)
      if (d?.provider) setEditForm({
        name:     d.provider.name     || '',
        email:    d.provider.email    || '',
        country:  d.provider.country  || '',
        category: d.provider.category || '',
      })
      setLoading(false)
    })
  }, [id])

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/providers/${id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(editForm),
    })
    const updated = await res.json()
    if (!updated.error) { setData((d:any) => ({ ...d, provider: updated })); setEditing(false) }
    setSaving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/providers/${id}`, { method:'DELETE' })
    router.push('/providers')
  }

  if (loading) return <div className="flex items-center justify-center h-screen" style={{ color:C.muted }}>Loading...</div>
  if (!data?.provider) return <div className="p-8" style={{ color:'#EF4444' }}>Provider not found.</div>

  const { provider, contracts, invoices } = data
  const allTranches     = contracts.flatMap((c:any) => c.contract_tranches || [])
  const totalContracted = allTranches.reduce((s:number,t:any) => s+(t.amount||0), 0)
  const totalPaid       = allTranches.filter((t:any) => t.status==='paid').reduce((s:number,t:any) => s+t.amount, 0)

  const inp = 'w-full px-3.5 py-2.5 text-sm rounded-xl outline-none'
  const inpSt = { background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:'#0F172A' }

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color:C.muted }}>
        <Link href="/providers" className="hover:text-blue-500 transition-colors">Consultants</Link>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        <span style={{ color:'#0F172A' }}>{provider.name}</span>
      </div>

      {/* Header card */}
      <div className="rounded-2xl overflow-hidden mb-6" style={{ background:C.card, border:'1px solid #E2E8F0' }}>
        <div style={{ height:4, background:'linear-gradient(90deg,#3B82F6,#8B5CF6)' }}/>
        <div className="p-6">
          {!editing ? (
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1" style={{ color:'#0F172A' }}>{provider.name}</h1>
                <div className="flex items-center gap-3 text-sm flex-wrap" style={{ color:C.muted }}>
                  {provider.email && <span>✉️ {provider.email}</span>}
                  {provider.country && <span>🌍 {provider.country}</span>}
                  {provider.category && (
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:'rgba(59,130,246,0.1)', color:'#3B82F6' }}>{provider.category}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditing(true)} className="text-sm px-3.5 py-2 rounded-xl font-medium" style={{ background:'#F1F5F9', color:C.muted }}>
                  Edit
                </button>
                {confirmDel ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color:C.muted }}>Sure?</span>
                    <button onClick={handleDelete} disabled={deleting} className="text-xs px-3 py-2 rounded-xl font-medium disabled:opacity-50" style={{ background:'#EF4444', color:'#fff' }}>
                      {deleting ? 'Deleting...' : 'Yes, delete'}
                    </button>
                    <button onClick={() => setConfirmDel(false)} className="text-xs px-3 py-2 rounded-xl" style={{ background:'#F1F5F9', color:C.muted }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDel(true)} className="text-sm px-3.5 py-2 rounded-xl font-medium" style={{ background:'rgba(239,68,68,0.08)', color:'#EF4444' }}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:C.muted }}>Name *</label>
                  <input className={inp} style={inpSt} value={editForm.name} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:C.muted }}>Email</label>
                  <input className={inp} style={inpSt} type="email" value={editForm.email} onChange={e=>setEditForm(p=>({...p,email:e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:C.muted }}>Country</label>
                  <input className={inp} style={inpSt} value={editForm.country} onChange={e=>setEditForm(p=>({...p,country:e.target.value}))} placeholder="e.g. Nigeria" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:C.muted }}>Category</label>
                  <input className={inp} style={inpSt} value={editForm.category} onChange={e=>setEditForm(p=>({...p,category:e.target.value}))} placeholder="e.g. Consulting" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background:'#3B82F6', color:'#fff' }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => setEditing(false)} className="px-5 py-2.5 rounded-xl text-sm" style={{ background:'#F1F5F9', color:C.muted }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* KPI row */}
          {!editing && (
            <div className="grid grid-cols-3 gap-4 mt-5">
              {[
                { label:'Total Contracted', value:formatCurrency(totalContracted), color:'#3B82F6', bg:'#EFF6FF' },
                { label:'Total Paid',       value:formatCurrency(totalPaid),       color:'#10B981', bg:'#F0FDF4' },
                { label:'Balance',          value:formatCurrency(totalContracted-totalPaid), color:'#F59E0B', bg:'#FFFBEB' },
              ].map(s=>(
                <div key={s.label} className="rounded-xl px-4 py-3" style={{ background:s.bg }}>
                  <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color:'#94A3B8' }}>{s.label}</p>
                  <p className="text-lg font-bold" style={{ color:s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contracts */}
      {contracts.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-4" style={{ background:C.card, border:'1px solid #E2E8F0' }}>
          <div className="px-6 py-4" style={{ borderBottom:'1px solid #F1F5F9' }}>
            <p className="text-sm font-semibold" style={{ color:'#0F172A' }}>Contracts ({contracts.length})</p>
          </div>
          {contracts.map((c:any) => {
            const t = c.contract_tranches || []
            const paid   = t.filter((x:any)=>x.status==='paid').reduce((s:number,x:any)=>s+x.amount,0)
            const budget = c.contract_amount || c.total_budget || 0
            const rate   = budget > 0 ? Math.round((paid/budget)*100) : 0
            return (
              <Link key={c.id} href={`/contracts/${c.id}`} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors" style={{ borderBottom:'1px solid #F8FAFC' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color:'#0F172A' }}>{c.contract_name}</p>
                  <p className="text-xs mt-0.5" style={{ color:C.muted }}>{c.project || 'No project'} - {c.category || 'No category'}</p>
                </div>
                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color:'#0F172A' }}>{formatCurrency(budget)}</p>
                    <p className="text-xs" style={{ color:C.green }}>{formatCurrency(paid)} paid</p>
                  </div>
                  <div className="w-16">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-bold" style={{ color:rate>=80?'#10B981':rate>=40?'#F59E0B':'#3B82F6' }}>{rate}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'#F1F5F9' }}>
                      <div style={{ width:`${rate}%`, height:'100%', background:rate>=80?'#10B981':rate>=40?'#F59E0B':'#3B82F6', borderRadius:4 }}/>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Invoices */}
      {invoices.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background:C.card, border:'1px solid #E2E8F0' }}>
          <div className="px-6 py-4" style={{ borderBottom:'1px solid #F1F5F9' }}>
            <p className="text-sm font-semibold" style={{ color:'#0F172A' }}>Invoices ({invoices.length})</p>
          </div>
          {invoices.map((inv:any) => {
            const sc = inv.status==='approved'?'#10B981':inv.status==='rejected'?'#EF4444':'#F59E0B'
            const sl = inv.status==='approved'?'Approved':inv.status==='rejected'?'Rejected':inv.status==='pending_review'?'Awaiting Rudy':inv.status==='pending_placide'?'Awaiting Placide':'Awaiting Dany'
            return (
              <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors" style={{ borderBottom:'1px solid #F8FAFC' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color:'#0F172A' }}>#{inv.invoice_number || 'N/A'}</p>
                  <p className="text-xs mt-0.5" style={{ color:C.muted }}>{inv.invoice_date || inv.submitted_at?.slice(0,10) || '—'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold" style={{ color:'#0F172A' }}>{formatCurrency(inv.amount_ttc)}</span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:`${sc}18`, color:sc }}>{sl}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
