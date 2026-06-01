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
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [open, messages])

  async function send(text?: string) {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setError('')

    const next: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(next)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Something went wrong. Please try again.')
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function clearChat() {
    setMessages([])
    setError('')
    setInput('')
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed z-50 flex items-center justify-center shadow-2xl transition-all hover:scale-105"
        style={{
          bottom: 24, right: 24,
          width: 52, height: 52,
          borderRadius: '50%',
          background: open ? '#1E293B' : 'linear-gradient(135deg,#1D4ED8,#3B82F6)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
        }}
        title="SkyKapital Assistant"
      >
        {open ? (
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>

      {/* Notification dot when closed and there are messages */}
      {!open && messages.length > 0 && (
        <div className="fixed z-50 w-3 h-3 rounded-full" style={{ bottom: 66, right: 22, background: '#10B981', border: '2px solid white' }}/>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            bottom: 88, right: 24,
            width: 380, height: 560,
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 shrink-0" style={{ background: 'linear-gradient(135deg,#0F172A,#1E3A5F)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.3)' }}>
                <svg width="16" height="16" fill="none" stroke="#60A5FA" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: '#fff' }}>SkyKapital Assistant</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Powered by Llama 3 via Groq</p>
              </div>
            </div>
            {messages.length > 0 && (
              <button onClick={clearChat} className="text-xs px-2.5 py-1 rounded-lg" style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.08)' }}>
                Clear
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: '#F8FAFC' }}>

            {/* Welcome message */}
            {messages.length === 0 && (
              <div>
                <div className="flex gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)' }}>
                    <svg width="13" height="13" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%]" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                    <p className="text-sm" style={{ color: '#0F172A' }}>
                      Hello! I am the SkyKapital assistant. I have access to your live data - projects, contracts, invoices and payments.
                    </p>
                    <p className="text-xs mt-1.5" style={{ color: '#94A3B8' }}>Ask me anything or pick a suggestion below.</p>
                  </div>
                </div>

                {/* Suggestion chips */}
                <div className="flex flex-col gap-1.5 ml-9">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-xs px-3 py-2 rounded-xl transition-colors hover:bg-blue-50"
                      style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#3B82F6' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat messages */}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)' }}>
                    <svg width="13" height="13" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                )}
                <div
                  className="rounded-2xl px-3.5 py-2.5 max-w-[82%] text-sm whitespace-pre-wrap"
                  style={m.role === 'user'
                    ? { background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: '#fff', borderBottomRightRadius: 4 }
                    : { background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A', borderTopLeftRadius: 4 }
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)' }}>
                  <svg width="13" height="13" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div className="rounded-2xl rounded-tl-sm px-3.5 py-3 flex items-center gap-1.5" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#94A3B8', animationDelay: `${i * 0.15}s` }}/>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="text-xs px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}

            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div className="px-3 py-3 shrink-0" style={{ borderTop: '1px solid #E2E8F0', background: '#FFFFFF' }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0' }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask anything about your data..."
                disabled={loading}
                className="flex-1 text-sm outline-none bg-transparent"
                style={{ color: '#0F172A' }}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40 transition-all"
                style={{ background: input.trim() ? 'linear-gradient(135deg,#1D4ED8,#3B82F6)' : '#E2E8F0', flexShrink: 0 }}
              >
                <svg width="14" height="14" fill="none" stroke={input.trim() ? '#fff' : '#94A3B8'} strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
            <p className="text-center text-xs mt-2" style={{ color: '#CBD5E1' }}>Llama 3.3 70B - Live data</p>
          </div>
        </div>
      )}
    </>
  )
}