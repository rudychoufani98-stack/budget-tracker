import { supabaseAdmin } from '@/lib/supabase'
import { formatCurrency } from '@/lib/format'
import Link from 'next/link'

export const revalidate = 0

const C = { card:'#FFFFFF', border:'#E2E8F0', border2:'#CBD5E1', green:'#10B981', amber:'#F59E0B', red:'#EF4444', blue:'#3B82F6', muted:'#64748B', text:'#0F172A' }

export default async function ProjectsPage() {
  const { data: contracts } = await supabaseAdmin
    .from('contracts')
    .select('id, contract_name, project, category, client_name, contract_amount, contract_tranches(id, amount, status), invoices(id, status)')

  const all = contracts || []

  // Group by project name
  const map: Record<string, typeof all> = {}
  for (const c of all) {
    const key = c.project?.trim() || 'Unassigned'
    if (!map[key]) map[key] = []
    map[key].push(c)
  }

  const projects = Object.entries(map).map(([name, ctrs]) => {
    const committed = ctrs.reduce((s, c) => s + (c.contract_tranches||[]).reduce((ts:number, t:any) => ts + (t.amount||0), 0), 0)
    const paid      = ctrs.reduce((s, c) => s + (c.contract_tranches||[]).filter((t:any)=>t.status==='paid').reduce((ts:number,t:any)=>ts+(t.amount||0),0),0)
    const invoices  = ctrs.reduce((s, c) => s + (c.invoices||[]).length, 0)
    const pending   = ctrs.reduce((s, c) => s + (c.invoices||[]).filter((i:any)=>i.status!=='approved'&&i.status!=='rejected').length, 0)
    const pct       = committed > 0 ? Math.round((paid/committed)*100) : 0
    return { name, contracts: ctrs, committed, paid, invoices, pending, pct }
  }).sort((a,b) => b.committed - a.committed)

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: C.muted }}>Finance</p>
        <h1 className="text-2xl font-medium" style={{ color: C.text }}>Projects</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>{projects.length} project{projects.length !== 1 ? 's' : ''} · {all.length} contracts total</p>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <p className="text-sm" style={{ color: C.muted }}>No projects yet. Add a project name when creating contracts.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map(proj => (
            <Link
              key={proj.name}
              href={`/projects/${encodeURIComponent(proj.name)}`}
              className="block rounded-2xl p-5 hover:shadow-md transition-shadow"
              style={{ background: C.card, border: `1px solid ${C.border}` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base font-semibold" style={{ color: C.text }}>{proj.name}</h2>
                    {proj.pending > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background:'rgba(245,158,11,0.1)', color: C.amber }}>
                        {proj.pending} pending
                      </span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: C.muted }}>
                    {proj.contracts.length} contract{proj.contracts.length !== 1 ? 's' : ''} · {proj.invoices} invoice{proj.invoices !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold" style={{ color: C.text }}>{formatCurrency(proj.committed)}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>{formatCurrency(proj.paid)} paid · {proj.pct}%</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: C.border }}>
                <div className="h-full rounded-full" style={{ width: `${proj.pct}%`, background: proj.pct >= 80 ? C.green : proj.pct >= 40 ? C.amber : C.blue }} />
              </div>

              {/* Contract pills */}
              <div className="flex flex-wrap gap-2">
                {proj.contracts.slice(0, 5).map((c:any) => (
                  <span key={c.id} className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#F1F5F9', color: C.muted }}>
                    {c.contract_name}
                  </span>
                ))}
                {proj.contracts.length > 5 && (
                  <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#F1F5F9', color: C.muted }}>
                    +{proj.contracts.length - 5} more
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}