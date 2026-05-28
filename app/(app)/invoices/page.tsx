import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Invoice } from '@/lib/types'

export const revalidate = 0

const NAVY = '#0C1F52'

const STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending_review:  { label: 'Awaiting Rudy',    color: '#C2410C', bg: '#FFF7ED', dot: '#F97316' },
  pending_placide: { label: 'Awaiting Placide',  color: '#78350F', bg: '#FEF3C7', dot: '#D97706' },
  pending_hitech:  { label: 'Awaiting Dani',     color: '#A16207', bg: '#FEFCE8', dot: '#FACC15' },
  approved:        { label: 'Approved',           color: '#065F46', bg: '#D1FAE5', dot: '#059669' },
  rejected:        { label: 'Rejected',           color: '#991B1B', bg: '#FEE2E2', dot: '#DC2626' },
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
    pending: invoices.filter(i => ['pending_review', 'pending_placide', 'pending_hitech'].includes(i.status)).length,
    approved: invoices.filter(i => i.status === 'approved').length,
    rejected: invoices.filter(i => i.status === 'rejected').length,
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6B7280' }}>Management</p>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Invoices</h1>
        </div>
        <Link
          href="/upload"
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl text-white shadow-sm"
          style={{ background: NAVY }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Upload Invoice
        </Link>
      </div>

      {/* Pill filters */}
      <div className="flex gap-3 flex-wrap">
        <Pill label="All" count={counts.all} active />
        <Pill label="Pending" count={counts.pending} dotColor="#D97706" />
        <Pill label="Approved" count={counts.approved} dotColor="#059669" />
        <Pill label="Rejected" count={counts.rejected} dotColor="#DC2626" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="mb-3">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p className="text-sm font-medium text-gray-400">No invoices yet</p>
            <Link href="/upload" className="mt-3 text-sm font-medium hover:underline" style={{ color: NAVY }}>
              Upload your first invoice →
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-widest">
              <div className="col-span-3">Subcontractor</div>
              <div className="col-span-2">Invoice #</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Amount TTC</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1" />
            </div>
            <div className="divide-y divide-gray-50">
              {invoices.map((inv) => {
                const s = STATUS[inv.status] ?? STATUS.pending_review
                return (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors items-center group"
                  >
                    <div className="col-span-3 min-w-0">
                      <p className="text-sm font-semibold truncate group-hover:text-blue-700 transition-colors" style={{ color: '#111928' }}>
                        {inv.subcontractor_name || '—'}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#6B7280' }}>
                        {inv.category || 'Uncategorised'}
                      </p>
                    </div>
                    <div className="col-span-2 text-sm font-mono" style={{ color: '#6B7280' }}>
                      {inv.invoice_number || '—'}
                    </div>
                    <div className="col-span-2 text-sm" style={{ color: '#6B7280' }}>
                      {formatDate(inv.invoice_date || inv.submitted_at)}
                    </div>
                    <div className="col-span-2 text-sm font-bold tabular-nums" style={{ color: '#111928' }}>
                      {formatCurrency(inv.amount_ttc)}
                    </div>
                    <div className="col-span-2">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: s.bg, color: s.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                        {s.label}
                      </span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <svg className="text-gray-300 group-hover:text-blue-500 transition-colors" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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

function Pill({ label, count, active, dotColor }: {
  label: string; count: number; active?: boolean; dotColor?: string
}) {
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold"
      style={
        active
          ? { background: '#0C1F52', borderColor: '#0C1F52', color: '#fff' }
          : { background: '#fff', borderColor: '#E5E7EB', color: '#374151' }
      }
    >
      {dotColor && !active && (
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
      )}
      {label}
      <span
        className="rounded-full px-1.5 py-0.5 text-xs font-bold"
        style={
          active
            ? { background: 'rgba(255,255,255,0.2)', color: '#fff' }
            : { background: '#F3F4F6', color: '#6B7280' }
        }
      >
        {count}
      </span>
    </span>
  )
}
