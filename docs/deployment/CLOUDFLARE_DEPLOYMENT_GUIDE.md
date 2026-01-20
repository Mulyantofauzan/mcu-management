# 🚀 Cloudflare Pages Deployment Guide - MCU Management System

**Status:** Code ready, configuration complete. Ready for Cloudflare Pages deployment.

**Project:** MCU Management System
**Backend:** Cloudflare Workers (serverless)
**Platform:** Cloudflare Pages

---

## ⚡ Quick Start (3 Steps)

### Step 1: Connect to Cloudflare Pages (5 minutes)

1. Go to: https://pages.cloudflare.com/
2. Log in with Cloudflare account (or create one)
3. Click: **Create a project**
4. Connect your GitHub account
5. Select: **MCU-APP** repository
6. Click: **Begin setup**

**Build Configuration:**
- Framework: **None** (custom build)
- Build command: `npm run build`
- Build output directory: `mcu-management/dist`
- Root directory: `.`

Click **Save and Deploy**

### Step 2: Set Environment Variables (5 minutes)

In Cloudflare Pages dashboard:
1. Go to your project: **mcu-management**
2. Click: **Settings → Environment variables**
3. Add these variables:

```
GOOGLE_CREDENTIALS
(paste entire contents of /credentials/google-credentials.json)

GOOGLE_DRIVE_ROOT_FOLDER_ID
1XJ2utC4aWHUdhdqerfRr96E3SSILmntH

SUPABASE_URL
https://your-project.supabase.co

SUPABASE_SERVICE_ROLE_KEY
your-actual-service-role-key
```

