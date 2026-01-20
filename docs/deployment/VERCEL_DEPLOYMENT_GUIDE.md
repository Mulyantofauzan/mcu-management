# 🚀 Vercel Deployment Guide - MCU Management System

**Status:** Code ready, configuration complete. Ready for Vercel deployment.

**Project:** MCU Management System
**Backend:** Vercel Serverless Functions (free tier)
**Platform:** Vercel

---

## ⚡ Quick Start (5 Steps)

### Step 1: Connect to Vercel (5 minutes)

1. Go to: https://vercel.com
2. Sign up or log in with GitHub
3. Click: **Import Project**
4. Paste repo URL: `https://github.com/your-username/MCU-APP`
5. Or connect your GitHub account for auto-deployment

### Step 2: Configure Environment Variables (5 minutes)

In Vercel dashboard, go to your project → **Settings** → **Environment Variables**

Add these 4 variables:

```
Key: GOOGLE_CREDENTIALS
Value: (paste entire contents of /credentials/google-credentials.json)

Key: GOOGLE_DRIVE_ROOT_FOLDER_ID
Value: 1XJ2utC4aWHUdhdqerfRr96E3SSILmntH

Key: SUPABASE_URL
Value: https://your-project.supabase.co

Key: SUPABASE_SERVICE_ROLE_KEY
Value: your-actual-service-role-key
```

**Important:** Make sure to paste the ENTIRE JSON object for `GOOGLE_CREDENTIALS`.

### Step 3: Deploy to Vercel (2 minutes)

**Option A: Automatic (Recommended)**
- Push to GitHub
- Vercel auto-deploys on every push

**Option B: Manual CLI**
```bash
npm install -g vercel
cd /Users/mulyanto/Desktop/MCU-APP
vercel
```

### Step 4: Get Your Vercel Endpoint URL

After deployment, Vercel will show your project URL:
```
https://your-project-name.vercel.app
```

Your API function will be at:
```
https://your-project-name.vercel.app/api/uploadToGoogleDrive
```

### Step 5: Update .env.local (2 minutes)

**File:** `mcu-management/.env.local`

```env
VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID=1XJ2utC4aWHUdhdqerfRr96E3SSILmntH
VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT=https://your-project-name.vercel.app/api/uploadToGoogleDrive
```

Replace `your-project-name` with your actual Vercel project name.

---

## 📁 Project Structure for Vercel

```
MCU-APP/
├── api/
│   ├── uploadToGoogleDrive.js    ← Your serverless function
│   └── package.json              ← API dependencies
│
├── mcu-management/               ← Frontend app
│   ├── index.html
│   ├── .env.local                ← Environment variables
│   ├── js/
│   │   ├── components/
│   │   │   └── fileUploadWidget.js
│   │   ├── services/
│   │   │   └── googleDriveService.js
│   │   ├── utils/
│   │   │   └── fileCompression.js
│   │   └── pages/
│   │       ├── tambah-karyawan.js
│   │       └── kelola-karyawan.js
│   └── ...
│
├── vercel.json                   ← Vercel configuration
├── package.json                  ← Root dependencies
├── vite.config.js               ← Frontend build config
└── ...
```

---

## 🔧 Configuration Explained

### vercel.json

- **version: 2** - Latest Vercel config format
- **functions** - API routes run as serverless functions
- **memory: 512** - 512MB RAM per function (enough for file uploads)
- **maxDuration: 30** - 30 second timeout (enough for large files)
- **runtime: nodejs20.x** - Node.js 20 runtime
- **headers** - CORS headers for API routes
- **env** - Environment variable definitions

### api/package.json

Only includes dependencies needed for the serverless function:
- `googleapis` - Google Drive API
- `@supabase/supabase-js` - Supabase SDK
- `uuid` - File ID generation
- `busboy` - Multipart form parsing

Does NOT include Firebase dependencies (not needed for Vercel).

### Root package.json

Includes:
- Frontend build tools (Vite)
- API dependencies (same as api/package.json)
- Deployment tools (firebase-tools for other uses)

---

## 🔐 Environment Variables Explained

### GOOGLE_CREDENTIALS
- **What:** Service Account JSON from Google Cloud
- **Where to get:** `/credentials/google-credentials.json`
- **Format:** Entire JSON object (multi-line)
- **Why:** Authenticates with Google Drive API
- **Example:**
  ```json
  {
    "type": "service_account",
    "project_id": "mcu-management",
    "private_key_id": "...",
    ...
  }
  ```

### GOOGLE_DRIVE_ROOT_FOLDER_ID
- **What:** Folder ID where all MCU files are stored
- **Where to get:** Google Drive folder sharing link
- **Format:** Single string ID (no spaces)
- **Why:** Organizes files within Google Drive
- **Example:** `1XJ2utC4aWHUdhdqerfRr96E3SSILmntH`

### SUPABASE_URL
- **What:** Your Supabase project URL
- **Where to get:** Supabase dashboard → Settings → API
- **Format:** `https://your-project.supabase.co`
- **Why:** Connects to database for metadata storage
- **Example:** `https://abcdef1234567.supabase.co`

