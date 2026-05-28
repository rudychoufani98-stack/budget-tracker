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
        backgroundColor: '#0C1F52',
        titleColor: 'rgba(255,255,255,0.6)',
        bodyColor: '#fff',
        borderColor: 'rgba(255,255,255,0.1)',
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
        ticks: { color: '#6B7280', font: { size: 11, family: 'Inter' } },
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
          i === data.length - 1 ? '#0C1F52' : 'rgba(12,31,82,0.25)'
        ),
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  }

  return <Bar data={chartData} options={options} />
}
