'use client'

// Generic CSV export button used by list pages.
// rows: first row is the header, remaining rows are data.
export function CsvExportButton({
  rows,
  filename,
  label = 'Export CSV',
}: {
  rows: () => (string | number)[][]
  filename: string
  label?: string
}) {
  function handleExport() {
    const csv = rows()
      .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    // BOM so Excel opens UTF-8 correctly
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="text-sm font-medium px-4 py-2 rounded-xl"
      style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#0F172A' }}
    >
      {label}
    </button>
  )
}
