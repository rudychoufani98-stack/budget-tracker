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
  data: { name: string; amount: number }[]
}

export function TopSubcontractorsChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 100, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k€` : `${v}€`
          }
        />
        <YAxis
          dataKey="name"
          type="category"
          tick={{ fontSize: 11 }}
          width={100}
          tickFormatter={(v: string) => (v.length > 14 ? v.slice(0, 13) + '…' : v)}
        />
        <Tooltip
          formatter={(value) =>
            new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
            }).format(Number(value))
          }
        />
        <Bar dataKey="amount" fill="#7c3aed" radius={[0, 4, 4, 0]} name="Dépenses" />
      </BarChart>
    </ResponsiveContainer>
  )
}
