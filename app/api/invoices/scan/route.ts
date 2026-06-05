import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import Anthropic from '@anthropic-ai/sdk'

const PROMPT = `Extract all data from this invoice and return ONLY a valid JSON object with no markdown, no explanation, just raw JSON.

Required format:
{
  "subcontractor_name": "Company name that issued the invoice",
  "invoice_number": "Invoice reference number",
  "invoice_date": "YYYY-MM-DD format",
  "currency": "ISO 4217 currency code, e.g. EUR, USD, GBP, CHF, MAD, XOF, NGN",
  "amount_ht": 1000.00,
  "amount_tva": 200.00,
  "amount_ttc": 1200.00,
  "vat_rate": 20.0,
  "category": "One of: Subcontracting, Travel, Accommodation, Meals, Equipment, Other",
  "description": "Brief description of what the invoice is for",
  "line_items": [
    {
      "description": "Line item description",
      "quantity": 1,
      "unit_price": 1000.00,
      "total_ht": 1000.00,
      "vat_rate": 20.0,
      "total_ttc": 1200.00
    }
  ]
}

Rules:
- All monetary amounts must be numbers (not strings)
- If a value is not found, use null
- For currency: detect from symbols (€=EUR, $=USD, £=GBP, Fr=CHF, DH/MAD=MAD, FCFA=XOF, ₦=NGN) or explicit text. Default to NGN if unclear.
- For category: consulting/services = Subcontracting, flights/trains/taxi = Travel, hotel = Accommodation, restaurants = Meals, hardware/software = Equipment
- invoice_date must be YYYY-MM-DD or null
- Return ONLY the JSON, nothing else`

export async function POST(request: NextRequest) {
  const deny = await requireAuth(request)
  if (deny) return deny

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            {
              type: 'text',
              text: PROMPT,
            },
          ],
        },
      ],
    })

    const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''
    if (!raw) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return NextResponse.json(parsed)

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Scan error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
