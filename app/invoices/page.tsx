import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Invoice } from '@/lib/types'

export const revalidate = 0

const STATUS_CONFIG = {
  pending_review:  { label: 'Awaiting Rudy',    dot: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  pending_placide: { label: 'Awaiting Placide',  dot: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  pending_hitech:  { label: 'Awaiting Hitech',   dot: 'bg-purple-400', text: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  approved:        { label: 'Approved',           dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  rejected:        { label: 'Rejected',           dot: 'bg-red-400', text: 'text-red-700', bg: 'bg-red-50 border-red-200' },
}

async function getInvoices() {
  const { data } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })
  return (data || []) as Invoice[]
}

export default async function InvoicesPage() {
  const invoices = await getInvoices()

  const counts = {
    all: invoices.length,
    pending: invoices.filter(i => ['pending_review','pending_placide','pending_hitech'].includes(i.status)).length,
    approved: invoices.filter(i => i.status === 'approved').length,
    rejected: invoices.filter(i => i.status === 'rejected').length,
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Management</p>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        </div>
        <Link
          href="/upload"
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-opacity hover:opacity-90 shadow-sm"
          style={{ background: '#0C1F52' }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Upload Invoice
        </Link>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        <Pill label="All" count={counts.all} active />
        <Pill label="Pending" count={counts.pending} color="text-amber-700 bg-amber-50 border-amber-200" />
        <Pill label="Approved" count={counts.approved} color="text-emerald-700 bg-emerald-50 border-emerald-200" />
        <Pill label="Rejected" count={counts.rejected} color="text-red-700 bg-red-50 border-red-200" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="mb-4">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p className="text-sm font-medium text-slate-400">No invoices yet</p>
            <Link href="/upload" className="mt-3 text-sm text-blue-600 hover:underline font-medium">
              Upload your first invoice →
            </Link>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-widest">
              <div className="col-span-3">Subcontractor</div>
              <div className="col-span-2">Invoice #</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Amount TTC</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1"></div>
            </div>
            {/* Table rows */}
            <div className="divide-y divide-slate-50">
              {invoices.map((inv) => {
                const s = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.pending_review
                return (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-50 transition-colors items-center group"
                  >
                    <div className="col-span-3">
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                        {inv.subcontractor_name || '—'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{inv.category || 'Uncategorised'}</p>
                    </div>
                    <div className="col-span-2 text-sm text-slate-600 font-mono">
                      {inv.invoice_number || '—'}
                    </div>
                    <div className="col-span-2 text-sm text-slate-600">
                      {formatDate(inv.invoice_date || inv.submitted_at)}
                    </div>
                    <div className="col-span-2 text-sm font-bold text-slate-900 tabular-nums">
                      {formatCurrency(inv.amount_ttc)}
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${s.bg} ${s.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <svg className="text-slate-300 group-hover:text-blue-500 transition-colors" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Pill({ label, count, active, color }: { label: string; count: number; active?: boolean; color?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
      active
        ? 'text-white border-[#0C1F52]'
        : color || 'bg-white text-slate-600 border-slate-200'
    }`}>
      {label}
      <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${active ? 'bg-blue-600' : 'bg-slate-100 text-slate-500'}`}>
        {count}
      </span>
    </span>
  )
}
