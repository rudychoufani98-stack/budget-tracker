import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ESG Tracker — Skykapital',
  description: 'Automated budget tracker for ESG contracts',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
