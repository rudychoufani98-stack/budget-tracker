'use client'
import { useState, useEffect, useRef } from 'react'
import { formatCurrency } from '@/lib/format'

const CATEGORIES = [
  'Travel', 'Accommodation', 'Meals', 'Fuel & Transport',
  'Communication', 'Equipment', 'Training', 'Medical & Health', 'Other',
]
const CAT_ICON: Record<string, string> = {
  'Travel': '✈', 'Accommodation': '🏨', 'Meals': '🍽',
  'Fuel & Transport': '⛽', 'Communication': '📡', 'Equipment': '🔧',
  'Training': '📚', 'Medical & Health': '🏥', 'Other': '📋',
}
const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending',  color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
  approved: { label: 'Approved', color: '#10B981', bg: 'rgba(16,185,129,0.1)'  },
  rejected: { label: 'Rejected', color: '#EF4444', bg: 'rgba(239,68,68,0.1)'   },
  reimbursed:{ label:'Reimbursed',color:'#3B82F6', bg: 'rgba(59,130,246,0.1)'  },
}
const C = { card:'#FFFFFF', border:'#E2E8F0', text:'#0F172A', muted:'#64748B' }

const EMPTY = {
  title:'', submitted_by:'', category:'Travel', amount:'', currency:'NGN',
  expense_date:'', description:'', project_id:'', receipt_url:'',
}

