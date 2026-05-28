import Link from 'next/link'
import { getContracts } from '@/lib/queries'
import { formatCurrency, formatDate, calcPercent } from '@/lib/format'

export const revalidate = 0

const NAVY = '#0C1F52'

export default async function ContractsPage() {
  const contracts = await getContracts()
  const active = contracts.filter((c) => c.status === 'active')
  const closed = contracts.filter((c) => c.status === 'closed')

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6B7280' }}>Management</p>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Contracts</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            {active.length} active · {closed.length} closed
          </p>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <p className="font-medium text-gray-600">No contracts</p>
          <p className="text-sm text-gray-400 mt-1">Add contracts in your Supabase database</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contracts.map((contract) => {
            const pct = calcPercent(contract.spent, contract.total_budget)
            const remaining = contract.total_budget - contract.spent
            const isOver = remaining < 0
            const barColor = pct >= 90 ? '#DC2626' : pct >= 80 ? '#D97706' : NAVY

            return (
              <Link
                key={contract.id}
                href={`/contracts/${contract.id}`}
                className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-blue-200 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-6 mb-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1">
                      <h2 className="text-base font-semibold truncate group-hover:text-blue-700 transition-colors" style={{ color: '#111928' }}>
                        {contract.contract_name}
                      </h2>
                      <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700">
                        {contract.contract_type}
                      </span>
                      <span
                        className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium"
                        style={
                          contract.status === 'active'
                            ? { background: '#D1FAE5', color: '#065F46' }
                            : { background: '#F3F4F6', color: '#6B7280' }
                        }
                      >
                        {contract.status === 'active' ? 'Active' : 'Closed'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
                      {contract.client_name} · {formatDate(contract.start_date)} → {formatDate(contract.end_date)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400 mb-0.5">Total budget</p>
                    <p className="text-lg font-bold" style={{ color: '#111928' }}>
                      {formatCurrency(contract.total_budget, contract.currency)}
                    </p>
                  </div>
                </div>

                <div className="h-2 rounded-full overflow-hidden bg-gray-100 mb-3">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">
                    Spent: <span className="font-semibold" style={{ color: '#111928' }}>{formatCurrency(contract.spent)}</span>
                  </span>
                  <span className="font-semibold" style={{ color: barColor }}>{pct}%</span>
                  <span className="text-gray-400">
                    Remaining: <span className="font-semibold" style={{ color: isOver ? '#DC2626' : '#059669' }}>{formatCurrency(remaining)}</span>
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
