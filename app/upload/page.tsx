'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'

interface ScannedData {
  subcontractor_name: string
  invoice_number: string
  invoice_date: string
  currency: string
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

const NAVY = '#0C1F52'
const CATEGORIES = ['Subcontracting', 'Travel', 'Accommodation', 'Meals', 'Equipment', 'Other']
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'MAD', 'XOF', 'NGN', 'CAD', 'AED', 'JPY', 'Other']

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', CHF: 'Fr', MAD: 'MAD', XOF: 'FCFA',
  NGN: '₦', CAD: 'CA$', AED: 'AED', JPY: '¥', Other: ''
}
function currencySymbol(code: string) {
  return CURRENCY_SYMBOLS[code] ?? code
}

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

  useEffect(() => {
    supabase.from('contracts').select('id, contract_name').eq('status', 'active').then(({ data }) => {
      setContracts(data || [])
    })
  }, [])

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f && f.type === 'application/pdf') { setFile(f); setScanned(null); setError('') }
    else setError('Please select a PDF file.')
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f && f.type === 'application/pdf') { setFile(f); setScanned(null); setError('') }
    else setError('Please drop a PDF file.')
  }

  async function scanInvoice() {
    if (!file) return
    setScanning(true); setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/invoices/scan', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scan failed')
      setScanned(data)
      setStep('review')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'AI scanning failed. Please try again.')
    }
    setScanning(false)
  }

  async function submitForValidation() {
    if (!scanned || !file) return
    setSubmitting(true); setError('')
    try {
      const ts = Date.now()
      const storagePath = `invoices/${ts}_${file.name.replace(/\s+/g, '_')}`

      // Upload via server API (uses admin key, bypasses RLS)
      const uploadForm = new FormData()
      uploadForm.append('file', file)
      uploadForm.append('path', storagePath)
      const uploadRes = await fetch('/api/storage/upload', { method: 'POST', body: uploadForm })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed')
      const pdfUrl = uploadData.signedUrl ?? ''

      const { data: inv, error: invErr } = await supabase
        .from('invoices')
        .insert({
          contract_id: contractId || null,
          subcontractor_name: scanned.subcontractor_name,
          invoice_number: scanned.invoice_number,
          invoice_date: scanned.invoice_date || null,
          currency: scanned.currency || 'EUR',
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
        .select().single()
      if (invErr) throw invErr

      if (scanned.line_items?.length > 0) {
        await supabase.from('invoice_line_items').insert(scanned.line_items.map(item => ({ ...item, invoice_id: inv.id })))
      }

      await fetch(`/api/invoices/${inv.id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'submitted', validator_name: 'System', comment: 'Invoice uploaded and scanned automatically' }),
      }).catch(() => {})

      setStep('done')
      setTimeout(() => router.push(`/invoices/${inv.id}`), 2000)
    } catch (e: unknown) {
      const msg = e instanceof Error
        ? e.message
        : (e as { message?: string })?.message ?? JSON.stringify(e)
      console.error('Submit error:', e)
      setError(`Error: ${msg}`)
    }
    setSubmitting(false)
  }

  function updateField(field: keyof ScannedData, value: string | number) {
    if (!scanned) return
    setScanned({ ...scanned, [field]: value })
  }

  // DONE
  if (step === 'done') {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5 bg-emerald-100">
          <svg width="32" height="32" fill="none" stroke="#059669" strokeWidth="2.5" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: NAVY }}>Invoice Submitted</h2>
        <p className="text-sm text-gray-500">
          Sent to <strong className="text-gray-800">Rudy Choufani</strong> for validation. Redirecting…
        </p>
      </div>
    )
  }

  // REVIEW
  if (step === 'review' && scanned) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-gray-400">Step 2 of 2</p>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Review Extracted Data</h1>
          <p className="text-sm text-gray-500 mt-1">AI has scanned your invoice. Check the data and correct any errors before submitting.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Invoice Details</h2>
              <LightField label="Subcontractor Name" value={scanned.subcontractor_name} onChange={v => updateField('subcontractor_name', v)} />
              <LightField label="Invoice Number" value={scanned.invoice_number} onChange={v => updateField('invoice_number', v)} />
              <LightField label="Invoice Date" value={scanned.invoice_date} onChange={v => updateField('invoice_date', v)} type="date" />
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 block mb-1.5">Currency</label>
                <select
                  value={scanned.currency || 'EUR'}
                  onChange={e => updateField('currency', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 block mb-1.5">Category</label>
                <select
                  value={scanned.category}
                  onChange={e => updateField('category', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <LightField label="Description" value={scanned.description} onChange={v => updateField('description', v)} />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Amounts</h2>
              <div className="grid grid-cols-2 gap-4">
                <LightField label={`Excl. VAT (${currencySymbol(scanned.currency || 'EUR')})`} value={String(scanned.amount_ht ?? '')} onChange={v => updateField('amount_ht', parseFloat(v) || 0)} type="number" />
                <LightField label="VAT Rate (%)" value={String(scanned.vat_rate ?? '')} onChange={v => updateField('vat_rate', parseFloat(v) || 0)} type="number" />
                <LightField label={`VAT Amount (${currencySymbol(scanned.currency || 'EUR')})`} value={String(scanned.amount_tva ?? '')} onChange={v => updateField('amount_tva', parseFloat(v) || 0)} type="number" />
                <LightField label={`Total incl. VAT (${currencySymbol(scanned.currency || 'EUR')})`} value={String(scanned.amount_ttc ?? '')} onChange={v => updateField('amount_ttc', parseFloat(v) || 0)} type="number" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Link to Contract</h2>
              <select
                value={contractId}
                onChange={e => setContractId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">— Select a contract (optional) —</option>
                {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_name}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden self-start">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Line Items</h2>
              <p className="text-xs text-gray-400 mt-0.5">{scanned.line_items?.length || 0} item(s) detected</p>
            </div>
            {!scanned.line_items?.length ? (
              <p className="text-sm text-gray-400 p-6 text-center">No line items detected</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 font-semibold uppercase tracking-wide">
                      <th className="text-left px-4 py-3">Description</th>
                      <th className="text-right px-3 py-3">Qty</th>
                      <th className="text-right px-3 py-3">Unit</th>
                      <th className="text-right px-4 py-3">Total HT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {scanned.line_items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-gray-700">{item.description || '—'}</td>
                        <td className="px-3 py-3 text-right text-gray-500">{item.quantity ?? '—'}</td>
                        <td className="px-3 py-3 text-right text-gray-500">{item.unit_price != null ? `€${item.unit_price}` : '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold" style={{ color: NAVY }}>{item.total_ht != null ? `€${item.total_ht}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 font-medium">{error}</div>
        )}

        {/* Approval chain */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Approval Chain</p>
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { step: '1', name: 'Rudy Choufani', role: 'Invoice Review', active: true },
              { step: '2', name: 'Placide', role: 'Manager Approval', active: false },
              { step: '3', name: 'Hitech', role: 'Final Approval', active: false },
            ].map(({ step, name, role, active }, i) => (
              <div key={step} className="flex items-center gap-3">
                <div
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm"
                  style={
                    active
                      ? { background: NAVY, borderColor: NAVY, color: '#fff' }
                      : { background: '#fff', borderColor: '#E5E7EB', color: '#6B7280' }
                  }
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={active ? { background: 'rgba(255,255,255,0.25)', color: '#fff' } : { background: '#F3F4F6', color: '#6B7280' }}
                  >
                    {step}
                  </span>
                  <div>
                    <p className="font-semibold leading-none">{name}</p>
                    <p className="text-xs mt-0.5" style={{ color: active ? 'rgba(255,255,255,0.6)' : '#9CA3AF' }}>{role}</p>
                  </div>
                </div>
                {i < 2 && (
                  <svg width="16" height="16" fill="none" stroke="#D1D5DB" strokeWidth="2" viewBox="0 0 24 24">
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
            className="px-5 py-3 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={submitForValidation}
            disabled={submitting}
            className="flex-1 disabled:opacity-50 text-white text-sm font-bold py-3 rounded-xl"
            style={{ background: NAVY }}
          >
            {submitting ? 'Submitting…' : 'Submit to Rudy for Validation →'}
          </button>
        </div>
      </div>
    )
  }

  // UPLOAD
  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-gray-400">Step 1 of 2</p>
        <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Upload Invoice</h1>
        <p className="text-sm text-gray-500 mt-1">Upload a PDF and our AI will extract all data automatically.</p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all"
        style={file ? { borderColor: NAVY, background: '#EFF6FF' } : { borderColor: '#D1D5DB', background: '#fff' }}
        onMouseEnter={e => { if (!file) (e.currentTarget as HTMLElement).style.borderColor = NAVY }}
        onMouseLeave={e => { if (!file) (e.currentTarget as HTMLElement).style.borderColor = '#D1D5DB' }}
      >
        <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={onFileChange} />
        {file ? (
          <div>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: '#DBEAFE' }}>
              <svg width="28" height="28" fill="none" stroke={NAVY} strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="font-semibold text-sm" style={{ color: NAVY }}>{file.name}</p>
            <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(0)} KB — Click to change</p>
          </div>
        ) : (
          <div>
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg width="28" height="28" fill="none" stroke="#9CA3AF" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="font-semibold text-gray-700 text-sm">Drop your PDF here</p>
            <p className="text-xs text-gray-400 mt-1">or click to browse files</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 font-medium">{error}</div>
      )}

      {/* What AI extracts */}
      <div className="rounded-2xl p-5 text-white" style={{ background: NAVY }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3 opacity-60">What AI extracts</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {['Subcontractor name', 'Invoice number & date', 'All line items', 'Total excl. VAT', 'VAT rate & amount', 'Total incl. VAT', 'Category detection', 'Description'].map(item => (
            <div key={item} className="flex items-center gap-2 opacity-80">
              <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
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
        className="w-full disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2"
        style={{ background: NAVY }}
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

function LightField({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 block mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />
    </div>
  )
}
