import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Verifies the caller is authenticated.
 * Returns { user, role } or null if unauthenticated.
 */
export async function getApiUser(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return {
    id:    user.id,
    email: user.email || '',
    role:  (user.user_metadata?.role as string) || 'viewer',
    name:  (user.user_metadata?.name as string) || '',
  }
}

/** Returns 401 response if not authenticated */
export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

/** Returns 403 response if role not allowed */
export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

/** Require specific roles. Returns error response or null (means OK). */
export async function requireRole(req: NextRequest, roles: string[]): Promise<NextResponse | null> {
  const user = await getApiUser(req)
  if (!user) return unauthorized()
  if (!roles.includes(user.role)) return forbidden()
  return null
}

/** Require any authenticated user. Returns error response or null (means OK). */
export async function requireAuth(req: NextRequest): Promise<NextResponse | null> {
  const user = await getApiUser(req)
  if (!user) return unauthorized()
  return null
}