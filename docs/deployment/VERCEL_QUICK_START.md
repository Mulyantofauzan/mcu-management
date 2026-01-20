# ⚡ Vercel Quick Start - 3 Simple Steps

**Everything is ready. Just follow these 3 steps.**

---

## Step 1️⃣: Deploy to Vercel (5 min)

### Option A: Automatic (Recommended)
```bash
# Just push to GitHub and Vercel auto-deploys
git push origin main
```

### Option B: Manual CLI
```bash
npm install -g vercel
cd /Users/mulyanto/Desktop/MCU-APP
vercel
# Follow prompts
```

### Option C: Web Dashboard
1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Select your GitHub repo
4. Click "Import"
5. Environment variables will be needed (Step 2)

**Result:** You'll get a URL like `https://your-project-name.vercel.app`

---

## Step 2️⃣: Set Environment Variables (5 min)

In Vercel dashboard, go to **Settings → Environment Variables** and add:

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

---

## Step 3️⃣: Update & Test (5 min)

### Update .env.local
File: `mcu-management/.env.local`

Replace `YOUR_VERCEL_PROJECT_NAME` with your actual project name:
```env
VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT=https://YOUR_VERCEL_PROJECT_NAME.vercel.app/api/uploadToGoogleDrive
```

Example: `https://mcu-app-blue.vercel.app/api/uploadToGoogleDrive`

### Create Supabase Table
1. Go to https://app.supabase.com
2. Select MCU project
3. Go to SQL Editor
4. Run SQL from: `docs/SUPABASE_SETUP.md`

### Test
```bash
cd mcu-management
npm run dev
```

1. Open http://localhost:5173
2. Go to "Tambah Karyawan"
3. Click "+ Tambah MCU"
4. Drop a PDF or image
5. Should upload without errors

---

## ✅ Verification Checklist

- [ ] Vercel deployment successful
- [ ] Environment variables set
- [ ] Supabase table created
- [ ] .env.local updated
- [ ] Frontend starts
- [ ] File upload widget appears
- [ ] File uploads successfully
- [ ] File appears in Google Drive
- [ ] Metadata in Supabase

**All checked?** 🎉 **You're done!**

---

## 🆘 Troubleshooting

**"Function failed to deploy"**
- Check `/api/uploadToGoogleDrive.js` exists
- Check `/api/package.json` exists
- Check `vercel.json` exists

**"401 Unauthorized"**
- Verify GOOGLE_CREDENTIALS is set correctly
- Check if entire JSON was pasted (not truncated)

**"File doesn't upload"**
- Check browser console for errors
- Verify Vercel function is deployed
- Check environment variables are set

**"File in Google Drive but not Supabase"**
- Create `mcuFiles` table first
- Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

---

## 📞 Need Help?

See detailed docs:
- **VERCEL_DEPLOYMENT_GUIDE.md** - Full instructions
- **VERCEL_REFACTORING_COMPLETE.md** - What changed
- **docs/SUPABASE_SETUP.md** - Database setup
- **docs/CLOUD_FUNCTION_DEPLOYMENT.md** - Troubleshooting

---

## 🚀 Ready?

1. Deploy to Vercel
2. Set environment variables
3. Update .env.local
4. Create Supabase table
5. Test upload

**Total time:** ~20 minutes
**Cost:** $0
**Status:** Ready to go! 🎉

---

**November 8, 2025**