⚠️ **Important:** Paste the ENTIRE JSON for GOOGLE_CREDENTIALS (it's multi-line)

### Step 3: Update .env.local & Test (5 minutes)

Replace `YOUR_CLOUDFLARE_PROJECT_NAME` in `mcu-management/.env.local`:

```env
VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT=https://YOUR_CLOUDFLARE_PROJECT_NAME.pages.dev/api/uploadToGoogleDrive
```

**Example:** `https://mcu-management.pages.dev/api/uploadToGoogleDrive`

Then:
```bash
cd mcu-management
npm run dev
```

Test file upload and verify in Google Drive & Supabase.

---

## 📁 Project Structure for Cloudflare Pages

```
MCU-APP/
├── functions/
│   ├── uploadToGoogleDrive.ts    ← Your serverless function (NEW)
│   └── package.json              ← Dependencies
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
├── wrangler.toml                 ← Cloudflare configuration (NEW)
├── package.json                  ← Root dependencies
├── vite.config.js               ← Frontend build config
└── ...
```

---

## 🔧 How Cloudflare Pages Works

### With Functions

Cloudflare Pages automatically detects functions in the `/functions` directory:

1. Any file in `/functions` becomes an API endpoint
2. `uploadToGoogleDrive.ts` → `https://your-site.pages.dev/api/uploadToGoogleDrive`
3. Automatically deployed with your site
4. No separate function deployment needed

### Routing

```
GET  /                          → mcu-management/index.html
GET  /pages/tambah-karyawan     → mcu-management/pages/tambah-karyawan.html
POST /api/uploadToGoogleDrive   → functions/uploadToGoogleDrive.ts
GET  /js/components/*           → mcu-management/js/components/*
```

---

## 🔐 Environment Variables Explained

Same as before, but set in Cloudflare Pages dashboard instead of wrangler.toml:

### GOOGLE_CREDENTIALS
- **What:** Service Account JSON from Google Cloud
- **Where to get:** `/credentials/google-credentials.json`
- **Format:** Entire JSON object (multi-line)
- **Why:** Authenticates with Google Drive API

### GOOGLE_DRIVE_ROOT_FOLDER_ID
- **What:** Folder ID where all MCU files are stored
- **Where to get:** Google Drive folder sharing link
- **Format:** Single string ID
- **Example:** `1XJ2utC4aWHUdhdqerfRr96E3SSILmntH`

### SUPABASE_URL
- **What:** Your Supabase project URL
- **Where to get:** Supabase dashboard → Settings → API
- **Format:** `https://your-project.supabase.co`

### SUPABASE_SERVICE_ROLE_KEY
- **What:** Service role API key for Supabase
- **Where to get:** Supabase dashboard → Settings → API → Service Role
- **Format:** Long alphanumeric string

---

## 📊 How It Works

### File Upload Flow

```
User Browser
    ↓ (FileUploadWidget)
    ├─→ Select/Drop file
    └─→ POST to /api/uploadToGoogleDrive
         ↓
    Cloudflare Worker (TypeScript)
    (uploadToGoogleDrive.ts)
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

| Operation | Cost |
|-----------|------|
| Cloudflare Pages | Free (unlimited requests) |
| Cloudflare Workers | Free (100k requests/day) |
| Google Drive API | Free (unlimited) |
| Supabase Database | Free (500MB) |
| **Total** | **$0** |

**Expected usage:** 100 uploads/day = 3,000/month (well within free tier)

---

## 🧪 Testing Deployment

### Step 1: Verify Function Endpoint

Open in browser:
```
https://your-project.pages.dev/api/uploadToGoogleDrive
```

You should get an error (expected - OPTIONS/GET not allowed):
```json
{
  "error": "Method not allowed"
}
```

If you see 404, function not deployed yet.

### Step 2: Test File Upload

1. Start frontend: `npm run dev`
2. Open: http://localhost:5173
3. Go to: **Tambah Karyawan** page
4. Click: **+ Tambah MCU**
5. Upload file (PDF or image)

Verify:
- ✅ No errors in browser console
- ✅ File appears in list
- ✅ File appears in Google Drive
- ✅ Metadata in Supabase

---

## 🐛 Troubleshooting

### Issue: "Function deployment failed"
**Solution:**
- Check `functions/uploadToGoogleDrive.ts` syntax
- Check `functions/package.json` has dependencies
- Try pushing to GitHub again

### Issue: "401 Unauthorized" error
**Solution:**
- Verify GOOGLE_CREDENTIALS environment variable is set
- Check if JSON is complete (no truncation)
- Verify SUPABASE_URL and key are correct

### Issue: "CORS error in browser"
**Solution:**
- Cloudflare automatically handles CORS
- If error persists, check function return headers

### Issue: "File upload timeout"
**Solution:**
- Cloudflare timeout: 30 seconds (default)
- Current 5MB limit should work fine

### Issue: "Files don't appear in Google Drive"
**Solution:**
- Verify GOOGLE_DRIVE_ROOT_FOLDER_ID
- Check Service Account has folder access

### Issue: "Metadata not in Supabase"
**Solution:**
- Create `mcuFiles` table (see SUPABASE_SETUP.md)
- Verify SUPABASE_SERVICE_ROLE_KEY is correct

---

## 📋 Deployment Checklist

Before deploying:

- [ ] `functions/uploadToGoogleDrive.ts` created
- [ ] `functions/package.json` exists
- [ ] `wrangler.toml` created
- [ ] Root `package.json` updated
- [ ] `.env.local` template ready
- [ ] Google credentials ready
- [ ] Google Drive folder ID ready
- [ ] Supabase project created
- [ ] Supabase API keys ready
- [ ] GitHub account connected to Cloudflare
- [ ] MCU repository accessible

All checked? ✅ Ready to deploy!

---

## 🚀 Local Development

Test locally before deploying:

```bash
# Install Wrangler CLI
npm install -g wrangler

# Set up local environment
cp .env.example .env.local

# Run locally
wrangler dev
```

Your local function will be at: `http://localhost:8787/api/uploadToGoogleDrive`

Update `.env.local`:
```env
VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT=http://localhost:8787/api/uploadToGoogleDrive
```

---

## 📚 Documentation Map

| Document | Purpose |
|----------|---------|
| **CLOUDFLARE_DEPLOYMENT_GUIDE.md** | This guide |
| **CLOUDFLARE_PAGES_SETUP.md** | Detailed setup |
| **docs/SUPABASE_SETUP.md** | Database table setup |
| **functions/uploadToGoogleDrive.ts** | Function implementation |

---

## ✅ What's Included

✅ **Code**
- TypeScript Cloudflare Worker function
- Multipart form parsing
- Google Drive integration
- Supabase database integration
- Error handling

✅ **Configuration**
- wrangler.toml for Cloudflare
- Environment variables defined
- CORS headers configured

✅ **Documentation**
- Deployment guide (this file)
- Setup instructions
- Troubleshooting guide

---

## 🎯 Next Steps

1. Go to: https://pages.cloudflare.com/
2. Connect GitHub repository
3. Configure build settings
4. Set environment variables
5. Deploy
6. Update .env.local
7. Create Supabase table
8. Test file upload

**Time to deploy:** ~15 minutes
**Cost:** $0 (free forever)
**Uptime:** 99.95%

---

## 💡 Why Cloudflare Pages?

✅ **Free** - No cost, no credit card
✅ **Fast** - Edge deployment (worldwide)
✅ **Simple** - Auto-deploy on git push
✅ **Powerful** - Built-in Workers for functions
✅ **Reliable** - 99.95% uptime SLA
✅ **Scalable** - Automatically handles traffic

---

**Ready to deploy? Go to:** https://pages.cloudflare.com/

---

Generated: November 8, 2025
Status: Ready for deployment 🚀
