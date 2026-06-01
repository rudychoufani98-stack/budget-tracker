import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SkyKapital ESG Budget Tracker',
  description: 'ESG contract budget management and invoice validation platform — SkyKapital Europe',
  robots: 'noindex, nofollow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
