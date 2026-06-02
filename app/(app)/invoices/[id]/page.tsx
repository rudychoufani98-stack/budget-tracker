'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-browser'
import { createClient } from '@/utils/supabase/client'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Invoice, InvoiceLineItem, Validation } from '@/lib/types'

const C = { card:'#FFFFFF', border:'#E2E8F0', border2:'#CBD5E1', green:'#10B981', amber:'#F59E0B', red:'#EF4444', blue:'#3B82F6', muted:'#64748B', muted2:'#94A3B8', text:'#0F172A' }

const ALL_CATEGORIES = [
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

const STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending_review:  { label: 'Awaiting Rudy',    color: '#F97316', bg: 'rgba(249,115,22,0.12)',  dot: '#F97316' },
  pending_placide: { label: 'Awaiting Placide',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', dot: '#8B5CF6' },
  pending_dani:    { label: 'Awaiting Dani',     color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', dot: '#3B82F6' },
  pending_fares:   { label: 'Awaiting Payment',  color: '#0EA5E9', bg: 'rgba(14,165,233,0.12)', dot: '#0EA5E9' },
  approved:        { label: 'Approved',           color: '#10B981', bg: 'rgba(16,185,129,0.12)', dot: '#10B981' },
  rejected:        { label: 'Rejected',           color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  dot: '#EF4444' },
}

const STEPS = ['pending_review', 'pending_placide', 'pending_dani', 'pending_fares', 'approved']
const STEP_LABELS = ['Rudy', 'Placide', 'Dani', 'Accountant', 'Done']

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([])
  const [validations, setValidations] = useState<Validation[]>([])
  const [currency, setCurrency] = useState('NGN')
  const [savingCurrency, setSavingCurrency] = useState(false)
  const [loading, setLoading] = useState(true)
  const [validatorName, setValidatorName] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Invoice>>({})
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const auth = createClient()
    auth.auth.getUser().then(({ data }) => {
      setUserRole(data.user?.user_metadata?.role || 'viewer')
    })
  }, [])

  async function load() {
    const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).single()
    const { data: items } = await supabase.from('invoice_line_items').select('*').eq('invoice_id', id)
    const { data: vals } = await supabase.from('validations').select('*').eq('invoice_id', id).order('validated_at')
    const { data: cur } = await supabase.from('invoice_currency').select('currency').eq('invoice_id', id).single()
    setInvoice(inv)
    setEditData(inv || {})
    setLineItems(items || [])
    setValidations(vals || [])
    if (cur?.currency) setCurrency(cur.currency)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function saveCurrency(newCurrency: string) {
    setSavingCurrency(true)
    setCurrency(newCurrency)
    await supabase.from('invoice_currency').upsert({ invoice_id: id, currency: newCurrency }, { onConflict: 'invoice_id' })
    setSavingCurrency(false)
  }

  async function handleValidation(decision: 'approved' | 'rejected') {
    if (!validatorName.trim()) { setMessage({ text: 'Please enter your name.', ok: false }); return }
    setSubmitting(true)
    setMessage(null)
    const res = await fetch(`/api/invoices/${id}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, comment, validator_name: validatorName }),
    })
    if (res.ok) {
      setMessage({ text: decision === 'approved' ? 'Invoice approved successfully' : 'Invoice rejected', ok: decision === 'approved' })
      setShowRejectModal(false)
      await load()
    } else {
      const err = await res.json()
      setMessage({ text: `Error: ${err.error || 'Please try again'}`, ok: false })
    }
    setSubmitting(false)
  }

  async function handleSaveEdit() {
    await supabase.from('invoices').update({
      subcontractor_name: editData.subcontractor_name,
      invoice_number: editData.invoice_number,
      invoice_date: editData.invoice_date,
      amount_ht: editData.amount_ht,
      amount_tva: editData.amount_tva,
      amount_ttc: editData.amount_ttc,
      vat_rate: editData.vat_rate,
      category: editData.category,
      description: editData.description,
    }).eq('id', id)
    setEditing(false)
    await load()
  }

  async function handleDelete() {
    if (!confirm('Delete this invoice? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    router.push('/invoices')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: '#F8FAFC' }}>
      <div className="text-sm" style={{ color: C.muted }}>Loading…</div>
    </div>
  )

  if (!invoice) return (
    <div className="p-8 text-sm" style={{ color: C.red }}>Invoice not found.</div>
  )

  const roleForStep: Record<string, string[]> = {
    pending_review:  ['rudy', 'admin'],
    pending_placide: ['placide'],
    pending_dani:    ['dani', 'hitech'],
    pending_fares:   ['fares'],
  }
  const stepAllowed = roleForStep[invoice.status] ?? []
  const canValidate = stepAllowed.includes(userRole)
  const validatorLabelMap: Record<string,string> = { pending_review:'Rudy', pending_placide:'Placide', pending_dani:'Dani', pending_fares:'Accountant', approved:'', rejected:'' }
  const validatorLabel = validatorLabelMap[invoice.status] || 'Validator'
  const isWaitingForOther = ['pending_review','pending_placide','pending_dani','pending_fares'].includes(invoice.status) && !canValidate
  const s = STATUS[invoice.status] ?? STATUS.pending_review
  const currentStep = STEPS.indexOf(invoice.status)

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: C.muted }}>
        <Link href="/invoices" className="hover:text-blue-400 transition-colors">Invoices</Link>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        <span className="font-medium" style={{ color: C.text }}>{invoice.subcontractor_name || 'Invoice'}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* LEFT */}
        <div className="space-y-5">

          {/* Header card */}
          <div className="rounded-2xl p-6" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h1 className="text-xl font-semibold" style={{ color: C.text }}>{invoice.subcontractor_name || 'Unknown consultant'}</h1>
                {invoice.invoice_number && (
                  <p className="text-sm mt-0.5" style={{ color: C.muted }}>Invoice # {invoice.invoice_number}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: s.bg, color: s.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />{s.label}
                </span>
                {!editing && (
                  <>
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      style={{ color: C.muted2, border: `1px solid ${C.border2}`, background: 'transparent' }}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#E2E8F0'}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit
                    </button>
                    {['admin','rudy'].includes(userRole) && (
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        style={{ color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent' }}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(239,68,68,0.08)'}
                        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}
                      >
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                        {deleting ? 'Deleting…' : 'Delete'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Step tracker */}
            <div className="flex items-center gap-1 mb-5">
              {STEP_LABELS.map((step, i) => {
                const done = invoice.status === 'approved' || (invoice.status !== 'rejected' && i < currentStep)
                const active = i === currentStep && invoice.status !== 'approved' && invoice.status !== 'rejected'
                const rejected = invoice.status === 'rejected' && i === currentStep
                return (
                  <div key={step} className="flex items-center flex-1 min-w-0">
                    <div className="flex flex-col items-center min-w-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={
                        rejected ? { background: 'rgba(239,68,68,0.2)', color: '#EF4444' }
                        : done || (invoice.status==='approved'&&i===3) ? { background: '#10B981', color: '#fff' }
                        : active ? { background: 'rgba(59,130,246,0.2)', color: '#3B82F6', border: '2px solid #3B82F6' }
                        : { background: '#E2E8F0', color: '#6B7280' }
                      }>
                        {done||(invoice.status==='approved'&&i===3) ? (
                          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : rejected ? '✕' : i+1}
                      </div>
                      <p className="text-xs mt-1 text-center truncate w-full" style={{
                        color: active ? '#3B82F6' : done ? '#10B981' : C.muted
                      }}>{step}</p>
                    </div>
                    {i < 3 && (
                      <div className="flex-1 h-px mx-1 mb-4" style={{ background: done ? '#10B981' : C.border }} />
                    )}
                  </div>
                )
              })}
            </div>

            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <DField label="Consultant" value={editData.subcontractor_name||''} onChange={v=>setEditData(p=>({...p,subcontractor_name:v}))}/>
                  <DField label="Invoice #" value={editData.invoice_number||''} onChange={v=>setEditData(p=>({...p,invoice_number:v}))}/>
                  <DField label="Date" value={editData.invoice_date||''} onChange={v=>setEditData(p=>({...p,invoice_date:v}))} type="date"/>
                  <div className="col-span-2">
                    <label className="text-xs font-medium block mb-2" style={{ color: C.muted }}>Category</label>
                    <div className="grid grid-cols-4 gap-2">
                      {ALL_CATEGORIES.map(cat => {
                        const sel = (editData.category||'') === cat.label
                        return (
                          <button key={cat.label} type="button"
                            onClick={()=>setEditData(p=>({...p,category:cat.label as Invoice['category']}))}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                            style={sel
                              ? { background:`${cat.color}18`, border:`2px solid ${cat.color}`, color:cat.color }
                              : { background:'#F8FAFC', border:'2px solid #E2E8F0', color:'#64748B' }
                            }
                          >
                            <span>{cat.icon}</span><span>{cat.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <DField label={`Amount excl. VAT (${currency})`} value={String(editData.amount_ht||'')} onChange={v=>setEditData(p=>({...p,amount_ht:parseFloat(v)}))} type="number"/>
                  <DField label="VAT rate (%)" value={String(editData.vat_rate||'')} onChange={v=>setEditData(p=>({...p,vat_rate:parseFloat(v)}))} type="number"/>
                  <DField label={`VAT amount (${currency})`} value={String(editData.amount_tva||'')} onChange={v=>setEditData(p=>({...p,amount_tva:parseFloat(v)}))} type="number"/>
                  <DField label={`Total incl. VAT (${currency})`} value={String(editData.amount_ttc||'')} onChange={v=>setEditData(p=>({...p,amount_ttc:parseFloat(v)}))} type="number"/>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSaveEdit} className="flex-1 text-white text-sm font-medium py-2.5 rounded-xl" style={{ background: '#3B82F6' }}>Save changes</button>
                  <button onClick={()=>{setEditing(false);setEditData(invoice)}} className="px-4 py-2.5 text-sm rounded-xl transition-colors" style={{ color:C.muted, border:`1px solid ${C.border2}` }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <DInfo label="Invoice date" value={formatDate(invoice.invoice_date)}/>
                <DInfo label="Category" value={invoice.category||'—'}/>
                <DInfo label="VAT rate" value={invoice.vat_rate ? `${invoice.vat_rate}%` : '—'}/>
                <DInfo label="Submitted" value={formatDate(invoice.submitted_at)}/>
                {invoice.description && (
                  <div className="col-span-2">
                    <p className="text-xs mb-0.5" style={{ color: C.muted }}>Description</p>
                    <p style={{ color: C.text }}>{invoice.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Amounts */}
          <div className="rounded-2xl p-6" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: C.text }}>Amounts</h2>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background:'#E2E8F0', color:C.text }}>
                {currency}
              </span>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span style={{ color: C.muted }}>Excl. VAT</span>
                <span className="font-medium" style={{ color: C.text }}>{formatCurrency(invoice.amount_ht, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: C.muted }}>VAT ({invoice.vat_rate||0}%)</span>
                <span className="font-medium" style={{ color: C.muted2 }}>{formatCurrency(invoice.amount_tva, currency)}</span>
              </div>
              <div className="flex justify-between pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
                <span className="font-medium" style={{ color: C.text }}>Total incl. VAT</span>
                <span className="text-xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(invoice.amount_ttc, currency)}</span>
              </div>
            </div>
          </div>

          {/* Line items */}
          {lineItems.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="px-6 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                <h2 className="text-sm font-semibold" style={{ color: C.text }}>Line Items</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-medium uppercase tracking-widest" style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                      <th className="text-left px-6 py-3">Description</th>
                      <th className="text-right px-4 py-3">Qty</th>
                      <th className="text-right px-4 py-3">Unit HT</th>
                      <th className="text-right px-4 py-3">Total HT</th>
                      <th className="text-right px-4 py-3">VAT</th>
                      <th className="text-right px-6 py-3">Total TTC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map(item=>(
                      <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td className="px-6 py-3" style={{ color: C.text }}>{item.description||'—'}</td>
                        <td className="px-4 py-3 text-right" style={{ color: C.muted }}>{item.quantity??'—'}</td>
                        <td className="px-4 py-3 text-right" style={{ color: C.muted }}>{formatCurrency(item.unit_price, currency)}</td>
                        <td className="px-4 py-3 text-right" style={{ color: C.text }}>{formatCurrency(item.total_ht, currency)}</td>
                        <td className="px-4 py-3 text-right" style={{ color: C.muted }}>{item.vat_rate ? `${item.vat_rate}%` : '—'}</td>
                        <td className="px-6 py-3 text-right font-semibold" style={{ color: '#10B981' }}>{formatCurrency(item.total_ttc, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Validation history */}
          {validations.length > 0 && (
            <div className="rounded-2xl p-6" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: C.text }}>Validation History</h2>
              <div className="space-y-3">
                {validations.map(v=>(
                  <div key={v.id} className="rounded-xl p-4 text-sm" style={
                    v.decision==='approved'
                      ? { background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)' }
                      : { background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }
                  }>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium capitalize" style={{ color: C.text }}>{v.validator_name}</span>
                      <span className="text-xs font-semibold" style={{ color: v.decision==='approved' ? '#10B981' : '#EF4444' }}>
                        {v.decision==='approved' ? '✓ Approved' : '✗ Rejected'}
                      </span>
                    </div>
                    {v.comment && <p className="text-xs mt-1 italic" style={{ color: C.muted2 }}>&ldquo;{v.comment}&rdquo;</p>}
                    <p className="text-xs mt-1.5" style={{ color: C.muted }}>{formatDate(v.validated_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Waiting banner */}
          {isWaitingForOther && (
            <div className="rounded-2xl p-6" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.amber }}/>
                <h2 className="text-sm font-semibold" style={{ color: C.text }}>Waiting for {validatorLabel}</h2>
              </div>
              <p className="text-xs" style={{ color: C.muted }}>This invoice is pending validation by {validatorLabel}. You don&apos;t have permission to validate at this step.</p>
            </div>
          )}

          {/* Validation panel */}
          {canValidate && (
            <div className="rounded-2xl p-6" style={{ background: C.card, border: `2px solid #3B82F6` }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#3B82F6' }}/>
                <h2 className="text-sm font-semibold" style={{ color: C.text }}>Action required — {validatorLabel}</h2>
              </div>
              <p className="text-xs mb-5" style={{ color: C.muted }}>Compare the extracted data with the original PDF before validating.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: C.muted2 }}>Your name</label>
                  <input type="text" value={validatorName} onChange={e=>setValidatorName(e.target.value)} placeholder={validatorLabel} className="w-full rounded-xl px-4 py-2.5 text-sm" style={{ background:'#E2E8F0', color:C.text, border:`1px solid ${C.border2}` }}/>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: C.muted2 }}>Comment (optional)</label>
                  <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={2} placeholder="Add a note…" className="w-full rounded-xl px-4 py-2.5 text-sm resize-none" style={{ background:'#E2E8F0', color:C.text, border:`1px solid ${C.border2}` }}/>
                </div>
                {message && (
                  <div className="text-sm font-medium px-4 py-3 rounded-xl" style={
                    message.ok
                      ? { background:'rgba(16,185,129,0.12)', color:'#10B981', border:'1px solid rgba(16,185,129,0.3)' }
                      : { background:'rgba(239,68,68,0.12)', color:'#EF4444', border:'1px solid rgba(239,68,68,0.3)' }
                  }>{message.text}</div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button onClick={()=>handleValidation('approved')} disabled={submitting} className="text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50" style={{ background:'#10B981' }}>
                    {submitting ? '…' : '✓ Approve'}
                  </button>
                  <button onClick={()=>setShowRejectModal(true)} disabled={submitting} className="text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50" style={{ background:'#EF4444' }}>
                    ✕ Reject
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — PDF */}
        <div className="rounded-2xl overflow-hidden sticky top-24 self-start" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: C.text }}>Original Invoice</h2>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>PDF document</p>
            </div>
            {invoice.pdf_url && (
              <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: '#3B82F6' }}>
                Open
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            )}
          </div>
          {invoice.pdf_url ? (
            <iframe src={invoice.pdf_url} className="w-full" style={{ height: 'calc(100vh - 180px)', minHeight: '500px' }} title="Invoice PDF"/>
          ) : (
            <div className="flex flex-col items-center justify-center h-64" style={{ color: C.muted }}>
              <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="mb-3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <p className="text-sm">No PDF available</p>
            </div>
          )}
        </div>
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.6)' }} onClick={()=>setShowRejectModal(false)}>
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ background:'#F1F5F9', border:`1px solid ${C.border2}` }} onClick={e=>e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-1" style={{ color: C.text }}>Reject Invoice</h3>
            <p className="text-sm mb-5" style={{ color: C.muted }}>Please provide a reason for rejecting this invoice.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: C.muted2 }}>Your name</label>
                <input type="text" value={validatorName} onChange={e=>setValidatorName(e.target.value)} placeholder={validatorLabel} className="w-full rounded-xl px-4 py-2.5 text-sm" style={{ background:'#E2E8F0', color:C.text, border:`1px solid ${C.border2}` }}/>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: C.muted2 }}>Reason for rejection</label>
                <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={3} placeholder="Explain why this invoice is rejected…" className="w-full rounded-xl px-4 py-2.5 text-sm resize-none" style={{ background:'#E2E8F0', color:C.text, border:`1px solid ${C.border2}` }}/>
              </div>
              {message && !message.ok && (
                <p className="text-sm" style={{ color: '#EF4444' }}>{message.text}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={()=>handleValidation('rejected')} disabled={submitting} className="flex-1 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50" style={{ background:'#EF4444' }}>
                  {submitting ? '…' : 'Confirm Rejection'}
                </button>
                <button onClick={()=>setShowRejectModal(false)} className="px-5 py-2.5 text-sm rounded-xl transition-colors" style={{ color:C.muted, border:`1px solid ${C.border2}` }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs mb-0.5" style={{ color: '#6B7280' }}>{label}</p>
      <p className="font-medium" style={{ color: '#0F172A' }}>{value}</p>
    </div>
  )
}

function DField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1" style={{ color: '#6B7280' }}>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background:'#E2E8F0', color:'#0F172A', border:'1px solid #CBD5E1' }}/>
    </div>
  )
}