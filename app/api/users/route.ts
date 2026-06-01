import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireRole } from '@/lib/auth-guard'

async function assertAdmin(req: NextRequest) {
  return requireRole(req, ['admin'])
}

export async function GET(req: NextRequest) {
  const deny = await assertAdmin(req)
  if (deny) return deny
  const { data, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
  const users = data.users.map(u => ({
    id: u.id, email: u.email,
    name: u.user_metadata?.name || '',
    role: u.user_metadata?.role || 'viewer',
    created_at: u.created_at,
  }))
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const deny = await assertAdmin(req)
  if (deny) return deny
  const { email, password, name, role } = await req.json()
  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Email, password and name are required' }, { status: 400 })
  }
  const safRole = role || 'viewer'
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { name, role: safRole },
  })
  if (error) return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  return NextResponse.json({ id: data.user.id, email: data.user.email })
}

export async function PATCH(req: NextRequest) {
  const deny = await assertAdmin(req)
  if (deny) return deny
  const { id, name, role } = await req.json()
  if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    user_metadata: { name, role },
  })
  if (error) return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const deny = await assertAdmin(req)
  if (deny) return deny
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  // Sign out the user first to invalidate all their active sessions immediately
  await supabaseAdmin.auth.admin.signOut(id).catch(() => {})
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  return NextResponse.json({ success: true })
}