'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Props {
  data: { month: string; amount: number }[]
}

export function MonthlySpendChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k€` : `${v}€`
          }
        />
        <Tooltip
          formatter={(value) =>
            new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
            }).format(Number(value))
          }
        />
        <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} name="Dépenses" />
      </BarChart>
    </ResponsiveContainer>
  )
}
