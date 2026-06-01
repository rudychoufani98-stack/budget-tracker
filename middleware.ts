import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Pages each role can access
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

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Always allow login page and API routes
  if (pathname.startsWith('/login') || pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return supabaseResponse
  }

  // Redirect to login if not authenticated
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const role = user.user_metadata?.role || 'viewer'

  // Check role-based access
  if (!canAccess(role, pathname)) {
    // Redirect to the first allowed page for this role
    const allowed = ROLE_ACCESS[role] || ['/dashboard']
    const firstPage = allowed[0] === '*' ? '/dashboard' : allowed[0]
    return NextResponse.redirect(new URL(firstPage, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
}