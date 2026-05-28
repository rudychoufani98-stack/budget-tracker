import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getContract } from '@/lib/queries'
import { formatCurrency, formatDate, calcPercent } from '@/lib/format'
import { StatusBadge } from '@/components/StatusBadge'
import { CategoryBreakdown } from '@/components/charts/CategoryBreakdown'
import { MonthlySpendChart } from '@/components/charts/MonthlySpendChart'
import { CsvExportButton } from '@/components/CsvExportButton'

export const revalidate = 0

export default async function ContractDetailPage({ params }: { params: { id: string } }) {
  const data = await getContract(params.id)
  if (!data) notFound()

  const { contract, invoices } = data
  const approvedInvoices = invoices.filter((i) => i.status === 'approved')
  const spent = approvedInvoices.reduce((s, i) => s + (i.amount_ttc || 0), 0)
  const remaining = contract.total_budget - spent
  const pct = calcPercent(spent, contract.total_budget)

  // Category breakdown
  const categoryMap: Record<string, number> = {}
  for (const inv of approvedInvoices) {
    const cat = inv.category || 'Other'
    categoryMap[cat] = (categoryMap[cat] || 0) + (inv.amount_ttc || 0)
  }
  const categoryData = Object.entries(categoryMap).map(([category, amount]) => ({ category, amount }))

  // Monthly spend
  const now = new Date()
  const monthlyMap: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleString('fr-FR', { month: 'short', year: '2-digit' })
    monthlyMap[key] = 0
  }
  for (const inv of approvedInvoices) {
    const d = new Date(inv.submitted_at)
    const key = d.toLocaleString('fr-FR', { month: 'short', year: '2-digit' })
    if (key in monthlyMap) monthlyMap[key] += inv.amount_ttc || 0
  }
  const monthlyData = Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount }))

  // VAT summary
  const totalHT = approvedInvoices.reduce((s, i) => s + (i.amount_ht || 0), 0)
  const totalTVA = approvedInvoices.reduce((s, i) => s + (i.amount_tva || 0), 0)
  const totalTTC = approvedInvoices.reduce((s, i) => s + (i.amount_ttc || 0), 0)

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <Link href="/contracts" className="hover:text-blue-600 transition-colors">Contrats</Link>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
        <span className="text-slate-700 font-medium truncate">{contract.contract_name}</span>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-slate-900">{contract.contract_name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                contract.contract_type === 'ESG'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {contract.contract_type}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                contract.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {contract.status === 'active' ? 'Actif' : 'Clôturé'}
              </span>
            </div>
            <p className="text-sm text-slate-400">
              {contract.client_name} · {formatDate(contract.start_date)} → {formatDate(contract.end_date)}
            </p>
          </div>
          <CsvExportButton invoices={invoices} contractName={contract.contract_name} />
        </div>

        {/* Budget numbers */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Budget total</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(contract.total_budget, contract.currency)}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Dépensé</p>
            <p className="text-lg font-bold text-blue-700">{formatCurrency(spent)}</p>
          </div>
          <div className={`rounded-xl p-4 ${remaining < 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
            <p className="text-xs text-slate-400 mb-1">Restant</p>
            <p className={`text-lg font-bold ${remaining < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>Consommation budget</span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-blue-600'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">Répartition par catégorie</h2>
          <p className="text-xs text-slate-400 mb-5">Factures approuvées — montant TTC</p>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Aucune facture approuvée</div>
          ) : (
            <CategoryBreakdown data={categoryData} />
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">Dépenses mensuelles</h2>
          <p className="text-xs text-slate-400 mb-5">6 derniers mois</p>
          <MonthlySpendChart data={monthlyData} />
        </div>
      </div>

      {/* VAT summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-5">Récapitulatif TVA — factures approuvées</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Total HT</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(totalHT)}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
            <p className="text-xs text-slate-400 mb-1">TVA récupérable</p>
            <p className="text-lg font-bold text-blue-700">{formatCurrency(totalTVA)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Total TTC</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(totalTTC)}</p>
          </div>
        </div>
      </div>

      {/* Invoices table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Factures liées</h2>
            <p className="text-xs text-slate-400 mt-0.5">{invoices.length} facture{invoices.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        {invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">Aucune facture liée à ce contrat</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {invoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                    {invoice.subcontractor_name || 'Sous-traitant inconnu'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {invoice.invoice_number ? `N° ${invoice.invoice_number} · ` : ''}
                    {formatDate(invoice.invoice_date || invoice.submitted_at)}
                    {invoice.category ? ` · ${invoice.category}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <StatusBadge status={invoice.status} />
                  <p className="text-sm font-bold text-slate-900 w-28 text-right">
                    {formatCurrency(invoice.amount_ttc)}
                  </p>
                  <svg className="text-slate-300 group-hover:text-blue-400 transition-colors" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
