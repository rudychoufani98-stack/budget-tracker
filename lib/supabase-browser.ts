import { createClient } from '@supabase/supabase-js'

// Browser-safe client — uses anon key only — safe to import in client components
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
