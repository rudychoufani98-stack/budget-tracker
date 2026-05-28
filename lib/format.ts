export function formatCurrency(amount: number | null, currency = 'EUR'): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatPercent(value: number, total: number): string {
  if (!total) return '0%'
  return `${Math.min(Math.round((value / total) * 100), 100)}%`
}

export function calcPercent(value: number, total: number): number {
  if (!total) return 0
  return Math.min(Math.round((value / total) * 100), 100)
}
