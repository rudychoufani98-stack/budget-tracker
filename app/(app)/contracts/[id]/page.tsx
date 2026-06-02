'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/format'

const C = { card:'#FFFFFF', card2:'#F1F5F9', border:'#E2E8F0', border2:'#CBD5E1', green:'#10B981', amber:'#F59E0B', red:'#EF4444', blue:'#3B82F6', muted:'#64748B', text:'#0F172A' }
const TRANCHE_ORDER = ['T1','T2','T3','T4','One-Shot']
const ESG_COLORS: Record<string,string> = { E:'#10B981', S:'#3B82F6', G:'#8B5CF6', Other:'#6B7280' }
const STATUS_COLORS: Record<string,{bg:string;color:string;label:string}> = {
  unpaid:          { bg:'rgba(107,114,128,0.15)', color:'#6B7280',  label:'Unpaid'              },
  scheduled:       { bg:'rgba(245,158,11,0.15)',  color:'#F59E0B',  label:'Scheduled'           },
  pending_review:  { bg:'rgba(59,130,246,0.15)',  color:'#3B82F6',  label:'In Validation'       },
  pending_placide: { bg:'rgba(59,130,246,0.15)',  color:'#3B82F6',  label:'In Validation'       },
  pending_dani:    { bg:'rgba(59,130,246,0.15)',  color:'#3B82F6',  label:'In Validation'       },
  pending_fares:   { bg:'rgba(139,92,246,0.15)',  color:'#8B5CF6',  label:'Pending Payment'     },
  paid:            { bg:'rgba(16,185,129,0.15)',  color:'#10B981',  label:'Paid'                },
}
const INV_STATUS: Record<string,{label:string;color:string;bg:string}> = {
  pending_review:  { label:'Awaiting Rudy',    color:'#F97316', bg:'rgba(249,115,22,0.1)' },
  pending_placide: { label:'Awaiting Placide', color:'#D97706', bg:'rgba(217,119,6,0.1)'  },
  pending_dani:  { label:'Awaiting Dani',    color:'#7C3AED', bg:'rgba(124,58,237,0.1)' },
  approved:        { label:'Approved',          color:'#10B981', bg:'rgba(16,185,129,0.1)' },
  rejected:        { label:'Rejected',          color:'#EF4444', bg:'rgba(239,68,68,0.1)'  },
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id:string }>()
  const router  = useRouter()

  const [contract, setContract] = useState<any>(null)
  const [tranches, setTranches] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [popRefs,  setPopRefs]  = useState<Record<string,string>>({})
  const [marking,  setMarking]  = useState<string|null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editingRate, setEditingRate] = useState(false)
  const [rateInput,   setRateInput]   = useState('')
  const [savingRate,  setSavingRate]  = useState(false)

  async function saveRate() {
    setSavingRate(true)
    await fetch(`/api/contracts/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ fx_rate_at_signing: parseFloat(rateInput) || null }) })
    await load()
    setSavingRate(false); setEditingRate(false)
  }

  async function load() {
    const res  = await fetch(`/api/contracts/${id}`)
    const data = await res.json()
    setContract(data)
    const sorted = [...(data.contract_tranches || [])].sort(
      (a,b) => TRANCHE_ORDER.indexOf(a.tranche_name) - TRANCHE_ORDER.indexOf(b.tranche_name)
    )
    setTranches(sorted)
    setInvoices(data.invoices || [])
    const refs: Record<string,string> = {}
    sorted.forEach((t:any) => { refs[t.id] = t.pop_reference || '' })
    setPopRefs(refs)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function sendToAccounting(trancheId: string) {
    setMarking(trancheId)
    await fetch(`/api/tranches/${trancheId}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ status: 'pending_review' }),
    })
    await load()
    setMarking(null)
  }

  async function markPaid(trancheId: string) {
    setMarking(trancheId)
    await fetch(`/api/tranches/${trancheId}/mark-paid`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ pop_reference: popRefs[trancheId] || null }),
    })
    await load()
    setMarking(null)
  }

  async function handleDelete() {
    if (!confirm('Delete this contract and all its data? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/contracts/${id}`, { method:'DELETE' })
    router.push('/contracts')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"/>
        <p className="text-sm" style={{ color:C.muted }}>Loading...</p>
      </div>
    </div>
  )
  if (!contract) return <div className="p-8 text-sm" style={{ color:C.red }}>Contract not found.</div>

  // ── Budget & invoice calculations ──────────────────────────────────
  const contractBudget  = contract.contract_amount || contract.total_budget || 0
  const ccy             = contract.currency || 'NGN'

  // Invoice-based tracking (what matters for budget deduction)
  const nonRejected     = invoices.filter((i:any) => i.status !== 'rejected')
  const approvedInvs    = invoices.filter((i:any) => i.status === 'approved')
  const pendingInvs     = invoices.filter((i:any) => !['approved','rejected'].includes(i.status))

  const totalInvoiced   = nonRejected.reduce((s:number,i:any) => s+(i.amount_ttc||0), 0)
  const totalApproved   = approvedInvs.reduce((s:number,i:any)=> s+(i.amount_ttc||0), 0)
  const totalPending    = pendingInvs.reduce((s:number,i:any) => s+(i.amount_ttc||0), 0)
  const remaining       = contractBudget - totalApproved
  const approvedPct     = contractBudget > 0 ? Math.min(100, Math.round((totalApproved/contractBudget)*100)) : 0
  const pendingPct      = contractBudget > 0 ? Math.min(100-approvedPct, Math.round((totalPending/contractBudget)*100)) : 0

  // Tranche-based tracking
  const tranchePaid     = tranches.filter((t:any)=>t.status==='paid').reduce((s:number,t:any)=>s+(t.amount||0),0)
  const trancheTotal    = tranches.reduce((s:number,t:any)=>s+(t.amount||0),0)
  const tranchePct      = trancheTotal > 0 ? Math.round((tranchePaid/trancheTotal)*100) : 0

  const catColor = ESG_COLORS[contract.category] || ESG_COLORS.Other

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color:C.muted }}>
        <Link href="/contracts" className="hover:text-blue-500 transition-colors">Contracts</Link>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        <span style={{ color:C.text }}>{contract.contract_name}</span>
      </div>

      {/* Header */}
      <div className="rounded-2xl overflow-hidden mb-6" style={{ background:C.card, border:`1px solid ${C.border}` }}>
        <div style={{ height:4, background: catColor ? `linear-gradient(90deg,${catColor},${catColor}88)` : 'linear-gradient(90deg,#3B82F6,#8B5CF6)' }}/>
        <div className="px-6 py-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold" style={{ color:C.text }}>{contract.contract_name}</h1>
              {contract.category && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:`${catColor}18`, color:catColor }}>{contract.category}</span>
              )}
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold capitalize" style={{ background:'rgba(59,130,246,0.1)', color:'#3B82F6' }}>{contract.status}</span>
            </div>
            <div className="flex items-center gap-3 text-sm flex-wrap" style={{ color:C.muted }}>
              {contract.service_providers?.name && <span>{contract.service_providers.name}</span>}
              {contract.project && <span>{contract.project}</span>}
              {contract.start_date && <span>{formatDate(contract.start_date)}</span>}
            </div>
            {/* FX Rate at Signing */}
            <div className="flex items-center gap-2 mt-2">
              {!editingRate ? (
                <>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background:'rgba(59,130,246,0.08)', color:'#3B82F6' }}>
                    {contract.fx_rate_at_signing
                      ? `1 USD = ₦${Number(contract.fx_rate_at_signing).toLocaleString()} at signing`
                      : 'No signing rate set'}
                  </span>
                  <button onClick={() => { setRateInput(contract.fx_rate_at_signing ? String(contract.fx_rate_at_signing) : ''); setEditingRate(true) }}
                    className="text-xs px-2 py-0.5 rounded-lg" style={{ color:'#64748B', background:'#F1F5F9' }}>
                    Edit rate
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color:C.muted }}>1 USD =</span>
                  <input type="number" value={rateInput} onChange={e=>setRateInput(e.target.value)}
                    className="text-xs px-2.5 py-1 rounded-lg w-28 outline-none"
                    style={{ background:'#F8FAFC', border:'1.5px solid #3B82F6', color:'#0F172A' }}
                    placeholder="e.g. 1580" step="0.01" />
                  <span className="text-xs" style={{ color:C.muted }}>NGN</span>
                  <button onClick={saveRate} disabled={savingRate} className="text-xs px-2.5 py-1 rounded-lg font-semibold disabled:opacity-50" style={{ background:'#3B82F6', color:'#fff' }}>
                    {savingRate ? '...' : 'Save'}
                  </button>
                  <button onClick={()=>setEditingRate(false)} className="text-xs px-2 py-1 rounded-lg" style={{ color:'#64748B', background:'#F1F5F9' }}>Cancel</button>
                </div>
              )}
            </div>
          </div>
          <button onClick={handleDelete} disabled={deleting} className="text-xs font-medium px-3 py-2 rounded-xl disabled:opacity-50" style={{ background:'rgba(239,68,68,0.08)', color:'#EF4444' }}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* ── BUDGET DEDUCTION TRACKER ── */}
      <div className="rounded-2xl overflow-hidden mb-6" style={{ background:C.card, border:`1px solid ${C.border}` }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom:`1px solid #F1F5F9` }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color:C.text }}>Budget Tracking</h2>
            <p className="text-xs mt-0.5" style={{ color:C.muted }}>Invoice payments deducted from contract budget</p>
          </div>
          <Link href={`/upload?contract=${id}`} className="text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5" style={{ background:'#3B82F6', color:'#fff' }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Invoice
          </Link>
        </div>

        <div className="p-6">
          {/* KPI row */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label:'Contract Budget', value:formatCurrency(contractBudget, ccy),  color:'#3B82F6', bg:'#EFF6FF',  icon:'💰' },
              { label:'Total Invoiced',  value:formatCurrency(totalInvoiced,  ccy),  color:'#8B5CF6', bg:'#F5F3FF',  icon:'🧾' },
              { label:'Approved',        value:formatCurrency(totalApproved,  ccy),  color:'#10B981', bg:'#F0FDF4',  icon:'✅' },
              { label:'Remaining',       value:formatCurrency(remaining,      ccy),  color:remaining<0?'#EF4444':remaining<contractBudget*0.2?'#F59E0B':'#0F172A', bg:remaining<0?'#FEF2F2':'#F8FAFC', icon:'📊' },
            ].map(k=>(
              <div key={k.label} className="rounded-xl px-4 py-3.5" style={{ background:k.bg }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">{k.icon}</span>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color:'#94A3B8' }}>{k.label}</p>
                </div>
                <p className="text-lg font-bold" style={{ color:k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Budget consumption bar */}
          {contractBudget > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color:C.muted }}>Budget consumed</span>
                <span className="text-xs font-bold" style={{ color:approvedPct>=80?'#EF4444':approvedPct>=60?'#F59E0B':'#10B981' }}>{approvedPct}% approved</span>
              </div>
              <div className="h-4 rounded-full overflow-hidden flex" style={{ background:'#F1F5F9' }}>
                {/* Approved — green */}
                {approvedPct > 0 && (
                  <div style={{ width:`${approvedPct}%`, background:'#10B981', transition:'width 0.5s' }}
                    title={`Approved: ${formatCurrency(totalApproved, ccy)}`}/>
                )}
                {/* Pending — amber */}
                {pendingPct > 0 && (
                  <div style={{ width:`${pendingPct}%`, background:'#F59E0B', transition:'width 0.5s' }}
                    title={`Pending: ${formatCurrency(totalPending, ccy)}`}/>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2">
                {[
                  { color:'#10B981', label:`Approved (${approvedPct}%)` },
                  { color:'#F59E0B', label:`Pending (${pendingPct}%)` },
                  { color:'#F1F5F9', label:`Remaining (${Math.max(0,100-approvedPct-pendingPct)}%)`, border:true },
                ].map(l=>(
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div style={{ width:10, height:10, background:l.color, borderRadius:3, border:l.border?'1px solid #E2E8F0':undefined }}/>
                    <span className="text-xs" style={{ color:C.muted }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {contractBudget === 0 && (
            <div className="text-center py-4 px-4 rounded-xl" style={{ background:'#FFFBEB', border:'1px solid #FDE68A' }}>
              <p className="text-sm font-medium" style={{ color:'#92400E' }}>No budget set for this contract.</p>
              <p className="text-xs mt-1" style={{ color:'#B45309' }}>Edit the contract to add a budget amount for tracking.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── INVOICES ── */}
      <div className="rounded-2xl overflow-hidden mb-6" style={{ background:C.card, border:`1px solid ${C.border}` }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom:`1px solid #F1F5F9` }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color:C.text }}>Linked Invoices</h2>
            <p className="text-xs mt-0.5" style={{ color:C.muted }}>{invoices.length} invoice{invoices.length!==1?'s':''} · {formatCurrency(totalInvoiced, ccy)} total</p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-3xl mb-3">🧾</div>
            <p className="text-sm font-medium mb-1" style={{ color:C.text }}>No invoices linked yet</p>
            <p className="text-sm mb-4" style={{ color:C.muted }}>Upload an invoice and link it to this contract.</p>
            <Link href="/upload" className="inline-flex text-sm font-semibold px-4 py-2 rounded-xl" style={{ background:'#3B82F6', color:'#fff' }}>
              + Upload Invoice
            </Link>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid px-6 py-2.5 text-xs font-semibold uppercase tracking-widest" style={{ color:'#94A3B8', borderBottom:`1px solid #F1F5F9`, background:'#FAFBFC', gridTemplateColumns:'0.6fr 1.5fr 0.8fr 1fr 1fr 1.3fr' }}>
              <div>#</div><div>Consultant</div><div>Date</div><div>HT</div><div>TTC</div><div>Status</div>
            </div>
            {invoices.map((inv:any) => {
              const st  = INV_STATUS[inv.status] || INV_STATUS.pending_review
              const iccy = inv.currency || ccy
              return (
                <Link key={inv.id} href={`/invoices/${inv.id}`}
                  className="grid px-6 py-3.5 items-center hover:bg-slate-50 transition-colors"
                  style={{ borderBottom:`1px solid #F8FAFC`, gridTemplateColumns:'0.6fr 1.5fr 0.8fr 1fr 1fr 1.3fr' }}
                >
                  <span className="font-mono text-xs px-2 py-0.5 rounded-lg" style={{ background:'#F1F5F9', color:'#64748B' }}>
                    {inv.invoice_number || '—'}
                  </span>
                  <div>
                    <p className="text-sm font-medium truncate" style={{ color:C.text }}>{inv.subcontractor_name || '—'}</p>
                  </div>
                  <p className="text-sm" style={{ color:C.muted }}>{formatDate(inv.invoice_date)}</p>
                  <p className="text-sm" style={{ color:C.text }}>{formatCurrency(inv.amount_ht, iccy)}</p>
                  <p className="text-sm font-bold" style={{ color:C.text }}>{formatCurrency(inv.amount_ttc, iccy)}</p>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold inline-block" style={{ background:st.bg, color:st.color }}>{st.label}</span>
                </Link>
              )
            })}
            {/* Totals footer */}
            <div className="grid px-6 py-3 items-center" style={{ background:'#F8FAFC', borderTop:`1px solid #F1F5F9`, gridTemplateColumns:'0.6fr 1.5fr 0.8fr 1fr 1fr 1.3fr' }}>
              <div className="col-span-3 text-xs font-semibold uppercase tracking-widest" style={{ color:'#94A3B8' }}>Total</div>
              <div/>
              <p className="text-sm font-bold" style={{ color:C.text }}>{formatCurrency(totalInvoiced, ccy)}</p>
              <p className="text-xs font-semibold" style={{ color:'#10B981' }}>{formatCurrency(totalApproved, ccy)} approved</p>
            </div>
          </>
        )}
      </div>

      {/* ── PAYMENT TRANCHES ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom:`1px solid #F1F5F9` }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color:C.text }}>Payment Milestones</h2>
            <p className="text-xs mt-0.5" style={{ color:C.muted }}>{tranchePct}% of tranches paid · {formatCurrency(tranchePaid, ccy)} of {formatCurrency(trancheTotal, ccy)}</p>
          </div>
        </div>

        {tranches.length === 0 ? (
          <p className="text-sm text-center py-10" style={{ color:C.muted }}>No payment milestones set.</p>
        ) : (
          <div>
            {tranches.map((t:any) => {
              const sc = STATUS_COLORS[t.status] || STATUS_COLORS.unpaid
              return (
                <div key={t.id} className="px-6 py-4 flex items-center gap-4" style={{ borderBottom:`1px solid #F8FAFC` }}>
                  <div className="w-16 shrink-0">
                    <span className="text-sm font-bold" style={{ color:C.text }}>{t.tranche_name}</span>
                  </div>
                  <div className="w-36 shrink-0">
                    <p className="text-sm font-semibold" style={{ color:C.text }}>{formatCurrency(t.amount, ccy)}</p>
                    {t.scheduled_date && <p className="text-xs mt-0.5" style={{ color:C.muted }}>{formatDate(t.scheduled_date)}</p>}
                  </div>
                  <div className="flex-1">
                    {t.status === 'paid' ? (
                      <div>
                        <p className="text-xs font-medium" style={{ color:C.muted }}>POP: {t.pop_reference || '—'}</p>
                        <p className="text-xs mt-0.5" style={{ color:C.muted }}>Paid {formatDate(t.paid_date)}</p>
                      </div>
                    ) : ['pending_review','pending_placide','pending_dani','pending_fares'].includes(t.status) ? (
                      <div className="flex items-center gap-2">
                        <Link href="/validations" className="text-xs px-3 py-1.5 rounded-lg font-medium hover:underline" style={{ background:'rgba(59,130,246,0.08)', color:'#3B82F6' }}>
                          In validation pipeline — view in Validations
                        </Link>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => sendToAccounting(t.id)}
                          disabled={marking===t.id}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                          style={{ background:'rgba(59,130,246,0.1)', color:'#3B82F6', border:'1px solid rgba(59,130,246,0.25)' }}
                        >
                          {marking===t.id ? '...' : (
                            <><svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>Send to Accounting</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:sc.bg, color:sc.color }}>{sc.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
