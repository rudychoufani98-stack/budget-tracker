import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['application/pdf']

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

    // Server-side file type validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    // Server-side file size validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10 MB' }, { status: 400 })
    }

    // Sanitize path - only allow safe characters
    const safePath = path.replace(/[^a-zA-Z0-9/_.\-]/g, '_')

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Verify PDF magic bytes (first 4 bytes should be %PDF)
    if (buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
      return NextResponse.json({ error: 'Invalid PDF file' }, { status: 400 })
    }

    await supabaseAdmin.storage.createBucket('invoices', { public: false }).catch(() => {})

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('invoices')
      .upload(safePath, buffer, { contentType: 'application/pdf', upsert: false })

    if (uploadErr) {
      return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
    }

    const { data: urlData } = await supabaseAdmin.storage
      .from('invoices')
      .createSignedUrl(safePath, 60 * 60 * 24 * 365 * 10)

    return NextResponse.json({ signedUrl: urlData?.signedUrl ?? '' })
  } catch {
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }
}