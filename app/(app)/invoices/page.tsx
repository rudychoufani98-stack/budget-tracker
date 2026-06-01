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

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:'#64748B' }}>Invoices</p>
          <h1 className="text-2xl font-bold" style={{ color:'#0F172A' }}>All Invoices</h1>
          <p className="text-sm mt-0.5" style={{ color:'#64748B' }}>
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/upload" className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl" style={{ background:'#3B82F6', color:'#fff' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Upload Invoice
        </Link>
      </div>

      <InvoicesClient invoices={invoices} />
    </div>
  )
}