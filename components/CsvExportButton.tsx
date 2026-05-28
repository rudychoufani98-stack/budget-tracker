'use client'

import type { Invoice } from '@/lib/types'

export function CsvExportButton({
  invoices,
  contractName,
}: {
  invoices: Invoice[]
  contractName: string
}) {
  function handleExport() {
    const rows = [
      ['Sous-traitant', 'N° Facture', 'Date', 'Catégorie', 'Montant HT', 'TVA', 'Montant TTC', 'Statut'],
      ...invoices.map((i) => [
        i.subcontractor_name || '',
        i.invoice_number || '',
        i.invoice_date || '',
        i.category || '',
        i.amount_ht?.toString() || '',
        i.amount_tva?.toString() || '',
        i.amount_ttc?.toString() || '',
        i.status,
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${contractName.replace(/\s+/g, '_')}_factures.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="shrink-0 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
    >
      Exporter CSV
    </button>
  )
}
