# R2 Storage - Pre-Deployment Checklist

## ✅ MOST CRITICAL: Environment Variables

**Yang paling penting:** Set 5 env vars di Vercel!

Tanpa env vars, upload akan gagal.

### Langkah-langkah:

1. Login ke Vercel Dashboard: https://vercel.com
2. Buka project: **MCU-APP**
3. Go to: **Settings** → **Environment Variables**
4. Tambah 5 variables baru:

```
CLOUDFLARE_R2_ENDPOINT
Value: https://fd1c39fefc64308d6692bb137a7a55c0.r2.cloudflarestorage.com

CLOUDFLARE_R2_ACCESS_KEY_ID
Value: 9c414074a10f8be1f5832b17833048ea

CLOUDFLARE_R2_SECRET_ACCESS_KEY
Value: d63c43da985786e1a6a2563d870a0deedb01674212f208c6b8ef7a29f51e123a

CLOUDFLARE_R2_BUCKET_NAME
Value: mcu-files

CLOUDFLARE_ACCOUNT_ID
Value: fd1c39fefc64308d6692bb137a7a55c0
```

5. Click **Save**
6. Vercel akan auto-redeploy

---

## ✅ Configuration Status

| Component | Status | Notes |
|-----------|--------|-------|
| Backend Services | ✅ Ready | `/api/r2StorageService.js`, `/api/r2SignedUrlService.js` |
| Upload Endpoint | ✅ Ready | `/api/compress-upload/index.js` |
| Download Endpoint | ✅ Ready | `/api/download-file/index.js` |
| Frontend Services | ✅ Updated | `downloadFile()`, `getMCUFilesWithSignedUrls()` |
| Vercel Config | ✅ Ready | `/vercel.json` configured |
| Dependencies | ✅ Installed | AWS SDK S3 + Presigner |
| Env Variables | ⚠️ **PENDING** | Perlu di-set di Vercel |

---

## 🚀 What's Ready to Use

### Upload File
- ✅ Works immediately after env vars set
- ✅ POST /api/compress-upload
- ✅ Stores in R2 + metadata in Supabase

### View File List
- ✅ Works immediately
- ✅ GET /api/get-mcu-files
- ✅ Shows all files for MCU

### Download File
- ✅ Works immediately after env vars set
- ✅ GET /api/download-file
- ✅ Auto-generates signed URL (1 hour valid)

---

## ⚡ Quick Start

### 1. Set Environment Variables (REQUIRED)
```
Go to Vercel Dashboard → Project Settings → Environment Variables
Add 5 variables listed above
Save → Auto-redeploy
```

### 2. Verify Deployment
```bash
vercel deploy --prod
# or git push (auto-deploy)
```

### 3. Test Upload
1. Open app
2. Manage Employees → Select employee
3. Tambah MCU → Upload file
4. Click Save

Expected: ✅ No errors, file saved

### 4. Test View
1. Click on employee again
2. View MCU history → Click Detail
3. Scroll to "📄 Dokumen MCU"

Expected: ✅ File list visible

### 5. Test Download
1. In MCU detail modal
2. Click Download button on file

Expected: ✅ File downloads

---

## 🔍 Verification Commands

```bash
# Check if deployed
vercel status

# Check logs (live tail)
vercel logs --tail

# Check env vars set
vercel env list

# Manual redeploy if needed
vercel deploy --prod
```

---

## ❌ If Upload Fails

**Error:** "Missing R2 environment variables"
- → Set env vars in Vercel (see Step 1 above)

**Error:** "R2 client not initialized"
- → Same as above, env vars not loaded

**Error:** "File too large"
- → File must be under 2MB

**Error:** "File type not allowed"
- → Only PDF, JPG, PNG allowed

**Error:** "Unauthorized"
- → Download only works for file owner

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| R2_SETUP.md | Initial R2 setup |
| R2_SIGNED_URLS.md | Complete signed URL guide |
| R2_SIGNED_URLS_FAQ.md | FAQ & examples |
| R2_CHEATSHEET.md | Quick reference |
| R2_TROUBLESHOOTING.md | Debug guide |
| DEPLOYMENT_CHECKLIST.md | This file |

---

## ✨ Summary

```
Everything is ready!

Just need to:
1. Set 5 env vars in Vercel ← CRITICAL
2. Deploy (git push or vercel deploy --prod)
3. Test in app

Then:
- Upload ✅
- View ✅
- Download ✅

All automatic and secure! 🎉
```

---

## Questions?

See documentation files listed above.
