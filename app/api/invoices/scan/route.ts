import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
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
              text: `Extract all data from this invoice and return ONLY a valid JSON object with no markdown, no explanation, just raw JSON.

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
- Return ONLY the JSON, nothing else`,
            },
          ],
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''

    // Strip any markdown code blocks if present
    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const parsed = JSON.parse(cleaned)
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Scan error:', error)
    return NextResponse.json({ error: 'Failed to scan invoice' }, { status: 500 })
  }
}
