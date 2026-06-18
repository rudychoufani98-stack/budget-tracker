'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Invalid credentials. Please try again.')
      setLoading(false)
    } else {
      router.push('/dashboard'); router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#0A0F1E' }}>

      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }}/>

      {/* Glow blobs */}
      <div className="absolute rounded-full blur-3xl pointer-events-none" style={{ top: '-100px', left: '20%', width: '400px', height: '400px', background: 'rgba(59,130,246,0.15)' }}/>
      <div className="absolute rounded-full blur-3xl pointer-events-none" style={{ bottom: '-100px', right: '20%', width: '350px', height: '350px', background: 'rgba(139,92,246,0.12)' }}/>

      {/* Card */}
      <div className="relative w-full max-w-md mx-4">

        {/* Logo on white pill */}
        <div className="flex justify-center mb-8">
          <div className="rounded-2xl px-6 py-3.5 shadow-xl flex items-center gap-2.5" style={{ background: '#FFFFFF' }}>
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="32" height="32" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
              <path d="M50 3 Q50 50 97 50 Q50 50 50 97 Q50 50 3 50 Q50 50 50 3 Z" fill="#1a3c5e" />
            </svg>
            <span style={{ color: '#1a3c5e', fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em' }}>Skykapital</span>
          </div>
        </div>

        {/* Glass box */}
        <div className="rounded-3xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(20px)' }}>
          <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #3B82F6 40%, #8B5CF6 60%, transparent)', borderRadius: '99px 99px 0 0' }}/>

          <div className="px-8 py-9">

            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2" style={{ color: '#F1F5F9' }}>Welcome back</h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Sign in to access your workspace</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: 'rgba(255,255,255,0.35)' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3.5 text-sm rounded-xl outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F1F5F9' }}
                  onFocus={e => { (e.target as HTMLElement).style.borderColor = '#3B82F6'; (e.target as HTMLElement).style.background = 'rgba(59,130,246,0.1)' }}
                  onBlur={e  => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: 'rgba(255,255,255,0.35)' }}>Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-3.5 pr-12 text-sm rounded-xl outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F1F5F9' }}
                    onFocus={e => { (e.target as HTMLElement).style.borderColor = '#3B82F6'; (e.target as HTMLElement).style.background = 'rgba(59,130,246,0.1)' }}
                    onBlur={e  => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {showPwd ? (
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: '#fff', boxShadow: '0 0 40px rgba(59,130,246,0.25)', marginTop: '8px' }}
              >
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Signing in...</>
                  : 'Sign in'
                }
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-center gap-4 mt-6 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }}/>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Secured</span>
          </div>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Authorized access only</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>SkyKapital Europe</span>
        </div>

      </div>
    </div>
  )
}