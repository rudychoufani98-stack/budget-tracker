import Link from 'next/link'
import { getDashboardStats, getContractBudgets, getRecentInvoices, getPendingValidations } from '@/lib/queries'
import { formatCurrency, formatDate } from '@/lib/format'
import { SpendBarChart } from '@/components/charts/SpendBarChart'
import { ContractDonutChart } from '@/components/charts/ContractDonutChart'

export const revalidate = 0

const NAVY = '#0C1F52'

const STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending_review:  { label: 'Awaiting Rudy',    color: '#92400E', bg: '#FEF3C7', dot: '#D97706' },
  pending_placide: { label: 'Awaiting Placide',  color: '#92400E', bg: '#FEF3C7', dot: '#D97706' },
  pending_hitech:  { label: 'Awaiting Hitech',   color: '#5B21B6', bg: '#EDE9FE', dot: '#7C3AED' },
  approved:        { label: 'Approved',           color: '#065F46', bg: '#D1FAE5', dot: '#059669' },
  rejected:        { label: 'Rejected',           color: '#991B1B', bg: '#FEE2E2', dot: '#DC2626' },
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6B7280' }}>
            Overview
          </p>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Financial Dashboard</h1>
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

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Budget" value={formatCurrency(stats.totalBudget)} sub="Active contracts" icon={<BudgetIcon />} />
        <KpiCard label="Total Spent" value={formatCurrency(stats.totalSpent)} sub={`${pct}% consumed`} icon={<SpentIcon />} navy />
        <KpiCard label="Remaining" value={formatCurrency(stats.totalRemaining)} sub={stats.totalRemaining < 0 ? 'Over budget' : 'Available'} icon={<RemainingIcon />} positive={stats.totalRemaining >= 0} danger={stats.totalRemaining < 0} />
        <KpiCard label="Pending Approval" value={String(pendingTotal)} sub={`${stats.pendingRudy} · ${stats.pendingPlacide} · ${stats.pendingHitech}`} icon={<PendingIcon />} warn />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6B7280' }}>Monthly Spend</p>
          <p className="text-sm font-semibold mb-6" style={{ color: NAVY }}>Last 6 months — approved invoices</p>
          <div style={{ height: 180 }}>
            <SpendBarChart data={stats.monthlyData} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6B7280' }}>Budget by Contract</p>
          <p className="text-sm font-semibold mb-6" style={{ color: NAVY }}>Consumption by active contract</p>
          <div style={{ height: 180 }}>
            <ContractDonutChart data={contractBudgets} />
          </div>
        </div>
      </div>

      {/* Budget bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6B7280' }}>
              Overall Budget Consumption
            </p>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              <span className="font-bold" style={{ color: '#111928' }}>{formatCurrency(stats.totalSpent)}</span>
              {' '}spent of {formatCurrency(stats.totalBudget)}
            </p>
          </div>
          <span
            className="text-4xl font-bold tabular-nums"
            style={{ color: pct >= 90 ? '#DC2626' : pct >= 80 ? '#D97706' : NAVY }}
          >
            {pct}<span className="text-2xl">%</span>
          </span>
        </div>
        <div className="h-3 rounded-full overflow-hidden bg-gray-100">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: pct >= 90 ? '#DC2626' : pct >= 80 ? '#D97706' : NAVY,
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs" style={{ color: '#6B7280' }}>
          <span>€0</span>
          <span>{formatCurrency(stats.totalBudget)}</span>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent invoices */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: NAVY }}>Recent Invoices</p>
            <Link href="/invoices" className="text-xs font-medium hover:underline" style={{ color: NAVY }}>
              View all →
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <EmptyState message="No invoices yet" />
          ) : (
            <div className="divide-y divide-gray-50">
              {recentInvoices.map((inv) => {
                const s = STATUS[inv.status] ?? STATUS.pending_review
                return (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#111928' }}>
                        {inv.subcontractor_name || '—'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                        {inv.invoice_number || 'No number'} · {formatDate(inv.invoice_date || inv.submitted_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-sm font-bold tabular-nums" style={{ color: '#111928' }}>
                        {formatCurrency(inv.amount_ttc)}
                      </span>
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: s.dot }}
                        title={s.label}
                      />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Pending validations */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: NAVY }}>Pending Validations</p>
            {pendingValidations.length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {pendingValidations.length}
              </span>
            )}
          </div>
          {pendingValidations.length === 0 ? (
            <EmptyState message="All invoices are processed" icon="check" />
          ) : (
            <div className="divide-y divide-gray-50">
              {pendingValidations.slice(0, 5).map((inv) => {
                const s = STATUS[inv.status] ?? STATUS.pending_review
                return (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#111928' }}>
                        {inv.subcontractor_name || '—'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                        {formatDate(inv.submitted_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-sm font-bold tabular-nums" style={{ color: '#111928' }}>
                        {formatCurrency(inv.amount_ttc)}
                      </span>
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: s.bg, color: s.color }}
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6B7280' }}>VAT Summary</p>
        <p className="text-sm font-semibold mb-5" style={{ color: NAVY }}>Current quarter — approved invoices</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Total Excl. VAT</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: '#111928' }}>{formatCurrency(stats.vatSummary.totalHT)}</p>
          </div>
          <div className="rounded-xl p-5 text-center text-white" style={{ background: NAVY }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-60">Recoverable VAT</p>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(stats.vatSummary.totalTVA)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Total Incl. VAT</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: '#111928' }}>{formatCurrency(stats.vatSummary.totalTTC)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, icon, navy, positive, danger, warn }: {
  label: string; value: string; sub: string; icon: React.ReactNode
  navy?: boolean; positive?: boolean; danger?: boolean; warn?: boolean
}) {
  const valueColor = navy ? '#0C1F52' : danger ? '#DC2626' : positive ? '#059669' : warn ? '#D97706' : '#111928'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>{label}</p>
        <div style={{ color: '#9CA3AF' }}>{icon}</div>
      </div>
      <p className="text-2xl font-bold tabular-nums" style={{ color: valueColor }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: '#6B7280' }}>{sub}</p>
    </div>
  )
}

function EmptyState({ message, icon = 'doc' }: { message: string; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-300">
      {icon === 'check' ? (
        <svg width="32" height="32" fill="none" stroke="#059669" strokeWidth="1.5" viewBox="0 0 24 24" className="mb-3">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : (
        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="mb-3">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )}
      <p className="text-sm font-medium text-gray-400">{message}</p>
    </div>
  )
}

function BudgetIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
}
function SpentIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
}
function RemainingIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
}
function PendingIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
}
