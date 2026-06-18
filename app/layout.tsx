import type { Metadata } from 'next'
import './globals.css'

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="white"/><path d="M50 10 Q50 50 90 50 Q50 50 50 90 Q50 50 10 50 Q50 50 50 10 Z" fill="%231a3c5e"/></svg>`

export const metadata: Metadata = {
  title: 'SkyKapital ESG Budget Tracker',
  description: 'ESG contract budget management and invoice validation platform — SkyKapital Europe',
  robots: 'noindex, nofollow',
  icons: {
    icon: `data:image/svg+xml,${faviconSvg}`,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
