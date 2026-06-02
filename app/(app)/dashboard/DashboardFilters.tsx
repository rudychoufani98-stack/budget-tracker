'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { formatCurrency } from '@/lib/format'

interface ProjectStat {
  id: string
  name: string
  status: string
  committed: number
  paid: number
  pct: number
  contractCount: number
  sectionCount: number
  currency: string
}

interface Props {
  projects: ProjectStat[]
  currentProject: string
  currentSection: string
}

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  active:    { color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  completed: { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  cancelled: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
}

export function DashboardFilters({ projects, currentProject, currentSection }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [showAll, setShowAll] = useState(false)
  const [sections, setSections] = useState<{ id: string; name: string }[]>([])
  const [loadingSections, setLoadingSections] = useState(false)

  const visibleProjects = showAll ? projects : projects.slice(0, 4)
  const hasMore = projects.length > 4

  useEffect(() => {
    if (!currentProject) { setSections([]); return }
    setLoadingSections(true)
    fetch(`/api/sections?project_id=${currentProject}`)
      .then(r => r.json())
      .then(d => { setSections(Array.isArray(d) ? d : []); setLoadingSections(false) })
      .catch(() => setLoadingSections(false))
  }, [currentProject])

  function navigate(projectId: string, sectionId: string) {
    const params = new URLSearchParams()
    if (projectId) params.set('project', projectId)
    if (sectionId) params.set('section', sectionId)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function handleCardClick(id: string) {
    if (currentProject === id) {
      navigate('', '')
    } else {
      navigate(id, '')
    }
  }

  function handleProjectDropdown(e: React.ChangeEvent<HTMLSelectElement>) {
    navigate(e.target.value, '')
  }

  function handleSectionDropdown(e: React.ChangeEvent<HTMLSelectElement>) {
    navigate(currentProject, e.target.value)
  }

  function clearFilters() {
    router.push(pathname)
  }

  const hasFilter = !!(currentProject || currentSection)

  return (
    <div className="mb-6 space-y-3">
      {/* Project cards row */}
      {projects.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {visibleProjects.map(p => {
            const isSelected = currentProject === p.id
            const st = STATUS_STYLES[p.status] || STATUS_STYLES.active
            const pctColor = p.pct >= 80 ? '#EF4444' : p.pct >= 50 ? '#F59E0B' : '#10B981'
            return (
              <button
                key={p.id}
                onClick={() => handleCardClick(p.id)}
                className="rounded-xl px-4 py-3 text-left transition-all hover:shadow-md"
                style={{
                  background: isSelected ? 'rgba(16,185,129,0.06)' : '#FFFFFF',
                  border: isSelected ? '2px solid #10B981' : '1px solid #E2E8F0',
                  minWidth: 180,
                  maxWidth: 220,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold truncate" style={{ color: '#0F172A', maxWidth: 130 }}>{p.name}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold shrink-0 ml-1" style={{ background: st.bg, color: st.color }}>{p.status}</span>
                </div>
                <div className="flex items-center gap-1 mb-1.5">
                  <div className="flex-1 h-1 rounded-full" style={{ background: '#F1F5F9' }}>
                    <div style={{ width: `${Math.min(p.pct, 100)}%`, height: '100%', background: pctColor, borderRadius: 4 }} />
                  </div>
                  <span className="text-xs font-bold shrink-0" style={{ color: pctColor }}>{p.pct}%</span>
                </div>
                <p className="text-xs" style={{ color: '#94A3B8' }}>
                  {formatCurrency(p.paid, p.currency)} / {formatCurrency(p.committed, p.currency)} &middot; {p.contractCount} contract{p.contractCount !== 1 ? 's' : ''}
                </p>
              </button>
            )
          })}
          {hasMore && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="rounded-xl px-4 py-3 text-sm font-medium transition-all"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B' }}
            >
              {showAll ? 'Show less' : `+${projects.length - 4} more`}
            </button>
          )}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={currentProject}
          onChange={handleProjectDropdown}
          className="text-sm px-3 py-2 rounded-lg"
          style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A', outline: 'none' }}
        >
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={currentSection}
          onChange={handleSectionDropdown}
          disabled={!currentProject || loadingSections}
          className="text-sm px-3 py-2 rounded-lg"
          style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', color: currentProject ? '#0F172A' : '#94A3B8', outline: 'none' }}
        >
          <option value="">All Sections</option>
          {sections.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {hasFilter && (
          <button
            onClick={clearFilters}
            className="text-sm px-3 py-2 rounded-lg font-medium transition-all"
            style={{ background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}
          >
            Clear filters
          </button>
        )}

        {hasFilter && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
            Filtered view
          </span>
        )}
      </div>
    </div>
  )
}