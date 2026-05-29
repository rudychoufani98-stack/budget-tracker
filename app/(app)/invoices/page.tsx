import { supabaseAdmin } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/format'
import Link from 'next/link'
import type { Invoice } from '@/lib/types'

export const revalidate = 0
const C = { card:'#222A42', border:'#323D5E', green:'#10B981', amber:'#F59E0B', red:'#EF4444', blue:'#3B82F6', muted:'#6B7280' }

const STATUS_MAP: Record<string,{label:string;color:string}> = {
  pending_review:  { label:'Awaiting Rudy',    color:'#F97316' },
  pending_placide: { label:'Awaiting Placide', color:'#D97706' },
  pending_hitech:  { label:'Awaiting Dani',    color:'#FACC15' },
  approved:        { label:'Approved',         color:'#10B981' },
  rejected:        { label:'Rejected',         color:'#EF4444' },
}

export default async function InvoicesPage() {
  const { data } = await supabaseAdmin.from('invoices').select('*, service_providers(name), contracts(contract_name)').order('created_at', { ascending: false })
  const invoices = (data || []) as (Invoice & { service_providers: any; contracts: any })[]

  const counts = {
    all:      invoices.length,
    pending:  invoices.filter(i=>['pending_review','pending_placide','pending_hitech'].includes(i.status)).length,
    approved: invoices.filter(i=>i.status==='approved').length,
    rejected: invoices.filter(i=>i.status==='rejected').length,
  }

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color:C.muted }}>Management</p>
          <h1 className="text-2xl font-medium" style={{ color:'#F9FAFB' }}>Invoices</h1>
        </div>
        <Link href="/upload" className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl" style={{ background:C.blue, color:'#fff' }}>
          + Upload Invoice
        </Link>
      </div>
      <div className="flex gap-3 mb-6 flex-wrap">
        {[
          { label:'All', count:counts.all, color:'#fff' },
          { label:'Pending', count:counts.pending, color:C.amber },
          { label:'Approved', count:counts.approved, color:C.green },
          { label:'Rejected', count:counts.rejected, color:C.red },
        ].map(p=>(
          <div key={p.label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background:'#323D5E', border:'1px solid #404F74', color:p.color }}>
            {p.label} <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background:'#404F74' }}>{p.count}</span>
          </div>
        ))}
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
        <div className="grid px-6 py-3 text-xs font-medium uppercase tracking-widest" style={{ color:C.muted, borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'0.7fr 1.5fr 1.5fr 1fr 1fr 1fr 1.5fr 0.5fr' }}>
          <div>#</div><div>Provider</div><div>Contract</div><div>HT</div><div>TVA</div><div>TTC</div><div>Status</div><div></div>
        </div>
        {invoices.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color:C.muted }}>No invoices yet.</p>
        ) : (
          <div>
            {invoices.map((inv) => {
              const st = STATUS_MAP[inv.status] || STATUS_MAP.pending_review
              return (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="grid px-6 py-3 hover:bg-white/5 transition-colors items-center" style={{ borderBottom:`1px solid ${C.border}`, gridTemplateColumns:'0.7fr 1.5fr 1.5fr 1fr 1fr 1fr 1.5fr 0.5fr' }}>
                  <div className="text-xs font-mono" style={{ color:C.muted }}>{inv.invoice_number || '—'}</div>
                  <div>
                    <p className="text-sm" style={{ color:'#F9FAFB' }}>{(inv as any).service_providers?.name || inv.subcontractor_name || '—'}</p>
                    <p className="text-xs mt-0.5" style={{ color:C.muted }}>{formatDate(inv.invoice_date || inv.submitted_at)}</p>
                  </div>
                  <div className="text-sm" style={{ color:C.muted }}>{(inv as any).contracts?.contract_name || '—'}</div>
                  <div className="text-sm" style={{ color:'#F9FAFB' }}>{formatCurrency(inv.amount_ht)}</div>
                  <div className="text-sm" style={{ color:C.muted }}>{formatCurrency(inv.amount_tva)}</div>
                  <div className="text-sm font-medium" style={{ color:'#F9FAFB' }}>{formatCurrency(inv.amount_ttc)}</div>
                  <div>
                    <span className="text-xs px-2.5 py-1 rounded-full" style={{ background:`${st.color}20`, color:st.color }}>{st.label}</span>
                  </div>
                  <div className="flex justify-end">
                    <svg width="14" height="14" fill="none" stroke="#5A6A8A" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}