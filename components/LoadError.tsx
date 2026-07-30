'use client'

// Shown when a page's data fetch fails, instead of an endless spinner.
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl p-10 text-center" style={{ background: '#FFFFFF', border: '1px solid #FECACA' }}>
      <p className="text-sm font-semibold mb-1" style={{ color: '#0F172A' }}>Could not load data</p>
      <p className="text-sm mb-4" style={{ color: '#64748B' }}>Check your connection and try again.</p>
      <button
        onClick={onRetry}
        className="text-sm font-semibold px-4 py-2 rounded-xl"
        style={{ background: '#3B82F6', color: '#fff' }}
      >
        Retry
      </button>
    </div>
  )
}

// Consistent in-content loading spinner (never blanks the whole page).
export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  )
}