export default function ExpensesPage() {
  const [expenses,  setExpenses]  = useState<any[]>([])
  const [projects,  setProjects]  = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState<any>({ ...EMPTY })
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [filter,    setFilter]    = useState<'all'|'pending'|'approved'|'reimbursed'>('all')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [expRes, projRes] = await Promise.all([
      fetch('/api/expenses').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
    ])
    setExpenses(Array.isArray(expRes) ? expRes : [])
    setProjects(Array.isArray(projRes) ? projRes : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function uploadReceipt(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('path', `invoices/expenses/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`)
    const res  = await fetch('/api/storage/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (data.signedUrl) setForm((p: any) => ({ ...p, receipt_url: data.signedUrl }))
  }

  async function handleSubmit() {
    if (!form.title || !form.submitted_by || !form.amount || !form.expense_date) {
      setError('Please fill in: title, name, amount, date'); return
    }
    setSaving(true); setError('')
    const res  = await fetch('/api/expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to save'); setSaving(false); return }
    setSaving(false); setShowForm(false); setForm({ ...EMPTY }); await load()
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/expenses/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await load()
  }

  async function deleteExpense(id: string) {
    if (!confirm('Delete this expense?')) return
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    await load()
  }

  const filtered = filter === 'all' ? expenses : expenses.filter(e => e.status === filter)
  const totalNGN = expenses.reduce((s, e) => s + (e.currency === 'NGN' ? e.amount : 0), 0)
  const totalUSD = expenses.reduce((s, e) => s + (e.currency === 'USD' ? e.amount : 0), 0)
  const pendingCount = expenses.filter(e => e.status === 'pending').length

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"/>
    </div>
  )

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: C.muted }}>Finance</p>
          <h1 className="text-2xl font-bold" style={{ color: C.text }}>Notes de Frais</h1>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>Expense reports — travel, meals, transport, etc.</p>
        </div>
        <button onClick={() => { setShowForm(true); setForm({ ...EMPTY }) }}
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl"
          style={{ background: '#3B82F6', color: '#fff' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Expense
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total NGN', value: formatCurrency(totalNGN, 'NGN'), color: '#10B981', bg: '#F0FDF4', icon: '🧾' },
          { label: 'Total USD', value: formatCurrency(totalUSD, 'USD'), color: '#3B82F6', bg: '#EFF6FF', icon: '💵' },
          { label: 'Pending approval', value: `${pendingCount} expense${pendingCount !== 1 ? 's' : ''}`, color: '#F59E0B', bg: '#FFFBEB', icon: '⏳' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl px-5 py-4" style={{ background: k.bg, border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 mb-1">
              <span>{k.icon}</span>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#94A3B8' }}>{k.label}</p>
            </div>
            <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        {(['all', 'pending', 'approved', 'reimbursed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="text-sm px-3 py-1.5 rounded-lg font-medium capitalize"
            style={filter === f
              ? { background: '#0F172A', color: '#fff' }
              : { background: '#F1F5F9', color: '#64748B' }}>
            {f === 'all' ? `All (${expenses.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${expenses.filter(e => e.status === f).length})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">🧾</div>
            <p className="text-sm font-semibold mb-1" style={{ color: C.text }}>No expense reports yet</p>
            <p className="text-sm" style={{ color: C.muted }}>Click "Add Expense" to submit a note de frais</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid px-5 py-2.5 text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#94A3B8', borderBottom: `1px solid #F1F5F9`, background: '#FAFBFC',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr' }}>
              <div>Title / Person</div><div>Category</div><div>Date</div>
              <div>Amount</div><div>Status</div><div>Actions</div>
            </div>
            {filtered.map((e: any) => {
              const st = STATUS_STYLE[e.status] || STATUS_STYLE.pending
              return (
                <div key={e.id} className="grid px-5 py-3.5 items-center"
                  style={{ borderBottom: `1px solid #F8FAFC`, gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: C.text }}>{e.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>{e.submitted_by}{e.projects?.name ? ` — ${e.projects.name}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{CAT_ICON[e.category] || '📋'}</span>
                    <span className="text-sm" style={{ color: C.muted }}>{e.category}</span>
                  </div>
                  <p className="text-sm" style={{ color: C.muted }}>{e.expense_date ? new Date(e.expense_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' }) : '—'}</p>
                  <p className="text-sm font-bold" style={{ color: C.text }}>{formatCurrency(e.amount, e.currency)}</p>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold inline-block w-fit"
                    style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  <div className="flex items-center gap-1.5">
                    {e.receipt_url && (
                      <a href={e.receipt_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-2 py-1 rounded-lg font-medium"
                        style={{ background: 'rgba(59,130,246,0.08)', color: '#3B82F6' }}>Receipt</a>
                    )}
                    {e.status === 'pending' && (
                      <button onClick={() => updateStatus(e.id, 'approved')}
                        className="text-xs px-2 py-1 rounded-lg font-medium"
                        style={{ background: 'rgba(16,185,129,0.08)', color: '#10B981' }}>Approve</button>
                    )}
                    {e.status === 'approved' && (
                      <button onClick={() => updateStatus(e.id, 'reimbursed')}
                        className="text-xs px-2 py-1 rounded-lg font-medium"
                        style={{ background: 'rgba(59,130,246,0.08)', color: '#3B82F6' }}>Reimburse</button>
                    )}
                    <button onClick={() => deleteExpense(e.id)}
                      className="text-xs px-2 py-1 rounded-lg font-medium"
                      style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>Del</button>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Add expense modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
              <h2 className="text-sm font-bold" style={{ color: C.text }}>New Expense Report</h2>
              <button onClick={() => setShowForm(false)} style={{ color: C.muted }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>Title *</label>
                <input value={form.title} onChange={e => setForm((p: any) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Flight Lagos - Abuja"
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: C.text }} />
              </div>
              {/* Submitted by */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>Submitted by *</label>
                <input value={form.submitted_by} onChange={e => setForm((p: any) => ({ ...p, submitted_by: e.target.value }))}
                  placeholder="Your name"
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: C.text }} />
              </div>
              {/* Category + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>Category</label>
                  <select value={form.category} onChange={e => setForm((p: any) => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                    style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: C.text }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>Date *</label>
                  <input type="date" value={form.expense_date} onChange={e => setForm((p: any) => ({ ...p, expense_date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                    style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: C.text }} />
                </div>
              </div>
              {/* Amount + Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>Amount *</label>
                  <input type="number" value={form.amount} onChange={e => setForm((p: any) => ({ ...p, amount: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                    style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: C.text }} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>Currency</label>
                  <select value={form.currency} onChange={e => setForm((p: any) => ({ ...p, currency: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                    style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: C.text }}>
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              {/* Project (optional) */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>Project (optional)</label>
                <select value={form.project_id} onChange={e => setForm((p: any) => ({ ...p, project_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: C.text }}>
                  <option value="">-- No project --</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {/* Description */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>Description</label>
                <textarea value={form.description} onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))}
                  rows={2} placeholder="Optional details..."
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none resize-none"
                  style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: C.text }} />
              </div>
              {/* Receipt upload */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>Receipt (optional)</label>
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer text-sm font-medium"
                  style={{ background: '#F0FDF4', border: '1.5px dashed #10B981', color: '#059669' }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  {uploading ? 'Uploading...' : form.receipt_url ? 'Receipt uploaded' : 'Upload receipt PDF/image'}
                  <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadReceipt(f) }} />
                </label>
              </div>
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>{error}</p>}
            </div>
            <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => setShowForm(false)} className="text-sm px-4 py-2 rounded-xl"
                style={{ border: `1px solid ${C.border}`, color: C.muted }}>Cancel</button>
              <button onClick={handleSubmit} disabled={saving}
                className="text-sm font-semibold px-5 py-2 rounded-xl"
                style={{ background: '#3B82F6', color: '#fff', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Submit Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
