import Link from 'next/link'
import { getDashboardStats } from '@/lib/queries'
import { formatCurrency } from '@/lib/format'
import { MonthlySpendChart } from '@/components/charts/MonthlySpendChart'
import { TopSubcontractorsChart } from '@/components/charts/TopSubcontractorsChart'

export const revalidate = 0

const NAVY = '#0C1F52'

export default async function DashboardPage() {
  const stats = await getDashboardStats()
  const pct = stats.totalBudget
    ? Math.min(Math.round((stats.totalSpent / stats.totalBudget) * 100), 100)
    : 0
  const total = stats.pendingRudy + stats.pendingPlacide + stats.pendingHitech

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Overview</p>
          <h1 className="text-2xl font-bold text-slate-900">Financial Dashboard</h1>
        </div>
        <Link
          href="/upload"
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-opacity hover:opacity-90 shadow-sm"
          style={{ background: NAVY }}
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Upload Invoice
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Budget" value={formatCurrency(stats.totalBudget)} sub="Active contracts" />
        <KpiCard label="Total Spent" value={formatCurrency(stats.totalSpent)} sub={`${pct}% of budget`} navy />
        <KpiCard label="Remaining" value={formatCurrency(stats.totalRemaining)} sub={stats.totalRemaining < 0 ? 'Over budget' : 'Available'} green={stats.totalRemaining >= 0} red={stats.totalRemaining < 0} />
        <KpiCard label="Pending Approval" value={String(total)} sub={`${stats.pendingRudy} · ${stats.pendingPlacide} · ${stats.pendingHitech}`} warn />
      </div>

      {/* Budget bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Budget Consumption</p>
            <p className="text-sm text-slate-600">
              <span className="font-bold text-slate-900">{formatCurrency(stats.totalSpent)}</span> spent of {formatCurrency(stats.totalBudget)}
            </p>
          </div>
          <span className={`text-3xl font-bold tabular-nums ${pct >= 90 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : ''}`}
            style={pct < 80 ? { color: NAVY } : {}}>
            {pct}<span className="text-xl">%</span>
          </span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${pct >= 90 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : ''}`}
            style={pct < 80 ? { width: `${pct}%`, background: NAVY } : { width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>0</span>
          <span>{formatCurrency(stats.totalBudget)}</span>
        </div>
      </div>

      {/* Pending approvals */}
      {total > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-sm font-bold text-amber-900 mb-3">
            {total} invoice{total > 1 ? 's' : ''} awaiting approval
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Awaiting Rudy', count: stats.pendingRudy, cls: 'bg-yellow-100 text-yellow-900 border-yellow-200' },
              { label: 'Awaiting Placide', count: stats.pendingPlacide, cls: 'bg-orange-100 text-orange-900 border-orange-200' },
              { label: 'Awaiting Hitech', count: stats.pendingHitech, cls: 'bg-purple-100 text-purple-900 border-purple-200' },
            ].map(({ label, count, cls }) => (
              <Link key={label} href="/invoices" className={`rounded-xl border p-4 ${cls} hover:opacity-80 transition-opacity`}>
                <p className="text-2xl font-bold tabular-nums">{count}</p>
                <p className="text-xs font-medium mt-0.5">{label}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Monthly Spend</p>
          <p className="text-sm font-semibold text-slate-800 mb-5">Last 6 months — approved invoices</p>
          <MonthlySpendChart data={stats.monthlyData} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Top Subcontractors</p>
          <p className="text-sm font-semibold text-slate-800 mb-5">By billing volume this year</p>
          {stats.topSubcontractors.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-300 text-sm">No data yet</div>
          ) : (
            <TopSubcontractorsChart data={stats.topSubcontractors} />
          )}
        </div>
      </div>

      {/* VAT */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">VAT Summary</p>
        <p className="text-sm font-semibold text-slate-800 mb-5">Current quarter — approved invoices</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-xl p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Total Excl. VAT</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums">{formatCurrency(stats.vatSummary.totalHT)}</p>
          </div>
          <div className="rounded-xl p-5 text-center text-white" style={{ background: NAVY }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Recoverable VAT</p>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(stats.vatSummary.totalTVA)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Total Incl. VAT</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums">{formatCurrency(stats.vatSummary.totalTTC)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, navy, green, red, warn }: {
  label: string; value: string; sub: string
  navy?: boolean; green?: boolean; red?: boolean; warn?: boolean
}) {
  const valueColor = navy ? '#0C1F52' : green ? '#059669' : red ? '#DC2626' : warn ? '#D97706' : '#111928'
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: valueColor }}>{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  )
}
