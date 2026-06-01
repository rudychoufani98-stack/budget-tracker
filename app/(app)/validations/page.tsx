'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { formatCurrency } from '@/lib/format'

const C = { card:'#FFFFFF', border:'#E2E8F0', green:'#10B981', amber:'#F59E0B', red:'#EF4444', blue:'#3B82F6', muted:'#6B7280' }

// Which status each role can action
const ROLE_QUEUE: Record<string, string> = {
  admin:    'pending_review',
  rudy:     'pending_review',
  placide:  'pending_placide',
  dani:     'pending_dani',
  fares:    'pending_fares',
}

const STEP_META: Record<string,{ label:string; nextLabel:string; color:string; bg:string; step:number }> = {
  pending_review:  { label:'Awaiting Rudy',    nextLabel:'Send to Placide',  color:'#F97316', bg:'rgba(249,115,22,0.1)',  step:1 },
  pending_placide: { label:'Awaiting Placide',  nextLabel:'Send to Dani',     color:'#8B5CF6', bg:'rgba(139,92,246,0.1)', step:2 },
  pending_dani:    { label:'Awaiting Dani',     nextLabel:'Send to Fares',    color:'#3B82F6', bg:'rgba(59,130,246,0.1)', step:3 },
  pending_fares:   { label:'Awaiting Fares',    nextLabel:'Confirm Payment',  color:'#10B981', bg:'rgba(16,185,129,0.1)', step:4 },
  approved:        { label:'Approved',          nextLabel:'',                 color:'#10B981', bg:'rgba(16,185,129,0.1)', step:5 },
  rejected:        { label:'Rejected',          nextLabel:'',                 color:'#EF4444', bg:'rgba(239,68,68,0.1)',  step:0 },
}

const VALIDATOR_NAMES: Record<string,string> = {
  admin:'Rudy', rudy:'Rudy', placide:'Placide', dani:'Dani', fares:'Fares'
}

