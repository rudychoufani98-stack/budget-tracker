import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'ESG Tracker — Skykapital',
  description: 'Automated budget tracker for ESG contracts',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto" style={{ background: '#F4F6FA' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
