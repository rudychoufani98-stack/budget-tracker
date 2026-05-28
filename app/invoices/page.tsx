import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Invoice } from '@/lib/types'

export const revalidate = 0

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending_review:  { label: 'Awaiting Rudy',    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  pending_placide: { label: 'Awaiting Placide',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  pending_hitech:  { label: 'Awaiting Hitech',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  approved:        { label: 'Approved',           color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  rejected:        { label: 'Rejected',           color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
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
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>
            Management
          </p>
          <h1 className="text-2xl font-bold" style={{ color: '#F9FAFB' }}>Invoices</h1>
        </div>
        <Link
          href="/upload"
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl"
          style={{ background: '#10B981', color: '#fff' }}
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
        <Pill label="Pending" count={counts.pending} color="#F59E0B" />
        <Pill label="Approved" count={counts.approved} color="#10B981" />
        <Pill label="Rejected" count={counts.rejected} color="#EF4444" />
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: '#111827', borderColor: '#1F2937' }}>
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20" style={{ color: '#9CA3AF' }}>
            <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="mb-3">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p className="text-sm font-medium mb-3">No invoices yet</p>
            <Link href="/upload" className="text-sm font-medium" style={{ color: '#10B981' }}>
              Upload your first invoice →
            </Link>
          </div>
        ) : (
          <>
            {/* Header row */}
            <div
              className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-widest border-b"
              style={{ background: '#0A0F1E', borderColor: '#1F2937', color: '#9CA3AF' }}
            >
              <div className="col-span-3">Subcontractor</div>
              <div className="col-span-2">Invoice #</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Amount TTC</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1" />
            </div>

            {/* Rows */}
            <div className="divide-y" style={{ borderColor: '#1F2937' }}>
              {invoices.map((inv) => {
                const s = STATUS[inv.status] ?? STATUS.pending_review
                return (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center group"
                    style={{ transition: 'background 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="col-span-3 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#F9FAFB' }}>
                        {inv.subcontractor_name || '—'}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#9CA3AF' }}>
                        {inv.category || 'Uncategorised'}
                      </p>
                    </div>
                    <div className="col-span-2 text-sm font-mono" style={{ color: '#9CA3AF' }}>
                      {inv.invoice_number || '—'}
                    </div>
                    <div className="col-span-2 text-sm" style={{ color: '#9CA3AF' }}>
                      {formatDate(inv.invoice_date || inv.submitted_at)}
                    </div>
                    <div className="col-span-2 text-sm font-bold tabular-nums" style={{ color: '#F9FAFB' }}>
                      {formatCurrency(inv.amount_ttc)}
                    </div>
                    <div className="col-span-2">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: s.bg, color: s.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                        {s.label}
                      </span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: '#9CA3AF' }}>
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

function Pill({
  label, count, active, color,
}: {
  label: string; count: number; active?: boolean; color?: string
}) {
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold"
      style={
        active
          ? { background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.3)', color: '#10B981' }
          : { background: '#111827', borderColor: '#1F2937', color: color || '#9CA3AF' }
      }
    >
      {label}
      <span
        className="rounded-full px-1.5 py-0.5 text-xs font-bold"
        style={
          active
            ? { background: '#10B981', color: '#fff' }
            : { background: '#1F2937', color: color || '#9CA3AF' }
        }
      >
        {count}
      </span>
    </span>
  )
}
