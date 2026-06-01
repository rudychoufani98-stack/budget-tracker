import { Sidebar } from '@/components/Sidebar'
import { ChatBot } from '@/components/ChatBot'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#F8FAFC' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto" style={{ background: '#F8FAFC' }}>
        {children}
      </main>
      <ChatBot />
    </div>
  )
}