export default function ValidationsPage() {
  const [invoices,    setInvoices]    = useState<any[]>([])
  const [userRole,    setUserRole]    = useState('')
  const [history,     setHistory]     = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [submitting,  setSubmitting]  = useState<string|null>(null)
  const [comments,    setComments]    = useState<Record<string,string>>({})
  const [rejectModal, setRejectModal] = useState<string|null>(null)
  const [activeTab,   setActiveTab]   = useState<'queue'|'history'>('queue')

  async function load() {
    const allStatuses = ['pending_review','pending_placide','pending_dani','pending_fares']
    const [invRes, curRes, valRes] = await Promise.all([
      supabase.from('invoices').select('*').in('status', allStatuses).order('submitted_at'),
      supabase.from('invoice_currency').select('invoice_id, currency'),
      supabase.from('validations').select('*, invoices(subcontractor_name)').order('validated_at', { ascending:false }).limit(50),
    ])
    const cmap: Record<string,string> = {}
    for (const c of curRes.data || []) cmap[c.invoice_id] = c.currency
    setInvoices((invRes.data || []).map((inv: any) => ({
      ...inv,
      currency: cmap[inv.id] || inv.currency || 'NGN',
    })))
    setHistory(valRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    const auth = createClient()
    auth.auth.getUser().then(({ data }) => {
      const role = data.user?.user_metadata?.role || 'viewer'
      setUserRole(role)
    })
    load()
  }, [])

  async function validate(invoiceId: string, decision: 'approved'|'rejected') {
    setSubmitting(invoiceId)
    const validatorName = VALIDATOR_NAMES[userRole] || userRole
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

  // Invoices this user can action
  const myQueue = ROLE_QUEUE[userRole]
  const myInvoices     = invoices.filter(i => i.status === myQueue)
  const otherInvoices  = invoices.filter(i => i.status !== myQueue)

  // Step progress display
  const steps = ['pending_review','pending_placide','pending_dani','pending_fares','approved']
  const stepNames = ['Rudy','Placide','Dani','Fares','Done']

  if (loading) return <div className="flex items-center justify-center h-screen" style={{ color:C.muted }}>Loading...</div>

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:C.muted }}>Invoices</p>
          <h1 className="text-2xl font-bold" style={{ color:'#0F172A' }}>Validations</h1>
          <p className="text-sm mt-0.5" style={{ color:C.muted }}>
            {myQueue ? `Your queue: ${myInvoices.length} invoice${myInvoices.length!==1?'s':''} waiting` : 'Read-only view'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setActiveTab('queue')} className="text-sm px-4 py-2 rounded-xl font-medium" style={activeTab==='queue'?{background:'#3B82F6',color:'#fff'}:{background:'#F1F5F9',color:'#64748B'}}>
            Queue ({invoices.length})
          </button>
          <button onClick={()=>setActiveTab('history')} className="text-sm px-4 py-2 rounded-xl font-medium" style={activeTab==='history'?{background:'#3B82F6',color:'#fff'}:{background:'#F1F5F9',color:'#64748B'}}>
            History ({history.length})
          </button>
        </div>
      </div>

      {activeTab === 'queue' && (
        <>
          {/* Pipeline overview */}
          <div className="rounded-2xl p-5 mb-6" style={{ background:C.card, border:`1px solid ${C.border}` }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color:'#94A3B8' }}>Validation Pipeline</p>
            <div className="flex items-center gap-0">
              {steps.map((s, i) => {
                const count = s === 'approved' ? 0 : invoices.filter(inv => inv.status === s).length
                const meta  = STEP_META[s]
                const isMe  = s === myQueue
                return (
                  <div key={s} className="flex items-center flex-1">
                    <div className="flex-1 text-center">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-1.5"
                        style={{ background: isMe ? meta.color : count > 0 ? `${meta.color}30` : '#F1F5F9',
                                 color: isMe ? '#fff' : count > 0 ? meta.color : '#94A3B8',
                                 border: isMe ? 'none' : '2px solid transparent' }}>
                        {count > 0 ? count : i + 1}
                      </div>
                      <p className="text-xs font-semibold" style={{ color: isMe ? meta.color : '#64748B' }}>{stepNames[i]}</p>
                      {isMe && <p className="text-xs" style={{ color:meta.color }}>Your turn</p>}
                    </div>
                    {i < steps.length - 1 && (
                      <div className="h-0.5 flex-1 mx-1" style={{ background: count > 0 ? meta.color + '40' : '#E2E8F0' }}/>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* My queue */}
          {myQueue && myInvoices.length > 0 && (
            <div className="rounded-2xl overflow-hidden mb-6" style={{ background:C.card, border:`2px solid ${STEP_META[myQueue]?.color}` }}>
              <div className="px-5 py-4" style={{ background:`${STEP_META[myQueue]?.color}10`, borderBottom:`1px solid ${STEP_META[myQueue]?.color}30` }}>
                <p className="text-sm font-bold" style={{ color:STEP_META[myQueue]?.color }}>
                  Your queue - {myInvoices.length} invoice{myInvoices.length!==1?'s':''} waiting for you
                </p>
                <p className="text-xs mt-0.5" style={{ color:C.muted }}>
                  {userRole === 'fares' ? 'Confirm payment received - this is the final step' : `Approve to forward to ${STEP_META[myQueue]?.nextLabel.replace('Send to ','')}`}
                </p>
              </div>
              <div className="divide-y divide-[#F8FAFC]">
                {myInvoices.map((inv: any) => {
                  const days = daysWaiting(inv.submitted_at || inv.created_at)
                  return (
                    <div key={inv.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Link href={`/invoices/${inv.id}`} className="text-sm font-semibold hover:text-blue-600" style={{ color:'#0F172A' }}>
                              {inv.subcontractor_name || 'Unknown Consultant'}
                            </Link>
                            {inv.invoice_number && <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background:'#F1F5F9', color:'#64748B' }}>#{inv.invoice_number}</span>}
                            {days > 3 && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:'rgba(239,68,68,0.1)', color:'#EF4444' }}>{days}d waiting</span>}
                          </div>
                          <p className="text-xs mb-2" style={{ color:C.muted }}>
                            {inv.invoice_date} - {inv.category || 'General'}
                          </p>
                          <p className="text-lg font-bold" style={{ color:'#0F172A' }}>{formatCurrency(inv.amount_ttc, inv.currency || 'NGN')}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => validate(inv.id, 'approved')}
                              disabled={submitting === inv.id}
                              className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                              style={{ background: userRole === 'fares' ? '#10B981' : '#3B82F6', color:'#fff' }}
                            >
                              {submitting === inv.id ? '...' : userRole === 'fares' ? 'Confirm Paid' : STEP_META[myQueue]?.nextLabel || 'Approve'}
                            </button>
                            <button
                              onClick={() => setRejectModal(inv.id)}
                              disabled={submitting === inv.id}
                              className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                              style={{ background:'rgba(239,68,68,0.08)', color:'#EF4444' }}
                            >
                              Reject
                            </button>
                          </div>
                          <textarea
                            rows={1}
                            value={comments[inv.id] || ''}
                            onChange={e => setComments(p=>({...p,[inv.id]:e.target.value}))}
                            placeholder="Optional comment..."
                            className="text-xs px-3 py-1.5 rounded-lg resize-none w-56 outline-none"
                            style={{ background:'#F8FAFC', border:`1px solid ${C.border}`, color:'#0F172A' }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {myQueue && myInvoices.length === 0 && (
            <div className="rounded-2xl p-10 text-center mb-6" style={{ background:'#F0FDF4', border:'1px solid rgba(16,185,129,0.2)' }}>
              <p className="text-2xl mb-2">OK</p>
              <p className="text-sm font-semibold" style={{ color:'#10B981' }}>Your queue is empty</p>
              <p className="text-xs mt-1" style={{ color:'#64748B' }}>No invoices waiting for your validation right now</p>
            </div>
          )}

          {/* Other steps - read only */}
          {otherInvoices.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
              <div className="px-5 py-4" style={{ borderBottom:`1px solid #F1F5F9` }}>
                <p className="text-sm font-bold" style={{ color:'#0F172A' }}>Other steps in progress</p>
                <p className="text-xs mt-0.5" style={{ color:C.muted }}>Read only - waiting for other validators</p>
              </div>
              <div className="divide-y divide-[#F8FAFC]">
                {otherInvoices.map((inv: any) => {
                  const meta = STEP_META[inv.status] || STEP_META.pending_review
                  return (
                    <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-sm font-semibold" style={{ color:'#0F172A' }}>{inv.subcontractor_name || 'Unknown'}</p>
                        <p className="text-xs mt-0.5" style={{ color:C.muted }}>{formatCurrency(inv.amount_ttc, inv.currency || 'NGN')}</p>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:meta.bg, color:meta.color }}>{meta.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div className="rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
          <div className="px-5 py-4" style={{ borderBottom:`1px solid #F1F5F9` }}>
            <p className="text-sm font-bold" style={{ color:'#0F172A' }}>Validation History</p>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color:C.muted }}>No validations yet</p>
          ) : (
            <div className="divide-y divide-[#F8FAFC]">
              {history.map((v: any) => {
                const isApproved = v.decision === 'approved'
                return (
                  <div key={v.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm font-semibold" style={{ color:'#0F172A' }}>
                        {v.invoices?.subcontractor_name || 'Invoice'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color:C.muted }}>
                        By {v.validator_name} - {new Date(v.validated_at).toLocaleDateString('en-GB')}
                        {v.comment && ` - "${v.comment}"`}
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:isApproved?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)', color:isApproved?'#10B981':'#EF4444' }}>
                      {isApproved ? 'Approved' : 'Rejected'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.5)' }} onClick={()=>setRejectModal(null)}>
          <div className="rounded-2xl w-full max-w-md overflow-hidden shadow-2xl" style={{ background:'#fff' }} onClick={e=>e.stopPropagation()}>
            <div style={{ height:4, background:'#EF4444' }}/>
            <div className="p-6">
              <h3 className="text-base font-bold mb-4" style={{ color:'#0F172A' }}>Reject Invoice</h3>
              <textarea
                rows={3}
                value={comments[rejectModal] || ''}
                onChange={e => setComments(p=>({...p,[rejectModal]:e.target.value}))}
                placeholder="Reason for rejection (recommended)..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none resize-none"
                style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:'#0F172A' }}
              />
              <div className="flex gap-3 mt-4">
                <button onClick={()=>validate(rejectModal,'rejected')} disabled={submitting===rejectModal} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background:'#EF4444', color:'#fff' }}>
                  {submitting===rejectModal?'...':'Confirm Reject'}
                </button>
                <button onClick={()=>setRejectModal(null)} className="px-5 py-3 rounded-xl text-sm" style={{ background:'#F1F5F9', color:'#64748B' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}