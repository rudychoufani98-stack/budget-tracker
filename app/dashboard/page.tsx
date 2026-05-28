import Link from 'next/link'
import { getDashboardStats, getContractBudgets, getRecentInvoices, getPendingValidations } from '@/lib/queries'
import { formatCurrency, formatDate } from '@/lib/format'
import { SpendBarChart } from '@/components/charts/SpendBarChart'
import { ContractDonutChart } from '@/components/charts/ContractDonutChart'

export const revalidate = 0

const STATUS: Record<string, { label: string; color: string; dot: string }> = {
  pending_review:  { label: 'Awaiting Rudy',    color: '#F59E0B', dot: '#F59E0B' },
  pending_placide: { label: 'Awaiting Placide',  color: '#F59E0B', dot: '#F59E0B' },
  pending_hitech:  { label: 'Awaiting Hitech',   color: '#8B5CF6', dot: '#8B5CF6' },
  approved:        { label: 'Approved',           color: '#10B981', dot: '#10B981' },
  rejected:        { label: 'Rejected',           color: '#EF4444', dot: '#EF4444' },
}

export default async function DashboardPage() {
  const [stats, contractBudgets, recentInvoices, pendingValidations] = await Promise.all([
    getDashboardStats(),
    getContractBudgets(),
    getRecentInvoices(5),
    getPendingValidations(),
  ])

  const pct = stats.totalBudget
    ? Math.min(Math.round((stats.totalSpent / stats.totalBudget) * 100), 100)
    : 0
  const pendingTotal = stats.pendingRudy + stats.pendingPlacide + stats.pendingHitech

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>
            Overview
          </p>
          <h1 className="text-2xl font-bold" style={{ color: '#F9FAFB' }}>Financial Dashboard</h1>
        </div>
        <Link
          href="/upload"
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm"
          style={{ background: '#10B981', color: '#fff' }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Upload Invoice
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Budget"
          value={formatCurrency(stats.totalBudget)}
          sub="Active contracts"
          icon={<BudgetIcon />}
        />
        <KpiCard
          label="Total Spent"
          value={formatCurrency(stats.totalSpent)}
          sub={`${pct}% consumed`}
          icon={<SpentIcon />}
          accent
        />
        <KpiCard
          label="Remaining"
          value={formatCurrency(stats.totalRemaining)}
          sub={stats.totalRemaining < 0 ? 'Over budget' : 'Available'}
          icon={<RemainingIcon />}
          positive={stats.totalRemaining >= 0}
          danger={stats.totalRemaining < 0}
        />
        <KpiCard
          label="Pending Approval"
          value={String(pendingTotal)}
          sub={`${stats.pendingRudy} · ${stats.pendingPlacide} · ${stats.pendingHitech}`}
          icon={<PendingIcon />}
          warn
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly spend */}
        <div className="rounded-2xl border p-6" style={{ background: '#111827', borderColor: '#1F2937' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>
            Monthly Spend
          </p>
          <p className="text-sm font-semibold mb-6" style={{ color: '#F9FAFB' }}>
            Last 6 months — approved invoices
          </p>
          <div style={{ height: 180 }}>
            <SpendBarChart data={stats.monthlyData} />
          </div>
        </div>

        {/* Budget per contract donut */}
        <div className="rounded-2xl border p-6" style={{ background: '#111827', borderColor: '#1F2937' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>
            Budget by Contract
          </p>
          <p className="text-sm font-semibold mb-6" style={{ color: '#F9FAFB' }}>
            Consumption by active contract
          </p>
          <div style={{ height: 180 }}>
            <ContractDonutChart data={contractBudgets} />
          </div>
        </div>
      </div>

      {/* Budget bar */}
      <div className="rounded-2xl border p-6" style={{ background: '#111827', borderColor: '#1F2937' }}>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>
              Overall Budget Consumption
            </p>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              <span className="font-bold" style={{ color: '#F9FAFB' }}>{formatCurrency(stats.totalSpent)}</span>
              {' '}spent of {formatCurrency(stats.totalBudget)}
            </p>
          </div>
          <span
            className="text-4xl font-bold tabular-nums"
            style={{ color: pct >= 90 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#10B981' }}
          >
            {pct}<span className="text-2xl">%</span>
          </span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: '#1F2937' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: pct >= 90 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#10B981',
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs" style={{ color: '#9CA3AF' }}>
          <span>€0</span>
          <span>{formatCurrency(stats.totalBudget)}</span>
        </div>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent invoices */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: '#111827', borderColor: '#1F2937' }}>
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1F2937' }}>
            <p className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Recent Invoices</p>
            <Link href="/invoices" className="text-xs font-medium" style={{ color: '#10B981' }}>
              View all →
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <EmptyState message="No invoices yet" />
          ) : (
            <div className="divide-y" style={{ borderColor: '#1F2937' }}>
              {recentInvoices.map((inv) => {
                const s = STATUS[inv.status] ?? STATUS.pending_review
                return (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between px-6 py-3.5 group"
                    style={{ transition: 'background 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#F9FAFB' }}>
                        {inv.subcontractor_name || '—'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                        {inv.invoice_number || 'No number'} · {formatDate(inv.invoice_date || inv.submitted_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-sm font-bold tabular-nums" style={{ color: '#F9FAFB' }}>
                        {formatCurrency(inv.amount_ttc)}
                      </span>
                      <StatusDot color={s.dot} label={s.label} />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Pending validations */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: '#111827', borderColor: '#1F2937' }}>
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1F2937' }}>
            <p className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Pending Validations</p>
            {pendingValidations.length > 0 && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}
              >
                {pendingValidations.length}
              </span>
            )}
          </div>
          {pendingValidations.length === 0 ? (
            <EmptyState message="All invoices are processed" icon="check" />
          ) : (
            <div className="divide-y" style={{ borderColor: '#1F2937' }}>
              {pendingValidations.slice(0, 5).map((inv) => {
                const s = STATUS[inv.status] ?? STATUS.pending_review
                return (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between px-6 py-3.5"
                    style={{ transition: 'background 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#F9FAFB' }}>
                        {inv.subcontractor_name || '—'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                        {formatDate(inv.submitted_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-sm font-bold tabular-nums" style={{ color: '#F9FAFB' }}>
                        {formatCurrency(inv.amount_ttc)}
                      </span>
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={{ background: `${s.dot}18`, color: s.color }}
                      >
                        {s.label}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* VAT Summary */}
      <div className="rounded-2xl border p-6" style={{ background: '#111827', borderColor: '#1F2937' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>
          VAT Summary
        </p>
        <p className="text-sm font-semibold mb-5" style={{ color: '#F9FAFB' }}>
          Current quarter — approved invoices
        </p>
        <div className="grid grid-cols-3 gap-4">
          <VatCard label="Total Excl. VAT" value={formatCurrency(stats.vatSummary.totalHT)} />
          <VatCard label="Recoverable VAT" value={formatCurrency(stats.vatSummary.totalTVA)} accent />
          <VatCard label="Total Incl. VAT" value={formatCurrency(stats.vatSummary.totalTTC)} />
        </div>
      </div>

    </div>
  )
}

function KpiCard({
  label, value, sub, icon, accent, positive, danger, warn,
}: {
  label: string; value: string; sub: string; icon: React.ReactNode
  accent?: boolean; positive?: boolean; danger?: boolean; warn?: boolean
}) {
  const valueColor = accent ? '#10B981' : danger ? '#EF4444' : positive ? '#10B981' : warn ? '#F59E0B' : '#F9FAFB'
  return (
    <div className="rounded-2xl border p-5" style={{ background: '#111827', borderColor: '#1F2937' }}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>{label}</p>
        <div style={{ color: '#9CA3AF' }}>{icon}</div>
      </div>
      <p className="text-2xl font-bold tabular-nums" style={{ color: valueColor }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{sub}</p>
    </div>
  )
}

function VatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className="rounded-xl p-5 text-center"
      style={accent
        ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }
        : { background: '#1F2937' }
      }
    >
      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: accent ? '#10B981' : '#9CA3AF' }}>
        {label}
      </p>
      <p className="text-xl font-bold tabular-nums" style={{ color: accent ? '#10B981' : '#F9FAFB' }}>
        {value}
      </p>
    </div>
  )
}

function StatusDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
    </span>
  )
}

function EmptyState({ message, icon = 'doc' }: { message: string; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12" style={{ color: '#9CA3AF' }}>
      {icon === 'check' ? (
        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="mb-3" style={{ color: '#10B981' }}>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : (
        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="mb-3">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )}
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}

function BudgetIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  )
}

function SpentIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function RemainingIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}

function PendingIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
