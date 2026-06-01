import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_ACCESS: Record<string, string[]> = {
  admin:    ['*'],
  placide:  ['/dashboard', '/projects', '/contracts', '/payment-register', '/invoices', '/upload', '/validations', '/providers', '/vault', '/reports', '/settings'],
  uploader: ['/dashboard', '/invoices', '/upload'],
  dani:     ['/dashboard', '/invoices', '/validations'],
  fares:    ['/dashboard', '/invoices', '/validations'],
  viewer:   ['/dashboard'],
}

function canAccess(role: string, pathname: string): boolean {
  const allowed = ROLE_ACCESS[role] || ROLE_ACCESS.viewer
  if (allowed.includes('*')) return true
  return allowed.some(p => pathname === p || pathname.startsWith(p + '/'))
}

// Simple in-memory login attempt tracker (resets on cold start)
// For production, replace with Redis/Upstash
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS  = 10
const WINDOW_MS     = 15 * 60 * 1000 // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = loginAttempts.get(ip)
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (record.count >= MAX_ATTEMPTS) return false
  record.count++
  return true
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  // Skip static assets
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/logo')) {
    return supabaseResponse
  }

  // Rate limit login page POST attempts
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait 15 minutes.' },
        { status: 429, headers: { 'Retry-After': '900' } }
      )
    }
  }

  // Allow API routes through — they have their own auth checks via auth-guard
  if (pathname.startsWith('/api')) {
    return supabaseResponse
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if not authenticated
  if (!user) {
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }

  // Redirect logged-in user away from login
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const role = user.user_metadata?.role || 'viewer'

  // Role-based route protection
  if (!canAccess(role, pathname)) {
    const allowed = ROLE_ACCESS[role] || ['/dashboard']
    const firstPage = allowed[0] === '*' ? '/dashboard' : allowed[0]
    return NextResponse.redirect(new URL(firstPage, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
}