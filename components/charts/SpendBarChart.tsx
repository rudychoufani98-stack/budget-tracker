'use client'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

interface Props {
  data: { month: string; amount: number }[]
}

export function SpendBarChart({ data }: Props) {
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
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
          label: (ctx) =>
            ` €${(ctx.raw as number).toLocaleString('en-US', { minimumFractionDigits: 0 })}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#9CA3AF', font: { size: 11, family: 'Inter' } },
      },
      y: {
        display: false,
        grid: { display: false },
      },
    },
    animation: { duration: 600 },
  }

  const chartData = {
    labels: data.map((d) => d.month),
    datasets: [
      {
        data: data.map((d) => d.amount),
        backgroundColor: data.map((_, i) =>
          i === data.length - 1 ? '#10B981' : 'rgba(16,185,129,0.35)'
        ),
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  }

  return <Bar data={chartData} options={options} />
}
