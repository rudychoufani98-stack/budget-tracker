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
      setError('Invalid email or password. Please try again.')
      setLoading(false)
    } else {
      router.push('/dashboard'); router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background:'#F1F5F9' }}>

      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 p-12" style={{ background:'linear-gradient(160deg,#0F172A 0%,#1E3A5F 100%)' }}>
        <div>
          <div className="rounded-2xl px-6 py-4 inline-block" style={{ background:'rgba(255,255,255,0.08)', backdropFilter:'blur(10px)' }}>
            <Image src="/logo.png" alt="Skykapital" width={140} height={40} style={{ objectFit:'contain' }} priority />
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold mb-4 leading-tight" style={{ color:'#fff' }}>
            ESG Budget<br/>Management Platform
          </h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color:'rgba(255,255,255,0.55)' }}>
            Track contracts, validate invoices and monitor payment progress across all ESG projects.
          </p>
          <div className="flex flex-col gap-3">
            {[
              { icon:'shield', text:'5-step validation workflow' },
              { icon:'chart',  text:'Real-time NGN/USD tracking' },
              { icon:'lock',   text:'Role-based secure access' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background:'rgba(59,130,246,0.2)' }}>
                  {icon === 'shield' && <svg width="14" height="14" fill="none" stroke="#60A5FA" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
                  {icon === 'chart'  && <svg width="14" height="14" fill="none" stroke="#60A5FA" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
                  {icon === 'lock'   && <svg width="14" height="14" fill="none" stroke="#60A5FA" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                </div>
                <span className="text-sm" style={{ color:'rgba(255,255,255,0.7)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs" style={{ color:'rgba(255,255,255,0.25)' }}>
          SkyKapital Europe - Confidential
        </p>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <div className="rounded-2xl px-6 py-4" style={{ background:'#FFFFFF', border:'1px solid #E2E8F0' }}>
              <Image src="/logo.png" alt="Skykapital" width={130} height={38} style={{ objectFit:'contain' }} priority />
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-xl" style={{ background:'#FFFFFF' }}>
            <div style={{ height:4, background:'linear-gradient(90deg,#1D4ED8,#3B82F6,#60A5FA)' }}/>
            <div className="p-8">
              <h1 className="text-2xl font-bold mb-1" style={{ color:'#0F172A' }}>Welcome back</h1>
              <p className="text-sm mb-8" style={{ color:'#64748B' }}>Sign in to your SkyKapital account</p>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@skykapital.com"
                    required
                    autoComplete="email"
                    className="w-full px-4 py-3 text-sm rounded-xl outline-none transition-all"
                    style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:'#0F172A' }}
                    onFocus={e => (e.target as HTMLElement).style.borderColor='#3B82F6'}
                    onBlur={e => (e.target as HTMLElement).style.borderColor='#E2E8F0'}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color:'#64748B' }}>Password</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      className="w-full px-4 py-3 pr-12 text-sm rounded-xl outline-none transition-all"
                      style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', color:'#0F172A' }}
                      onFocus={e => (e.target as HTMLElement).style.borderColor='#3B82F6'}
                      onBlur={e => (e.target as HTMLElement).style.borderColor='#E2E8F0'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded"
                      style={{ color:'#94A3B8' }}
                    >
                      {showPwd
                        ? <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm" style={{ background:'rgba(239,68,68,0.08)', color:'#DC2626', border:'1px solid rgba(239,68,68,0.2)' }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-sm font-bold disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                  style={{ background:'linear-gradient(135deg,#1D4ED8,#3B82F6)', color:'#fff', boxShadow:'0 4px 14px rgba(59,130,246,0.4)' }}
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Signing in...</>
                  ) : (
                    <>Sign in to Dashboard</>
                  )}
                </button>
              </form>
            </div>
          </div>

          <p className="text-center text-xs mt-6" style={{ color:'#94A3B8' }}>
            Access restricted to authorized personnel only.
          </p>
          <p className="text-center text-xs mt-1" style={{ color:'#CBD5E1' }}>
            Contact your administrator to request access.
          </p>
        </div>
      </div>
    </div>
  )
}