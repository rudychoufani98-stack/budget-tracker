'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Invoice, InvoiceLineItem, Validation } from '@/lib/types'

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending_review:  { label: 'Awaiting Rudy',    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  pending_placide: { label: 'Awaiting Placide',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  pending_hitech:  { label: 'Awaiting Hitech',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  approved:        { label: 'Approved',           color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  rejected:        { label: 'Rejected',           color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
}

const STEPS = ['pending_review', 'pending_placide', 'pending_hitech', 'approved']

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
      <div className="flex items-center justify-center h-screen" style={{ background: '#0A0F1E' }}>
        <div className="text-sm" style={{ color: '#9CA3AF' }}>Loading…</div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="p-8">
        <p className="font-medium" style={{ color: '#EF4444' }}>Invoice not found.</p>
      </div>
    )
  }

  const canValidate = ['pending_review', 'pending_placide', 'pending_hitech'].includes(invoice.status)
  const validatorLabel = invoice.status === 'pending_review' ? 'Rudy' : invoice.status === 'pending_placide' ? 'Placide' : 'Hitech'
  const s = STATUS[invoice.status] ?? STATUS.pending_review
  const currentStep = STEPS.indexOf(invoice.status)

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: '#9CA3AF' }}>
        <Link href="/invoices" style={{ color: '#9CA3AF' }}>Invoices</Link>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span style={{ color: '#F9FAFB' }} className="font-medium truncate">
          {invoice.subcontractor_name || 'Invoice'}
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* LEFT COLUMN */}
        <div className="space-y-5">

          {/* Header card */}
          <div className="rounded-2xl border p-6" style={{ background: '#111827', borderColor: '#1F2937' }}>
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h1 className="text-xl font-bold" style={{ color: '#F9FAFB' }}>
                  {invoice.subcontractor_name || 'Unknown subcontractor'}
                </h1>
                {invoice.invoice_number && (
                  <p className="text-sm mt-0.5" style={{ color: '#9CA3AF' }}>Invoice # {invoice.invoice_number}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: s.bg, color: s.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border"
                    style={{ color: '#9CA3AF', borderColor: '#374151', background: 'transparent' }}
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

            {/* Validation steps tracker */}
            <div className="flex items-center gap-1 mb-5">
              {['Rudy', 'Placide', 'Hitech', 'Done'].map((step, i) => {
                const done = invoice.status === 'approved' || (invoice.status !== 'rejected' && i < currentStep)
                const active = i === currentStep && invoice.status !== 'approved' && invoice.status !== 'rejected'
                return (
                  <div key={step} className="flex items-center flex-1 min-w-0">
                    <div className="flex flex-col items-center min-w-0">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                        style={
                          invoice.status === 'rejected' && i === currentStep
                            ? { background: 'rgba(239,68,68,0.15)', color: '#EF4444' }
                            : done || (invoice.status === 'approved' && i === 3)
                            ? { background: '#10B981', color: '#fff' }
                            : active
                            ? { background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid #F59E0B' }
                            : { background: '#1F2937', color: '#9CA3AF' }
                        }
                      >
                        {done || (invoice.status === 'approved' && i === 3) ? (
                          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : invoice.status === 'rejected' && i === currentStep ? (
                          '✕'
                        ) : (
                          i + 1
                        )}
                      </div>
                      <p className="text-xs mt-1 text-center truncate w-full" style={{ color: active ? '#F59E0B' : done ? '#10B981' : '#9CA3AF' }}>
                        {step}
                      </p>
                    </div>
                    {i < 3 && (
                      <div
                        className="flex-1 h-px mx-1 mb-4"
                        style={{ background: done ? '#10B981' : '#1F2937' }}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <DarkEditField label="Subcontractor" value={editData.subcontractor_name || ''} onChange={v => setEditData(p => ({ ...p, subcontractor_name: v }))} />
                  <DarkEditField label="Invoice #" value={editData.invoice_number || ''} onChange={v => setEditData(p => ({ ...p, invoice_number: v }))} />
                  <DarkEditField label="Date" value={editData.invoice_date || ''} onChange={v => setEditData(p => ({ ...p, invoice_date: v }))} type="date" />
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: '#9CA3AF' }}>Category</label>
                    <select
                      value={editData.category || ''}
                      onChange={e => setEditData(p => ({ ...p, category: e.target.value as Invoice['category'] }))}
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                      style={{ background: '#0A0F1E', border: '1px solid #374151', color: '#F9FAFB' }}
                    >
                      {['Subcontracting','Travel','Accommodation','Meals','Equipment','Other'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <DarkEditField label="Amount excl. VAT (€)" value={String(editData.amount_ht || '')} onChange={v => setEditData(p => ({ ...p, amount_ht: parseFloat(v) }))} type="number" />
                  <DarkEditField label="VAT rate (%)" value={String(editData.vat_rate || '')} onChange={v => setEditData(p => ({ ...p, vat_rate: parseFloat(v) }))} type="number" />
                  <DarkEditField label="VAT amount (€)" value={String(editData.amount_tva || '')} onChange={v => setEditData(p => ({ ...p, amount_tva: parseFloat(v) }))} type="number" />
                  <DarkEditField label="Total incl. VAT (€)" value={String(editData.amount_ttc || '')} onChange={v => setEditData(p => ({ ...p, amount_ttc: parseFloat(v) }))} type="number" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 text-white text-sm font-semibold py-2.5 rounded-xl"
                    style={{ background: '#10B981' }}
                  >
                    Save changes
                  </button>
                  <button
                    onClick={() => { setEditing(false); setEditData(invoice) }}
                    className="px-4 py-2.5 text-sm rounded-xl border"
                    style={{ color: '#9CA3AF', borderColor: '#374151' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <DarkInfoField label="Invoice date" value={formatDate(invoice.invoice_date)} />
                <DarkInfoField label="Category" value={invoice.category || '—'} />
                <DarkInfoField label="VAT rate" value={invoice.vat_rate ? `${invoice.vat_rate}%` : '—'} />
                <DarkInfoField label="Submitted" value={formatDate(invoice.submitted_at)} />
                {invoice.description && (
                  <div className="col-span-2">
                    <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Description</p>
                    <p style={{ color: '#F9FAFB' }}>{invoice.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Amounts card */}
          <div className="rounded-2xl border p-6" style={{ background: '#111827', borderColor: '#1F2937' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: '#F9FAFB' }}>Amounts</h2>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span style={{ color: '#9CA3AF' }}>Excl. VAT</span>
                <span className="font-medium" style={{ color: '#F9FAFB' }}>{formatCurrency(invoice.amount_ht)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: '#9CA3AF' }}>VAT ({invoice.vat_rate || 0}%)</span>
                <span className="font-medium" style={{ color: '#F9FAFB' }}>{formatCurrency(invoice.amount_tva)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t" style={{ borderColor: '#1F2937' }}>
                <span className="font-semibold" style={{ color: '#F9FAFB' }}>Total incl. VAT</span>
                <span className="text-xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(invoice.amount_ttc)}</span>
              </div>
            </div>
          </div>

          {/* Line items */}
          {lineItems.length > 0 && (
            <div className="rounded-2xl border overflow-hidden" style={{ background: '#111827', borderColor: '#1F2937' }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: '#1F2937' }}>
                <h2 className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Line Items</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wide border-b" style={{ background: '#0A0F1E', color: '#9CA3AF', borderColor: '#1F2937' }}>
                      <th className="text-left px-6 py-3">Description</th>
                      <th className="text-right px-4 py-3">Qty</th>
                      <th className="text-right px-4 py-3">Unit HT</th>
                      <th className="text-right px-4 py-3">Total HT</th>
                      <th className="text-right px-4 py-3">VAT</th>
                      <th className="text-right px-6 py-3">Total TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: '#1F2937' }}>
                    {lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-3" style={{ color: '#F9FAFB' }}>{item.description || '—'}</td>
                        <td className="px-4 py-3 text-right" style={{ color: '#9CA3AF' }}>{item.quantity ?? '—'}</td>
                        <td className="px-4 py-3 text-right" style={{ color: '#9CA3AF' }}>{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-3 text-right" style={{ color: '#F9FAFB' }}>{formatCurrency(item.total_ht)}</td>
                        <td className="px-4 py-3 text-right" style={{ color: '#9CA3AF' }}>{item.vat_rate ? `${item.vat_rate}%` : '—'}</td>
                        <td className="px-6 py-3 text-right font-semibold" style={{ color: '#10B981' }}>{formatCurrency(item.total_ttc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Validation history */}
          {validations.length > 0 && (
            <div className="rounded-2xl border p-6" style={{ background: '#111827', borderColor: '#1F2937' }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: '#F9FAFB' }}>Validation History</h2>
              <div className="space-y-3">
                {validations.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-xl p-4 text-sm border"
                    style={
                      v.decision === 'approved'
                        ? { background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.25)' }
                        : { background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }
                    }
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold capitalize" style={{ color: '#F9FAFB' }}>{v.validator_name}</span>
                      <span className="text-xs font-semibold" style={{ color: v.decision === 'approved' ? '#10B981' : '#EF4444' }}>
                        {v.decision === 'approved' ? '✓ Approved' : '✗ Rejected'}
                      </span>
                    </div>
                    {v.comment && (
                      <p className="text-xs mt-1 italic" style={{ color: '#9CA3AF' }}>&ldquo;{v.comment}&rdquo;</p>
                    )}
                    <p className="text-xs mt-1.5" style={{ color: '#9CA3AF' }}>{formatDate(v.validated_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation action panel */}
          {canValidate && (
            <div
              className="rounded-2xl border-2 p-6"
              style={{ background: '#111827', borderColor: 'rgba(245,158,11,0.4)' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#F59E0B' }} />
                <h2 className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>
                  Action required — {validatorLabel}
                </h2>
              </div>
              <p className="text-xs mb-5" style={{ color: '#9CA3AF' }}>
                Compare the extracted data with the original PDF before validating.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: '#9CA3AF' }}>Your name</label>
                  <input
                    type="text"
                    value={validatorName}
                    onChange={(e) => setValidatorName(e.target.value)}
                    placeholder={validatorLabel}
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    style={{ background: '#0A0F1E', border: '1px solid #374151', color: '#F9FAFB' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: '#9CA3AF' }}>Comment (optional)</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                    placeholder="Add a note…"
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none"
                    style={{ background: '#0A0F1E', border: '1px solid #374151', color: '#F9FAFB' }}
                  />
                </div>

                {message && (
                  <div
                    className="text-sm font-medium px-4 py-3 rounded-xl"
                    style={
                      message.ok
                        ? { background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }
                        : { background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }
                    }
                  >
                    {message.text}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={() => handleValidation('approved')}
                    disabled={submitting}
                    className="font-semibold py-3 rounded-xl text-sm text-white disabled:opacity-50"
                    style={{ background: '#10B981' }}
                  >
                    {submitting ? '…' : '✓ Approve'}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={submitting}
                    className="font-semibold py-3 rounded-xl text-sm text-white disabled:opacity-50"
                    style={{ background: '#EF4444' }}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — PDF */}
        <div
          className="rounded-2xl border overflow-hidden sticky top-24 self-start"
          style={{ background: '#111827', borderColor: '#1F2937' }}
        >
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1F2937' }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Original Invoice</h2>
              <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>PDF document</p>
            </div>
            {invoice.pdf_url && (
              <a
                href={invoice.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium flex items-center gap-1"
                style={{ color: '#10B981' }}
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
            <div className="flex flex-col items-center justify-center h-64" style={{ color: '#9CA3AF' }}>
              <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="mb-3 opacity-40">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-sm">No PDF available</p>
            </div>
          )}
        </div>
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="rounded-2xl border p-6 w-full max-w-md"
            style={{ background: '#111827', borderColor: '#374151' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold mb-1" style={{ color: '#F9FAFB' }}>Reject Invoice</h3>
            <p className="text-sm mb-5" style={{ color: '#9CA3AF' }}>Please provide a reason for rejecting this invoice.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: '#9CA3AF' }}>Your name</label>
                <input
                  type="text"
                  value={validatorName}
                  onChange={e => setValidatorName(e.target.value)}
                  placeholder={validatorLabel}
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  style={{ background: '#0A0F1E', border: '1px solid #374151', color: '#F9FAFB' }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: '#9CA3AF' }}>Reason for rejection</label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                  placeholder="Explain why this invoice is rejected…"
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none"
                  style={{ background: '#0A0F1E', border: '1px solid #374151', color: '#F9FAFB' }}
                />
              </div>
              {message && !message.ok && (
                <p className="text-sm" style={{ color: '#EF4444' }}>{message.text}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => handleValidation('rejected')}
                  disabled={submitting}
                  className="flex-1 font-semibold py-2.5 rounded-xl text-sm text-white disabled:opacity-50"
                  style={{ background: '#EF4444' }}
                >
                  {submitting ? '…' : 'Confirm Rejection'}
                </button>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-5 py-2.5 text-sm rounded-xl border"
                  style={{ color: '#9CA3AF', borderColor: '#374151' }}
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

function DarkInfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs mb-0.5" style={{ color: '#9CA3AF' }}>{label}</p>
      <p className="font-medium" style={{ color: '#F9FAFB' }}>{value}</p>
    </div>
  )
}

function DarkEditField({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1" style={{ color: '#9CA3AF' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
        style={{ background: '#0A0F1E', border: '1px solid #374151', color: '#F9FAFB' }}
      />
    </div>
  )
}
