'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-browser'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Invoice, InvoiceLineItem, Validation } from '@/lib/types'

const NAVY = '#0C1F52'

const STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending_review:  { label: 'Awaiting Rudy',    color: '#92400E', bg: '#FEF3C7', dot: '#D97706' },
  pending_placide: { label: 'Awaiting Placide',  color: '#92400E', bg: '#FEF3C7', dot: '#D97706' },
  pending_hitech:  { label: 'Awaiting Hitech',   color: '#5B21B6', bg: '#EDE9FE', dot: '#7C3AED' },
  approved:        { label: 'Approved',           color: '#065F46', bg: '#D1FAE5', dot: '#059669' },
  rejected:        { label: 'Rejected',           color: '#991B1B', bg: '#FEE2E2', dot: '#DC2626' },
}

const STEPS = ['pending_review', 'pending_placide', 'pending_hitech', 'approved']
const STEP_LABELS = ['Rudy', 'Placide', 'Hitech', 'Done']

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([])
  const [validations, setValidations] = useState<Validation[]>([])
  const [loading, setLoading] = useState(true)
  const [validatorName, setValidatorName] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Invoice>>({})
  const [showRejectModal, setShowRejectModal] = useState(false)

  async function load() {
    const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).single()
    const { data: items } = await supabase.from('invoice_line_items').select('*').eq('invoice_id', id)
    const { data: vals } = await supabase.from('validations').select('*').eq('invoice_id', id).order('validated_at')
    setInvoice(inv)
    setEditData(inv || {})
    setLineItems(items || [])
    setValidations(vals || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function handleValidation(decision: 'approved' | 'rejected') {
    if (!validatorName.trim()) {
      setMessage({ text: 'Please enter your name.', ok: false })
      return
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#F4F6FA' }}>
        <div className="text-sm text-gray-400">Loading…</div>
      </div>
    )
  }

  if (!invoice) {
    return <div className="p-8 text-red-600 font-medium">Invoice not found.</div>
  }

  const canValidate = ['pending_review', 'pending_placide', 'pending_hitech'].includes(invoice.status)
  const validatorLabel = invoice.status === 'pending_review' ? 'Rudy' : invoice.status === 'pending_placide' ? 'Placide' : 'Hitech'
  const s = STATUS[invoice.status] ?? STATUS.pending_review
  const currentStep = STEPS.indexOf(invoice.status)

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/invoices" className="hover:text-blue-600 transition-colors">Invoices</Link>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="font-medium truncate" style={{ color: '#111928' }}>
          {invoice.subcontractor_name || 'Invoice'}
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* LEFT */}
        <div className="space-y-5">

          {/* Header card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h1 className="text-xl font-bold" style={{ color: NAVY }}>
                  {invoice.subcontractor_name || 'Unknown subcontractor'}
                </h1>
                {invoice.invoice_number && (
                  <p className="text-sm text-gray-400 mt-0.5">Invoice # {invoice.invoice_number}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: s.bg, color: s.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                  {s.label}
                </span>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit
                  </button>
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
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                        style={
                          rejected
                            ? { background: '#FEE2E2', color: '#DC2626' }
                            : done || (invoice.status === 'approved' && i === 3)
                            ? { background: NAVY, color: '#fff' }
                            : active
                            ? { background: '#FEF3C7', color: '#D97706', border: '2px solid #D97706' }
                            : { background: '#F3F4F6', color: '#9CA3AF' }
                        }
                      >
                        {done || (invoice.status === 'approved' && i === 3) ? (
                          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : rejected ? '✕' : i + 1}
                      </div>
                      <p className="text-xs mt-1 text-center truncate w-full" style={{
                        color: active ? '#D97706' : done ? NAVY : '#9CA3AF'
                      }}>
                        {step}
                      </p>
                    </div>
                    {i < 3 && (
                      <div
                        className="flex-1 h-px mx-1 mb-4"
                        style={{ background: done ? NAVY : '#E5E7EB' }}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Subcontractor" value={editData.subcontractor_name || ''} onChange={v => setEditData(p => ({ ...p, subcontractor_name: v }))} />
                  <Field label="Invoice #" value={editData.invoice_number || ''} onChange={v => setEditData(p => ({ ...p, invoice_number: v }))} />
                  <Field label="Date" value={editData.invoice_date || ''} onChange={v => setEditData(p => ({ ...p, invoice_date: v }))} type="date" />
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Category</label>
                    <select
                      value={editData.category || ''}
                      onChange={e => setEditData(p => ({ ...p, category: e.target.value as Invoice['category'] }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white"
                      style={{ '--tw-ring-color': NAVY } as React.CSSProperties}
                    >
                      {['Subcontracting','Travel','Accommodation','Meals','Equipment','Other'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <Field label="Amount excl. VAT (€)" value={String(editData.amount_ht || '')} onChange={v => setEditData(p => ({ ...p, amount_ht: parseFloat(v) }))} type="number" />
                  <Field label="VAT rate (%)" value={String(editData.vat_rate || '')} onChange={v => setEditData(p => ({ ...p, vat_rate: parseFloat(v) }))} type="number" />
                  <Field label="VAT amount (€)" value={String(editData.amount_tva || '')} onChange={v => setEditData(p => ({ ...p, amount_tva: parseFloat(v) }))} type="number" />
                  <Field label="Total incl. VAT (€)" value={String(editData.amount_ttc || '')} onChange={v => setEditData(p => ({ ...p, amount_ttc: parseFloat(v) }))} type="number" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 text-white text-sm font-semibold py-2.5 rounded-xl"
                    style={{ background: NAVY }}
                  >
                    Save changes
                  </button>
                  <button
                    onClick={() => { setEditing(false); setEditData(invoice) }}
                    className="px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoField label="Invoice date" value={formatDate(invoice.invoice_date)} />
                <InfoField label="Category" value={invoice.category || '—'} />
                <InfoField label="VAT rate" value={invoice.vat_rate ? `${invoice.vat_rate}%` : '—'} />
                <InfoField label="Submitted" value={formatDate(invoice.submitted_at)} />
                {invoice.description && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Description</p>
                    <p className="text-gray-700">{invoice.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Amounts */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold mb-4" style={{ color: NAVY }}>Amounts</h2>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Excl. VAT</span>
                <span className="font-medium text-gray-800">{formatCurrency(invoice.amount_ht)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">VAT ({invoice.vat_rate || 0}%)</span>
                <span className="font-medium text-gray-800">{formatCurrency(invoice.amount_tva)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-100">
                <span className="font-semibold text-gray-800">Total incl. VAT</span>
                <span className="text-xl font-bold" style={{ color: NAVY }}>{formatCurrency(invoice.amount_ttc)}</span>
              </div>
            </div>
          </div>

          {/* Line items */}
          {lineItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Line Items</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      <th className="text-left px-6 py-3">Description</th>
                      <th className="text-right px-4 py-3">Qty</th>
                      <th className="text-right px-4 py-3">Unit HT</th>
                      <th className="text-right px-4 py-3">Total HT</th>
                      <th className="text-right px-4 py-3">VAT</th>
                      <th className="text-right px-6 py-3">Total TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {lineItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-700">{item.description || '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{item.quantity ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(item.total_ht)}</td>
                        <td className="px-4 py-3 text-right text-gray-400">{item.vat_rate ? `${item.vat_rate}%` : '—'}</td>
                        <td className="px-6 py-3 text-right font-semibold" style={{ color: NAVY }}>{formatCurrency(item.total_ttc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Validation history */}
          {validations.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold mb-4" style={{ color: NAVY }}>Validation History</h2>
              <div className="space-y-3">
                {validations.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-xl p-4 text-sm border"
                    style={
                      v.decision === 'approved'
                        ? { background: '#F0FDF4', borderColor: '#BBF7D0' }
                        : { background: '#FFF5F5', borderColor: '#FECACA' }
                    }
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-800 capitalize">{v.validator_name}</span>
                      <span className="text-xs font-semibold" style={{ color: v.decision === 'approved' ? '#059669' : '#DC2626' }}>
                        {v.decision === 'approved' ? '✓ Approved' : '✗ Rejected'}
                      </span>
                    </div>
                    {v.comment && <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{v.comment}&rdquo;</p>}
                    <p className="text-xs text-gray-400 mt-1.5">{formatDate(v.validated_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation panel */}
          {canValidate && (
            <div className="bg-white rounded-2xl border-2 p-6 shadow-sm" style={{ borderColor: '#D97706' }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                <h2 className="text-sm font-semibold" style={{ color: '#111928' }}>
                  Action required — {validatorLabel}
                </h2>
              </div>
              <p className="text-xs text-gray-400 mb-5">
                Compare the extracted data with the original PDF before validating.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">Your name</label>
                  <input
                    type="text"
                    value={validatorName}
                    onChange={e => setValidatorName(e.target.value)}
                    placeholder={validatorLabel}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">Comment (optional)</label>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={2}
                    placeholder="Add a note…"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                {message && (
                  <div
                    className="text-sm font-medium px-4 py-3 rounded-xl"
                    style={
                      message.ok
                        ? { background: '#F0FDF4', color: '#059669', border: '1px solid #BBF7D0' }
                        : { background: '#FFF5F5', color: '#DC2626', border: '1px solid #FECACA' }
                    }
                  >
                    {message.text}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={() => handleValidation('approved')}
                    disabled={submitting}
                    className="text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50"
                    style={{ background: '#059669' }}
                  >
                    {submitting ? '…' : '✓ Approve'}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={submitting}
                    className="text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50"
                    style={{ background: '#DC2626' }}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — PDF */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-24 self-start">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Original Invoice</h2>
              <p className="text-xs text-gray-400 mt-0.5">PDF document</p>
            </div>
            {invoice.pdf_url && (
              <a
                href={invoice.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium flex items-center gap-1 hover:underline"
                style={{ color: NAVY }}
              >
                Open
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
          </div>
          {invoice.pdf_url ? (
            <iframe
              src={invoice.pdf_url}
              className="w-full"
              style={{ height: 'calc(100vh - 180px)', minHeight: '500px' }}
              title="Invoice PDF"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-300">
              <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="mb-3">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-sm text-gray-400">No PDF available</p>
            </div>
          )}
        </div>
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="bg-white rounded-2xl border border-gray-100 shadow-xl p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold mb-1" style={{ color: '#111928' }}>Reject Invoice</h3>
            <p className="text-sm text-gray-400 mb-5">Please provide a reason for rejecting this invoice.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Your name</label>
                <input
                  type="text"
                  value={validatorName}
                  onChange={e => setValidatorName(e.target.value)}
                  placeholder={validatorLabel}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Reason for rejection</label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                  placeholder="Explain why this invoice is rejected…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
              </div>
              {message && !message.ok && (
                <p className="text-sm text-red-600">{message.text}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => handleValidation('rejected')}
                  disabled={submitting}
                  className="flex-1 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50"
                  style={{ background: '#DC2626' }}
                >
                  {submitting ? '…' : 'Confirm Rejection'}
                </button>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-5 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
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

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />
    </div>
  )
}
