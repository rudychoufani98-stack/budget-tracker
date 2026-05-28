import { NextRequest, NextResponse } from 'next/server'

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
- For category: consulting/services = Subcontracting, flights/trains/taxi = Travel, hotel = Accommodation, restaurants = Meals, hardware/software = Equipment
- invoice_date must be YYYY-MM-DD or null
- Return ONLY the JSON, nothing else`

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY is not configured in environment variables' }, { status: 500 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Extract text from PDF
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Dynamic import to avoid Next.js build issues with pdf-parse
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse.js')
    const pdfData = await pdfParse(buffer)
    const pdfText = pdfData.text?.trim()

    if (!pdfText) {
      return NextResponse.json(
        { error: 'Could not extract text from this PDF. It may be a scanned image — please try a text-based PDF.' },
        { status: 400 }
      )
    }

    // Send extracted text to Groq
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an invoice data extraction specialist. Extract invoice data and return ONLY valid JSON with no markdown formatting.',
          },
          {
            role: 'user',
            content: `${PROMPT}\n\nInvoice text:\n${pdfText}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 2048,
      }),
    })

    const groqResponse = await res.json()

    if (!res.ok) {
      const errMsg = groqResponse?.error?.message || JSON.stringify(groqResponse)
      console.error('Groq API error:', errMsg)
      return NextResponse.json({ error: `Groq error: ${errMsg}` }, { status: 500 })
    }

    const raw = groqResponse?.choices?.[0]?.message?.content ?? ''
    if (!raw) {
      return NextResponse.json({ error: 'Groq returned empty response' }, { status: 500 })
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
