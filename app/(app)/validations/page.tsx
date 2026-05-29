'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { formatCurrency } from '@/lib/format'

const C = { card:'#FFFFFF', card2:'#F1F5F9', border:'#E2E8F0', green:'#10B981', amber:'#F59E0B', red:'#EF4444', blue:'#3B82F6', muted:'#6B7280' }

const COLUMNS = [
  { key:'pending_review',  label:'Awaiting Rudy',    role:['rudy','admin'], color:'#F97316' },
  { key:'pending_placide', label:'Awaiting Placide',  role:['placide'],      color:'#D97706' },
  { key:'pending_hitech',  label:'Awaiting Dani',     role:['hitech'],       color:'#FACC15' },
]

export default function ValidationsPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [userRole, setUserRole] = useState('')
  const [history, setHistory]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState<string|null>(null)
  const [comments, setComments] = useState<Record<string,string>>({})
  const [rejectModal, setRejectModal] = useState<string|null>(null)

  async function load() {
    const [invRes, curRes, valRes] = await Promise.all([
      supabase.from('invoices').select('*').in('status',['pending_review','pending_placide','pending_hitech']).order('submitted_at'),
      supabase.from('invoice_currency').select('invoice_id, currency'),
      supabase.from('validations').select('*, invoices(subcontractor_name)').order('validated_at', { ascending:false }).limit(50),
    ])
    const cmap: Record<string,string> = {}
    for (const c of curRes.data || []) cmap[c.invoice_id] = c.currency
    setInvoices((invRes.data || []).map((inv: any) => ({
      ...inv,
      currency: cmap[inv.id] || inv.currency || 'USD',
    })))
    setHistory(valRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    const auth = createClient()
    auth.auth.getUser().then(({ data }) => setUserRole(data.user?.user_metadata?.role || 'viewer'))
    load()
  }, [])

  async function validate(invoiceId: string, decision: 'approved'|'rejected') {
    setSubmitting(invoiceId)
    const validatorName = userRole === 'admin' || userRole === 'rudy' ? 'Rudy' : userRole === 'placide' ? 'Placide' : 'Dani'
    await fetch(`/api/invoices/${invoiceId}/validate`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ decision, validator_name: validatorName, comment: comments[invoiceId] || null }),
    })
    setSubmitting(null)
    setRejectModal(null)
    setComments(p=>{ const n={...p}; delete n[invoiceId]; return n })
    await load()
  }

  const daysWaiting = (date: string) => Math.floor((Date.now() - new Date(date).getTime()) / 86400000)

  if (loading) return <div className="flex items-center justify-center h-screen" style={{ color:C.muted }}>Loading...</div>

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color:C.muted }}>Workflow</p>
        <h1 className="text-2xl font-medium" style={{ color:'#0F172A' }}>Validations</h1>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {COLUMNS.map(col => {
          const colInvoices = invoices.filter(i=>i.status===col.key)
          const canAct = col.role.includes(userRole)
          return (
            <div key={col.key} className="rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:`1px solid ${C.border}` }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background:col.color }} />
                  <p className="text-sm font-medium" style={{ color:'#0F172A' }}>{col.label}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background:`${col.color}20`, color:col.color }}>{colInvoices.length}</span>
              </div>
              <div className="p-3 space-y-3">
                {colInvoices.length === 0 && <p className="text-xs text-center py-4" style={{ color:C.muted }}>No invoices</p>}
                {colInvoices.map(inv => {
                  const days = daysWaiting(inv.submitted_at)
                  const urgent = days > 3
                  return (
                    <div key={inv.id} className="rounded-xl p-4" style={{ background:C.card2, border:`1px solid ${C.border}` }}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium" style={{ color:'#0F172A' }}>{inv.subcontractor_name || 'Unknown'}</p>
                          <p className="text-xs mt-0.5" style={{ color:C.muted }}>#{inv.invoice_number || 'N/A'}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background:urgent?'rgba(239,68,68,0.15)':'rgba(107,114,128,0.15)', color:urgent?C.red:C.muted }}>{days}d</span>
                      </div>
                      <p className="text-sm font-medium mb-3" style={{ color:col.color }}>{formatCurrency(inv.amount_ttc, inv.currency || 'USD')}</p>
                      <Link href={`/invoices/${inv.id}`} className="block text-xs mb-3" style={{ color:C.blue }}>View details</Link>
                      {canAct && (
                        <div className="space-y-2">
                          <textarea rows={1} placeholder="Comment (optional)" className="w-full text-xs px-3 py-2 rounded-lg resize-none" style={{ background:'#FFFFFF', border:'1px solid #CBD5E1', color:'#0F172A' }}
                            value={comments[inv.id]||''} onChange={e=>setComments(p=>({...p,[inv.id]:e.target.value}))} />
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={()=>validate(inv.id,'approved')} disabled={submitting===inv.id} className="py-2 rounded-lg text-xs font-medium disabled:opacity-50" style={{ background:C.green, color:'#fff' }}>
                              {submitting===inv.id ? '...' : 'Approve'}
                            </button>
                            <button onClick={()=>setRejectModal(inv.id)} disabled={submitting===inv.id} className="py-2 rounded-lg text-xs font-medium disabled:opacity-50" style={{ background:'rgba(239,68,68,0.15)', color:C.red }}>
                              Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {history.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
          <div className="px-6 py-4" style={{ borderBottom:`1px solid ${C.border}` }}>
            <p className="text-sm font-medium" style={{ color:'#0F172A' }}>Validation History</p>
          </div>
          <div>
            {history.map(v => (
              <div key={v.id} className="flex items-center justify-between px-6 py-3" style={{ borderBottom:`1px solid ${C.border}` }}>
                <div>
                  <p className="text-sm" style={{ color:'#0F172A' }}>{(v.invoices as any)?.subcontractor_name || 'Invoice'}</p>
                  <p className="text-xs mt-0.5" style={{ color:C.muted }}>{v.validator_name} - {new Date(v.validated_at).toLocaleDateString('en-GB')}</p>
                  {v.comment && <p className="text-xs mt-0.5 italic" style={{ color:'#6B7280' }}>"{v.comment}"</p>}
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ background:v.decision==='approved'?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)', color:v.decision==='approved'?C.green:C.red }}>
                  {v.decision === 'approved' ? 'Approved' : 'Rejected'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.7)' }} onClick={()=>setRejectModal(null)}>
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ background:C.card, border:`1px solid #CBD5E1` }} onClick={e=>e.stopPropagation()}>
            <h3 className="text-base font-medium mb-4" style={{ color:'#0F172A' }}>Reject Invoice</h3>
            <textarea rows={3} placeholder="Reason for rejection..." className="w-full text-sm px-4 py-3 rounded-xl resize-none mb-4" style={{ background:'#E2E8F0', border:'1px solid #CBD5E1', color:'#0F172A' }}
              value={comments[rejectModal]||''} onChange={e=>setComments(p=>({...p,[rejectModal]:e.target.value}))} />
            <div className="flex gap-3">
              <button onClick={()=>validate(rejectModal,'rejected')} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background:C.red, color:'#fff' }}>Confirm Rejection</button>
              <button onClick={()=>setRejectModal(null)} className="px-5 py-2.5 rounded-xl text-sm" style={{ background:'#E2E8F0', color:C.muted }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
