'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/format'
import { StatusBadge } from '@/components/StatusBadge'
import type { Invoice, InvoiceLineItem, Validation } from '@/lib/types'

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
      setMessage({ text: 'Veuillez saisir votre nom.', ok: false })
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
      setMessage({ text: decision === 'approved' ? '✓ Facture approuvée avec succès' : '✗ Facture rejetée', ok: decision === 'approved' })
      await load()
    } else {
      const err = await res.json()
      setMessage({ text: `Erreur : ${err.error || 'Veuillez réessayer'}`, ok: false })
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-400 text-sm">Chargement…</div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="p-8">
        <p className="text-red-600 font-medium">Facture introuvable.</p>
      </div>
    )
  }

  const canValidate = ['pending_review', 'pending_placide', 'pending_hitech'].includes(invoice.status)
  const validatorLabel = invoice.status === 'pending_review' ? 'Rudy' : invoice.status === 'pending_placide' ? 'Placide' : 'Hitech'

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <Link href="/contracts" className="hover:text-blue-600 transition-colors">Contrats</Link>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
        <span className="text-slate-700 font-medium truncate">
          {invoice.subcontractor_name || 'Facture'}
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-5">

          {/* Invoice header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {invoice.subcontractor_name || 'Sous-traitant inconnu'}
                </h1>
                {invoice.invoice_number && (
                  <p className="text-sm text-slate-400 mt-0.5">Facture N° {invoice.invoice_number}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={invoice.status} />
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Modifier
                  </button>
                )}
              </div>
            </div>

            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <EditField label="Sous-traitant" value={editData.subcontractor_name || ''} onChange={v => setEditData(p => ({ ...p, subcontractor_name: v }))} />
                  <EditField label="N° Facture" value={editData.invoice_number || ''} onChange={v => setEditData(p => ({ ...p, invoice_number: v }))} />
                  <EditField label="Date" value={editData.invoice_date || ''} onChange={v => setEditData(p => ({ ...p, invoice_date: v }))} type="date" />
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Catégorie</label>
                    <select
                      value={editData.category || ''}
                      onChange={e => setEditData(p => ({ ...p, category: e.target.value as Invoice['category'] }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {['Subcontracting','Travel','Accommodation','Meals','Equipment','Other'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <EditField label="Montant HT (€)" value={String(editData.amount_ht || '')} onChange={v => setEditData(p => ({ ...p, amount_ht: parseFloat(v) }))} type="number" />
                  <EditField label="Taux TVA (%)" value={String(editData.vat_rate || '')} onChange={v => setEditData(p => ({ ...p, vat_rate: parseFloat(v) }))} type="number" />
                  <EditField label="Montant TVA (€)" value={String(editData.amount_tva || '')} onChange={v => setEditData(p => ({ ...p, amount_tva: parseFloat(v) }))} type="number" />
                  <EditField label="Montant TTC (€)" value={String(editData.amount_ttc || '')} onChange={v => setEditData(p => ({ ...p, amount_ttc: parseFloat(v) }))} type="number" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSaveEdit} className="flex-1 bg-blue-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Enregistrer
                  </button>
                  <button onClick={() => { setEditing(false); setEditData(invoice) }} className="px-4 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoField label="Date de facture" value={formatDate(invoice.invoice_date)} />
                <InfoField label="Catégorie" value={invoice.category || '—'} />
                <InfoField label="Taux TVA" value={invoice.vat_rate ? `${invoice.vat_rate}%` : '—'} />
                <InfoField label="Soumis le" value={formatDate(invoice.submitted_at)} />
                {invoice.description && (
                  <div className="col-span-2">
                    <p className="text-xs text-slate-400 mb-1">Description</p>
                    <p className="text-slate-700">{invoice.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Amounts */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Montants</h2>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Montant HT</span>
                <span className="font-medium text-slate-800">{formatCurrency(invoice.amount_ht)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">TVA ({invoice.vat_rate || 0}%)</span>
                <span className="font-medium text-slate-800">{formatCurrency(invoice.amount_tva)}</span>
              </div>
              <div className="border-t border-slate-100 pt-2.5 flex justify-between">
                <span className="font-semibold text-slate-800">Total TTC</span>
                <span className="text-xl font-bold text-slate-900">{formatCurrency(invoice.amount_ttc)}</span>
              </div>
            </div>
          </div>

          {/* Line items */}
          {lineItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-800">Lignes de facture</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      <th className="text-left px-6 py-3">Description</th>
                      <th className="text-right px-4 py-3">Qté</th>
                      <th className="text-right px-4 py-3">PU HT</th>
                      <th className="text-right px-4 py-3">Total HT</th>
                      <th className="text-right px-4 py-3">TVA</th>
                      <th className="text-right px-6 py-3">Total TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {lineItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-slate-700">{item.description || '—'}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{item.quantity ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(item.total_ht)}</td>
                        <td className="px-4 py-3 text-right text-slate-400">{item.vat_rate ? `${item.vat_rate}%` : '—'}</td>
                        <td className="px-6 py-3 text-right font-semibold text-slate-900">{formatCurrency(item.total_ttc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Validation history */}
          {validations.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-4">Historique des validations</h2>
              <div className="space-y-3">
                {validations.map((v) => (
                  <div key={v.id} className={`rounded-xl p-4 text-sm border ${
                    v.decision === 'approved' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold capitalize text-slate-800">{v.validator_name}</span>
                      <span className={`text-xs font-semibold ${v.decision === 'approved' ? 'text-emerald-700' : 'text-red-700'}`}>
                        {v.decision === 'approved' ? '✓ Approuvé' : '✗ Rejeté'}
                      </span>
                    </div>
                    {v.comment && <p className="text-slate-600 text-xs mt-1 italic">&quot;{v.comment}&quot;</p>}
                    <p className="text-slate-400 text-xs mt-1.5">{formatDate(v.validated_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation panel */}
          {canValidate && (
            <div className="bg-white rounded-2xl border-2 border-blue-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <h2 className="text-sm font-semibold text-slate-800">
                  Action requise — {validatorLabel}
                </h2>
              </div>
              <p className="text-xs text-slate-400 mb-5">
                Comparez les données extraites avec le PDF original avant de valider.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Votre nom</label>
                  <input
                    type="text"
                    value={validatorName}
                    onChange={(e) => setValidatorName(e.target.value)}
                    placeholder={validatorLabel}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Commentaire (optionnel)</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                    placeholder="Ajouter une note…"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {message && (
                  <div className={`text-sm font-medium px-4 py-3 rounded-xl ${
                    message.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {message.text}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={() => handleValidation('approved')}
                    disabled={submitting}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
                  >
                    {submitting ? '…' : '✓ Approuver'}
                  </button>
                  <button
                    onClick={() => handleValidation('rejected')}
                    disabled={submitting}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
                  >
                    ✗ Rejeter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN — PDF ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6 self-start">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Facture originale</h2>
              <p className="text-xs text-slate-400 mt-0.5">PDF reçu par email</p>
            </div>
            {invoice.pdf_url && (
              <a
                href={invoice.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Ouvrir
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
              title="Facture PDF"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="mb-3 opacity-30">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-sm">Aucun PDF disponible</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  )
}

function EditField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500 block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
