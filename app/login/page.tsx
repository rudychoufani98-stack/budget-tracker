'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Invalid email or password.'); setLoading(false) }
    else { router.push('/dashboard'); router.refresh() }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1A1F35' }}>
      <div className="w-full max-w-sm px-6">
        <div className="flex justify-center mb-8">
          <div className="rounded-2xl px-8 py-5" style={{ background: '#222A42', border: '1px solid #323D5E' }}>
            <Image src="/logo.png" alt="Skykapital" width={150} height={44} style={{ objectFit: 'contain' }} priority />
          </div>
        </div>
        <div className="rounded-2xl p-8" style={{ background: '#222A42', border: '1px solid #323D5E' }}>
          <h1 className="text-xl font-medium mb-1" style={{ color: '#F9FAFB' }}>Sign in</h1>
          <p className="text-sm mb-6" style={{ color: '#6B7280' }}>ESG Budget Tracker — SkyKapital Europe</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide block mb-1.5" style={{ color: '#6B7280' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@skykapital.com" required className="w-full px-4 py-3 text-sm" style={{ background: '#323D5E', border: '1px solid #404F74', borderRadius: 10, color: '#F9FAFB' }} />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide block mb-1.5" style={{ color: '#6B7280' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="w-full px-4 py-3 text-sm" style={{ background: '#323D5E', border: '1px solid #404F74', borderRadius: 10, color: '#F9FAFB' }} />
            </div>
            {error && <div className="text-sm px-4 py-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
            <button type="submit" disabled={loading} className="w-full font-medium py-3 rounded-xl text-sm disabled:opacity-50 mt-2" style={{ background: '#3B82F6', color: '#fff' }}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs mt-6" style={{ color: '#5A6A8A' }}>Contact your administrator to get access.</p>
      </div>
    </div>
  )
}
