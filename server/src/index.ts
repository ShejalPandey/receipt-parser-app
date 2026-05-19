import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3001;
const DATA_FILE = join(__dirname, '..', 'data', 'receipts.json');

interface LineItem {
  id: string;
  name: string;
  amount: number;
  type: 'item' | 'tax' | 'tip' | 'discount' | 'other';
}

interface Receipt {
  id: string;
  merchant: string;
  date: string;
  lineItems: LineItem[];
  total: number;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  paymentMethod: 'cash' | 'card' | 'online';
  paymentSource?: string;
  createdAt: string;
  updatedAt: string;
  originalExtracted?: {
    merchant?: string;
    date?: string;
    total?: number;
    lineItems?: { name?: string; amount?: number }[];
    paymentMethod?: string;
    paymentSource?: string;
  };
  confidence?: {
    merchant: 'high' | 'medium' | 'low';
    date: 'high' | 'medium' | 'low';
    total: 'high' | 'medium' | 'low';
    paymentMethod: 'high' | 'medium' | 'low';
    lineItems: ('high' | 'medium' | 'low')[];
  };
}

function loadReceipts(): Receipt[] {
  if (!existsSync(DATA_FILE)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function validateExtraction(extracted: Partial<Receipt>): Partial<Receipt> {
  const suspiciousPatterns = [
    /lorem\s*ipsum/i,
    /dolor\s*(sit|amet)/i,
    /example\s*(text|data|item)/i,
    /^[\W\d]+$/,
  ];
  
  const isSuspicious = (text: string | undefined) => {
    if (!text || text === 'unknown') return false;
    return suspiciousPatterns.some(p => p.test(text));
  };

  if (extracted.lineItems) {
    const suspiciousItems = extracted.lineItems.filter(item => isSuspicious(item.name)).length;
    
    if (suspiciousItems > extracted.lineItems.length / 2) {
      if (!extracted.confidence) {
        extracted.confidence = { merchant: 'low', date: 'high', total: 'low', paymentMethod: 'high', lineItems: [] };
      } else {
        extracted.confidence.merchant = 'low';
        extracted.confidence.total = 'low';
      }
    }
  }

  return extracted;
}

function saveReceipts(receipts: Receipt[]): void {
  const dir = join(__dirname, '..', 'data');
  if (!existsSync(dir)) {
    require('fs').mkdirSync(dir, { recursive: true });
  }
  writeFileSync(DATA_FILE, JSON.stringify(receipts, null, 2));
}

async function extractReceipt(imageBase64: string): Promise<Partial<Receipt>> {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY or OPENAI_API_KEY not configured. Add one to server/.env');
  }

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1'
  });

  const prompt = `You are a receipt parser. Extract structured data from this receipt image.

Return ONLY valid JSON (no markdown code blocks, no explanation). Use this exact structure:
{
  "merchant": "store name or unknown",
  "date": "YYYY-MM-DD or unknown", 
  "currency": "INR|USD|EUR|GBP",
  "paymentMethod": "cash|card|online",
  "paymentSource": "GPay|PhonePe|Paytm|UPI|Card|Cash or null",
  "lineItems": [
    {"name": "item name", "amount": 0.00, "type": "item|tax|tip|discount|other", "quantity": 1}
  ],
  "total": 0.00,
  "confidence": {
    "merchant": "high|medium|low",
    "date": "high|medium|low", 
    "total": "high|medium|low",
    "paymentMethod": "high|medium|low",
    "lineItems": ["high|medium|low"]
  }
}

Rules:
- If you cannot read something, use "unknown" for merchant/date
- For currency: detect from symbols (₹=INR, $=USD, €=EUR, £=GBP). Default to USD if unclear
- paymentMethod: "online" if UPI/GPay/PhonePe/Paytm/Pay/Online is shown, "card" if card payment, "cash" otherwise. If unclear, default to "cash".
- paymentSource: extract the specific source like "GPay", "PhonePe", "Paytm", "UPI", "Card" etc. Set to null if not clearly shown.
- For lineItems: detect items, tax, tip, discounts with quantity. Type "other" for unclear.
- total MUST be a number, not a string. Use numeric format like 4800, not "4800" or "4800.00"
- total should be the final amount after all taxes/tips/discounts (just the number, no currency symbols)
- Set confidence to "low" if text is blurry, faded, or unusual format
- Set confidence to "medium" if reasonably confident but not certain
- Set confidence to "high" if clearly readable
- Line item amount should be positive numbers (handle negative signs in name)
- If no total visible, set total to 0 and confidence.total to "low"`;

  const response = await client.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
          }
        ]
      }
    ],
    temperature: 0.1,
    max_tokens: 2000
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from LLM');
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid JSON response from LLM');
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Failed to parse LLM response as JSON');
  }
}

app.post('/api/extract', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const extracted = validateExtraction(await extractReceipt(base64Data));

    const receipt: Partial<Receipt> = {
      id: uuidv4(),
      merchant: extracted.merchant || 'Unknown',
      date: extracted.date || new Date().toISOString().split('T')[0],
      currency: extracted.currency || 'USD',
      paymentMethod: extracted.paymentMethod || 'cash',
      paymentSource: extracted.paymentSource || undefined,
      lineItems: extracted.lineItems?.map((item, i) => ({
        id: uuidv4(),
        name: item.name || `Item ${i + 1}`,
        amount: Number(item.amount) || 0,
        type: item.type || 'other'
      })) || [],
      total: Math.round((Number(extracted.total) || 0) * 100) / 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      originalExtracted: extracted.merchant || extracted.date || extracted.total ? {
        merchant: extracted.merchant,
        date: extracted.date,
        total: extracted.total,
        lineItems: extracted.lineItems,
        paymentMethod: extracted.paymentMethod,
        paymentSource: extracted.paymentSource
      } : undefined,
      confidence: extracted.confidence
    };

    res.json(receipt);
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Extraction failed' });
  }
});

app.get('/api/receipts', (req, res) => {
  const receipts = loadReceipts();
  res.json(receipts);
});

app.post('/api/receipts', (req, res) => {
  const receipts = loadReceipts();
  const receipt: Receipt = {
    ...req.body,
    id: req.body.id || uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  receipts.unshift(receipt);
  saveReceipts(receipts);
  res.json(receipt);
});

app.put('/api/receipts/:id', (req, res) => {
  const receipts = loadReceipts();
  const index = receipts.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Receipt not found' });
  }
  receipts[index] = {
    ...receipts[index],
    ...req.body,
    id: req.params.id,
    updatedAt: new Date().toISOString()
  };
  saveReceipts(receipts);
  res.json(receipts[index]);
});

app.delete('/api/receipts/:id', (req, res) => {
  const receipts = loadReceipts();
  const filtered = receipts.filter(r => r.id !== req.params.id);
  if (filtered.length === receipts.length) {
    return res.status(404).json({ error: 'Receipt not found' });
  }
  saveReceipts(filtered);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});