'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#10B981','#F59E0B','#6B7280']

export function DashboardCharts({ monthlyData, trancheCounts }: {
  monthlyData: { month: string; amount: number }[]
  trancheCounts: { paid: number; scheduled: number; unpaid: number }
}) {
  const pieData = [
    { name: 'Paid',      value: trancheCounts.paid },
    { name: 'Scheduled', value: trancheCounts.scheduled },
    { name: 'Unpaid',    value: trancheCounts.unpaid },
  ].filter(d => d.value > 0)

  const fmt = (v: number) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)

  return (
    <div className="grid grid-cols-2 gap-6">
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmt} />
            <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB' }} formatter={(v: number) => [fmt(v), 'Amount']} />
            <Bar dataKey="amount" fill="#3B82F6" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ height: 200 }}>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value">
                {pieData.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
              <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB' }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full" style={{ color: '#4B5563', fontSize: 13 }}>No tranche data yet</div>
        )}
      </div>
    </div>
  )
}
