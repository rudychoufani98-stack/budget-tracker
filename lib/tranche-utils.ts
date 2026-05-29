import type { ContractTranche } from './types'

export function calcTrancheStats(tranches: ContractTranche[]) {
  const total_committed  = tranches.reduce((s, t) => s + (t.amount || 0), 0)
  const total_paid       = tranches.filter(t => t.status === 'paid').reduce((s, t) => s + t.amount, 0)
  const total_scheduled  = tranches.filter(t => t.status === 'scheduled').reduce((s, t) => s + t.amount, 0)
  const total_unpaid     = tranches.filter(t => t.status === 'unpaid').reduce((s, t) => s + t.amount, 0)
  const payment_rate     = total_committed > 0 ? Math.round((total_paid / total_committed) * 100) : 0
  return { total_committed, total_paid, total_scheduled, total_unpaid, payment_rate }
}

export function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

export function daysUntil(dateStr: string): number {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}
