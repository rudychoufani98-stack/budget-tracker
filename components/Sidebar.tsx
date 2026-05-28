'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const nav = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/invoices',
    label: 'Invoices',
    icon: (
      <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="13" y2="17" />
      </svg>
    ),
  },
  {
    href: '/upload',
    label: 'Upload Invoice',
    icon: (
      <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-60 min-h-screen flex flex-col shrink-0"
      style={{ background: '#0C1F52' }}
    >
      {/* Logo */}
      <div className="px-6 pt-7 pb-6 border-b border-white/10">
        <Image
          src="/logo.png"
          alt="Skykapital"
          width={160}
          height={48}
          className="brightness-0 invert"
          priority
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Menu
        </p>
        <ul className="space-y-1">
          {nav.map(({ href, label, icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'text-white'
                      : 'hover:bg-white/5'
                  }`}
                  style={active ? { background: 'rgba(255,255,255,0.12)' } : { color: 'rgba(255,255,255,0.55)' }}
                >
                  {icon}
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="px-4 py-5 border-t border-white/10">
        <div className="flex items-center gap-3 px-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            RC
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">Rudy Choufani</p>
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
