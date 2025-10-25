import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Cache สำหรับ rate limiting (TTL = 24 ชั่วโมง)
const usageCache = new NodeCache({ stdTTL: 86400 });

// Middleware
app.use(cors({
    origin: [
        'https://mengmengep-arch.github.io',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ],
    credentials: true
}));
app.use(express.json({ limit: '10mb' })); // รองรับรูปขนาดใหญ่

// Configuration
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT) || 10; // 10 รูป/วัน/IP
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ================== Rate Limiting Helper ==================
function checkRateLimit(ip) {
    const today = new Date().toDateString();
    const key = `${ip}-${today}`;
    const count = usageCache.get(key) || 0;

    return {
        allowed: count < RATE_LIMIT,
        count: count,
        limit: RATE_LIMIT,
        remaining: Math.max(0, RATE_LIMIT - count)
    };
}

function incrementUsage(ip) {
    const today = new Date().toDateString();
    const key = `${ip}-${today}`;
    const count = usageCache.get(key) || 0;
    usageCache.set(key, count + 1);
}

// ================== Health Check Endpoint ==================
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Tax Calculator OCR Proxy',
        version: '1.0.0',
        endpoints: {
            health: 'GET /',
            ocr: 'POST /api/ocr',
            usage: 'GET /api/usage'
        }
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ================== Usage Check Endpoint ==================
app.get('/api/usage', (req, res) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const rateLimit = checkRateLimit(ip);

    res.json({
        used: rateLimit.count,
        limit: rateLimit.limit,
        remaining: rateLimit.remaining
    });
});

// ================== OCR Endpoint ==================
app.post('/api/ocr', async (req, res) => {
    try {
        // Get client IP
        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // Check API Key
        if (!OPENAI_API_KEY) {
            return res.status(500).json({
                error: 'OpenAI API Key not configured on server',
                code: 'NO_API_KEY'
            });
        }

        // Check rate limit
        const rateLimit = checkRateLimit(ip);
        if (!rateLimit.allowed) {
            return res.status(429).json({
                error: `ใช้งานเกินจำนวนที่กำหนด (${RATE_LIMIT} รูป/วัน)`,
                code: 'RATE_LIMIT_EXCEEDED',
                used: rateLimit.count,
                limit: rateLimit.limit,
                resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
            });
        }

        // Validate request
        const { imageDataUrl } = req.body;
        if (!imageDataUrl) {
            return res.status(400).json({
                error: 'Missing imageDataUrl in request body',
                code: 'MISSING_IMAGE'
            });
        }

        console.log(`🔍 OCR Request from IP: ${ip} (${rateLimit.count + 1}/${RATE_LIMIT})`);

        // Call OpenAI Vision API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `Extract ALL salary information from this Thai pay slip image.

Return ONLY a JSON object (no markdown, no explanation) with these exact fields:
{
  "salary": <base salary as number WITH decimals>,
  "luncheonAllowance": <luncheon allowance/ค่าอาหาร as number WITH decimals or 0>,
  "otMeal": <OT meal allowance as number WITH decimals or 0>,
  "overtime15x": <overtime 1.5X as number WITH decimals or 0>,
  "overtime20x": <overtime 2.0X as number WITH decimals or 0>,
  "overtime30x": <overtime 3.0X as number WITH decimals or 0>,
  "bonus": <bonus/โบนัส as number WITH decimals or 0>,
  "socialSecurity": <social security/ประกันสังคม deduction as number WITH decimals or 0>,
  "providentFund": <provident fund/กองทุนสำรอง deduction as number WITH decimals or 0>,
  "taxWithheld": <tax/ภาษี deduction as number WITH decimals or 0>,
  "inHouseLoan": <in-house loan/เงินกู้ deduction as number WITH decimals or 0>,
  "otherDeductions": <other deductions as number WITH decimals or 0>
}

IMPORTANT:
- Return numbers WITH decimal places (e.g., 10997.75, NOT 10997)
- Remove commas but KEEP decimal points (e.g., "10,997.75" → 10997.75)
- Do NOT round numbers - preserve exact decimal values
- If a field is not found, use 0`
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: imageDataUrl
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 500,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ OpenAI API Error:', errorData);

            return res.status(response.status).json({
                error: errorData.error?.message || 'OpenAI API error',
                code: 'OPENAI_ERROR',
                details: errorData
            });
        }

        const data = await response.json();

        // Increment usage count
        incrementUsage(ip);

        console.log(`✅ OCR Success for IP: ${ip} (Remaining: ${rateLimit.remaining - 1}/${RATE_LIMIT})`);

        // Return result
        res.json({
            success: true,
            data: data,
            usage: {
                used: rateLimit.count + 1,
                limit: RATE_LIMIT,
                remaining: rateLimit.remaining - 1
            }
        });

    } catch (error) {
        console.error('❌ Server Error:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'SERVER_ERROR',
            message: error.message
        });
    }
});

// ================== Error Handler ==================
app.use((err, req, res, next) => {
    console.error('❌ Unhandled Error:', err);
    res.status(500).json({
        error: 'Something went wrong',
        code: 'UNHANDLED_ERROR'
    });
});

// ================== Start Server ==================
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Rate limit: ${RATE_LIMIT} requests/day/IP`);
    console.log(`🔑 OpenAI API Key: ${OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
});
