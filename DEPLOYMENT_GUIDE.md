# 📘 คู่มือการ Deploy Tax Calculator

## 🎯 Overview

ระบบประกอบด้วย 2 ส่วน:
1. **Frontend** - Tax Calculator (GitHub Pages)
2. **Backend** - OCR Proxy (Vercel)

---

## 🌐 Part 1: Deploy Backend (Vercel)

### Step 1: ติดตั้ง Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Deploy Backend

```bash
cd backend
vercel
```

ตอบคำถามดังนี้:
- `Set up and deploy "backend"?` → **Y**
- `Which scope do you want to deploy to?` → เลือก account ของคุณ
- `Link to existing project?` → **N**
- `What's your project's name?` → `tax-calculator-backend` (หรือชื่ออื่นที่ต้องการ)
- `In which directory is your code located?` → `./` (กด Enter)

รอจนเสร็จ จะได้ URL ตัวอย่าง: `https://tax-calculator-backend.vercel.app`

### Step 4: เพิ่ม Environment Variables

1. ไปที่ https://vercel.com/dashboard
2. เลือก project `tax-calculator-backend`
3. ไปที่ **Settings** → **Environment Variables**
4. เพิ่ม variables:

| Name | Value | Environment |
|------|-------|-------------|
| `OPENAI_API_KEY` | `sk-...` (API Key ของคุณ) | Production, Preview, Development |
| `RATE_LIMIT` | `10` | Production, Preview, Development |

5. กด **Save**

### Step 5: Redeploy

```bash
vercel --prod
```

### Step 6: ทดสอบ Backend

เปิด browser ไปที่ `https://your-backend.vercel.app`

ควรเห็น:
```json
{
  "status": "ok",
  "service": "Tax Calculator OCR Proxy",
  "version": "1.0.0"
}
```

---

## 📱 Part 2: Deploy Frontend (GitHub Pages)

### Step 1: สร้าง GitHub Repository

1. ไปที่ https://github.com/new
2. ตั้งชื่อ: `tax-calculator` (หรือชื่ออื่นที่ต้องการ)
3. เลือก **Public**
4. กด **Create repository**

### Step 2: อัปโหลดไฟล์

**วิธีที่ 1: Upload ผ่านเว็บ (ง่ายที่สุด)**

1. ในหน้า Repository กด **"uploading an existing file"**
2. ลากไฟล์ทั้งหมดมาวาง:
   ```
   ├── index.html
   ├── salary-slips.html
   ├── test-pvd.html
   ├── styles.css
   ├── script.js
   ├── salary-slips.js
   └── test-pvd.js
   ```
3. **อย่าอัปโหลดโฟลเดอร์ `backend`!**
4. กด **Commit changes**

**วิธีที่ 2: ใช้ Git**

```bash
cd "c:\Users\user\Desktop\AI Coding\AiCode\Tax Cal App by Claud Code"

# สร้าง .gitignore เพื่อไม่อัปโหลด backend
echo "backend/" > .gitignore
echo "node_modules/" >> .gitignore

# Initialize git
git init
git add index.html salary-slips.html test-pvd.html styles.css script.js salary-slips.js test-pvd.js .gitignore
git commit -m "Initial commit - Tax Calculator 2569"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tax-calculator.git
git push -u origin main
```

### Step 3: เปิดใช้งาน GitHub Pages

1. ใน Repository → **Settings**
2. เลื่อนลงไปหา **"Pages"** ในเมนูซ้าย
3. ที่ **Source** เลือก **"Deploy from a branch"**
4. ที่ **Branch** เลือก **"main"** และ **"/ (root)"**
5. กด **Save**
6. รอ 1-2 นาที แล้ว refresh หน้านี้
7. จะมี URL: `https://YOUR_USERNAME.github.io/tax-calculator/`

### Step 4: อัปเดต Backend URL ใน Frontend

1. แก้ไขไฟล์ `salary-slips.js` บรรทัด 496:

```javascript
// เปลี่ยนจาก:
const BACKEND_URL = 'https://your-backend.vercel.app/api/ocr';

// เป็น URL ที่ได้จาก Vercel:
const BACKEND_URL = 'https://tax-calculator-backend.vercel.app/api/ocr';
```

