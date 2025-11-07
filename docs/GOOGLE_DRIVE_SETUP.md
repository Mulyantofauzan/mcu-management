# Google Drive File Upload Setup Guide

## Overview

This guide walks through setting up Google Drive file uploads for MCU documents. Files are stored in Google Drive, with only metadata (links, file info) stored in Supabase.

**Architecture:**
```
Frontend (Browser)
    ↓ (file + metadata)
Cloud Function (Firebase)
    ↓ (file)
Google Drive
    ↓ (fileId)
Supabase (metadata only)
```

## Phase 1: Google Cloud Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Login with your Google account
3. Click **"Select a Project"** → **"NEW PROJECT"**
4. Fill in:
   - **Project name:** `MCU-Management`
   - **Organization:** (optional)
5. Click **CREATE**

### Step 2: Enable Google Drive API

1. In Cloud Console, search for **"Google Drive API"**
2. Click the result
3. Click **ENABLE**
4. Wait for activation to complete

### Step 3: Create Service Account

1. Go to **Credentials** (left sidebar)
2. Click **+ CREATE CREDENTIALS** → **Service Account**
3. Fill form:
   - **Service account name:** `mcu-file-upload`
   - **Service account ID:** auto-filled (OK)
   - **Description:** `Service account for uploading MCU files to Google Drive`
4. Click **CREATE AND CONTINUE**
5. Step 2: Click **CONTINUE** (skip permissions)
6. Step 3: Click **DONE**

### Step 4: Create and Download JSON Key

1. Go to **Service Accounts** page
2. Click on **mcu-file-upload** service account
3. Go to **KEYS** tab
4. Click **Add Key** → **Create new key**
5. Choose **JSON** → **CREATE**
6. JSON file downloads automatically
7. **Save securely!** This contains API credentials

### Step 5: Setup Google Drive Folder

