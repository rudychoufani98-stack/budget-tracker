import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']

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

    // Validate path structure — must start with a known prefix
    const ALLOWED_PREFIXES = ['invoices/', 'contracts/', 'payment-proofs/']
    if (!ALLOWED_PREFIXES.some(p => safePath.startsWith(p))) {
      return NextResponse.json({ error: 'Invalid upload path' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Verify file magic bytes
    const isPdf  = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46
    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8
    const isPng  = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47
    if (!isPdf && !isJpeg && !isPng) {
      return NextResponse.json({ error: 'Invalid file — only PDF, JPG, or PNG allowed' }, { status: 400 })
    }
    const contentType = isPdf ? 'application/pdf' : isJpeg ? 'image/jpeg' : 'image/png'

    await supabaseAdmin.storage.createBucket('invoices', { public: false }).catch(() => {})

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('invoices')
      .upload(safePath, buffer, { contentType, upsert: false })

    if (uploadErr) {
      return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
    }

    const { data: urlData } = await supabaseAdmin.storage
      .from('invoices')
      .createSignedUrl(safePath, 60 * 60 * 24 * 365 * 2) // 2-year TTL

    return NextResponse.json({ signedUrl: urlData?.signedUrl ?? '' })
  } catch {
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }
}