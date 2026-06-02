'use client'
import { useEffect, useState, useRef } from 'react'
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
  const [view,        setView]       = useState<'native'|'ngn'|'usd'>('native')
  const [editing,     setEditing]    = useState(false)
  const [editData,    setEditData]   = useState<any>({})
  const [savingEdit,  setSavingEdit] = useState(false)
  const [contractDoc, setContractDoc] = useState<any>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const contractFileRef = useRef<HTMLInputElement>(null)
  const [editingSchedule, setEditingSchedule] = useState(false)
  const [scheduleEdits, setScheduleEdits] = useState<Record<string,any>>({})
  const [savingSchedule, setSavingSchedule] = useState(false)

  async function uploadContractPdf(file: File) {
    setUploadingDoc(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('path', `contracts/${id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`)
    const res = await fetch('/api/storage/upload', { method: 'POST', body: fd })
    const { signedUrl, error } = await res.json()
    if (error) { alert(`Upload failed: ${error}`); setUploadingDoc(false); return }
    // Save to documents table
    await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract_id: id, filename: file.name, file_url: signedUrl, file_type: 'contract' }) })
    await loadContractDoc()
    setUploadingDoc(false)
  }

  async function loadContractDoc() {
    const res = await fetch(`/api/documents?contract_id=${id}&file_type=contract`)
    const data = await res.json()
    if (Array.isArray(data) && data.length > 0) setContractDoc(data[0])
  }

  async function saveEdit() {
    setSavingEdit(true)
    await fetch(`/api/contracts/${id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        contract_name:    editData.contract_name,
        contract_amount:  parseFloat(editData.contract_amount) || 0,
        currency:         editData.currency,
        category:         editData.category,
        status:           editData.status,
        start_date:       editData.start_date || null,
        end_date:         editData.end_date || null,
        description:      editData.description || null,
      })
    })
    await load()
    setSavingEdit(false); setEditing(false)
  }

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

  useEffect(() => { load(); loadContractDoc() }, [id])

  async function sendToAccounting(trancheId: string) {
    setMarking(trancheId)
    await fetch(`/api/tranches/${trancheId}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ status: 'pending_review' }),
    })
    await load()
    setMarking(null)
  }

  async function markMilestoneAchieved(trancheId: string) {
    setMarking(trancheId)
    const today = new Date().toISOString().split('T')[0]
    await fetch(`/api/tranches/${trancheId}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ status: 'pending_review', scheduled_date: today }),
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

  function openScheduleEditor() {
    const edits: Record<string,any> = {}
    tranches.forEach((t:any) => {
      edits[t.id] = { tranche_name: t.tranche_name, amount: t.amount, scheduled_date: t.scheduled_date || '', notes: t.notes || '' }
    })
    setScheduleEdits(edits)
    setEditingSchedule(true)
  }

  async function saveSchedule() {
    setSavingSchedule(true)
    await Promise.all(
      Object.entries(scheduleEdits).map(([tid, vals]) =>
        fetch(`/api/tranches/${tid}`, {
          method:'PATCH', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ tranche_name: vals.tranche_name, amount: Number(vals.amount), scheduled_date: vals.scheduled_date || null, notes: vals.notes || null }),
        })
      )
    )
    await load()
    setSavingSchedule(false)
    setEditingSchedule(false)
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

  // ── Currency setup (must be first) ────────────────────────────────
  const signingRate = contract.fx_rate_at_signing || 1580
  const hasRate     = !!contract.fx_rate_at_signing
  const nativeCcy   = contract.currency || 'NGN'
  const displayCcy  = view === 'native' ? nativeCcy : view === 'ngn' ? 'NGN' : 'USD'
  const catColor    = ESG_COLORS[contract.category] || ESG_COLORS.Other

  // Convert invoice to contract's native currency for budget calculations
  function invToContractCcy(inv: any): number {
    const amt    = inv.amount_ttc || 0
    const invCcy = inv.currency || nativeCcy
    if (!amt || invCcy === nativeCcy) return amt
    const rate = contract.fx_rate_at_signing || 1580
    if (invCcy === 'USD' && nativeCcy === 'NGN') return amt * rate
    if (invCcy === 'NGN' && nativeCcy === 'USD') return amt / rate
    return amt
  }

  // Convert invoice to display currency for the invoice table rows
  function invDisplayAmount(inv: any): number {
    const amt    = inv.amount_ttc || 0
    const invCcy = inv.currency || nativeCcy
    if (invCcy === displayCcy) return amt
    if (invCcy === 'USD' && displayCcy === 'NGN') return amt * signingRate
    if (invCcy === 'NGN' && displayCcy === 'USD') return amt / signingRate
    return amt
  }
  function invDisplayHT(inv: any): number {
    const amt    = inv.amount_ht || 0
    const invCcy = inv.currency || nativeCcy
    if (invCcy === displayCcy) return amt
    if (invCcy === 'USD' && displayCcy === 'NGN') return amt * signingRate
    if (invCcy === 'NGN' && displayCcy === 'USD') return amt / signingRate
    return amt
  }

  // ── Budget & invoice calculations ──────────────────────────────────
  const contractBudget  = contract.contract_amount || contract.total_budget || 0
  const ccy             = nativeCcy

  const nonRejected  = invoices.filter((i:any) => i.status !== 'rejected')
  const approvedInvs = invoices.filter((i:any) => i.status === 'approved')
  const pendingInvs  = invoices.filter((i:any) => !['approved','rejected'].includes(i.status))

  const totalInvoiced = nonRejected.reduce((s:number,i:any) => s + invToContractCcy(i), 0)
  const totalApproved = approvedInvs.reduce((s:number,i:any) => s + invToContractCcy(i), 0)
  const totalPending  = pendingInvs.reduce((s:number,i:any)  => s + invToContractCcy(i), 0)
  const remaining     = contractBudget - totalApproved
  const approvedPct   = contractBudget > 0 ? Math.min(100, Math.round((totalApproved/contractBudget)*100)) : 0
  const pendingPct    = contractBudget > 0 ? Math.min(100-approvedPct, Math.round((totalPending/contractBudget)*100)) : 0

  // Tranche-based tracking
  const tranchePaid  = tranches.filter((t:any)=>t.status==='paid').reduce((s:number,t:any)=>s+(t.amount||0),0)
  const trancheTotal = tranches.reduce((s:number,t:any)=>s+(t.amount||0),0)
  const tranchePct   = trancheTotal > 0 ? Math.round((tranchePaid/trancheTotal)*100) : 0


  function cvt(amount: number): number {
    if (view === 'native' || nativeCcy === displayCcy) return amount
    if (view === 'ngn') {
      if (nativeCcy === 'USD') return amount * signingRate
      return amount
    }
    // view === 'usd'
    if (nativeCcy === 'NGN') return amount / signingRate
    return amount
  }
  function fc(amount: number) { return formatCurrency(cvt(amount), displayCcy) }

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
          <div className="flex-1 min-w-0 mr-4">
            {!editing ? (
              <>
                <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                  <h1 className="text-2xl font-bold" style={{ color:C.text }}>{contract.contract_name}</h1>
                  {contract.category && <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:`${catColor}18`, color:catColor }}>{contract.category}</span>}
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold capitalize" style={{ background:'rgba(59,130,246,0.1)', color:'#3B82F6' }}>{contract.status}</span>
                  {contract.payment_type === 'milestone_based' && <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:'rgba(139,92,246,0.1)', color:'#8B5CF6' }}>🎯 Milestone-based</span>}
                </div>
                <div className="flex items-center gap-3 text-sm flex-wrap" style={{ color:C.muted }}>
                  {contract.service_providers?.name && <span>{contract.service_providers.name}</span>}
                  {contract.project && <span>{contract.project}</span>}
                  {contract.start_date && <span>{formatDate(contract.start_date)}</span>}
                  {contract.end_date && <span>→ {formatDate(contract.end_date)}</span>}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color:C.muted }}>Contract Name</label>
                    <input className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ background:'#F8FAFC', border:'1.5px solid #3B82F6', color:C.text }}
                      value={editData.contract_name||''} onChange={e=>setEditData((p:any)=>({...p,contract_name:e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color:C.muted }}>Total Amount</label>
                    <input type="number" className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:C.text }}
                      value={editData.contract_amount||''} onChange={e=>setEditData((p:any)=>({...p,contract_amount:e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color:C.muted }}>Currency</label>
                    <select className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:C.text }}
                      value={editData.currency||'NGN'} onChange={e=>setEditData((p:any)=>({...p,currency:e.target.value}))}>
                      <option value="NGN">NGN</option><option value="USD">USD</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color:C.muted }}>Category</label>
                    <select className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:C.text }}
                      value={editData.category||'E'} onChange={e=>setEditData((p:any)=>({...p,category:e.target.value}))}>
                      <option value="E">E - Environmental</option><option value="S">S - Social</option>
                      <option value="G">G - Governance</option><option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color:C.muted }}>Status</label>
                    <select className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:C.text }}
                      value={editData.status||'active'} onChange={e=>setEditData((p:any)=>({...p,status:e.target.value}))}>
                      <option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color:C.muted }}>Start Date</label>
                    <input type="date" className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:C.text }}
                      value={editData.start_date||''} onChange={e=>setEditData((p:any)=>({...p,start_date:e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color:C.muted }}>End Date</label>
                    <input type="date" className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:C.text }}
                      value={editData.end_date||''} onChange={e=>setEditData((p:any)=>({...p,end_date:e.target.value}))} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color:C.muted }}>Description</label>
                    <textarea rows={2} className="w-full px-3 py-2 text-sm rounded-xl outline-none resize-none" style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:C.text }}
                      value={editData.description||''} onChange={e=>setEditData((p:any)=>({...p,description:e.target.value}))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveEdit} disabled={savingEdit} className="text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-50" style={{ background:'#3B82F6', color:'#fff' }}>
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={()=>setEditing(false)} className="text-xs px-4 py-2 rounded-xl" style={{ background:'#F1F5F9', color:C.muted }}>Cancel</button>
                </div>
              </div>
            )}
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
          <div className="flex items-center gap-2">
            {!editing && (
              <button onClick={()=>{ setEditData({ contract_name:contract.contract_name, contract_amount:contract.contract_amount||'', currency:contract.currency||'NGN', category:contract.category||'E', status:contract.status||'active', start_date:contract.start_date||'', end_date:contract.end_date||'', description:contract.description||'' }); setEditing(true) }}
                className="text-xs font-medium px-3 py-2 rounded-xl" style={{ background:'#F1F5F9', color:'#475569' }}>
                Edit
              </button>
            )}
            {/* Currency toggle — only show when contract is not NGN */}
            {nativeCcy !== 'NGN' && (
              <div className="flex items-center rounded-xl overflow-hidden" style={{ border:'1px solid #E2E8F0' }}>
                <button onClick={()=>setView('native')} className="px-3 py-1.5 text-xs font-bold transition-colors"
                  style={view==='native'?{background:'#0F172A',color:'#fff'}:{background:'#FFFFFF',color:'#64748B'}}>
                  {nativeCcy}
                </button>
                <button onClick={()=>setView('ngn')} disabled={!hasRate} title={!hasRate?'Set signing rate first':''}
                  className="px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-40"
                  style={view==='ngn'?{background:'#0F172A',color:'#fff'}:{background:'#FFFFFF',color:'#64748B'}}>
                  NGN
                </button>
              </div>
            )}
            {nativeCcy !== 'USD' && (
              <div className="flex items-center rounded-xl overflow-hidden" style={{ border:'1px solid #E2E8F0' }}>
                <button onClick={()=>setView('native')} className="px-3 py-1.5 text-xs font-bold transition-colors"
                  style={view==='native'?{background:'#0F172A',color:'#fff'}:{background:'#FFFFFF',color:'#64748B'}}>
                  {nativeCcy}
                </button>
                <button onClick={()=>setView('usd')} disabled={!hasRate} title={!hasRate?'Set signing rate first':''}
                  className="px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-40"
                  style={view==='usd'?{background:'#0F172A',color:'#fff'}:{background:'#FFFFFF',color:'#64748B'}}>
                  USD
                </button>
              </div>
            )}
            <button onClick={handleDelete} disabled={deleting} className="text-xs font-medium px-3 py-2 rounded-xl disabled:opacity-50" style={{ background:'rgba(239,68,68,0.08)', color:'#EF4444' }}>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* ── CONTRACT DOCUMENT ── */}
      <div className="rounded-2xl overflow-hidden mb-6" style={{ background:C.card, border:`1px solid ${C.border}` }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid #F1F5F9' }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color:C.text }}>Contract Document</h2>
            <p className="text-xs mt-0.5" style={{ color:C.muted }}>Signed contract PDF</p>
          </div>
          <div className="flex items-center gap-2">
            {contractDoc && (
              <a href={contractDoc.file_url} target="_blank" rel="noreferrer"
                className="text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5"
                style={{ background:'rgba(59,130,246,0.1)', color:'#3B82F6' }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Open PDF
              </a>
            )}
            <button onClick={() => contractFileRef.current?.click()} disabled={uploadingDoc}
              className="text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 disabled:opacity-50"
              style={{ background:'#3B82F6', color:'#fff' }}>
              {uploadingDoc
                ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Uploading...</>
                : <><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{contractDoc ? 'Replace PDF' : 'Upload Contract PDF'}</>
              }
            </button>
            <input ref={contractFileRef} type="file" accept=".pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadContractPdf(f); e.target.value = '' }} />
          </div>
        </div>
        <div className="px-6 py-4">
          {contractDoc ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background:'#F8FAFC', border:'1px solid #E2E8F0' }}>
              <svg width="20" height="20" fill="none" stroke="#EF4444" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color:C.text }}>{contractDoc.filename}</p>
                <p className="text-xs" style={{ color:C.muted }}>
                  Uploaded {new Date(contractDoc.uploaded_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
                </p>
              </div>
              <a href={contractDoc.file_url} target="_blank" rel="noreferrer"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                style={{ background:'rgba(59,130,246,0.1)', color:'#3B82F6' }}>
                View
              </a>
            </div>
          ) : (
            <div className="text-center py-6 rounded-xl" style={{ border:'1px dashed #E2E8F0', background:'#F8FAFC' }}>
              <svg width="32" height="32" fill="none" stroke="#CBD5E1" strokeWidth="1.5" viewBox="0 0 24 24" className="mx-auto mb-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <p className="text-sm" style={{ color:'#94A3B8' }}>No contract PDF uploaded yet</p>
              <button onClick={() => contractFileRef.current?.click()}
                className="text-xs font-semibold mt-2 px-3 py-1.5 rounded-lg"
                style={{ background:'#3B82F6', color:'#fff' }}>
                Upload PDF
              </button>
            </div>
          )}
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
              { label:'Contract Budget', value:fc(contractBudget),  color:'#3B82F6', bg:'#EFF6FF',  icon:'💰' },
              { label:'Total Invoiced',  value:fc(totalInvoiced),  color:'#8B5CF6', bg:'#F5F3FF',  icon:'🧾' },
              { label:'Approved',        value:fc(totalApproved),  color:'#10B981', bg:'#F0FDF4',  icon:'✅' },
              { label:'Remaining',       value:fc(remaining),      color:remaining<0?'#EF4444':remaining<contractBudget*0.2?'#F59E0B':'#0F172A', bg:remaining<0?'#FEF2F2':'#F8FAFC', icon:'📊' },
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
                    title={`Approved: ${fc(totalApproved)}`}/>
                )}
                {/* Pending — amber */}
                {pendingPct > 0 && (
                  <div style={{ width:`${pendingPct}%`, background:'#F59E0B', transition:'width 0.5s' }}
                    title={`Pending: ${fc(totalPending)}`}/>
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
            <p className="text-xs mt-0.5" style={{ color:C.muted }}>{invoices.length} invoice{invoices.length!==1?'s':''} · {fc(totalInvoiced)} total</p>
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
                  <p className="text-sm" style={{ color:C.text }}>{formatCurrency(invDisplayHT(inv), displayCcy)}</p>
                  <p className="text-sm font-bold" style={{ color:C.text }}>{formatCurrency(invDisplayAmount(inv), displayCcy)}</p>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold inline-block" style={{ background:st.bg, color:st.color }}>{st.label}</span>
                </Link>
              )
            })}
            {/* Totals footer */}
            <div className="grid px-6 py-3 items-center" style={{ background:'#F8FAFC', borderTop:`1px solid #F1F5F9`, gridTemplateColumns:'0.6fr 1.5fr 0.8fr 1fr 1fr 1.3fr' }}>
              <div className="col-span-3 text-xs font-semibold uppercase tracking-widest" style={{ color:'#94A3B8' }}>Total</div>
              <div/>
              <p className="text-sm font-bold" style={{ color:C.text }}>{fc(totalInvoiced)}</p>
              <p className="text-xs font-semibold" style={{ color:'#10B981' }}>{fc(totalApproved)} approved</p>
            </div>
          </>
        )}
      </div>

      {/* ── PAYMENT TRANCHES ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom:`1px solid #F1F5F9` }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color:C.text }}>Payment Milestones</h2>
            <p className="text-xs mt-0.5" style={{ color:C.muted }}>
            {contract.payment_type === 'milestone_based' ? '🎯 Milestone-based' : '📅 Date-based'} · {tranchePct}% paid · {fc(tranchePaid)} of {fc(trancheTotal)}
          </p>
          </div>
          {tranches.length > 0 && (
            <button onClick={openScheduleEditor}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              style={{ background:'rgba(59,130,246,0.08)', color:'#3B82F6', border:'1px solid rgba(59,130,246,0.2)' }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit Schedule
            </button>
          )}
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
                  <div className="w-44 shrink-0">
                    <p className="text-sm font-semibold" style={{ color:C.text }}>{fc(t.amount)}</p>
                    {t.scheduled_date && <p className="text-xs mt-0.5" style={{ color:C.muted }}>{formatDate(t.scheduled_date)}</p>}
                    {!t.scheduled_date && t.notes && (
                      <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color:'#8B5CF6' }}>
                        <span>🎯</span>
                        <span className="truncate max-w-[140px]" title={t.notes}>{t.notes}</span>
                      </p>
                    )}
                    {!t.scheduled_date && !t.notes && contract.payment_type === 'milestone_based' && (
                      <p className="text-xs mt-0.5" style={{ color:'#CBD5E1' }}>No milestone set</p>
                    )}
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
                    ) : (() => {
                      // Find invoice linked to this tranche
                      const linkedInv = invoices.find((inv:any) => inv.tranche_id === t.id)
                      const uploadUrl = `/upload?contract=${id}&tranche=${t.id}&project=${contract.project_id || ''}`

                      if (linkedInv) {
                        // Invoice exists — show its status
                        const invSt = INV_STATUS[linkedInv.status] || INV_STATUS.pending_review
                        return (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/invoices/${linkedInv.id}`}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                              style={{ background:invSt.bg, color:invSt.color }}>
                              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                              Invoice #{linkedInv.invoice_number || '—'} · {invSt.label}
                            </Link>
                          </div>
                        )
                      }

                      // No invoice yet
                      if (contract.payment_type === 'milestone_based') {
                        return (
                          <div className="flex flex-col gap-1.5">
                            {t.notes && (
                              <p className="text-xs px-3 py-1.5 rounded-lg" style={{ background:'rgba(139,92,246,0.08)', color:'#8B5CF6', border:'1px solid rgba(139,92,246,0.2)' }}>
                                🎯 {t.notes}
                              </p>
                            )}
                            <p className="text-xs" style={{ color:'#94A3B8' }}>Waiting for consultant invoice</p>
                            <Link href={uploadUrl}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 w-fit"
                              style={{ background:'rgba(139,92,246,0.1)', color:'#8B5CF6', border:'1px solid rgba(139,92,246,0.25)' }}>
                              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              Upload Invoice for this milestone
                            </Link>
                          </div>
                        )
                      }

                      return (
                        <div className="flex items-center gap-2">
                          <p className="text-xs" style={{ color:'#94A3B8' }}>No invoice yet</p>
                          <Link href={uploadUrl}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                            style={{ background:'rgba(59,130,246,0.1)', color:'#3B82F6', border:'1px solid rgba(59,130,246,0.25)' }}>
                            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Upload Invoice
                          </Link>
                        </div>
                      )
                    })()}
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background:sc.bg, color:sc.color }}>{sc.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── EDIT SCHEDULE MODAL ── */}
      {editingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background:C.card, border:`1px solid ${C.border}` }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom:`1px solid ${C.border}` }}>
              <h2 className="text-sm font-bold" style={{ color:C.text }}>Edit Payment Schedule</h2>
              <button onClick={() => setEditingSchedule(false)} style={{ color:C.muted }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
              {tranches.map((t:any) => {
                const e = scheduleEdits[t.id] || {}
                return (
                  <div key={t.id} className="rounded-xl p-4 flex flex-col gap-3" style={{ background:'#F8FAFC', border:`1px solid ${C.border}` }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background:'rgba(59,130,246,0.1)', color:'#3B82F6' }}>{e.tranche_name}</span>
                      {t.status === 'paid' && <span className="text-xs font-semibold" style={{ color:'#10B981' }}>Paid — amounts locked</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color:C.muted }}>Name</label>
                        <input value={e.tranche_name || ''} disabled={t.status === 'paid'}
                          onChange={ev => setScheduleEdits(prev => ({ ...prev, [t.id]: { ...prev[t.id], tranche_name: ev.target.value } }))}
                          className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                          style={{ border:`1px solid ${C.border}`, background: t.status === 'paid' ? '#F1F5F9' : '#fff', color:C.text }} />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color:C.muted }}>Amount ({contract.currency})</label>
                        <input type="number" value={e.amount || ''} disabled={t.status === 'paid'}
                          onChange={ev => setScheduleEdits(prev => ({ ...prev, [t.id]: { ...prev[t.id], amount: ev.target.value } }))}
                          className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                          style={{ border:`1px solid ${C.border}`, background: t.status === 'paid' ? '#F1F5F9' : '#fff', color:C.text }} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color:C.muted }}>
                        {contract.payment_type === 'milestone_based' ? 'Milestone description' : 'Scheduled date'}
                      </label>
                      {contract.payment_type === 'milestone_based' ? (
                        <input value={e.notes || ''} disabled={t.status === 'paid'}
                          onChange={ev => setScheduleEdits(prev => ({ ...prev, [t.id]: { ...prev[t.id], notes: ev.target.value } }))}
                          placeholder="e.g. Submission of Draft HRRA Report"
                          className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                          style={{ border:`1px solid ${C.border}`, background: t.status === 'paid' ? '#F1F5F9' : '#fff', color:C.text }} />
                      ) : (
                        <input type="date" value={e.scheduled_date || ''} disabled={t.status === 'paid'}
                          onChange={ev => setScheduleEdits(prev => ({ ...prev, [t.id]: { ...prev[t.id], scheduled_date: ev.target.value } }))}
                          className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                          style={{ border:`1px solid ${C.border}`, background: t.status === 'paid' ? '#F1F5F9' : '#fff', color:C.text }} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop:`1px solid ${C.border}` }}>
              <button onClick={() => setEditingSchedule(false)} className="text-sm px-4 py-2 rounded-lg" style={{ border:`1px solid ${C.border}`, color:C.muted }}>
                Cancel
              </button>
              <button onClick={saveSchedule} disabled={savingSchedule}
                className="text-sm font-semibold px-4 py-2 rounded-lg"
                style={{ background:'#3B82F6', color:'#fff', opacity: savingSchedule ? 0.6 : 1 }}>
                {savingSchedule ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