### SUPABASE_SERVICE_ROLE_KEY
- **What:** Service role API key for Supabase
- **Where to get:** Supabase dashboard → Settings → API → Service Role
- **Format:** Long alphanumeric string
- **Why:** Allows serverless function to write to database
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## 📊 How It Works

### File Upload Flow

```
User Browser
    ↓ (FileUploadWidget)
    ├─→ Select/Drop file
    └─→ POST to /api/uploadToGoogleDrive
         ↓
    Vercel Serverless Function
    (uploadToGoogleDrive.js)
         ├─→ Parse multipart form
         ├─→ Validate file (type, size)
         ├─→ Create employee folder in Google Drive
         ├─→ Upload file to Google Drive
         └─→ Save metadata to Supabase
         ↓
    Response to browser
         ├─→ File ID
         ├─→ Google Drive File ID
         └─→ Upload timestamp
```

### Cost Analysis

| Operation | Monthly Cost |
|-----------|--------------|
| Vercel Functions | Free (up to 400k execution hours) |
| Google Drive API | Free (unlimited) |
| Supabase Database | Free (500MB) |
| **Total** | **$0** |

**Expected usage:** 100 uploads/day = 3,000/month = ~5-10 execution hours/month

---

## 🧪 Testing Deployment

### Step 1: Verify API Endpoint

Open in browser:
```
https://your-project-name.vercel.app/api/uploadToGoogleDrive
```

You should see:
```json
{
  "error": "Method not allowed"
}
```

This is expected (OPTIONS/GET not allowed, POST required). If you see a 404, deployment failed.

### Step 2: Test File Upload

1. Start your frontend:
   ```bash
   cd /Users/mulyanto/Desktop/MCU-APP/mcu-management
   npm run dev
   ```

2. Open: http://localhost:5173

3. Go to: **Tambah Karyawan** page

4. Fill in employee details

5. Click: **+ Tambah MCU**

6. Drag-drop or select a PDF/image file

7. Verify:
   - ✅ File appears in list
   - ✅ Progress bar shows upload
   - ✅ No errors in browser console
   - ✅ File appears in Google Drive
   - ✅ Metadata in Supabase

---

## 🐛 Troubleshooting

### Issue: "Function failed to deploy"

**Solution:**
- Check `api/uploadToGoogleDrive.js` for syntax errors
- Verify `api/package.json` has all dependencies
- Check vercel.json for typos

### Issue: "401 Unauthorized" error

**Solution:**
- Verify GOOGLE_CREDENTIALS environment variable is set
- Check if JSON is complete (no truncation)
- Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct

### Issue: "File upload timeout (30s)"

**Solution:**
- Vercel max timeout is 30 seconds
- For files >50MB, consider splitting upload
- Current 5MB limit should work fine

### Issue: "CORS error in browser"

**Solution:**
- Vercel CORS headers should handle this
- Check vercel.json headers are correct
- Try from different domain if testing locally

### Issue: "Files don't appear in Google Drive"

**Solution:**
- Verify GOOGLE_DRIVE_ROOT_FOLDER_ID is correct
- Check Service Account has folder access
- Verify google-credentials.json is valid

### Issue: "Metadata not in Supabase"

**Solution:**
- Create `mcuFiles` table (see SUPABASE_SETUP.md)
- Verify SUPABASE_SERVICE_ROLE_KEY is correct
- Check table columns match (see SUPABASE_SETUP.md)

---

## 📋 Deployment Checklist

Before deploying, verify:

- [ ] `/api/uploadToGoogleDrive.js` created
- [ ] `/api/package.json` created
- [ ] `vercel.json` created
- [ ] Root `package.json` updated
- [ ] `.env.local` template exists in mcu-management
- [ ] Google credentials JSON ready
- [ ] Google Drive folder ID ready
- [ ] Supabase project created
- [ ] Supabase API keys ready
- [ ] Vercel account created
- [ ] GitHub connected to Vercel
- [ ] MCU project imported to Vercel

All items checked? ✅ Ready to deploy!

---

## 📞 Documentation Map

For detailed information:

| Document | Purpose |
|----------|---------|
| **api/uploadToGoogleDrive.js** | Function implementation |
| **api/package.json** | API dependencies |
| **vercel.json** | Vercel configuration |
| **SUPABASE_SETUP.md** | Database table setup |
| **README_DEPLOYMENT.md** | Deployment reference |

---

## 🎯 Next Steps

1. ✅ Create Vercel account
2. ✅ Connect GitHub repo
3. ✅ Set environment variables
4. ✅ Deploy
5. ✅ Update .env.local
6. ✅ Create Supabase table
7. ✅ Test file upload

**Time to deploy:** ~15 minutes
**Cost:** $0 (free tier)
**Uptime:** 99.95%

---

## 🚀 Ready to Deploy?

1. Go to: https://vercel.com/dashboard
2. Click: **New Project**
3. Connect your GitHub repo
4. Add environment variables (Step 2 above)
5. Deploy!

**Questions?** Check the documentation files listed above.

---

**Generated:** November 8, 2025
**Last Updated:** Vercel Refactoring Complete
