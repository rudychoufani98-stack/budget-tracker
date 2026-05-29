import { supabaseAdmin } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/format'
import Link from 'next/link'
import type { Invoice } from '@/lib/types'

export const revalidate = 0

const STATUS_MAP: Record<string,{label:string;color:string;bg:string}> = {
  pending_review:  { label:'Awaiting Rudy',    color:'#F97316', bg:'rgba(249,115,22,0.1)'  },
  pending_placide: { label:'Awaiting Placide', color:'#D97706', bg:'rgba(217,119,6,0.1)'   },
  pending_hitech:  { label:'Awaiting Dani',    color:'#7C3AED', bg:'rgba(124,58,237,0.1)'  },
  approved:        { label:'Approved',         color:'#10B981', bg:'rgba(16,185,129,0.1)'  },
  rejected:        { label:'Rejected',         color:'#EF4444', bg:'rgba(239,68,68,0.1)'   },
}

const CAT_ICONS: Record<string,string> = {
  Subcontracting:'🤝', Consulting:'💼', Travel:'✈️', Accommodation:'🏨', Meals:'🍽️',
  'Fuel & Transport':'⛽', Equipment:'🔧', 'Software & IT':'💻', Security:'🛡️',
  Logistics:'📦', Communication:'📡', Training:'📚', 'Legal & Compliance':'⚖️',
  'Medical & Health':'🏥', Other:'📋',
}

export default async function InvoicesPage() {
  const { data } = await supabaseAdmin
    .from('invoices')
    .select('*, service_providers(name), contracts(contract_name, project)')
    .order('created_at', { ascending: false })
  const invoices = (data||[]) as (Invoice & { service_providers:any; contracts:any })[]

  const counts = {
    all:      invoices.length,
    pending:  invoices.filter(i=>['pending_review','pending_placide','pending_hitech'].includes(i.status)).length,
    approved: invoices.filter(i=>i.status==='approved').length,
    rejected: invoices.filter(i=>i.status==='rejected').length,
  }

  const totalTTC  = invoices.reduce((s,i)=>s+(i.amount_ttc||0),0)
  const paidTTC   = invoices.filter(i=>i.status==='approved').reduce((s,i)=>s+(i.amount_ttc||0),0)

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:'#64748B' }}>Invoices</p>
          <h1 className="text-2xl font-bold" style={{ color:'#0F172A' }}>All Invoices</h1>
          <p className="text-sm mt-0.5" style={{ color:'#64748B' }}>{counts.all} invoice{counts.all!==1?'s':''} · {formatCurrency(totalTTC)} total</p>
        </div>
        <Link href="/upload" className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl" style={{ background:'#3B82F6', color:'#fff' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Upload Invoice
        </Link>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label:'All Invoices', count:counts.all,      value:formatCurrency(totalTTC), color:'#3B82F6', bg:'#EFF6FF' },
          { label:'Pending',      count:counts.pending,  value:'awaiting review',         color:'#F59E0B', bg:'#FFFBEB' },
          { label:'Approved',     count:counts.approved, value:formatCurrency(paidTTC),   color:'#10B981', bg:'#F0FDF4' },
          { label:'Rejected',     count:counts.rejected, value:'not processed',            color:'#EF4444', bg:'#FEF2F2' },
        ].map(s=>(
          <div key={s.label} className="rounded-2xl px-5 py-4" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:'#94A3B8' }}>{s.label}</p>
            <p className="text-2xl font-bold mb-0.5" style={{ color:s.color }}>{s.count}</p>
            <p className="text-xs" style={{ color:'#94A3B8' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
        {/* Header row */}
        <div className="grid px-6 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color:'#94A3B8', borderBottom:'1px solid #F1F5F9', background:'#FAFBFC', gridTemplateColumns:'0.8fr 1.8fr 1.4fr 0.8fr 1fr 1fr 1.5fr' }}>
          <div>Invoice #</div>
          <div>Provider</div>
          <div>Contract</div>
          <div>Category</div>
          <div>HT</div>
          <div>TTC</div>
          <div>Status</div>
        </div>

        {invoices.length===0 ? (
          <div className="py-16 text-center">
            <div className="text-3xl mb-3">🧾</div>
            <p className="text-sm font-medium mb-1" style={{ color:'#0F172A' }}>No invoices yet</p>
            <p className="text-sm mb-4" style={{ color:'#94A3B8' }}>Upload your first invoice to get started</p>
            <Link href="/upload" className="inline-flex text-sm font-semibold px-4 py-2 rounded-xl" style={{ background:'#3B82F6', color:'#fff' }}>+ Upload Invoice</Link>
          </div>
        ) : invoices.map(inv=>{
          const st = STATUS_MAP[inv.status] || STATUS_MAP.pending_review
          const catIcon = CAT_ICONS[inv.category||'Other'] || '📋'
          return (
            <Link
              key={inv.id} href={`/invoices/${inv.id}`}
              className="grid px-6 py-4 items-center transition-colors hover:bg-slate-50"
              style={{ borderBottom:'1px solid #F8FAFC', gridTemplateColumns:'0.8fr 1.8fr 1.4fr 0.8fr 1fr 1fr 1.5fr' }}
            >
              {/* Invoice # */}
              <div className="font-mono text-xs px-2 py-1 rounded-lg inline-block" style={{ background:'#F1F5F9', color:'#64748B' }}>
                {inv.invoice_number||'—'}
              </div>

              {/* Provider */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0" style={{ background:'rgba(59,130,246,0.1)', color:'#3B82F6' }}>
                  {((inv as any).service_providers?.name||inv.subcontractor_name||'?')[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color:'#0F172A' }}>{(inv as any).service_providers?.name||inv.subcontractor_name||'—'}</p>
                  <p className="text-xs truncate" style={{ color:'#94A3B8' }}>{formatDate(inv.invoice_date||inv.submitted_at)}</p>
                </div>
              </div>

              {/* Contract */}
              <div className="text-sm truncate" style={{ color:'#64748B' }}>
                {(inv as any).contracts?.contract_name||'—'}
              </div>

              {/* Category */}
              <div className="text-base">{catIcon}</div>

              {/* HT */}
              <div className="text-sm font-medium" style={{ color:'#0F172A' }}>{formatCurrency(inv.amount_ht)}</div>

              {/* TTC */}
              <div className="text-sm font-bold" style={{ color:'#0F172A' }}>{formatCurrency(inv.amount_ttc)}</div>

              {/* Status */}
              <div>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold inline-block" style={{ background:st.bg, color:st.color }}>{st.label}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
