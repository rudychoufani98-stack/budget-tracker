import { createClient } from '@supabase/supabase-js'

// *** WARNING: SERVICE ROLE KEY — bypasses Row Level Security ***
// Server-side ONLY — NEVER import this in client components or pages
// Only use in API route handlers and server-side utilities
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
