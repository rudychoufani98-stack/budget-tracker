import type { InvoiceStatus } from '@/lib/types'

const config: Record<InvoiceStatus, { label: string; className: string }> = {
  pending_review: {
    label: 'En attente — Rudy',
    className: 'bg-yellow-100 text-yellow-800',
  },
  pending_placide: {
    label: 'En attente — Placide',
    className: 'bg-orange-100 text-orange-800',
  },
  pending_hitech: {
    label: 'En attente — Hitech',
    className: 'bg-purple-100 text-purple-800',
  },
  approved: {
    label: 'Approuvée',
    className: 'bg-green-100 text-green-800',
  },
  rejected: {
    label: 'Rejetée',
    className: 'bg-red-100 text-red-800',
  },
}

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, className } = config[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-700',
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}
