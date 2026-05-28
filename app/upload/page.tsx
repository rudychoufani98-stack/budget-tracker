'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface ScannedData {
  subcontractor_name: string
  invoice_number: string
  invoice_date: string
  amount_ht: number | null
  amount_tva: number | null
  amount_ttc: number | null
  vat_rate: number | null
  category: string
  description: string
  line_items: {
    description: string
    quantity: number | null
    unit_price: number | null
    total_ht: number | null
    vat_rate: number | null
    total_ttc: number | null
  }[]
}

const CATEGORIES = ['Subcontracting', 'Travel', 'Accommodation', 'Meals', 'Equipment', 'Other']

export default function UploadPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState<ScannedData | null>(null)
  const [contractId, setContractId] = useState('')
  const [contracts, setContracts] = useState<{ id: string; contract_name: string }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'upload' | 'review' | 'done'>('upload')

  // Load contracts on mount
  useState(() => {
    supabase.from('contracts').select('id, contract_name').eq('status', 'active').then(({ data }) => {
      setContracts(data || [])
    })
  })

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f && f.type === 'application/pdf') {
      setFile(f)
      setScanned(null)
      setError('')
    } else {
      setError('Please select a PDF file.')
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f && f.type === 'application/pdf') {
      setFile(f)
      setScanned(null)
      setError('')
    } else {
      setError('Please drop a PDF file.')
    }
  }

  async function scanInvoice() {
    if (!file) return
    setScanning(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/invoices/scan', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Scan failed')
      const data = await res.json()
      setScanned(data)
      setStep('review')
    } catch {
      setError('AI scanning failed. Please check your Claude API key and try again.')
    }
    setScanning(false)
  }

  async function submitForValidation() {
    if (!scanned || !file) return
    setSubmitting(true)
    setError('')
    try {
      // 1. Upload PDF to Supabase Storage
      const ts = Date.now()
      const safeName = file.name.replace(/\s+/g, '_')
      const storagePath = `invoices/${ts}_${safeName}`
      const { error: uploadErr } = await supabase.storage
        .from('invoices')
        .upload(storagePath, file, { contentType: 'application/pdf' })
      if (uploadErr) throw uploadErr

      const { data: urlData } = await supabase.storage
        .from('invoices')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10)
      const pdfUrl = urlData?.signedUrl ?? ''

      // 2. Create invoice record
      const { data: inv, error: invErr } = await supabase
        .from('invoices')
        .insert({
          contract_id: contractId || null,
          subcontractor_name: scanned.subcontractor_name,
          invoice_number: scanned.invoice_number,
          invoice_date: scanned.invoice_date || null,
          amount_ht: scanned.amount_ht,
          amount_tva: scanned.amount_tva,
          amount_ttc: scanned.amount_ttc,
          vat_rate: scanned.vat_rate,
          category: scanned.category,
          description: scanned.description,
          pdf_url: pdfUrl,
          status: 'pending_review',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (invErr) throw invErr

      // 3. Insert line items
      if (scanned.line_items?.length > 0) {
        await supabase.from('invoice_line_items').insert(
          scanned.line_items.map(item => ({ ...item, invoice_id: inv.id }))
        )
      }

      // 4. Notify via API
      await fetch(`/api/invoices/${inv.id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'submitted',
          validator_name: 'System',
          comment: 'Invoice uploaded and scanned automatically',
        }),
      }).catch(() => {})

      setStep('done')
      setTimeout(() => router.push(`/invoices/${inv.id}`), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed. Please try again.')
    }
    setSubmitting(false)
  }

  function updateField(field: keyof ScannedData, value: string | number) {
    if (!scanned) return
    setScanned({ ...scanned, [field]: value })
  }

  // ── STEP: DONE ──
  if (step === 'done') {
    return (
      <div className="p-8 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <svg width="32" height="32" fill="none" stroke="#059669" strokeWidth="2.5" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Invoice Submitted</h2>
        <p className="text-slate-500 text-sm">
          Sent to <strong>Rudy Choufani</strong> for validation. Redirecting…
        </p>
      </div>
    )
  }

  // ── STEP: REVIEW ──
  if (step === 'review' && scanned) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Step 2 of 2</p>
          <h1 className="text-2xl font-bold text-slate-900">Review Extracted Data</h1>
          <p className="text-slate-500 text-sm mt-1">AI has scanned your invoice. Check the data and correct any errors before submitting.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left — editable fields */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Invoice Details</h2>
              <Field label="Subcontractor Name" value={scanned.subcontractor_name} onChange={v => updateField('subcontractor_name', v)} />
              <Field label="Invoice Number" value={scanned.invoice_number} onChange={v => updateField('invoice_number', v)} />
              <Field label="Invoice Date" value={scanned.invoice_date} onChange={v => updateField('invoice_date', v)} type="date" />
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Category</label>
                <select
                  value={scanned.category}
                  onChange={e => updateField('category', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Field label="Description" value={scanned.description} onChange={v => updateField('description', v)} />
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Amounts</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Amount Excl. VAT (€)" value={String(scanned.amount_ht ?? '')} onChange={v => updateField('amount_ht', parseFloat(v) || 0)} type="number" />
                <Field label="VAT Rate (%)" value={String(scanned.vat_rate ?? '')} onChange={v => updateField('vat_rate', parseFloat(v) || 0)} type="number" />
                <Field label="VAT Amount (€)" value={String(scanned.amount_tva ?? '')} onChange={v => updateField('amount_tva', parseFloat(v) || 0)} type="number" />
                <Field label="Total Incl. VAT (€)" value={String(scanned.amount_ttc ?? '')} onChange={v => updateField('amount_ttc', parseFloat(v) || 0)} type="number" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Link to Contract</h2>
              <select
                value={contractId}
                onChange={e => setContractId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">— Select a contract (optional) —</option>
                {contracts.map(c => (
                  <option key={c.id} value={c.id}>{c.contract_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Right — line items */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden self-start">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Line Items</h2>
              <p className="text-xs text-slate-400 mt-0.5">{scanned.line_items?.length || 0} item(s) detected</p>
            </div>
            {!scanned.line_items?.length ? (
              <p className="text-sm text-slate-400 p-6 text-center">No line items detected</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-semibold uppercase tracking-wide">
                      <th className="text-left px-4 py-3">Description</th>
                      <th className="text-right px-3 py-3">Qty</th>
                      <th className="text-right px-3 py-3">Unit</th>
                      <th className="text-right px-4 py-3">Total HT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {scanned.line_items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-slate-700">{item.description || '—'}</td>
                        <td className="px-3 py-3 text-right text-slate-500">{item.quantity ?? '—'}</td>
                        <td className="px-3 py-3 text-right text-slate-500">
                          {item.unit_price != null ? `€${item.unit_price}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {item.total_ht != null ? `€${item.total_ht}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 font-medium">
            {error}
          </div>
        )}

        {/* Validation chain preview */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Approval Chain</p>
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { step: '1', name: 'Rudy Choufani', role: 'Invoice Review', active: true },
              { step: '2', name: 'Placide', role: 'Manager Approval', active: false },
              { step: '3', name: 'Hitech', role: 'Final Approval', active: false },
            ].map(({ step, name, role, active }, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm ${
                  active ? 'bg-blue-700 border-blue-700 text-white' : 'bg-white border-slate-200 text-slate-500'
                }`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>{step}</span>
                  <div>
                    <p className="font-semibold leading-none">{name}</p>
                    <p className={`text-xs mt-0.5 ${active ? 'text-blue-200' : 'text-slate-400'}`}>{role}</p>
                  </div>
                </div>
                {i < 2 && (
                  <svg width="16" height="16" fill="none" stroke="#CBD5E1" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep('upload')}
            className="px-5 py-3 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={submitForValidation}
            disabled={submitting}
            className="flex-1 disabled:opacity-60 text-white text-sm font-bold py-3 rounded-xl transition-opacity hover:opacity-90 shadow-sm"
            style={{ background: '#0C1F52' }}
          >
            {submitting ? 'Submitting…' : 'Submit to Rudy for Validation →'}
          </button>
        </div>
      </div>
    )
  }

  // ── STEP: UPLOAD ──
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Step 1 of 2</p>
        <h1 className="text-2xl font-bold text-slate-900">Upload Invoice</h1>
        <p className="text-slate-500 text-sm mt-1">Upload a PDF and our AI will extract all data automatically.</p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
          file ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
        }`}
      >
        <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={onFileChange} />
        {file ? (
          <div>
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg width="28" height="28" fill="none" stroke="#1D4ED8" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="font-semibold text-blue-800 text-sm">{file.name}</p>
            <p className="text-xs text-blue-500 mt-1">{(file.size / 1024).toFixed(0)} KB — Click to change</p>
          </div>
        ) : (
          <div>
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg width="28" height="28" fill="none" stroke="#94A3B8" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="font-semibold text-slate-700 text-sm">Drop your PDF here</p>
            <p className="text-xs text-slate-400 mt-1">or click to browse files</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 font-medium">
          {error}
        </div>
      )}

      {/* AI scan info */}
      <div className="bg-slate-900 rounded-2xl p-5 text-white">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">What AI extracts</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {['Subcontractor name', 'Invoice number & date', 'All line items', 'Total excl. VAT', 'VAT rate & amount', 'Total incl. VAT', 'Category detection', 'Description'].map(item => (
            <div key={item} className="flex items-center gap-2 text-slate-300">
              <svg width="12" height="12" fill="none" stroke="#22C55E" strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {item}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={scanInvoice}
        disabled={!file || scanning}
        className="w-full disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-sm transition-opacity hover:opacity-90 shadow-sm flex items-center justify-center gap-2"
        style={{ background: '#0C1F52' }}
      >
        {scanning ? (
          <>
            <svg className="animate-spin" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Scanning with AI…
          </>
        ) : (
          <>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Scan Invoice with AI →
          </>
        )}
      </button>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />
    </div>
  )
}
