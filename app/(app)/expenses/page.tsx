'use client'
import { useState, useEffect, useRef } from 'react'
import { formatCurrency } from '@/lib/format'

const STAFF_CATEGORIES = [
  'Travel', 'Accommodation', 'Meals', 'Fuel & Transport',
  'Communication', 'Equipment', 'Training', 'Medical & Health', 'Other',
]

const ESG_CATEGORIES = [
  'Food Distribution',
  'Community Activities',
  'Health & Sanitation Programs',
  'Environmental Remediation',
  'Stakeholder Engagement',
  'Training & Capacity Building',
  'Water & Sanitation',
  'Biodiversity Conservation',
  'Infrastructure Support',
  'Social Welfare',
  'Awareness & Communication',
  'Other ESG Activity',
]

const CAT_ICON: Record<string, string> = {
  'Travel': '✈', 'Accommodation': '🏨', 'Meals': '🍽',
  'Fuel & Transport': '⛽', 'Communication': '📡', 'Equipment': '🔧',
  'Training': '📚', 'Medical & Health': '🏥', 'Other': '📋',
  'Food Distribution': '🥗', 'Community Activities': '🤝',
  'Health & Sanitation Programs': '🏥', 'Environmental Remediation': '🌿',
  'Stakeholder Engagement': '👥', 'Training & Capacity Building': '🎓',
  'Water & Sanitation': '💧', 'Biodiversity Conservation': '🦋',
  'Infrastructure Support': '🏗', 'Social Welfare': '❤',
  'Awareness & Communication': '📢', 'Other ESG Activity': '🌍',
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',    color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
  approved:   { label: 'Approved',   color: '#10B981', bg: 'rgba(16,185,129,0.1)'  },
  rejected:   { label: 'Rejected',   color: '#EF4444', bg: 'rgba(239,68,68,0.1)'   },
  reimbursed: { label: 'Reimbursed', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)'  },
}

const C = { card: '#FFFFFF', border: '#E2E8F0', text: '#0F172A', muted: '#64748B' }

const EMPTY_STAFF = {
  title: '', submitted_by: '', category: 'Travel', amount: '', currency: 'NGN',
  expense_date: '', description: '', project_id: '', receipt_url: '', type: 'staff',
}
const EMPTY_ESG = {
  title: '', submitted_by: '', category: 'Community Activities', amount: '', currency: 'NGN',
  expense_date: '', description: '', project_id: '', receipt_url: '', type: 'esg',
}

