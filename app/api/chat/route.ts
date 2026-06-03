import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

export async function POST(req: NextRequest) {
  const deny = await requireAuth(req)
  if (deny) return deny

  const { messages } = await req.json()
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 })
  }

  // Fetch live data to inject as context
  const [projectsRes, contractsRes, tranchesRes, invoicesRes] = await Promise.all([
    supabaseAdmin.from('projects').select('id, name, status, currency'),
    supabaseAdmin.from('contracts').select('id, contract_name, project, project_id, category, contract_amount, currency, status, service_providers(name), contract_tranches(tranche_name, amount, status, scheduled_date)'),
    supabaseAdmin.from('contract_tranches').select('id, tranche_name, amount, status, scheduled_date, contracts(contract_name, project)'),
    supabaseAdmin.from('invoices').select('id, invoice_number, subcontractor_name, amount_ttc, status, invoice_date, submitted_at').order('created_at', { ascending: false }).limit(30),
  ])

  const projects  = projectsRes.data  || []
  const contracts = contractsRes.data || []
  const tranches  = tranchesRes.data  || []
  const invoices  = invoicesRes.data  || []
  const now       = new Date()

  // Compute summary stats
  const totalCommitted = tranches.reduce((s: number, t: any) => s + (t.amount || 0), 0)
  const totalPaid      = tranches.filter((t: any) => t.status === 'paid').reduce((s: number, t: any) => s + (t.amount || 0), 0)
  const overdue        = tranches.filter((t: any) => t.status !== 'paid' && t.scheduled_date && new Date(t.scheduled_date) < now)
  const pendingInv     = invoices.filter((i: any) => ['pending_review','pending_placide','pending_hitech'].includes(i.status))
  const approvedInv    = invoices.filter((i: any) => i.status === 'approved')

  // Per-project stats
  const projectStats = projects.map((p: any) => {
    const pc  = contracts.filter((c: any) => c.project_id === p.id)
    const pt  = tranches.filter((t: any) => pc.some((c: any) => c.id === (t as any).contract_id))
    // Use tranche data from contracts join instead
    const allTranches = pc.flatMap((c: any) => c.contract_tranches || [])
    const committed   = allTranches.reduce((s: number, t: any) => s + (t.amount || 0), 0)
    const paid        = allTranches.filter((t: any) => t.status === 'paid').reduce((s: number, t: any) => s + (t.amount || 0), 0)
    const pct         = committed > 0 ? Math.round((paid / committed) * 100) : 0
    return { name: p.name, status: p.status, currency: p.currency, contracts: pc.length, committed, paid, pct }
  })

  // Build context string
  const context = `
You are a helpful assistant for the SkyKapital ESG Budget Tracker platform.
You have access to live financial data as of ${now.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}.

== PLATFORM OVERVIEW ==
SkyKapital ESG Budget Tracker manages ESG (Environmental, Social, Governance) contracts, invoice validation, and payment tracking for construction/consulting projects in Africa.
Validation workflow: Invoice uploaded -> Step 1 (Rudy, admin) -> Step 2 (Placide, ESG Manager) -> Step 3 (Dany, MD) -> Approved.

== LIVE DATA SUMMARY ==
Total committed: ${totalCommitted.toLocaleString()} (across all contracts)
Total paid: ${totalPaid.toLocaleString()} (${totalCommitted > 0 ? Math.round((totalPaid / totalCommitted) * 100) : 0}% payment rate)
Overdue tranches: ${overdue.length} tranche${overdue.length !== 1 ? 's' : ''} past due date
Pending invoices: ${pendingInv.length} awaiting validation
Approved invoices: ${approvedInv.length} total

== PROJECTS (${projects.length}) ==
${projectStats.map((p: any) => `- ${p.name} [${p.status}]: ${p.contracts} contracts, committed ${p.committed.toLocaleString()} ${p.currency}, paid ${p.paid.toLocaleString()} (${p.pct}%)`).join('\n') || 'No projects yet'}

== CONTRACTS (${contracts.length}) ==
${contracts.slice(0, 20).map((c: any) => {
  const ts   = c.contract_tranches || []
  const cpaid = ts.filter((t: any) => t.status === 'paid').reduce((s: number, t: any) => s + (t.amount || 0), 0)
  const ctotal = ts.reduce((s: number, t: any) => s + (t.amount || 0), 0)
  return `- ${c.contract_name} | ${c.service_providers?.name || 'No consultant'} | ${c.category || 'N/A'} | ${c.project || 'No project'} | ${(c.contract_amount || 0).toLocaleString()} ${c.currency} | Paid: ${cpaid.toLocaleString()} / ${ctotal.toLocaleString()} | Status: ${c.status}`
}).join('\n') || 'No contracts yet'}

== OVERDUE PAYMENTS (${overdue.length}) ==
${overdue.slice(0, 10).map((t: any) => `- ${(t.contracts as any)?.contract_name || 'Unknown'} | ${t.tranche_name} | Due: ${t.scheduled_date} | Amount: ${(t.amount || 0).toLocaleString()}`).join('\n') || 'No overdue payments'}

== RECENT INVOICES (last 30) ==
${invoices.slice(0, 15).map((i: any) => `- #${i.invoice_number || 'N/A'} | ${i.subcontractor_name || 'Unknown'} | ${(i.amount_ttc || 0).toLocaleString()} | ${i.status} | ${i.invoice_date || 'N/A'}`).join('\n') || 'No invoices yet'}

== HOW TO USE THE PLATFORM ==
- Dashboard: overview of all projects, KPIs, alerts
- Projects tab: manage projects and sections
- Contracts tab: all contracts with payment progress
- Upload Invoice: 4 steps - select project/section/contract/consultant, upload PDF, AI scans it, submit for validation
- Validations tab: approve or reject invoices in the workflow
- Payment Register: spreadsheet view of all tranches
- Reports tab: analytics by project, provider, category
- Document Vault: all uploaded PDF invoices
- Settings: user management (admin only), notification preferences

Answer questions clearly and concisely. Use the live data above to give specific numbers when asked.
If asked in French, respond in French. Otherwise respond in English.
Keep answers short and practical unless the user asks for detail.
`.trim()

  // Call Groq API (OpenAI-compatible)
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) {
    return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 })
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: context },
        ...messages.slice(-10), // last 10 messages for context window
      ],
      max_tokens: 600,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('Groq error:', err)
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 502 })
  }

  const data = await response.json()
  const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.'
  return NextResponse.json({ reply })
}