# Tax Calculator Backend - OCR Proxy

Backend API สำหรับ Tax Calculator ที่ทำหน้าที่เป็น Proxy สำหรับ OpenAI Vision OCR

## 🚀 Features

- ✅ Proxy สำหรับ OpenAI Vision API
- ✅ Rate Limiting (10 รูป/วัน/IP)
- ✅ CORS Support
- ✅ Error Handling
- ✅ Usage Tracking

## 📋 Prerequisites

- Node.js 18+
- OpenAI API Key

## 🛠️ Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

สร้างไฟล์ `.env`:

```env
OPENAI_API_KEY=your_openai_api_key_here
RATE_LIMIT=10
PORT=3000
```

### 3. Run Development Server

```bash
npm run dev
```

Server จะรันที่ `http://localhost:3000`

## 📡 API Endpoints

### GET /
Health check และข้อมูล API

**Response:**
```json
{
  "status": "ok",
  "service": "Tax Calculator OCR Proxy",
  "version": "1.0.0"
}
```

### GET /api/usage
เช็คการใช้งานของ IP

**Response:**
```json
{
  "used": 3,
  "limit": 10,
  "remaining": 7
}
```

### POST /api/ocr
OCR สลิปเงินเดือน

**Request Body:**
```json
{
  "imageDataUrl": "data:image/jpeg;base64,..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "choices": [{
      "message": {
        "content": "{...}"
      }
    }]
  },
  "usage": {
    "used": 4,
    "limit": 10,
    "remaining": 6
  }
}
```

**Response (Rate Limit Exceeded):**
```json
{
  "error": "ใช้งานเกินจำนวนที่กำหนด (10 รูป/วัน)",
  "code": "RATE_LIMIT_EXCEEDED",
  "used": 10,
  "limit": 10,
  "resetAt": "2025-10-23T00:00:00.000Z"
}
```

## 🌐 Deploy to Vercel

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Deploy

```bash
vercel
```

### 4. Add Environment Variables

ใน Vercel Dashboard:
1. เข้าไปที่ Project Settings
2. เลือก "Environment Variables"
3. เพิ่ม:
   - `OPENAI_API_KEY` = your_api_key
   - `RATE_LIMIT` = 10

### 5. Redeploy

```bash
vercel --prod
```

## 🔒 Security

- API Key เก็บไว้ฝั่งเซิร์ฟเวอร์เท่านั้น
- Rate Limiting ป้องกัน abuse
- CORS กำหนด origin ที่อนุญาต

## 📊 Rate Limiting

- Default: 10 รูป/วัน/IP
- Reset เวลา 00:00 ทุกวัน
- ใช้ in-memory cache (NodeCache)

## 💰 Cost Estimation

- Model: gpt-4o-mini
- ราคา: ~$0.0001/รูป (~0.003 บาท/รูป)
- ถ้า 100 คน × 10 รูป/วัน = 1,000 รูป/วัน
- ค่าใช้จ่าย: ~3 บาท/วัน (~90 บาท/เดือน)

## 🐛 Troubleshooting

### Error: "OpenAI API Key not configured"
ตรวจสอบว่าได้ตั้งค่า `OPENAI_API_KEY` ใน `.env` หรือ Vercel Environment Variables แล้ว

### Error: "RATE_LIMIT_EXCEEDED"
IP นี้ใช้งานครบ 10 รูปแล้ว รอ reset วันถัดไป

## 📝 License

MIT
