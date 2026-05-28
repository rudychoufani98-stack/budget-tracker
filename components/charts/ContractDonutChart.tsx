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
  '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6',
  '#EC4899', '#06B6D4', '#EF4444', '#84CC16',
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
      <div className="flex items-center justify-center h-full text-sm" style={{ color: '#9CA3AF' }}>
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
        backgroundColor: '#1F2937',
        titleColor: '#9CA3AF',
        bodyColor: '#F9FAFB',
        borderColor: '#374151',
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
        borderWidth: 0,
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
                  <p className="text-xs font-medium truncate" style={{ color: '#F9FAFB' }}>
                    {d.name}
                  </p>
                  <span className="text-xs tabular-nums shrink-0" style={{ color: '#9CA3AF' }}>
                    {pct}%
                  </span>
                </div>
                <div className="h-1 rounded-full mt-1" style={{ background: '#1F2937' }}>
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
