import Link from 'next/link'
import { getContracts } from '@/lib/queries'
import { formatCurrency, formatDate, calcPercent } from '@/lib/format'

export const revalidate = 0

export default async function ContractsPage() {
  const contracts = await getContracts()
  const active = contracts.filter((c) => c.status === 'active')
  const closed = contracts.filter((c) => c.status === 'closed')

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>
            Management
          </p>
          <h1 className="text-2xl font-bold" style={{ color: '#F9FAFB' }}>Contracts</h1>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
            {active.length} active · {closed.length} closed
          </p>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="rounded-2xl border p-16 text-center" style={{ background: '#111827', borderColor: '#1F2937' }}>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: '#1F2937' }}
          >
            <svg width="24" height="24" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <p className="font-medium" style={{ color: '#F9FAFB' }}>No contracts</p>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Add contracts in your Supabase database</p>
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
                className="block rounded-2xl border p-6 group"
                style={{
                  background: '#111827',
                  borderColor: '#1F2937',
                  transition: 'border-color 150ms, background 150ms',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(16,185,129,0.4)'
                  ;(e.currentTarget as HTMLElement).style.background = '#131e30'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#1F2937'
                  ;(e.currentTarget as HTMLElement).style.background = '#111827'
                }}
              >
                <div className="flex items-start justify-between gap-6 mb-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1">
                      <h2 className="text-base font-semibold truncate" style={{ color: '#F9FAFB' }}>
                        {contract.contract_name}
                      </h2>
                      <span
                        className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}
                      >
                        {contract.contract_type}
                      </span>
                      <span
                        className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium"
                        style={
                          contract.status === 'active'
                            ? { background: 'rgba(16,185,129,0.12)', color: '#10B981' }
                            : { background: '#1F2937', color: '#9CA3AF' }
                        }
                      >
                        {contract.status === 'active' ? 'Active' : 'Closed'}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>
                      {contract.client_name} · {formatDate(contract.start_date)} → {formatDate(contract.end_date)}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs mb-0.5" style={{ color: '#9CA3AF' }}>Total budget</p>
                    <p className="text-lg font-bold" style={{ color: '#F9FAFB' }}>
                      {formatCurrency(contract.total_budget, contract.currency)}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: '#1F2937' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      background: pct >= 90 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#10B981',
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: '#9CA3AF' }}>
                    Spent:{' '}
                    <span className="font-semibold" style={{ color: '#F9FAFB' }}>
                      {formatCurrency(contract.spent)}
                    </span>
                  </span>
                  <span className="font-semibold" style={{ color: pct >= 90 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#10B981' }}>
                    {pct}%
                  </span>
                  <span style={{ color: '#9CA3AF' }}>
                    Remaining:{' '}
                    <span className="font-semibold" style={{ color: isOver ? '#EF4444' : '#10B981' }}>
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
