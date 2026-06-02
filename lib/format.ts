export function formatCurrency(amount: number | null, currency = 'NGN'): string {
  if (amount === null || amount === undefined) return '—'
  // NGN amounts: show in millions (e.g. "₦39,9M") for readability
  if (currency === 'NGN') {
    const abs = Math.abs(amount)
    const sign = amount < 0 ? '-' : ''
    if (abs >= 1_000_000) {
      const m = abs / 1_000_000
      const formatted = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(m)
      return `${sign}₦${formatted}M`
    }
    if (abs >= 1_000) {
      const k = abs / 1_000
      const formatted = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(k)
      return `${sign}₦${formatted}K`
    }
    return `${sign}₦${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(abs)}`
  }
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
