import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getContract } from '@/lib/queries'
import { formatCurrency, formatDate, calcPercent } from '@/lib/format'
import { SpendBarChart } from '@/components/charts/SpendBarChart'
import { CsvExportButton } from '@/components/CsvExportButton'

export const revalidate = 0

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending_review:  { label: 'Awaiting Rudy',    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  pending_placide: { label: 'Awaiting Placide',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  pending_hitech:  { label: 'Awaiting Hitech',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  approved:        { label: 'Approved',           color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  rejected:        { label: 'Rejected',           color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
}

const CATEGORY_COLORS: Record<string, string> = {
  Subcontracting: '#10B981',
  Travel: '#F59E0B',
  Accommodation: '#3B82F6',
  Meals: '#8B5CF6',
  Equipment: '#EC4899',
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
      <div className="flex items-center gap-2 text-sm" style={{ color: '#9CA3AF' }}>
        <Link href="/contracts" style={{ color: '#9CA3AF' }}>Contracts</Link>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="font-medium truncate" style={{ color: '#F9FAFB' }}>{contract.contract_name}</span>
      </div>

      {/* Header card */}
      <div className="rounded-2xl border p-6" style={{ background: '#111827', borderColor: '#1F2937' }}>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <h1 className="text-xl font-bold" style={{ color: '#F9FAFB' }}>{contract.contract_name}</h1>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}
              >
                {contract.contract_type}
              </span>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
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
          <CsvExportButton invoices={invoices} contractName={contract.contract_name} />
        </div>

        {/* Budget KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="rounded-xl p-4" style={{ background: '#1F2937' }}>
            <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Total Budget</p>
            <p className="text-lg font-bold" style={{ color: '#F9FAFB' }}>{formatCurrency(contract.total_budget, contract.currency)}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p className="text-xs mb-1" style={{ color: '#10B981' }}>Spent</p>
            <p className="text-lg font-bold" style={{ color: '#10B981' }}>{formatCurrency(spent)}</p>
          </div>
          <div
            className="rounded-xl p-4"
            style={
              remaining < 0
                ? { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }
                : { background: '#1F2937' }
            }
          >
            <p className="text-xs mb-1" style={{ color: remaining < 0 ? '#EF4444' : '#9CA3AF' }}>Remaining</p>
            <p className="text-lg font-bold" style={{ color: remaining < 0 ? '#EF4444' : '#F9FAFB' }}>
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: '#9CA3AF' }}>
            <span>Budget consumption</span>
            <span
              className="font-semibold"
              style={{ color: pct >= 90 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#10B981' }}
            >
              {pct}%
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#1F2937' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(pct, 100)}%`,
                background: pct >= 90 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#10B981',
              }}
            />
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category breakdown */}
        <div className="rounded-2xl border p-6" style={{ background: '#111827', borderColor: '#1F2937' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>By Category</p>
          <p className="text-sm font-semibold mb-5" style={{ color: '#F9FAFB' }}>Approved invoices — total TTC</p>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: '#9CA3AF' }}>
              No approved invoices
            </div>
          ) : (
            <div className="space-y-3">
              {categoryData.map(([cat, amt]) => {
                const catPct = totalTTC ? Math.round((amt / totalTTC) * 100) : 0
                const color = CATEGORY_COLORS[cat] || '#9CA3AF'
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span style={{ color: '#F9FAFB' }}>{cat}</span>
                      <span style={{ color: '#9CA3AF' }}>{formatCurrency(amt)} · {catPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: '#1F2937' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${catPct}%`, background: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Monthly spend */}
        <div className="rounded-2xl border p-6" style={{ background: '#111827', borderColor: '#1F2937' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>Monthly Spend</p>
          <p className="text-sm font-semibold mb-5" style={{ color: '#F9FAFB' }}>Last 6 months</p>
          <div style={{ height: 160 }}>
            <SpendBarChart data={monthlyData} />
          </div>
        </div>
      </div>

      {/* VAT Summary */}
      <div className="rounded-2xl border p-6" style={{ background: '#111827', borderColor: '#1F2937' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>VAT Summary</p>
        <p className="text-sm font-semibold mb-5" style={{ color: '#F9FAFB' }}>Approved invoices</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl p-5 text-center" style={{ background: '#1F2937' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>Total Excl. VAT</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: '#F9FAFB' }}>{formatCurrency(totalHT)}</p>
          </div>
          <div className="rounded-xl p-5 text-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#10B981' }}>Recoverable VAT</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: '#10B981' }}>{formatCurrency(totalTVA)}</p>
          </div>
          <div className="rounded-xl p-5 text-center" style={{ background: '#1F2937' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>Total Incl. VAT</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: '#F9FAFB' }}>{formatCurrency(totalTTC)}</p>
          </div>
        </div>
      </div>

      {/* Invoices table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: '#111827', borderColor: '#1F2937' }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1F2937' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Related Invoices</p>
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
              {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {invoices.length === 0 ? (
          <div className="p-12 text-center text-sm" style={{ color: '#9CA3AF' }}>
            No invoices linked to this contract
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#1F2937' }}>
            {invoices.map((invoice) => {
              const s = STATUS[invoice.status] ?? STATUS.pending_review
              return (
                <Link
                  key={invoice.id}
                  href={`/invoices/${invoice.id}`}
                  className="flex items-center justify-between px-6 py-4 group"
                  style={{ transition: 'background 150ms' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#F9FAFB' }}>
                      {invoice.subcontractor_name || 'Unknown subcontractor'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
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
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                      {s.label}
                    </span>
                    <p className="text-sm font-bold w-28 text-right tabular-nums" style={{ color: '#F9FAFB' }}>
                      {formatCurrency(invoice.amount_ttc)}
                    </p>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: '#9CA3AF' }}>
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