1. Open [Google Drive](https://drive.google.com/)
2. Create new folder: **"MCU Documents"**
3. Right-click folder → **Share**
4. In the JSON file, find the `"client_email"` field
5. Paste this email into share dialog
6. Give **Editor** permission
7. Uncheck "Notify people" (automation account)
8. Click **Share**

### Step 6: Get Folder ID

1. Open "MCU Documents" folder in Google Drive
2. Look at the URL:
   ```
   https://drive.google.com/drive/folders/1ABC123XYZ...
   ```
3. The ID is: `1ABC123XYZ...` (after `/folders/`)
4. **Save this ID** - needed for configuration

---

## Phase 2: Local Development Setup

### Step 1: Add Credentials to Project

1. Get the JSON file from Phase 1, Step 4
2. Place it in: `/Users/mulyanto/Desktop/MCU-APP/credentials/google-credentials.json`
3. **DO NOT commit this to Git!** (.gitignore already set)

### Step 2: Setup Environment Variables

Create `.env.local` in `/mcu-management/` directory:

```env
# Google Drive Configuration
VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID=1ABC123XYZ...
VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT=http://localhost:5001/mcu-management-PROJECT-ID/us-central1/uploadToGoogleDrive
```

Replace:
- `1ABC123XYZ...` with actual folder ID from Step 6 above
- `mcu-management-PROJECT-ID` with your Firebase project ID

### Step 3: Setup Firebase Emulator (Local Testing)

```bash
cd /Users/mulyanto/Desktop/MCU-APP
firebase init emulators  # If not done already
firebase emulators:start --only functions
```

This starts local Cloud Function on `http://localhost:5001`

---

## Phase 3: Deploy Cloud Functions

### Step 1: Install Dependencies

```bash
cd /Users/mulyanto/Desktop/MCU-APP/functions
npm install
```

### Step 2: Setup Secrets in Firebase

Store credentials securely using Secret Manager:

```bash
# Set Google credentials secret
firebase functions:secrets:set GOOGLE_CREDENTIALS --data-file credentials/google-credentials.json

# Set other environment variables
firebase functions:secrets:set GOOGLE_DRIVE_ROOT_FOLDER_ID --data '1ABC123XYZ...'
firebase functions:secrets:set SUPABASE_URL
firebase functions:secrets:set SUPABASE_SERVICE_ROLE_KEY
```

### Step 3: Deploy Function

```bash
firebase deploy --only functions:uploadToGoogleDrive
```

After deployment, you'll get a URL like:
```
https://us-central1-mcu-management-PROJECT-ID.cloudfunctions.net/uploadToGoogleDrive
```

Update `.env.local`:
```env
VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT=https://us-central1-mcu-management-PROJECT-ID.cloudfunctions.net/uploadToGoogleDrive
```

---

## Phase 4: Database Setup

### Create mcuFiles Table in Supabase

Go to Supabase Dashboard → SQL Editor, paste this:

```sql
-- Create mcuFiles table
CREATE TABLE mcuFiles (
  fileId TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  employeeId TEXT NOT NULL,
  mcuId TEXT,
  fileName TEXT NOT NULL,
  fileType TEXT NOT NULL,
  fileSize INTEGER NOT NULL,
  googleDriveFileId TEXT NOT NULL UNIQUE,
  uploadedBy TEXT NOT NULL,
  uploadedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deletedAt TIMESTAMP WITH TIME ZONE,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_employee FOREIGN KEY (employeeId) REFERENCES employees(employeeId) ON DELETE CASCADE,
  CONSTRAINT fk_mcu FOREIGN KEY (mcuId) REFERENCES mcus(mcuId) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_mcufiles_employeeId ON mcuFiles(employeeId);
CREATE INDEX idx_mcufiles_mcuId ON mcuFiles(mcuId);
CREATE INDEX idx_mcufiles_uploadedAt ON mcuFiles(uploadedAt DESC);
CREATE INDEX idx_mcufiles_deletedAt ON mcuFiles(deletedAt);

-- Enable RLS (optional)
ALTER TABLE mcuFiles ENABLE ROW LEVEL SECURITY;
```

### Update Database Service

Add to `databaseAdapter.js`:

```javascript
async getMCUFiles(employeeId) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('mcuFiles')
    .select('*')
    .eq('employeeId', employeeId)
    .is('deletedAt', null)
    .order('uploadedAt', { ascending: false });

  if (error) throw error;
  return data;
}
```

---

## Testing

### Local Testing with Firebase Emulator

1. Start emulator: `firebase emulators:start --only functions`
2. In frontend, upload a file
3. Check emulator logs
4. Verify metadata in Supabase

### Production Testing

1. Deploy Cloud Function: `firebase deploy --only functions`
2. Update `.env.local` with production URL
3. Upload a file in production
4. Verify in Google Drive and Supabase

---

## Troubleshooting

### "Unauthorized" Error
- Check Service Account email is correct
- Verify folder is shared with Service Account
- Check GOOGLE_CREDENTIALS environment variable

### "Folder not found" Error
- Verify GOOGLE_DRIVE_ROOT_FOLDER_ID is correct
- Folder must be shared with Service Account email

### Upload Fails
- Check Cloud Function logs: `firebase functions:log`
- Verify file is < 5MB
- Check Firebase project ID matches

### File Visible in Google Drive but Not in Supabase
- Check database connection
- Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct
- Check Cloud Function error logs

---

## File Structure in Google Drive

```
MCU Documents/
├── EMP001 - John Doe/
│   ├── chest-xray-2024-01.pdf
│   ├── blood-test-2024-01.jpg
│   └── ekg-2024-01.pdf
├── EMP002 - Jane Smith/
│   ├── health-check-2024-01.pdf
│   └── vaccination-proof.jpg
└── EMP003 - Bob Johnson/
    └── medical-report-2024-01.pdf
```

Each employee gets their own folder named `{employeeId} - {name}`.

---

## API Reference

### Frontend: Upload File

```javascript
import { googleDriveService } from './services/googleDriveService.js';
import { fileCompression } from './utils/fileCompression.js';

// 1. Compress file
const compressedFile = await fileCompression.compressFile(file);

// 2. Initialize service with config
await googleDriveService.init(
  process.env.VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID,
  process.env.VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT
);

// 3. Upload
const result = await googleDriveService.uploadFile(
  compressedFile,
  employeeId,
  currentUser
);
// Returns: { fileId, googleDriveFileId, fileName, fileSize, uploadedAt }
```

### Google Drive URLs

```javascript
// Download URL (for clicking download button)
const downloadUrl = googleDriveService.getDownloadUrl(googleDriveFileId);

// Preview URL (for showing embedded preview)
const previewUrl = googleDriveService.getPreviewUrl(googleDriveFileId);

// Direct link (opens in Google Drive)
const driveLink = `https://drive.google.com/file/d/${googleDriveFileId}/view`;
```

---

## Security Notes

1. **Credentials:** Never commit `google-credentials.json` to Git
2. **Service Account:** Only used by Cloud Functions, not by frontend
3. **File Access:** Only authenticated users can upload (Firebase Auth)
4. **Google Drive:** Only people you share the folder with can see files
5. **Metadata:** Only metadata stored in Supabase, not actual files

---

## Costs

- **Google Drive:** Free (15GB included with Google account)
- **Firebase Cloud Functions:** First 2 million invocations free/month
- **Google API Calls:** Free for Drive API

---

## Next Steps

1. Complete all steps in this guide
2. Test local upload with Firebase Emulator
3. Deploy to production
4. Create UI for file upload in MCU page
5. Add file list and download/delete features
