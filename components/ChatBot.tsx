'use client'
import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'What is the total amount paid so far?',
  'Which invoices are pending validation?',
  'Are there any overdue payments?',
  'Summarize the LCCH project',
  'How does the validation workflow work?',
  'How do I upload an invoice?',
]

export function ChatBot() {
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text?: string) {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput(''); setError('')
    const next: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(next)
    setLoading(true)
    try {
      const res  = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ messages: next }) })
      const data = await res.json()
      if (!res.ok || data.error) setError(data.error || 'Something went wrong.')
      else setMessages(prev => [...prev, { role:'assistant', content: data.reply }])
    } catch { setError('Connection error. Please try again.') }
    finally { setLoading(false) }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed z-50 flex items-center justify-center transition-all duration-300"
        style={{
          bottom: 28, right: 28,
          width: 58, height: 58,
          borderRadius: '50%',
          background: open ? '#1E293B' : 'linear-gradient(135deg,#1D4ED8,#3B82F6)',
          color: '#fff', border: 'none', cursor: 'pointer',
          boxShadow: open ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 24px rgba(59,130,246,0.5)',
          transform: open ? 'scale(1)' : 'scale(1)',
        }}
      >
        {open ? (
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>

      {/* Pulse ring when closed */}
      {!open && (
        <div className="fixed z-40 rounded-full pointer-events-none" style={{
          bottom: 28, right: 28, width: 58, height: 58,
          background: 'rgba(59,130,246,0.25)',
          animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
        }}/>
      )}

      {/* Notification dot */}
      {!open && messages.length > 0 && (
        <div className="fixed z-50 rounded-full" style={{ bottom: 72, right: 24, width: 14, height: 14, background: '#10B981', border: '2.5px solid white' }}/>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed z-50 flex flex-col overflow-hidden"
          style={{
            bottom: 100, right: 28,
            width: 460, height: 620,
            borderRadius: 24,
            background: '#0F172A',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.1)',
          }}
        >
          {/* Header */}
          <div className="shrink-0 px-5 py-4" style={{ background: 'linear-gradient(135deg,#0F172A,#1E293B)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* AI Avatar */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', boxShadow: '0 0 16px rgba(59,130,246,0.4)' }}>
                    <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full" style={{ background: '#10B981', border: '2px solid #0F172A' }}/>
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#F1F5F9' }}>SkyKapital Assistant</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }}/>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Online - Live data access</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    onClick={() => { setMessages([]); setError(''); setInput('') }}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors hover:bg-white/10"
                    style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4" style={{ background: '#0F172A' }}>

            {/* Welcome */}
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)' }}>
                    <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <div className="rounded-2xl rounded-tl-sm px-4 py-3.5 flex-1" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-sm font-semibold mb-1" style={{ color: '#F1F5F9' }}>Hello! I am your SkyKapital assistant.</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      I have access to your live data - projects, contracts, invoices and payments. Ask me anything in English or French.
                    </p>
                  </div>
                </div>

                {/* Suggestion grid */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3 ml-11" style={{ color: 'rgba(255,255,255,0.25)' }}>Suggestions</p>
                  <div className="grid grid-cols-2 gap-2 ml-11">
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-left text-xs px-3.5 py-2.5 rounded-xl transition-all hover:border-blue-500/50 hover:bg-blue-500/10"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', lineHeight: '1.4' }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)' }}>
                    <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                )}
                <div
                  className="rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                  style={{
                    maxWidth: '78%',
                    ...(m.role === 'user'
                      ? { background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: '#fff', borderBottomRightRadius: 6 }
                      : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#E2E8F0', borderTopLeftRadius: 6 }
                    )
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)' }}>
                  <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full" style={{ background: '#3B82F6', animation: 'bounce 1.2s infinite', animationDelay: `${i*0.2}s` }}/>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs mx-11" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div className="shrink-0 px-4 pb-4 pt-3" style={{ background: '#0F172A', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask anything about your data..."
                disabled={loading}
                className="flex-1 text-sm outline-none bg-transparent"
                style={{ color: '#F1F5F9' }}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30 transition-all"
                style={{ background: input.trim() ? 'linear-gradient(135deg,#1D4ED8,#3B82F6)' : 'rgba(255,255,255,0.08)', flexShrink: 0, boxShadow: input.trim() ? '0 0 16px rgba(59,130,246,0.4)' : 'none' }}
              >
                <svg width="15" height="15" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
            <p className="text-center text-xs mt-2.5" style={{ color: 'rgba(255,255,255,0.15)' }}>Llama 3.3 70B by Groq - Live data</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </>
  )
}