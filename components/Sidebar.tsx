'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

const BG   = '#0D1117'
const CARD = '#161B22'

const nav = [
  {
    href: '/dashboard', label: 'Dashboard',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  },
  {
    href: '/contracts', label: 'Contracts',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>,
  },
  {
    href: '/payment-register', label: 'Payment Register',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>,
  },
  {
    href: '/invoices', label: 'Invoices',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  },
  {
    href: '/validations', label: 'Validations',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  },
  {
    href: '/providers', label: 'Service Providers',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    href: '/vault', label: 'Document Vault',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    href: '/reports', label: 'Reports',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  },
  {
    href: '/settings', label: 'Settings',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [user, setUser]               = useState<{ name: string; email: string; role: string } | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({
        name:  data.user.user_metadata?.name  || data.user.email?.split('@')[0] || 'User',
        email: data.user.email || '',
        role:  data.user.user_metadata?.role  || 'viewer',
      })
    })
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = user?.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <aside className="w-56 min-h-screen flex flex-col shrink-0" style={{ background: BG, borderRight: '1px solid #1F2937' }}>
      {/* Logo */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom: '1px solid #1F2937' }}>
        <div className="rounded-xl px-3 py-2.5 flex items-center justify-center" style={{ background: '#fff' }}>
          <Image src="/logo.png" alt="Skykapital" width={130} height={38} priority style={{ objectFit: 'contain' }} />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        <p className="text-xs font-medium uppercase tracking-widest px-3 mb-3" style={{ color: '#4B5563' }}>Menu</p>
        <ul className="space-y-0.5">
          {nav.map(({ href, label, icon }) => {
            const active = href === '/dashboard'
              ? pathname === '/' || pathname.startsWith('/dashboard')
              : pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all"
                  style={active
                    ? { background: 'rgba(59,130,246,0.15)', color: '#3B82F6', fontWeight: 500 }
                    : { color: '#6B7280' }
                  }
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = '#1F2937'; (e.currentTarget as HTMLElement).style.color = '#D1D5DB' } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B7280' } }}
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
      <div className="px-3 py-3 relative" style={{ borderTop: '1px solid #1F2937' }} ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(o => !o)}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all"
          style={{ color: '#9CA3AF' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1F2937'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0" style={{ background: '#3B82F6' }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-xs font-medium truncate" style={{ color: '#F9FAFB' }}>{user?.name || '...'}</p>
            <p className="text-xs truncate" style={{ color: '#4B5563' }}>{user?.email || ''}</p>
          </div>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: '#4B5563', flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {dropdownOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1 rounded-xl overflow-hidden shadow-xl z-50" style={{ background: '#1A2235', border: '1px solid #374151' }}>
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid #1F2937' }}>
              <p className="text-xs font-medium" style={{ color: '#F9FAFB' }}>{user?.name}</p>
              <p className="text-xs mt-0.5" style={{ color: '#4B5563' }}>{user?.role}</p>
            </div>
            <Link
              href="/settings"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-xs transition-colors"
              style={{ color: '#9CA3AF' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1F2937'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Manage Users
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors"
              style={{ color: '#EF4444' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1F2937'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}