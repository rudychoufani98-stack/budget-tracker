import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET — list all users
export async function GET() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const users = data.users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.user_metadata?.name || '',
    role: u.user_metadata?.role || 'viewer',
    created_at: u.created_at,
  }))
  return NextResponse.json(users)
}

// POST — create a new user
export async function POST(request: NextRequest) {
  const { email, password, name, role } = await request.json()
  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Email, password and name are required' }, { status: 400 })
  }
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: role || 'viewer' },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.user.id, email: data.user.email })
}

// DELETE — delete a user
export async function DELETE(request: NextRequest) {
  const { id } = await request.json()
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
