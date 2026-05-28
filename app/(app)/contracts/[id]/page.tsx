import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getContract } from '@/lib/queries'
import { formatCurrency, formatDate, calcPercent } from '@/lib/format'
import { SpendBarChart } from '@/components/charts/SpendBarChart'
import { CsvExportButton } from '@/components/CsvExportButton'

export const revalidate = 0

const NAVY = '#0C1F52'

const STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending_review:  { label: 'Awaiting Rudy',    color: '#92400E', bg: '#FEF3C7', dot: '#D97706' },
  pending_placide: { label: 'Awaiting Placide',  color: '#92400E', bg: '#FEF3C7', dot: '#D97706' },
  pending_hitech:  { label: 'Awaiting Hitech',   color: '#5B21B6', bg: '#EDE9FE', dot: '#7C3AED' },
  approved:        { label: 'Approved',           color: '#065F46', bg: '#D1FAE5', dot: '#059669' },
  rejected:        { label: 'Rejected',           color: '#991B1B', bg: '#FEE2E2', dot: '#DC2626' },
}

const CATEGORY_COLORS: Record<string, string> = {
  Subcontracting: '#0C1F52',
  Travel: '#D97706',
  Accommodation: '#1E40AF',
  Meals: '#7C3AED',
  Equipment: '#DB2777',
  Other: '#9CA3AF',
}

export default async function ContractDetailPage({ params }: { params: { id: string } }) {
  const data = await getContract(params.id)
  if (!data) notFound()

  const { contract, invoices } = data
  const approvedInvoices = invoices.filter((i) => i.status === 'approved')
  const spent = approvedInvoices.reduce((s, i) => s + (i.amount_ttc || 0), 0)
  const remaining = contract.total_budget - spent
  const pct = calcPercent(spent, contract.total_budget)
  const barColor = pct >= 90 ? '#DC2626' : pct >= 80 ? '#D97706' : NAVY

  const categoryMap: Record<string, number> = {}
  for (const inv of approvedInvoices) {
    const cat = inv.category || 'Other'
    categoryMap[cat] = (categoryMap[cat] || 0) + (inv.amount_ttc || 0)
  }
  const categoryData = Object.entries(categoryMap).sort(([, a], [, b]) => b - a)

  const now = new Date()
  const monthlyMap: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
    monthlyMap[key] = 0
  }
  for (const inv of approvedInvoices) {
    const d = new Date(inv.submitted_at)
    const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
    if (key in monthlyMap) monthlyMap[key] += inv.amount_ttc || 0
  }
  const monthlyData = Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount }))

  const totalHT  = approvedInvoices.reduce((s, i) => s + (i.amount_ht  || 0), 0)
  const totalTVA = approvedInvoices.reduce((s, i) => s + (i.amount_tva || 0), 0)
  const totalTTC = approvedInvoices.reduce((s, i) => s + (i.amount_ttc || 0), 0)

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/contracts" className="hover:text-blue-600 transition-colors">Contracts</Link>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="font-medium truncate" style={{ color: '#111928' }}>{contract.contract_name}</span>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <h1 className="text-xl font-bold" style={{ color: NAVY }}>{contract.contract_name}</h1>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700">
                {contract.contract_type}
              </span>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={contract.status === 'active' ? { background: '#D1FAE5', color: '#065F46' } : { background: '#F3F4F6', color: '#6B7280' }}
              >
                {contract.status === 'active' ? 'Active' : 'Closed'}
              </span>
            </div>
            <p className="text-sm text-gray-400">
              {contract.client_name} · {formatDate(contract.start_date)} → {formatDate(contract.end_date)}
            </p>
          </div>
          <CsvExportButton invoices={invoices} contractName={contract.contract_name} />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Total Budget</p>
            <p className="text-lg font-bold" style={{ color: '#111928' }}>{formatCurrency(contract.total_budget, contract.currency)}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: '#EFF6FF' }}>
            <p className="text-xs text-blue-400 mb-1">Spent</p>
            <p className="text-lg font-bold text-blue-700">{formatCurrency(spent)}</p>
          </div>
          <div className={`rounded-xl p-4 ${remaining < 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
            <p className={`text-xs mb-1 ${remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>Remaining</p>
            <p className={`text-lg font-bold ${remaining < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{formatCurrency(remaining)}</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>Budget consumption</span>
            <span className="font-semibold" style={{ color: barColor }}>{pct}%</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden bg-gray-100">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-gray-400">By Category</p>
          <p className="text-sm font-semibold mb-5" style={{ color: NAVY }}>Approved invoices — total TTC</p>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">No approved invoices</div>
          ) : (
            <div className="space-y-3">
              {categoryData.map(([cat, amt]) => {
                const catPct = totalTTC ? Math.round((amt / totalTTC) * 100) : 0
                const color = CATEGORY_COLORS[cat] || '#9CA3AF'
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{cat}</span>
                      <span className="text-gray-400">{formatCurrency(amt)} · {catPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100">
                      <div className="h-full rounded-full" style={{ width: `${catPct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-gray-400">Monthly Spend</p>
          <p className="text-sm font-semibold mb-5" style={{ color: NAVY }}>Last 6 months</p>
          <div style={{ height: 160 }}>
            <SpendBarChart data={monthlyData} />
          </div>
        </div>
      </div>

      {/* VAT Summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-gray-400">VAT Summary</p>
        <p className="text-sm font-semibold mb-5" style={{ color: NAVY }}>Approved invoices</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Total Excl. VAT</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: '#111928' }}>{formatCurrency(totalHT)}</p>
          </div>
          <div className="rounded-xl p-5 text-center text-white" style={{ background: NAVY }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-60">Recoverable VAT</p>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(totalTVA)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Total Incl. VAT</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: '#111928' }}>{formatCurrency(totalTTC)}</p>
          </div>
        </div>
      </div>

      {/* Invoices table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: NAVY }}>Related Invoices</p>
            <p className="text-xs text-gray-400 mt-0.5">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {invoices.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">No invoices linked to this contract</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {invoices.map((invoice) => {
              const s = STATUS[invoice.status] ?? STATUS.pending_review
              return (
                <Link
                  key={invoice.id}
                  href={`/invoices/${invoice.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-blue-600 transition-colors" style={{ color: '#111928' }}>
                      {invoice.subcontractor_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {invoice.invoice_number ? `# ${invoice.invoice_number} · ` : ''}
                      {formatDate(invoice.invoice_date || invoice.submitted_at)}
                      {invoice.category ? ` · ${invoice.category}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: s.bg, color: s.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                      {s.label}
                    </span>
                    <p className="text-sm font-bold w-28 text-right tabular-nums" style={{ color: '#111928' }}>
                      {formatCurrency(invoice.amount_ttc)}
                    </p>
                    <svg className="text-gray-300 group-hover:text-blue-400 transition-colors" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
