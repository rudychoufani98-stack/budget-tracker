import { getDashboardStats } from '@/lib/queries'
import { formatCurrency } from '@/lib/format'
import { MonthlySpendChart } from '@/components/charts/MonthlySpendChart'
import { TopSubcontractorsChart } from '@/components/charts/TopSubcontractorsChart'

export const revalidate = 0

export default async function DashboardPage() {
  const stats = await getDashboardStats()
  const budgetPct = stats.totalBudget
    ? Math.min(Math.round((stats.totalSpent / stats.totalBudget) * 100), 100)
    : 0
  const totalPending = stats.pendingRudy + stats.pendingPlacide + stats.pendingHitech

  return (
    <div className="p-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Vue globale de vos contrats ESG actifs</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Budget total"
          value={formatCurrency(stats.totalBudget)}
          sub="Contrats actifs"
          color="blue"
          icon={
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <KpiCard
          label="Dépensé"
          value={formatCurrency(stats.totalSpent)}
          sub={`${budgetPct}% du budget`}
          color="violet"
          icon={
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          }
        />
        <KpiCard
          label="Budget restant"
          value={formatCurrency(stats.totalRemaining)}
          sub={stats.totalRemaining < 0 ? 'Dépassement !' : 'Disponible'}
          color={stats.totalRemaining < 0 ? 'red' : 'green'}
          icon={
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
        <KpiCard
          label="En attente"
          value={String(totalPending)}
          sub="Factures à valider"
          color="amber"
          icon={
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
      </div>

      {/* Budget progress bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Consommation du budget global</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {formatCurrency(stats.totalSpent)} dépensé sur {formatCurrency(stats.totalBudget)}
            </p>
          </div>
          <span className={`text-2xl font-bold ${budgetPct >= 90 ? 'text-red-600' : budgetPct >= 80 ? 'text-amber-600' : 'text-blue-600'}`}>
            {budgetPct}%
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              budgetPct >= 90 ? 'bg-red-500' : budgetPct >= 80 ? 'bg-amber-500' : 'bg-blue-600'
            }`}
            style={{ width: `${budgetPct}%` }}
          />
        </div>
      </div>

      {/* Pending invoices breakdown */}
      {totalPending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <p className="text-sm font-semibold text-amber-800 mb-3">
            {totalPending} facture{totalPending > 1 ? 's' : ''} en attente de validation
          </p>
          <div className="grid grid-cols-3 gap-3">
            <PendingBox label="Rudy" count={stats.pendingRudy} color="yellow" />
            <PendingBox label="Placide" count={stats.pendingPlacide} color="orange" />
            <PendingBox label="Hitech" count={stats.pendingHitech} color="purple" />
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">Dépenses mensuelles</h2>
          <p className="text-xs text-slate-400 mb-5">6 derniers mois — factures approuvées</p>
          <MonthlySpendChart data={stats.monthlyData} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">Top 5 sous-traitants</h2>
          <p className="text-xs text-slate-400 mb-5">Par volume de facturation cette année</p>
          {stats.topSubcontractors.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
              Aucune donnée pour l&apos;instant
            </div>
          ) : (
            <TopSubcontractorsChart data={stats.topSubcontractors} />
          )}
        </div>
      </div>

      {/* VAT Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-1">Récapitulatif TVA</h2>
        <p className="text-xs text-slate-400 mb-5">Trimestre en cours — factures approuvées</p>
        <div className="grid grid-cols-3 gap-6">
          <VatBox label="Total HT" value={formatCurrency(stats.vatSummary.totalHT)} neutral />
          <VatBox label="TVA récupérable" value={formatCurrency(stats.vatSummary.totalTVA)} highlight />
          <VatBox label="Total TTC" value={formatCurrency(stats.vatSummary.totalTTC)} neutral />
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label, value, sub, color, icon,
}: {
  label: string; value: string; sub: string; color: string; icon: React.ReactNode
}) {
  const colors: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50',
    violet: 'text-violet-600 bg-violet-50',
    green: 'text-emerald-600 bg-emerald-50',
    red: 'text-red-600 bg-red-50',
    amber: 'text-amber-600 bg-amber-50',
  }
  const textColors: Record<string, string> = {
    blue: 'text-blue-600',
    violet: 'text-violet-600',
    green: 'text-emerald-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <span className={textColors[color]}>{icon}</span>
      </div>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${textColors[color]}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  )
}

function PendingBox({ label, count, color }: { label: string; count: number; color: string }) {
  const colors: Record<string, string> = {
    yellow: 'bg-yellow-100 text-yellow-800',
    orange: 'bg-orange-100 text-orange-800',
    purple: 'bg-purple-100 text-purple-800',
  }
  return (
    <div className={`rounded-xl px-4 py-3 ${colors[color]}`}>
      <p className="text-xl font-bold">{count}</p>
      <p className="text-xs font-medium">{label}</p>
    </div>
  )
}

function VatBox({ label, value, highlight, neutral }: { label: string; value: string; highlight?: boolean; neutral?: boolean }) {
  return (
    <div className={`rounded-xl p-4 text-center ${highlight ? 'bg-blue-50 border border-blue-100' : 'bg-slate-50'}`}>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-blue-700' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}
