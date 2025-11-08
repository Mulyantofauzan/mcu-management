# Google Drive File Upload Setup Guide

## Overview
The file upload feature has been refactored to use **Google Drive SDK (gapi)** directly from the frontend instead of a backend serverless function. This approach:
- Eliminates backend complexity
- Uses user's own Google account for authentication
- Uploads files directly to Google Drive
- No sensitive credentials stored on server

## What Changed

### Before (Backend Approach)
- Files uploaded to backend serverless function
- Backend authenticated with Google Service Account credentials
- Stored in Vercel environment variables
- Complex credential management

### After (Frontend Approach - Current)
- Files upload directly from browser to Google Drive
- Uses Google OAuth2 Client ID (public credential)
- User authenticates with their own Google account
- Much simpler setup and no backend credential management

## Step 1: Create Google OAuth2 Client ID

Follow these steps to create a new OAuth2 Client ID:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth Client ID**
5. Choose **Web application** as the application type
6. Name it something like `MCU-Management-FileUpload`
7. Under "Authorized JavaScript origins", add:
   - `http://localhost:5173`
   - `https://mcu-management.vercel.app` (replace with your actual domain)
8. Under "Authorized redirect URIs", add:
   - `http://localhost:5173`
   - `https://mcu-management.vercel.app`
9. Click **Create**
10. You'll see a dialog with your Client ID - **copy it**

## Step 2: Configure Local Development (.env.local)

Add the Client ID to your `.env.local` file:

```bash
# Google Drive Configuration
VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID=1_m-UR1_SrEswZ3tJcGDVy5xRdqFJTFMr
VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT=/api/uploadToGoogleDrive
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
```

Replace `YOUR_CLIENT_ID_HERE` with the Client ID you copied from Google Cloud Console.

**Note:** This file is `.gitignored` for security - don't commit it.

## Step 3: Configure Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Open your `mcu-management` project
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name:** `VITE_GOOGLE_CLIENT_ID`
   - **Value:** Your Client ID from Step 1
5. Make sure it's available for **Production** and **Preview** environments
6. Click **Save and Redeploy**

## Step 4: Verify the Setup

### Local Testing
1. Start your local development server:
   ```bash
   cd mcu-management
   npm run dev
   ```
2. Navigate to **Kelola Karyawan** → Click on an employee
3. Scroll to the **File Upload** section
4. Click **Choose Files** and select a PDF or image
5. Click **Upload**
6. You should see a Google sign-in popup (first time only)
7. After signing in, the file should upload to Google Drive

### Expected Behavior
1. First upload: Browser asks for Google sign-in
2. User signs in with their Google account
3. Permission dialog appears asking for Google Drive access
4. File uploads and shows progress
5. Success message appears with file details
6. File is now in Google Drive under the MCU Documents folder

## Folder Structure in Google Drive

Files are organized like this:
```
MCU Documents/
  EMP001 - John Doe/
    file1.pdf
    file2.jpg
  EMP002 - Jane Smith/
    file1.pdf
```

Each employee gets their own folder automatically created.

## Troubleshooting

### "Google Client ID not configured" Error
- Check `.env.local` has `VITE_GOOGLE_CLIENT_ID` set
- For production, verify Vercel environment variable is set correctly
- Redeploy if you just added the Vercel variable

### "Google Drive root folder ID not configured" Error
- Verify `VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID` is in `.env.local`
- The folder ID comes from the Google Drive URL: `https://drive.google.com/drive/folders/1ABC123XYZ...`

### User not signed into Google
- Browser will automatically prompt for Google sign-in on first upload
- Clear browser cookies if you want to test different accounts

### File upload shows "Failed: 403"
- Make sure your Google account has write access to the MCU Documents folder
- Check folder permissions in Google Drive

### File upload times out
- Try a smaller file first (test with a small PDF under 1MB)
- Check network connection
- File size limit is 5MB

## API Endpoints Used

The frontend uses these Google APIs directly (no backend needed):
- `https://apis.google.com/js/api.js` - Google API client library
- `https://www.googleapis.com/auth/drive.file` - Drive access scope
- `https://www.googleapis.com/upload/drive/v3/files` - File upload endpoint

## Security Notes

✅ **Safe:** Client ID is a public credential (meant for frontend)
✅ **Safe:** Users authenticate with their own Google accounts
✅ **Safe:** Google Drive API has fine-grained permissions
✅ **Safe:** No sensitive credentials stored in code

## Files Modified

- [gapiDriveService.js:1-209](mcu-management/js/services/gapiDriveService.js) - New Google Drive service using gapi
- [fileUploadWidget.js:346-381](mcu-management/js/components/fileUploadWidget.js) - Updated to use gapi instead of backend
- [googleDriveConfig.js:80-84](mcu-management/js/config/googleDriveConfig.js) - Added clientId getter

## Need Help?

If you encounter issues:
1. Check browser console (F12) for error messages
2. Verify all environment variables are set correctly
3. Make sure Google Cloud project has Drive API enabled
4. Ensure OAuth2 Client ID is for Web application type
5. Check that authorized origins/redirect URIs include your domain
