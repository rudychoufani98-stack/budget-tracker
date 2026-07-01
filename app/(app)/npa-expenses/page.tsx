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

const CAT_COLOR: Record<string, string> = {
  'Travel': '#3B82F6', 'Accommodation': '#8B5CF6', 'Meals': '#F59E0B',
  'Fuel & Transport': '#EF4444', 'Communication': '#06B6D4', 'Equipment': '#64748B',
  'Training': '#10B981', 'Medical & Health': '#EC4899', 'Other': '#94A3B8',
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',    color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
  approved:   { label: 'Approved',   color: '#10B981', bg: 'rgba(16,185,129,0.1)'  },
  rejected:   { label: 'Rejected',   color: '#EF4444', bg: 'rgba(239,68,68,0.1)'   },
  reimbursed: { label: 'Reimbursed', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)'  },
}

const C = { card: '#FFFFFF', border: '#E2E8F0', text: '#0F172A', muted: '#64748B' }
const ACCENT = '#7C3AED'

const EMPTY = {
  title: '', submitted_by: '', category: 'Travel', amount: '', currency: 'USD',
  expense_date: '', description: '', receipt_url: '',
}

export default function NpaExpensesPage() {
  const [expenses,   setExpenses]   = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState<any>({ ...EMPTY })
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [uploading,  setUploading]  = useState(false)
  const [filterCat,  setFilterCat]  = useState('all')
  const [filterStat, setFilterStat] = useState('all')
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const expRes = await fetch('/api/expenses?type=npa').then(r => r.json())
    setExpenses(Array.isArray(expRes) ? expRes : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Mini dashboard calculations ──────────────────────────────────────────
  const totalUSD     = expenses.reduce((s, e) => s + (e.currency === 'USD' ? +e.amount : 0), 0)
  const totalNGN     = expenses.reduce((s, e) => s + (e.currency === 'NGN' ? +e.amount : 0), 0)
  const totalEUR     = expenses.reduce((s, e) => s + (e.currency === 'EUR' ? +e.amount : 0), 0)
  const pendingCount = expenses.filter(e => e.status === 'pending').length
  const approvedUSD  = expenses.filter(e => e.status === 'approved' && e.currency === 'USD').reduce((s, e) => s + +e.amount, 0)
  const approvedNGN  = expenses.filter(e => e.status === 'approved' && e.currency === 'NGN').reduce((s, e) => s + +e.amount, 0)

  // by category
  const byCat = CATEGORIES.map(cat => ({
    cat,
    usd: expenses.filter(e => e.category === cat && e.currency === 'USD').reduce((s, e) => s + +e.amount, 0),
    ngn: expenses.filter(e => e.category === cat && e.currency === 'NGN').reduce((s, e) => s + +e.amount, 0),
  })).filter(c => c.usd > 0 || c.ngn > 0)

  // by person
  const byPerson: Record<string, { usd: number; ngn: number; count: number }> = {}
  for (const e of expenses) {
    const k = e.submitted_by || 'Unknown'
    if (!byPerson[k]) byPerson[k] = { usd: 0, ngn: 0, count: 0 }
    if (e.currency === 'USD') byPerson[k].usd += +e.amount
    if (e.currency === 'NGN') byPerson[k].ngn += +e.amount
    byPerson[k].count++
  }
  const byPersonArr = Object.entries(byPerson).sort((a, b) => b[1].usd - a[1].usd)

  // by status
  const byStatus = ['pending','approved','rejected','reimbursed'].map(s => ({
    s, count: expenses.filter(e => e.status === s).length,
    usd: expenses.filter(e => e.status === s && e.currency === 'USD').reduce((a, e) => a + +e.amount, 0),
  })).filter(s => s.count > 0)

  // filtered list
  const shown = expenses.filter(e => {
    if (filterCat !== 'all'  && e.category !== filterCat) return false
    if (filterStat !== 'all' && e.status   !== filterStat) return false
    return true
  })

  const maxUSD = Math.max(...byCat.map(c => c.usd), 1)

  // ── Receipt upload ────────────────────────────────────────────────────────
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

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!form.title || !form.submitted_by || !form.amount || !form.expense_date) {
      setError('Please fill in: title, name, amount, date'); return
    }
    setSaving(true); setError('')
    const res = await fetch('/api/expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount), type: 'npa' }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to save'); setSaving(false); return }
    setSaving(false); setShowForm(false); setForm({ ...EMPTY })
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

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${ACCENT}40`, borderTopColor: ACCENT }}/>
    </div>
  )

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: C.muted }}>Finance — NPA Project</p>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: C.text }}>
            <span className="text-2xl">🏗</span> NPA Expenses
          </h1>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>Team expenses for the NPA project — travel, accommodation, meals & more</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY }); setError(''); setShowForm(true) }}
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl"
          style={{ background: ACCENT, color: '#fff' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Expense
        </button>
      </div>

      {/* ── Mini Dashboard ─────────────────────────────────────────────────── */}
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total USD',      value: formatCurrency(totalUSD, 'USD'), color: '#3B82F6', bg: '#EFF6FF', icon: '💵' },
          { label: 'Total NGN',      value: formatCurrency(totalNGN, 'NGN'), color: '#10B981', bg: '#F0FDF4', icon: '💰' },
          totalEUR > 0
            ? { label: 'Total EUR', value: formatCurrency(totalEUR, 'EUR'), color: '#8B5CF6', bg: '#F5F3FF', icon: '💶' }
            : { label: 'Pending',   value: `${pendingCount} item${pendingCount !== 1 ? 's' : ''}`, color: '#F59E0B', bg: '#FFFBEB', icon: '⏳' },
          { label: 'Approved (USD)', value: formatCurrency(approvedUSD, 'USD'), color: '#10B981', bg: '#F0FDF4', icon: '✅' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl px-4 py-3.5" style={{ background: k.bg, border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ fontSize: 13 }}>{k.icon}</span>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#94A3B8' }}>{k.label}</p>
            </div>
            <p className="text-lg font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">

          {/* By Category bar chart */}
          <div className="col-span-2 rounded-2xl px-5 py-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#94A3B8' }}>Breakdown by Category (USD)</p>
            {byCat.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: C.muted }}>No data</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {byCat.sort((a, b) => b.usd - a.usd).map(({ cat, usd, ngn }) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-sm w-4 text-center">{CAT_ICON[cat] || '📋'}</span>
                    <span className="text-xs w-32 truncate" style={{ color: C.muted }}>{cat}</span>
                    <div className="flex-1 h-2 rounded-full" style={{ background: '#F1F5F9' }}>
                      <div className="h-2 rounded-full transition-all" style={{
                        width: `${Math.round((usd / maxUSD) * 100)}%`,
                        background: CAT_COLOR[cat] || ACCENT,
                      }}/>
                    </div>
                    <span className="text-xs font-semibold w-24 text-right" style={{ color: C.text }}>
                      {usd > 0 ? formatCurrency(usd, 'USD') : formatCurrency(ngn, 'NGN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* By Person */}
          <div className="rounded-2xl px-5 py-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#94A3B8' }}>By Team Member</p>
            {byPersonArr.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: C.muted }}>No data</p>
            ) : (
              <div className="flex flex-col gap-3">
                {byPersonArr.map(([name, vals]) => {
                  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  return (
                    <div key={name} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: `${ACCENT}18`, color: ACCENT }}>{initials}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: C.text }}>{name}</p>
                        <p className="text-xs" style={{ color: C.muted }}>
                          {vals.count} expense{vals.count !== 1 ? 's' : ''}
                          {vals.usd > 0 ? ` · ${formatCurrency(vals.usd, 'USD')}` : ''}
                          {vals.ngn > 0 ? ` · ${formatCurrency(vals.ngn, 'NGN')}` : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status pills summary */}
      {byStatus.length > 0 && (
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: C.muted }}>Status:</span>
          {byStatus.map(({ s, count, usd }) => {
            const st = STATUS_STYLE[s] || STATUS_STYLE.pending
            return (
              <button key={s} onClick={() => setFilterStat(filterStat === s ? 'all' : s)}
                className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
                style={{ background: filterStat === s ? st.color : st.bg, color: filterStat === s ? '#fff' : st.color }}>
                {st.label} · {count}{usd > 0 ? ` · ${formatCurrency(usd, 'USD')}` : ''}
              </button>
            )
          })}
          {filterStat !== 'all' && (
            <button onClick={() => setFilterStat('all')} className="text-xs px-3 py-1.5 rounded-full"
              style={{ background: '#F1F5F9', color: C.muted }}>Clear</button>
          )}
        </div>
      )}

      {/* ── Expense Table ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div style={{ height: 3, background: `linear-gradient(90deg,${ACCENT},#A78BFA)` }}/>

        {/* Category filter tabs */}
        <div className="px-5 pt-4 pb-2 flex items-center gap-2 flex-wrap" style={{ borderBottom: `1px solid #F1F5F9` }}>
          <span className="text-xs font-semibold" style={{ color: C.muted }}>Category:</span>
          {['all', ...CATEGORIES.filter(c => expenses.some(e => e.category === c))].map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className="text-xs px-3 py-1 rounded-full font-medium transition-all"
              style={filterCat === c
                ? { background: ACCENT, color: '#fff' }
                : { background: '#F1F5F9', color: C.muted }}>
              {c === 'all' ? 'All' : `${CAT_ICON[c] || ''} ${c}`}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">🏗</div>
            <p className="text-sm font-semibold mb-1" style={{ color: C.text }}>No expenses yet</p>
            <p className="text-sm" style={{ color: C.muted }}>Click "Add Expense" to log a team expense for the NPA project</p>
          </div>
        ) : (
          <>
            <div className="grid px-5 py-2.5 text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#94A3B8', background: '#FAFBFC', gridTemplateColumns: '2fr 1.2fr 0.8fr 1fr 1fr 1.2fr' }}>
              <div>Title / Person</div><div>Category</div><div>Date</div>
              <div>Amount</div><div>Status</div><div>Actions</div>
            </div>
            {shown.map((e: any) => {
              const st = STATUS_STYLE[e.status] || STATUS_STYLE.pending
              return (
                <div key={e.id} className="grid px-5 py-3.5 items-center"
                  style={{ borderBottom: `1px solid #F8FAFC`, gridTemplateColumns: '2fr 1.2fr 0.8fr 1fr 1fr 1.2fr' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: C.text }}>{e.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>{e.submitted_by}</p>
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

      {/* ── Add Expense Modal ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div style={{ height: 3, background: `linear-gradient(90deg,${ACCENT},#A78BFA)` }}/>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
              <h2 className="text-sm font-bold" style={{ color: C.text }}>🏗 New NPA Expense</h2>
              <button onClick={() => setShowForm(false)} style={{ color: C.muted }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>Title *</label>
                <input value={form.title} onChange={e => setForm((p: any) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Flight Lagos - Port Harcourt"
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: C.text }} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>Submitted by *</label>
                <input value={form.submitted_by} onChange={e => setForm((p: any) => ({ ...p, submitted_by: e.target.value }))}
                  placeholder="Team member name"
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: C.text }} />
              </div>
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
                    <option value="USD">USD</option>
                    <option value="NGN">NGN</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>Description</label>
                <textarea value={form.description} onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))}
                  rows={2} placeholder="Optional details..."
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none resize-none"
                  style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: C.text }} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: C.muted }}>Receipt (optional)</label>
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer text-sm font-medium"
                  style={{ background: '#F5F3FF', border: `1.5px dashed ${ACCENT}`, color: ACCENT }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  {uploading ? 'Uploading...' : form.receipt_url ? 'Document uploaded ✓' : 'Upload PDF / image'}
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
                style={{ background: ACCENT, color: '#fff', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Submit Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
