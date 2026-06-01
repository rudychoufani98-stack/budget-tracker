import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

export async function POST(request: NextRequest) {
  const deny = await requireAuth(request)
  if (deny) return deny
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const path = formData.get('path') as string | null

    if (!file || !path) {
      return NextResponse.json({ error: 'Missing file or path' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create bucket if it doesn't exist yet
    await supabaseAdmin.storage.createBucket('invoices', { public: false }).catch(() => {})

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('invoices')
      .upload(path, buffer, { contentType: 'application/pdf', upsert: false })

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 })
    }

    const { data: urlData } = await supabaseAdmin.storage
      .from('invoices')
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10)

    return NextResponse.json({ signedUrl: urlData?.signedUrl ?? '' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
