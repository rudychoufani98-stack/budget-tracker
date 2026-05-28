import Link from 'next/link'
import { getContracts } from '@/lib/queries'
import { formatCurrency, formatDate, calcPercent } from '@/lib/format'

export const revalidate = 0

export default async function ContractsPage() {
  const contracts = await getContracts()
  const active = contracts.filter((c) => c.status === 'active')
  const closed = contracts.filter((c) => c.status === 'closed')

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contrats ESG</h1>
          <p className="text-slate-500 text-sm mt-1">
            {active.length} actif{active.length > 1 ? 's' : ''} · {closed.length} clôturé{closed.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium">Aucun contrat</p>
          <p className="text-slate-400 text-sm mt-1">Ajoutez des contrats dans votre base Supabase</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contracts.map((contract) => {
            const pct = calcPercent(contract.spent, contract.total_budget)
            const remaining = contract.total_budget - contract.spent
            const isOver = remaining < 0

            return (
              <Link
                key={contract.id}
                href={`/contracts/${contract.id}`}
                className="block bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-6 mb-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1">
                      <h2 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {contract.contract_name}
                      </h2>
                      <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
                        contract.contract_type === 'ESG'
                          ? 'bg-emerald-100 text-emerald-700'
                          : contract.contract_type === 'Deployment'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {contract.contract_type}
                      </span>
                      <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
                        contract.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {contract.status === 'active' ? 'Actif' : 'Clôturé'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">
                      {contract.client_name} · {formatDate(contract.start_date)} → {formatDate(contract.end_date)}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400 mb-0.5">Budget total</p>
                    <p className="text-lg font-bold text-slate-900">
                      {formatCurrency(contract.total_budget, contract.currency)}
                    </p>
                  </div>
                </div>

                {/* Progress */}
                <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      pct >= 90 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Dépensé :{' '}
                    <span className="font-semibold text-slate-700">
                      {formatCurrency(contract.spent)}
                    </span>
                  </span>
                  <span className="font-semibold text-slate-500">{pct}%</span>
                  <span className="text-slate-500">
                    Restant :{' '}
                    <span className={`font-semibold ${isOver ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatCurrency(remaining)}
                    </span>
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
