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
    <header
      className="sticky top-0 z-50 border-b"
      style={{ background: '#111827', borderColor: '#1F2937' }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Logo */}
        <Link href="/dashboard" className="shrink-0">
          <Image
            src="/logo.png"
            alt="Skykapital"
            width={140}
            height={40}
            className="brightness-0 invert opacity-90"
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
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={
                  active
                    ? { color: '#10B981', background: 'rgba(16,185,129,0.1)' }
                    : { color: '#9CA3AF' }
                }
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = '#F9FAFB'
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = '#9CA3AF'
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
            <p className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Rudy Choufani</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Administrator</p>
          </div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: '#10B981' }}
          >
            RC
          </div>
        </div>
      </div>
    </header>
  )
}
