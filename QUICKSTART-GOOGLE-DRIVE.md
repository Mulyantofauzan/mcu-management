# Quick Start: Enable File Uploads

## TL;DR - Do These 3 Things

### 1. Create Google Client ID (5 minutes)
- Go to https://console.cloud.google.com/apis/credentials
- Create OAuth2 Client ID (Web app type)
- Add origins: `http://localhost:5173` and `https://mcu-management.vercel.app`
- Copy the Client ID

### 2. Set Local Environment (30 seconds)
Edit `.env.local`:
```
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
```

### 3. Set Vercel Environment (30 seconds)
In Vercel dashboard → Settings → Environment Variables:
```
VITE_GOOGLE_CLIENT_ID = YOUR_CLIENT_ID_HERE
```

## Done! 🎉

Now file uploads will work:
1. User clicks "Upload File"
2. Browser prompts for Google sign-in (first time only)
3. File uploads to Google Drive automatically

## What Just Happened?

The file upload feature was switched from a complex backend approach to a simple frontend approach:
- **Before:** Uploads sent to backend → backend authenticated with service account → upload to Drive
- **Now:** Uploads sent directly to Google Drive from browser → user's Google account

This is safer, simpler, and faster.

## Files Now Uploaded To

Your files go here in Google Drive:
```
MCU Documents/
  └─ EMP001 - John Doe/
  └─ EMP002 - Jane Smith/
```

Each employee gets their own folder.

## Troubleshooting

**Error: "Google Client ID not configured"**
→ Make sure you added `VITE_GOOGLE_CLIENT_ID` to `.env.local` and restarted dev server

**Error: "Google root folder not configured"**
→ Make sure `VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID` is in `.env.local` (it should be)

**File upload fails with 403**
→ Check your Google account has access to MCU Documents folder

**Need more help?**
→ See `GOOGLE_DRIVE_SETUP.md` for detailed guide

## Important: This Is a Breaking Change

⚠️ The old backend upload function in `/api/uploadToGoogleDrive.js` is **no longer used**.

If you had Vercel environment variables set for the backend approach:
- `GOOGLE_CREDENTIALS` - no longer needed
- `GOOGLE_DRIVE_ROOT_FOLDER_ID` - still needed for frontend

You can safely delete `GOOGLE_CREDENTIALS` from Vercel.