2. อัปโหลดไฟล์ที่แก้ไขแล้วขึ้น GitHub อีกครั้ง
3. รอ GitHub Pages rebuild (~1-2 นาที)

---

## ✅ Part 3: ทดสอบระบบ

### 1. ทดสอบ Frontend
- เปิด `https://YOUR_USERNAME.github.io/tax-calculator/`
- ควรเห็นหน้า Tax Calculator

### 2. ทดสอบ OCR
- ไปที่ **📄 จัดการสลิป**
- อัปโหลดสลิปเงินเดือน
- ระบบจะ:
  1. เช็คว่ามี API Key หรือไม่
  2. ถ้าไม่มี → ใช้ Backend Proxy (ฟรี 10 รูป/วัน)
  3. ถ้ามี → ใช้ API Key ของผู้ใช้ (ไม่จำกัด)

---

## 🔧 การตั้งค่า OCR

ผู้ใช้มี 3 ตัวเลือก:

### 1. 🆓 Tesseract OCR (ฟรี)
- แม่นยำ 60-70%
- ไม่จำกัดจำนวน
- ใช้งาน offline ได้

### 2. 🌐 Backend Proxy (ฟรี 10 รูป/วัน)
- แม่นยำ 90%+
- จำกัด 10 รูป/วัน/IP
- ไม่ต้องมี API Key

### 3. 🔑 Own API Key (ไม่จำกัด)
- แม่นยำ 90%+
- ไม่จำกัดจำนวน
- ต้องสมัคร OpenAI เอง

---

## 📢 วิธีแชร์ให้เพื่อน

ส่งข้อความนี้:

```
🎉 Tax Calculator 2569 - คำนวณภาษีฟรี!

✅ คำนวณภาษีอัตโนมัติ
✅ บันทึกสลิปเงินเดือน
✅ OCR อ่านสลิปอัตโนมัติ (ฟรี 10 รูป/วัน)
✅ วางแผนลดหย่อนภาษี

เปิดได้ที่:
👉 https://YOUR_USERNAME.github.io/tax-calculator/

ใช้ได้ทั้งคอมและมือถือ!
```

---

## 💰 ค่าใช้จ่าย

### GitHub Pages
- ✅ **ฟรี 100%**

### Vercel
- ✅ **ฟรี** (Hobby plan)
- Limits:
  - 100 GB bandwidth/เดือน
  - 100 deployments/วัน
  - Serverless function: 10 วินาที max

### OpenAI API
- Model: `gpt-4o-mini`
- ราคา: ~$0.0001/รูป (~0.003 บาท/รูป)
- ถ้าจำกัด 10 รูป/คน/วัน:
  - 100 คน = 1,000 รูป/วัน max
  - ค่าใช้จ่าย: ~3 บาท/วัน = ~90 บาท/เดือน

---

## 🔒 Security Checklist

- ✅ API Key เก็บไว้ฝั่ง Vercel (ไม่อยู่ใน frontend)
- ✅ Rate limiting ป้องกัน abuse
- ✅ CORS กำหนด allowed origins
- ✅ ไม่ commit `.env` ลง git
- ✅ ข้อมูลผู้ใช้เก็บใน localStorage (ไม่ส่งขึ้น server)

---

## 🐛 Troubleshooting

### Frontend ไม่ขึ้น
- เช็คว่า GitHub Pages เปิดใช้งานแล้ว
- ลอง hard refresh (Ctrl+Shift+R)

### OCR ไม่ทำงาน
- เปิด Console (F12) ดู error
- เช็คว่า Backend URL ถูกต้อง
- เช็คว่า Backend online อยู่

### Rate Limit Exceeded
- ใช้ครบ 10 รูปแล้ว
- รอวันถัดไป หรือ
- ใส่ API Key ของตัวเองแทน

---

## 📝 Next Steps

1. ✅ Deploy Backend บน Vercel
2. ✅ Deploy Frontend บน GitHub Pages
3. ✅ อัปเดต Backend URL ใน frontend
4. ✅ ทดสอบระบบ
5. 🎉 แชร์ให้เพื่อน!

---

**มีปัญหาหรือคำถาม?**
ดูได้ที่ `backend/README.md` หรือเปิด issue ใน GitHub repo
