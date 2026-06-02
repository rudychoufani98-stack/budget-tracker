'use client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, LabelList,
} from 'recharts'

const COLORS = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#F97316','#EC4899']

function fmt(v: number, ccy = 'NGN') {
  if (ccy === 'NGN') {
    if (v >= 1_000_000) return `₦${(v/1_000_000).toFixed(1)}M`
    if (v >= 1_000)     return `₦${(v/1_000).toFixed(0)}K`
    return `₦${Math.round(v)}`
  }
  if (v >= 1_000_000) return `$${(v/1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v/1_000).toFixed(0)}K`
  return `$${Math.round(v)}`
}

// Chart 2 — Consultant committed vs paid
export function ConsultantChart({ data, ccy }: { data: { name:string; committed:number; paid:number }[]; ccy:string }) {
  if (!data.length) return (
    <div className="flex items-center justify-center h-full" style={{ color:'#94A3B8', fontSize:13 }}>No contract data yet</div>
  )
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top:4, right:60, bottom:4, left:8 }} barCategoryGap="30%">
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" tick={{ fill:'#0F172A', fontSize:12, fontWeight:600 }} axisLine={false} tickLine={false} width={80} />
        <Tooltip
          contentStyle={{ background:'#0F172A', border:'none', borderRadius:10, color:'#fff', fontSize:12 }}
          formatter={(v:any, name:string) => [fmt(Number(v), ccy), name === 'committed' ? 'Contract value' : 'Paid']}
          cursor={{ fill:'rgba(0,0,0,0.04)' }}
        />
        {/* Committed bar (background) */}
        <Bar dataKey="committed" fill="#E2E8F0" radius={[0,4,4,0]} barSize={10}>
          <LabelList dataKey="committed" position="right" formatter={(v:any) => fmt(Number(v), ccy)}
            style={{ fill:'#94A3B8', fontSize:10 }} />
        </Bar>
        {/* Paid bar (foreground) */}
        <Bar dataKey="paid" radius={[0,4,4,0]} barSize={10}>
          {data.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          <LabelList dataKey="paid" position="right" formatter={(v:any) => fmt(Number(v), ccy)}
            style={{ fill:'#0F172A', fontSize:10, fontWeight:600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Chart 3 — Payments made by month
export function MonthlyPaymentsChart({ data, ccy }: { data: { month:string; amount:number }[]; ccy:string }) {
  if (!data.length) return (
    <div className="flex items-center justify-center h-full" style={{ color:'#94A3B8', fontSize:13 }}>No payments recorded yet</div>
  )
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top:4, right:8, bottom:4, left:8 }} barCategoryGap="35%">
        <XAxis dataKey="month" tick={{ fill:'#64748B', fontSize:11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill:'#64748B', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v, ccy)} />
        <Tooltip
          contentStyle={{ background:'#0F172A', border:'none', borderRadius:10, color:'#fff', fontSize:12 }}
          formatter={(v:any) => [fmt(Number(v), ccy), 'Paid']}
          cursor={{ fill:'rgba(0,0,0,0.04)' }}
        />
        <Bar dataKey="amount" radius={[4,4,0,0]}>
          {data.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Chart 4 — Project completion rate
export function ProjectCompletionChart({ data, ccy }: { data: { name:string; committed:number; paid:number; pct:number }[]; ccy:string }) {
  if (!data.length) return (
    <div className="flex items-center justify-center h-full" style={{ color:'#94A3B8', fontSize:13 }}>No projects with contracts yet</div>
  )
  return (
    <div className="space-y-4 px-1">
      {data.map((p, i) => {
        const color  = COLORS[i % COLORS.length]
        const pctColor = p.pct >= 80 ? '#10B981' : p.pct >= 40 ? '#F59E0B' : '#3B82F6'
        return (
          <div key={p.name}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background:color }}/>
                <span className="text-sm font-semibold" style={{ color:'#0F172A' }}>{p.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs" style={{ color:'#64748B' }}>
                <span>{fmt(p.paid, ccy)} paid</span>
                <span style={{ color:'#CBD5E1' }}>of</span>
                <span>{fmt(p.committed, ccy)}</span>
                <span className="font-bold text-sm" style={{ color:pctColor, minWidth:36, textAlign:'right' }}>{p.pct}%</span>
              </div>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background:'#F1F5F9' }}>
              <div style={{ width:`${Math.min(100, p.pct)}%`, height:'100%', background:color, borderRadius:4, transition:'width 0.6s ease' }}/>
            </div>
          </div>
        )
      })}
    </div>
  )
}
