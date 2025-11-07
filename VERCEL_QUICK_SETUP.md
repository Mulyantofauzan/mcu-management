# 🚀 Vercel Deployment - Quick Setup

**Semua sudah ready! Tinggal deploy.**

---

## 1️⃣ Deploy ke Vercel (3 menit)

1. Go to: https://vercel.com
2. Click: **New Project**
3. Import: Pilih repository MCU-APP
4. Click: **Import**
5. Wait for auto-deployment (~2 menit)

**Selesai!** Vercel akan auto-detect config dari `vercel.json`

---

## 2️⃣ Set Environment Variables (2 menit)

Di Vercel dashboard project kamu:

1. Go to: **Settings → Environment Variables**
2. Tambah 4 variables:

```
GOOGLE_CREDENTIALS = (paste seluruh isi /credentials/google-credentials.json)
GOOGLE_DRIVE_ROOT_FOLDER_ID = 1XJ2utC4aWHUdhdqerfRr96E3SSILmntH
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY = your-actual-key
```

3. Klik: **Save**
4. Vercel auto-redeploy

---

## 3️⃣ Update .env.local (1 menit)

File: `mcu-management/.env.local`

Ganti line endpoint:
```env
VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT=https://YOUR_VERCEL_PROJECT_NAME.vercel.app/api/uploadToGoogleDrive
```

Example: `https://mcu-app.vercel.app/api/uploadToGoogleDrive`

---

## 4️⃣ Create Supabase Table (2 menit)

1. Go to: https://app.supabase.com
2. Select: MCU project
3. SQL Editor → New Query
4. Copy-paste SQL dari: `docs/SUPABASE_SETUP.md`
5. Run

---

## 5️⃣ Test (2 menit)

```bash
cd mcu-management
npm run dev
```

1. Open: http://localhost:5173
2. Tambah Karyawan → Tambah MCU
3. Upload file
4. Cek Google Drive & Supabase

✅ Semua working!

---

**Total time: ~10 minutes**
**Cost: $0/month (free tier)**

---

## What's Ready

✅ Frontend code
✅ Serverless function (api/uploadToGoogleDrive.js)
✅ CORS configured
✅ vercel.json configured
✅ Environment variables defined
✅ Database setup SQL ready

**Semua siap. Tinggal deploy!** 🚀
