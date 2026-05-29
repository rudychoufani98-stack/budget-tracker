import { Sidebar } from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#0F172A' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto" style={{ background: '#0F172A' }}>
        {children}
      </main>
    </div>
  )
}
