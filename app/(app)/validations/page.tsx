'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { formatCurrency } from '@/lib/format'

const STEPS = [
  { status:'pending_review',  label:'Rudy',        role:'rudy',    action:'Forward to Placide',    color:'#60A5FA', step:1 },
  { status:'pending_placide', label:'Placide',      role:'placide', action:'Forward to Dani',       color:'#3B82F6', step:2 },
  { status:'pending_dani',    label:'Dani',         role:'hitech',  action:'Forward to Accountant', color:'#2563EB', step:3 },
  { status:'pending_fares',   label:'Accountant',   role:'fares',   action:'Confirm Payment',       color:'#1D4ED8', step:4 },
]

// Map user role → which step they act on
const ROLE_TO_STEP: Record<string,number> = {
  rudy:1, admin:1, placide:2, dani:3, hitech:3, fares:4
}

const VALIDATOR_NAME: Record<string,string> = {
  admin:'Rudy', rudy:'Rudy', placide:'Placide', dani:'Dani', hitech:'Dani', fares:'Accountant'
}

function StepBar({ counts, userRole }: { counts: Record<string,number>; userRole: string }) {
  const myStepNum = ROLE_TO_STEP[userRole] || 0
  return (
    <div className="rounded-2xl p-6 mb-6" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const count = counts[s.status] || 0
          const isMe  = s.step === myStepNum
          const done  = myStepNum > 0 && s.step < myStepNum
          return (
            <div key={s.status} className="flex items-center flex-1">
              <div className="flex-1">
                <div className="flex flex-col items-center">
                  <div className="relative mb-2">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                      style={{
                        background: isMe ? s.color : count > 0 ? s.color + '20' : '#F1F5F9',
                        color:      isMe ? '#fff'  : count > 0 ? s.color : '#94A3B8',
                        boxShadow:  isMe ? `0 0 0 4px ${s.color}25` : 'none',
                      }}
                    >
                      {done
                        ? <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        : s.step
                      }
                    </div>
                    {count > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: s.color, fontSize:10 }}>
                        {count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-center" style={{ color: isMe ? s.color : '#64748B' }}>
                    {isMe ? 'You' : s.label}
                  </p>
                  <p className="text-xs text-center mt-0.5" style={{ color:'#94A3B8' }}>
                    {s.step <= 3 ? 'Validation' : 'Payment'}
                  </p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className="shrink-0 flex items-center" style={{ width:40, marginTop:-20 }}>
                  <div className="w-full h-0.5 rounded" style={{ background: count > 0 ? s.color + '50' : '#E2E8F0' }}/>
                  <svg width="8" height="12" viewBox="0 0 8 12" fill="none" style={{ flexShrink:0, marginLeft:-1 }}>
                    <path d="M1 1l6 5-6 5" stroke={count > 0 ? s.color : '#E2E8F0'} strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ValidationsPage() {
  const [items,      setItems]      = useState<any[]>([])  // mixed invoices + tranches
  const [userRole,   setUserRole]   = useState('')
  const [history,    setHistory]    = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState<string|null>(null)
  const [comments,   setComments]   = useState<Record<string,string>>({})
  const [reject,     setReject]     = useState<string|null>(null)
  const [tab,        setTab]        = useState<'queue'|'history'>('queue')

  async function load() {
    const all = ['pending_review','pending_placide','pending_dani','pending_fares']
    const [invRes, curRes, valRes, trancheRes] = await Promise.all([
      supabase.from('invoices').select('*, contracts(contract_name), service_providers(name)').in('status', all).order('submitted_at'),
      supabase.from('invoice_currency').select('invoice_id, currency'),
      supabase.from('validations').select('*, invoices(subcontractor_name)').order('validated_at', { ascending:false }).limit(60),
      supabase.from('contract_tranches').select('*, contracts(id, contract_name, currency, service_providers(name))').in('status', all),
    ])
    const cmap: Record<string,string> = {}
    for (const c of curRes.data || []) cmap[c.invoice_id] = c.currency
    const invoices = (invRes.data || []).map((i:any) => ({
      ...i,
      _type: 'invoice',
      currency: cmap[i.id] || i.currency || 'NGN',
      _displayName: i.subcontractor_name || i.service_providers?.name || 'Invoice',
      _subtitle: i.contracts?.contract_name || '',
      _amount: i.amount_ttc,
      _date: i.submitted_at || i.created_at,
    }))
    const tranches = (trancheRes.data || []).map((t:any) => ({
      ...t,
      _type: 'tranche',
      currency: t.contracts?.currency || 'NGN',
      _displayName: t.contracts?.service_providers?.name || t.contracts?.contract_name || 'Payment',
      _subtitle: `${t.contracts?.contract_name || ''} — ${t.tranche_name}`,
      _amount: t.amount,
      _date: t.scheduled_date || t.created_at,
    }))
    setItems([...invoices, ...tranches].sort((a,b) => new Date(a._date||0).getTime() - new Date(b._date||0).getTime()))
    setHistory(valRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUserRole(data.user?.user_metadata?.role || 'viewer'))
    load()
  }, [])

  async function act(itemId: string, decision: 'approved'|'rejected') {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    setSubmitting(itemId)
    const endpoint = item._type === 'tranche'
      ? `/api/tranches/${itemId}/validate`
      : `/api/invoices/${itemId}/validate`
    try {
      const res = await fetch(endpoint, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ decision, validator_name: VALIDATOR_NAME[userRole] || userRole, comment: comments[itemId] || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(`Error: ${data.error || 'Validation failed. Please try again.'}`)
        setSubmitting(null)
        return
      }
    } catch (e) {
      alert('Network error. Please check your connection and try again.')
      setSubmitting(null)
      return
    }
    setSubmitting(null); setReject(null)
    setComments(p => { const n = {...p}; delete n[itemId]; return n })
    await load()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"/>
    </div>
  )

  const myStepNum = ROLE_TO_STEP[userRole] || 0
  const myStep    = STEPS.find(s => s.step === myStepNum)
  const myInvs    = myStep ? items.filter(i => i.status === myStep.status) : []
  const otherInvs = myStep ? items.filter(i => i.status !== myStep.status) : items
  const counts    = Object.fromEntries(STEPS.map(s => [s.status, items.filter(i=>i.status===s.status).length]))
  const total     = items.length

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:'#64748B' }}>Workflow</p>
          <h1 className="text-2xl font-bold" style={{ color:'#0F172A' }}>Validations</h1>
          <p className="text-sm mt-0.5" style={{ color:'#64748B' }}>
            {total > 0 ? `${total} item${total!==1?'s':''} in pipeline` : 'Pipeline is clear'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['queue','history'] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)}
              className="text-sm px-4 py-2 rounded-xl font-medium capitalize"
              style={tab===t
                ? {background:'#0F172A', color:'#fff'}
                : {background:'#F1F5F9', color:'#64748B'}}
            >
              {t === 'queue' ? `Queue (${total})` : `History (${history.length})`}
            </button>
          ))}
        </div>
      </div>

      {tab === 'queue' && (
        <>
          <StepBar counts={counts} userRole={userRole} />

          {/* My action section */}
          {myStep && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: myInvs.length > 0 ? myStep.color : '#94A3B8' }}/>
                <h2 className="text-sm font-bold" style={{ color:'#0F172A' }}>
                  {myInvs.length > 0 ? `${myInvs.length} invoice${myInvs.length!==1?'s':''} waiting for your action` : 'Your queue is clear'}
                </h2>
                {myStep.step === 4 && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:'rgba(16,185,129,0.1)', color:'#10B981' }}>Payment confirmation</span>}
              </div>

              {myInvs.length === 0 ? (
                <div className="rounded-2xl p-8 text-center" style={{ background:'#F8FAFC', border:'1px solid #E2E8F0' }}>
                  <div className="text-2xl mb-2">OK</div>
                  <p className="text-sm font-semibold" style={{ color:'#0F172A' }}>Nothing to do right now</p>
                  <p className="text-xs mt-1" style={{ color:'#64748B' }}>Invoices will appear here when they reach your step</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myInvs.map((inv: any) => {
                    const days  = Math.floor((Date.now() - new Date(inv._date || inv.created_at).getTime()) / 86400000)
                    const urgent = days >= 3
                    const isPayment = inv._type === 'tranche'
                    const href = isPayment ? `/contracts/${inv.contracts?.id}` : `/invoices/${inv.id}`
                    return (
                      <div key={inv.id} className="rounded-2xl overflow-hidden transition-shadow hover:shadow-md"
                        style={{ background:'#FFFFFF', border:`1.5px solid ${urgent ? '#FCA5A5' : myStep.color + '40'}` }}>
                        <div style={{ height:3, background: myStep.color }}/>
                        <div className="p-5">
                          <div className="flex items-start gap-4">
                            {/* Item info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {isPayment && (
                                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:'rgba(139,92,246,0.12)', color:'#8B5CF6' }}>
                                    Contract Payment
                                  </span>
                                )}
                                <Link href={href} className="text-base font-bold hover:text-blue-600 transition-colors" style={{ color:'#0F172A' }}>
                                  {inv._displayName}
                                </Link>
                                {!isPayment && inv.invoice_number && (
                                  <span className="text-xs px-2 py-0.5 rounded-lg font-mono" style={{ background:'#F1F5F9', color:'#64748B' }}>
                                    #{inv.invoice_number}
                                  </span>
                                )}
                                {urgent && (
                                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:'rgba(239,68,68,0.1)', color:'#EF4444' }}>
                                    {days}d waiting
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs mb-3" style={{ color:'#94A3B8' }}>
                                <span>{inv._subtitle}</span>
                                {!isPayment && inv.invoice_date && <span>{inv.invoice_date}</span>}
                                {!isPayment && inv.category && <span>{inv.category}</span>}
                              </div>
                              <p className="text-2xl font-bold" style={{ color:'#0F172A' }}>
                                {formatCurrency(inv._amount, inv.currency || 'NGN')}
                              </p>
                              {!isPayment && inv.amount_ht && inv.vat_rate && (
                                <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>
                                  HT {formatCurrency(inv.amount_ht, inv.currency||'NGN')} + VAT {inv.vat_rate}%
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="shrink-0 flex flex-col gap-2 items-end">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => act(inv.id, 'approved')}
                                  disabled={submitting === inv.id}
                                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all hover:opacity-90"
                                  style={{ background: myStep.color, color:'#fff', minWidth:160 }}
                                >
                                  {submitting === inv.id ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/>
                                  ) : (
                                    <>
                                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                                      {myStep.step === 4 ? 'Confirm Payment' : myStep.action}
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => setReject(inv.id)}
                                  disabled={submitting === inv.id}
                                  className="px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                                  style={{ background:'rgba(239,68,68,0.08)', color:'#EF4444', border:'1px solid rgba(239,68,68,0.2)' }}
                                >
                                  Reject
                                </button>
                              </div>
                              <textarea
                                rows={1}
                                value={comments[inv.id] || ''}
                                onChange={e => setComments(p=>({...p,[inv.id]:e.target.value}))}
                                placeholder="Add comment (optional)..."
                                className="text-xs px-3 py-1.5 rounded-lg resize-none outline-none"
                                style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', color:'#0F172A', width:280 }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Other steps in progress */}
          {otherInvs.length > 0 && (
            <div>
              <h2 className="text-sm font-bold mb-3" style={{ color:'#64748B' }}>
                Other items in pipeline ({otherInvs.length})
              </h2>
              <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
                {otherInvs.map((inv: any, i: number) => {
                  const step = STEPS.find(s => s.status === inv.status)
                  if (!step) return null
                  const days = Math.floor((Date.now() - new Date(inv._date || inv.created_at).getTime()) / 86400000)
                  const href = inv._type === 'tranche' ? `/contracts/${inv.contracts?.id}` : `/invoices/${inv.id}`
                  return (
                    <Link key={inv.id} href={href}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
                      style={{ borderBottom: i < otherInvs.length - 1 ? '1px solid #F8FAFC' : 'none' }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: step.color + '20', color: step.color }}>
                        {step.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {inv._type === 'tranche' && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold shrink-0" style={{ background:'rgba(139,92,246,0.1)', color:'#8B5CF6' }}>Payment</span>
                          )}
                          <p className="text-sm font-semibold truncate" style={{ color:'#0F172A' }}>{inv._displayName}</p>
                        </div>
                        <p className="text-xs truncate" style={{ color:'#94A3B8' }}>{inv._subtitle}</p>
                      </div>
                      <p className="text-sm font-bold shrink-0" style={{ color:'#0F172A' }}>
                        {formatCurrency(inv._amount, inv.currency || 'NGN')}
                      </p>
                      <div className="shrink-0 flex items-center gap-2">
                        {days > 3 && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background:'rgba(239,68,68,0.1)', color:'#EF4444' }}>{days}d</span>}
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: step.color + '18', color: step.color }}>
                          Awaiting {step.label}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {total === 0 && (
            <div className="rounded-2xl p-16 text-center" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background:'#F1F5F9' }}>
                <svg width="24" height="24" fill="none" stroke="#64748B" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              </div>
              <p className="text-base font-semibold mb-1" style={{ color:'#0F172A' }}>All clear</p>
              <p className="text-sm" style={{ color:'#64748B' }}>No invoices in the validation pipeline right now.</p>
              <Link href="/upload" className="inline-flex items-center gap-2 mt-4 text-sm font-semibold px-4 py-2.5 rounded-xl" style={{ background:'#3B82F6', color:'#fff' }}>
                Upload an Invoice
              </Link>
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <div className="rounded-2xl overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
          <div className="px-5 py-4" style={{ borderBottom:'1px solid #F1F5F9' }}>
            <p className="text-sm font-bold" style={{ color:'#0F172A' }}>Validation History</p>
            <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>Last 60 actions</p>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color:'#94A3B8' }}>No history yet</p>
          ) : (
            <div className="divide-y divide-[#F8FAFC]">
              {history.map((v: any) => {
                const approved = v.decision === 'approved'
                return (
                  <div key={v.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: approved ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
                      {approved
                        ? <svg width="12" height="12" fill="none" stroke="#10B981" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        : <svg width="12" height="12" fill="none" stroke="#EF4444" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color:'#0F172A' }}>
                        {v.invoices?.subcontractor_name || 'Invoice'}
                      </p>
                      <p className="text-xs truncate" style={{ color:'#94A3B8' }}>
                        By {v.validator_name} - {new Date(v.validated_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
                        {v.comment ? ` - "${v.comment}"` : ''}
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0"
                      style={{ background: approved ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: approved ? '#10B981' : '#EF4444' }}>
                      {approved ? 'Approved' : 'Rejected'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Reject modal */}
      {reject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.5)' }} onClick={()=>setReject(null)}>
          <div className="rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" style={{ background:'#fff' }} onClick={e=>e.stopPropagation()}>
            <div style={{ height:4, background:'#EF4444' }}/>
            <div className="p-6">
              <h3 className="text-base font-bold mb-1" style={{ color:'#0F172A' }}>Reject Invoice</h3>
              <p className="text-sm mb-4" style={{ color:'#64748B' }}>The consultant will be notified with your reason.</p>
              <textarea rows={3}
                value={comments[reject] || ''}
                onChange={e => setComments(p=>({...p,[reject]:e.target.value}))}
                placeholder="Reason for rejection..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none resize-none"
                style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:'#0F172A' }}
              />
              <div className="flex gap-3 mt-4">
                <button onClick={()=>act(reject,'rejected')} disabled={submitting===reject}
                  className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ background:'#EF4444', color:'#fff' }}>
                  {submitting===reject ? '...' : 'Confirm Rejection'}
                </button>
                <button onClick={()=>setReject(null)} className="px-6 py-3 rounded-xl text-sm font-medium" style={{ background:'#F1F5F9', color:'#64748B' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}