export default function ExpensesPage() {
  const [tab,       setTab]       = useState<'staff'|'esg'>('staff')
  const [expenses,  setExpenses]  = useState<any[]>([])
  const [projects,  setProjects]  = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState<any>({ ...EMPTY_STAFF })
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
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

  const staffExpenses = expenses.filter(e => (e.type || 'staff') === 'staff')
  const esgExpenses   = expenses.filter(e => e.type === 'esg')
  const shown         = tab === 'staff' ? staffExpenses : esgExpenses

  const totalNGN = shown.reduce((s, e) => s + (e.currency === 'NGN' ? e.amount : 0), 0)
  const totalUSD = shown.reduce((s, e) => s + (e.currency === 'USD' ? e.amount : 0), 0)
  const pendingCount = shown.filter(e => e.status === 'pending').length

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
    const res = await fetch('/api/expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to save'); setSaving(false); return }
    setSaving(false); setShowForm(false)
    setForm(tab === 'staff' ? { ...EMPTY_STAFF } : { ...EMPTY_ESG })
    await load()
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

  function openForm() {
    setForm(tab === 'staff' ? { ...EMPTY_STAFF } : { ...EMPTY_ESG })
    setError('')
    setShowForm(true)
  }

  const categories = tab === 'staff' ? STAFF_CATEGORIES : ESG_CATEGORIES
  const isESG      = tab === 'esg'

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
          <h1 className="text-2xl font-bold" style={{ color: C.text }}>Expenses</h1>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>
            {isESG ? 'ESG field activities — community, environmental & social spending' : 'Staff expense reports — travel, meals, transport, etc.'}
          </p>
        </div>
        <button onClick={openForm}
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl"
          style={{ background: isESG ? '#10B981' : '#3B82F6', color: '#fff' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {isESG ? 'Add ESG Activity' : 'Add Expense'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: '#F1F5F9' }}>
        <button onClick={() => setTab('staff')}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
          style={tab === 'staff'
            ? { background: '#fff', color: '#0F172A', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
            : { color: '#64748B' }}>
          Staff Expenses
        </button>
        <button onClick={() => setTab('esg')}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5"
          style={tab === 'esg'
            ? { background: '#fff', color: '#10B981', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
            : { color: '#64748B' }}>
          <span style={{ fontSize: 14 }}>🌍</span> ESG Activities
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: isESG ? 'Total ESG (NGN)' : 'Total NGN', value: formatCurrency(totalNGN, 'NGN'), color: isESG ? '#10B981' : '#10B981', bg: '#F0FDF4', icon: isESG ? '🌍' : '🧾' },
          { label: isESG ? 'Total ESG (USD)' : 'Total USD', value: formatCurrency(totalUSD, 'USD'), color: '#3B82F6', bg: '#EFF6FF', icon: '💵' },
          { label: 'Pending approval', value: `${pendingCount} item${pendingCount !== 1 ? 's' : ''}`, color: '#F59E0B', bg: '#FFFBEB', icon: '⏳' },
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

      {/* List */}
      <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${isESG ? '#D1FAE5' : C.border}` }}>
        {isESG && <div style={{ height: 3, background: 'linear-gradient(90deg,#10B981,#059669)' }}/>}
        {shown.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">{isESG ? '🌍' : '🧾'}</div>
            <p className="text-sm font-semibold mb-1" style={{ color: C.text }}>
              {isESG ? 'No ESG activities recorded yet' : 'No expense reports yet'}
            </p>
            <p className="text-sm" style={{ color: C.muted }}>
              {isESG ? 'Click "Add ESG Activity" to log community or environmental spending' : 'Click "Add Expense" to submit an expense report'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid px-5 py-2.5 text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#94A3B8', borderBottom: `1px solid #F1F5F9`, background: '#FAFBFC',
                gridTemplateColumns: '2fr 1.2fr 0.8fr 1fr 1fr 1.2fr' }}>
              <div>{isESG ? 'Activity' : 'Title'} / Person</div>
              <div>Category</div><div>Date</div>
              <div>Amount</div><div>Status</div><div>Actions</div>
            </div>
            {shown.map((e: any) => {
              const st = STATUS_STYLE[e.status] || STATUS_STYLE.pending
              return (
                <div key={e.id} className="grid px-5 py-3.5 items-center"
                  style={{ borderBottom: `1px solid #F8FAFC`, gridTemplateColumns: '2fr 1.2fr 0.8fr 1fr 1fr 1.2fr' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: C.text }}>{e.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                      {e.submitted_by}{e.projects?.name ? ` — ${e.projects.name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{CAT_ICON[e.category] || '📋'}</span>
                    <span className="text-xs truncate" style={{ color: C.muted }}>{e.category}</span>
                  </div>
                  <p className="text-xs" style={{ color: C.muted }}>
                    {e.expense_date ? new Date(e.expense_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                  </p>
                  <p className="text-sm font-bold" style={{ color: C.text }}>{formatCurrency(e.amount, e.currency)}</p>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold inline-block w-fit"
                    style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
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

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div style={{ height: 3, background: isESG ? 'linear-gradient(90deg,#10B981,#059669)' : '#3B82F6' }}/>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
              <h2 className="text-sm font-bold" style={{ color: C.text }}>
                {isESG ? '🌍 New ESG Activity' : 'New Expense Report'}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ color: C.muted }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>
                  {isESG ? 'Activity Title *' : 'Title *'}
                </label>
                <input value={form.title} onChange={e => setForm((p: any) => ({ ...p, title: e.target.value }))}
                  placeholder={isESG ? 'e.g. Food distribution — Badagry community' : 'e.g. Flight Lagos - Abuja'}
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: C.text }} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>
                  {isESG ? 'Responsible Person *' : 'Submitted by *'}
                </label>
                <input value={form.submitted_by} onChange={e => setForm((p: any) => ({ ...p, submitted_by: e.target.value }))}
                  placeholder="Name"
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: C.text }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>Category</label>
                  <select value={form.category} onChange={e => setForm((p: any) => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                    style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: C.text }}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>Date *</label>
                  <input type="date" value={form.expense_date} onChange={e => setForm((p: any) => ({ ...p, expense_date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                    style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: C.text }} />
                </div>
              </div>
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
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>Project (optional)</label>
                <select value={form.project_id} onChange={e => setForm((p: any) => ({ ...p, project_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: C.text }}>
                  <option value="">-- No project --</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>Description</label>
                <textarea value={form.description} onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))}
                  rows={2} placeholder={isESG ? 'Details of the activity, beneficiaries, location...' : 'Optional details...'}
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none resize-none"
                  style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: C.text }} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>
                  {isESG ? 'Supporting document (optional)' : 'Receipt (optional)'}
                </label>
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer text-sm font-medium"
                  style={{ background: isESG ? '#F0FDF4' : '#F0FDF4', border: `1.5px dashed ${isESG ? '#10B981' : '#10B981'}`, color: '#059669' }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  {uploading ? 'Uploading...' : form.receipt_url ? 'Document uploaded' : 'Upload PDF / image'}
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
                style={{ background: isESG ? '#10B981' : '#3B82F6', color: '#fff', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : isESG ? 'Save Activity' : 'Submit Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
