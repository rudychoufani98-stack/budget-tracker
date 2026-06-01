import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { InvoicesClient } from './InvoicesClient'

export const revalidate = 0

export default async function InvoicesPage() {
  const [{ data: invoiceData }, { data: currencyData }] = await Promise.all([
    supabaseAdmin
      .from('invoices')
      .select('*, service_providers(name), contracts(contract_name, project, project_id, projects(id, name), project_sections(id, name))')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('invoice_currency')
      .select('invoice_id, currency'),
  ])

  const currencyMap: Record<string, string> = {}
  for (const c of currencyData || []) currencyMap[c.invoice_id] = c.currency

  const invoices = (invoiceData || []).map((inv: any) => ({
    ...inv,
    currency: currencyMap[inv.id] || inv.currency || 'NGN',
  }))

  const pending  = invoices.filter(i => ['pending_review','pending_placide','pending_dani','pending_fares'].includes(i.status)).length
  const paid     = invoices.filter(i => i.status === 'approved').length

  return (
    <div style={{ background:'#F8FAFC', minHeight:'100vh' }}>
      {/* Blue header */}
      <div style={{ background:'linear-gradient(135deg,#1D4ED8,#3B82F6)', boxShadow:'0 4px 24px rgba(59,130,246,0.25)' }}>
        <div className="px-6 py-6 max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:'rgba(255,255,255,0.65)' }}>Finance</p>
            <h1 className="text-2xl font-bold" style={{ color:'#fff' }}>All Invoices</h1>
            <p className="text-sm mt-0.5" style={{ color:'rgba(255,255,255,0.75)' }}>
              {invoices.length} invoice{invoices.length!==1?'s':''} total
              {pending > 0 ? ` - ${pending} in pipeline` : ''}
              {paid > 0 ? ` - ${paid} paid` : ''}
            </p>
          </div>
          <Link href="/upload" className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:opacity-90"
            style={{ background:'#fff', color:'#1D4ED8' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Upload Invoice
          </Link>
        </div>
      </div>

      <div className="px-6 py-6 max-w-7xl mx-auto">
        <InvoicesClient invoices={invoices} />
      </div>
    </div>
  )
}