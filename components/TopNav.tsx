'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/contracts', label: 'Contracts' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/upload', label: 'Upload' },
]

export function TopNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50" style={{ background: '#0C1F52' }}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Logo */}
        <Link href="/dashboard" className="shrink-0">
          <Image
            src="/logo.png"
            alt="Skykapital"
            width={140}
            height={40}
            className="brightness-0 invert opacity-95"
            priority
          />
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {links.map(({ href, label }) => {
            const active = href === '/dashboard'
              ? pathname === '/' || pathname.startsWith('/dashboard')
              : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={
                  active
                    ? { color: '#fff', background: 'rgba(255,255,255,0.15)' }
                    : { color: 'rgba(255,255,255,0.6)' }
                }
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = '#fff'
                    ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  }
                }}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User avatar */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-white">Rudy Choufani</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Administrator</p>
          </div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            RC
          </div>
        </div>
      </div>
    </header>
  )
}
