import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const PROMPT = `Extract all data from this invoice and return ONLY a valid JSON object with no markdown, no explanation, just raw JSON.

Required format:
{
  "subcontractor_name": "Company name that issued the invoice",
  "invoice_number": "Invoice reference number",
  "invoice_date": "YYYY-MM-DD format",
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
- For category, infer from the content: consulting/services = Subcontracting, flights/trains/taxi = Travel, hotel = Accommodation, restaurants = Meals, hardware/software = Equipment
- invoice_date must be YYYY-MM-DD or null
- Return ONLY the JSON, nothing else`

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not set in environment variables' }, { status: 500 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64,
        },
      },
      PROMPT,
    ])

    const raw = result.response.text()

    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const parsed = JSON.parse(cleaned)
    return NextResponse.json(parsed)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Scan error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
