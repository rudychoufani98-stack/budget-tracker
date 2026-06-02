'use client'

import { useState, useEffect } from 'react'

const NAVY = '#0C1F52'
const ROLES = ['admin', 'rudy', 'placide', 'hitech', 'fares', 'uploader', 'viewer']

const ROLE_LABELS: Record<string,string> = {
  admin:    'Administrator',
  rudy:     'Director',
  placide:  'ESG Manager',
  hitech:   'MD / Dani',
  fares:    'Accountant',
  uploader: 'Intern (Data Entry)',
  viewer:   'Viewer',
}

interface User {
  id: string
  email: string
  name: string
  role: string
  created_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'viewer' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadUsers() {
    setLoading(true)
    const res = await fetch('/api/users')
    const data = await res.json()
    setUsers(data)
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to create user')
    } else {
      setSuccess(`Account created for ${form.name}`)
      setForm({ name: '', email: '', password: '', role: 'viewer' })
      setShowForm(false)
      loadUsers()
    }
    setSaving(false)
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return
    await fetch('/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadUsers()
  }

  const roleColors: Record<string, { bg: string; color: string }> = {
    admin:    { bg: '#DBEAFE', color: '#1D4ED8' },
    rudy:     { bg: '#FEE2E2', color: '#991B1B' },
    placide:  { bg: '#D1FAE5', color: '#065F46' },
    hitech:   { bg: '#EDE9FE', color: '#5B21B6' },
    dani:     { bg: '#EDE9FE', color: '#5B21B6' },
    fares:    { bg: '#ECFDF5', color: '#047857' },
    uploader: { bg: '#FEF9C3', color: '#854D0E' },
    viewer:   { bg: '#F3F4F6', color: '#6B7280' },
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>User Management</h1>
          <p className="text-sm text-gray-400 mt-1">Create and manage team accounts</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(''); setSuccess('') }}
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
          style={{ background: NAVY }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add User
        </button>
      </div>

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 font-medium">
          ✓ {success}
        </div>
      )}

      {/* Add user form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-5">New Account</h2>
          <form onSubmit={createUser} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 block mb-1.5">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Placide Dupont"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 block mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="placide@skykapital.com"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 block mb-1.5">Password</label>
              <input
                type="text"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Minimum 6 characters"
                required
                minLength={6}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 block mb-1.5">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
              </select>
            </div>
            {error && (
              <div className="col-span-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
            )}
            <div className="col-span-2 flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 text-white text-sm font-bold py-3 rounded-xl disabled:opacity-50"
                style={{ background: NAVY }}
              >
                {saving ? 'Creating…' : 'Create Account'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-3 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{users.length} accounts</p>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-sm text-gray-400 text-center">Loading…</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {users.map(user => {
              const rc = roleColors[user.role] ?? roleColors.viewer
              const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              return (
                <div key={user.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: NAVY }}
                    >
                      {initials || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{user.name || '—'}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-semibold px-3 py-1 rounded-full capitalize"
                      style={{ background: rc.bg, color: rc.color }}
                    >
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                    <button
                      onClick={() => deleteUser(user.id, user.name)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                      title="Delete user"
                    >
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
