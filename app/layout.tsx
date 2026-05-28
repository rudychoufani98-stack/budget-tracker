import type { Metadata } from 'next'
import './globals.css'
import { TopNav } from '@/components/TopNav'

export const metadata: Metadata = {
  title: 'ESG Tracker — Skykapital',
  description: 'Automated budget tracker for ESG contracts',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        <main className="min-h-screen" style={{ background: '#0A0F1E' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
