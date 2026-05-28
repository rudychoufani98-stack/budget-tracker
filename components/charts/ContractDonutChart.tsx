'use client'

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip)

const PALETTE = [
  '#0C1F52', '#1E40AF', '#059669', '#D97706',
  '#7C3AED', '#DB2777', '#0891B2', '#65A30D',
]

interface ContractBudget {
  name: string
  budget: number
  spent: number
}

interface Props {
  data: ContractBudget[]
}

export function ContractDonutChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-full text-sm" style={{ color: '#6B7280' }}>
        No contracts yet
      </div>
    )
  }

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0C1F52',
        titleColor: 'rgba(255,255,255,0.6)',
        bodyColor: '#fff',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx) => {
            const d = data[ctx.dataIndex]
            const pct = d.budget ? Math.round((d.spent / d.budget) * 100) : 0
            return ` €${d.spent.toLocaleString()} spent (${pct}% of budget)`
          },
        },
      },
    },
    animation: { duration: 600 },
  }

  const chartData = {
    labels: data.map((d) => d.name),
    datasets: [
      {
        data: data.map((d) => d.budget),
        backgroundColor: PALETTE.slice(0, data.length),
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 4,
      },
    ],
  }

  return (
    <div className="flex items-center gap-6 h-full">
      <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
        <Doughnut data={chartData} options={options} />
      </div>
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        {data.map((d, i) => {
          const pct = d.budget ? Math.round((d.spent / d.budget) * 100) : 0
          return (
            <div key={d.name} className="flex items-center gap-2 min-w-0">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: PALETTE[i % PALETTE.length] }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium truncate" style={{ color: '#111928' }}>
                    {d.name}
                  </p>
                  <span className="text-xs tabular-nums shrink-0" style={{ color: '#6B7280' }}>
                    {pct}%
                  </span>
                </div>
                <div className="h-1 rounded-full mt-1" style={{ background: '#E5E7EB' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(pct, 100)}%`, background: PALETTE[i % PALETTE.length] }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
