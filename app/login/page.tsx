'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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

      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }}/>

      {/* Glow blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: '#3B82F6' }}/>
      <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: '#8B5CF6' }}/>

      {/* Card */}
      <div className="relative w-full max-w-md mx-4">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="rounded-2xl px-7 py-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
            <Image src="/logo.png" alt="Skykapital" width={150} height={42} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }} priority />
          </div>
        </div>

        {/* Login box */}
        <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
          {/* Top accent line */}
          <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #3B82F6, #8B5CF6, transparent)' }}/>

          <div className="px-8 py-9">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2" style={{ color: '#F8FAFC' }}>Welcome back</h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Sign in to access your workspace</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3.5 text-sm rounded-xl outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F8FAFC' }}
                  onFocus={e => { (e.target as HTMLElement).style.borderColor = '#3B82F6'; (e.target as HTMLElement).style.background = 'rgba(59,130,246,0.08)' }}
                  onBlur={e  => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-3.5 pr-12 text-sm rounded-xl outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F8FAFC' }}
                    onFocus={e => { (e.target as HTMLElement).style.borderColor = '#3B82F6'; (e.target as HTMLElement).style.background = 'rgba(59,130,246,0.08)' }}
                    onBlur={e  => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
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

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
                style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: '#fff', boxShadow: '0 0 30px rgba(59,130,246,0.3)' }}
              >
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Signing in...</>
                ) : 'Sign in'}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-6 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }}/>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Secured</span>
          </div>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Authorized access only</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>SkyKapital Europe</span>
        </div>
      </div>
    </div>
  )
}