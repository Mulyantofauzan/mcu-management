# 🚀 Next Steps - Firebase Blaze Upgrade Required

## ✅ What's Done

✅ Google Cloud Project `mcu-management` sudah ada
✅ Firebase sudah ditambahkan ke project `mcu-management`
✅ Cloud Function code sudah ready
✅ Configuration sudah correct (`.firebaserc` = `mcu-management`)
✅ Semua dokumentasi lengkap

## ⏳ What's Left

**1 step saja:** Upgrade Firebase project ke **Blaze** plan

---

## 📋 Why Blaze?

Cloud Functions butuh API yang hanya tersedia di Blaze plan:
- `cloudfunctions.googleapis.com`
- `cloudbuild.googleapis.com`
- `artifactregistry.googleapis.com`

Spark (free) plan tidak support API-API ini.

---

## 💰 Blaze Plan Cost

**Untuk aplikasi ini:**
- Free tier: 2 juta invocations/bulan
- Expected usage: ~100 invocations/hari = 3,000/bulan
- **Total cost: $0** (dalam free tier)

---

## ✨ Simple Steps

### Step 1: Upgrade Firebase

1. Go to: https://console.firebase.google.com/project/mcu-management/usage/details
2. Klik "Upgrade to Blaze"
3. Masukkan kartu kredit
4. Confirm
5. Tunggu (biasanya instant)

### Step 2: Deploy Cloud Function

```bash
cd /Users/mulyanto/Desktop/MCU-APP
npx firebase deploy --only functions:uploadToGoogleDrive
```

Expected output:
```
Function URL (uploadToGoogleDrive):
https://us-central1-mcu-management.cloudfunctions.net/uploadToGoogleDrive
```

### Step 3: Update .env.local

Copy function URL dari Step 2, paste ke:

**File:** `mcu-management/.env.local`

```env
VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID=1XJ2utC4aWHUdhdqerfRr96E3SSILmntH
VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT=https://us-central1-mcu-management.cloudfunctions.net/uploadToGoogleDrive
```

### Step 4: Set Cloud Function Environment Variables

1. Go to: https://console.firebase.google.com/project/mcu-management/functions
2. Click function: `uploadToGoogleDrive`
3. Go to: **Runtime settings** tab
4. Add these 4 environment variables:

```
GOOGLE_CREDENTIALS = (paste seluruh isi /credentials/google-credentials.json)
GOOGLE_DRIVE_ROOT_FOLDER_ID = 1XJ2utC4aWHUdhdqerfRr96E3SSILmntH
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
```

5. Click **Deploy** or **Redeploy**

### Step 5: Create Supabase Table

1. Go to: https://app.supabase.com/
2. Select MCU project
3. Go to: **SQL Editor**
4. Create new query
5. Paste SQL dari: `docs/SUPABASE_SETUP.md`
6. Execute

### Step 6: Test Upload

1. Open app: http://localhost:5173
2. Go to: **Tambah Karyawan**
3. Upload a file
4. Verify file appears in Google Drive & Supabase

---

## 🎯 Firebase Project Info

```
Project ID: mcu-management
Project URL: https://console.firebase.google.com/project/mcu-management
Current Plan: Spark (free) → needs Blaze
Region: us-central1
```

---

## 📁 Documentation

For more details:

- **DEPLOYMENT_FINAL_STEPS.md** - Complete 6-step guide
- **FIREBASE_BLAZE_UPGRADE.md** - Blaze upgrade details
- **README_DEPLOYMENT.md** - Configuration reference
- **docs/SUPABASE_SETUP.md** - Database setup
- **docs/CLOUD_FUNCTION_DEPLOYMENT.md** - Troubleshooting

---

## ✅ Status

```
Code:            ✅ 100% Ready
Configuration:   ✅ 100% Ready (mcu-management)
Firebase Setup:  ✅ Project created
Database:        ⏳ Need to create table
Deployment:      ⏳ Need Blaze upgrade
```

---

## 🚀 Next Action

**1. Upgrade Firebase to Blaze**
- Link: https://console.firebase.google.com/project/mcu-management/usage/details

**2. Follow 6 steps above**

**Total time:** ~30 minutes

Ready? 🎉
