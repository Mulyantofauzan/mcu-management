# Cloud Function Deployment Guide

## Pre-Deployment Checklist

- [x] Firebase project configured (`mcu-management`)
- [x] Service Account credentials created
- [x] Google Drive API enabled
- [x] Google Drive folder created and shared
- [x] Cloud Function code written and tested
- [x] Dependencies in package.json
- [x] firebase.json configured
- [x] .firebaserc configured

## Step 1: Set Environment Variables for Cloud Function

The Cloud Function needs access to Google credentials and other configs. These are set as Firebase Secret Manager secrets:

```bash
# 1. Navigate to functions directory
cd /Users/mulyanto/Desktop/MCU-APP/functions

# 2. Deploy with environment secrets
# You'll need to set these via Firebase Console or gcloud CLI

# Option A: Via Firebase Console (Recommended for first time)
# 1. Go to Firebase Console > mcu-management > Functions > Runtime settings
# 2. Set environment variables:
#    - GOOGLE_CREDENTIALS: (paste the JSON from google-credentials.json)
#    - GOOGLE_DRIVE_ROOT_FOLDER_ID: 1XJ2utC4aWHUdhdqerfRr96E3SSILmntH
#    - SUPABASE_URL: (your Supabase URL)
#    - SUPABASE_SERVICE_ROLE_KEY: (your Supabase service role key)

# Option B: Via gcloud CLI
gcloud functions deploy uploadToGoogleDrive \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars \
  GOOGLE_CREDENTIALS="$(cat ../credentials/google-credentials.json | jq -c .)" \
  GOOGLE_DRIVE_ROOT_FOLDER_ID=1XJ2utC4aWHUdhdqerfRr96E3SSILmntH \
  SUPABASE_URL=https://your-project.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Step 2: Deploy to Firebase

**Using Firebase CLI (Simplest):**

```bash
cd /Users/mulyanto/Desktop/MCU-APP

# Deploy only the Cloud Function
firebase deploy --only functions:uploadToGoogleDrive

# Or deploy everything
firebase deploy

# View logs after deployment
firebase functions:log --limit 50
```

**Expected Output:**

After successful deployment, you should see output like:

```
✔  Deploy complete!

Function URL (uploadToGoogleDrive):
https://us-central1-mcu-management.cloudfunctions.net/uploadToGoogleDrive
```

## Step 3: Update Frontend Configuration

After deployment, update the `.env.local` file with the actual Cloud Function URL:

**File:** `mcu-management/.env.local`

```env
# Google Drive Configuration
VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID=1XJ2utC4aWHUdhdqerfRr96E3SSILmntH
VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT=https://us-central1-mcu-management.cloudfunctions.net/uploadToGoogleDrive
```

Replace `us-central1-mcu-management` with your actual Cloud Function URL (the first part varies by region and project).

## Step 4: Configure Supabase Environment Variables

The Cloud Function also needs Supabase credentials. Get them from your Supabase project:

1. Go to Supabase Dashboard > Project Settings > API
2. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **Service Role Key** (under "Project API keys") → `SUPABASE_SERVICE_ROLE_KEY`

3. Set these in Firebase Cloud Function environment variables (see Step 1)

## Step 5: Test Deployment Locally

Before deploying to production, test locally with Firebase Emulator:

```bash
# Start Firebase Emulator
firebase emulators:start --only functions

# In another terminal, test the function
curl -X POST http://localhost:5001/mcu-management/us-central1/uploadToGoogleDrive \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -F "file=@test-file.pdf" \
  -F "employeeId=EMP001" \
  -F "userId=user123" \
  -F "userName=John Doe"
```

## Troubleshooting

### Error: "GOOGLE_CREDENTIALS not found"

**Solution:** Set environment variables in Firebase Console:
1. Go to Firebase Console > Functions > Runtime settings
2. Add environment variables

### Error: "Permission denied: Google Drive"

**Solution:**
1. Verify Service Account has access to the Google Drive folder
2. Share the folder with the Service Account email: `mcu-file-upload@mcu-management.iam.gserviceaccount.com`

### Error: "SUPABASE_URL is not defined"

**Solution:** Set Supabase environment variables in Firebase Console

### Function Timeout

**Solution:** Increase timeout in firebase.json:
```json
{
  "functions": {
    "uploadToGoogleDrive": {
      "timeout": 540,
      "memory": "512MB"
    }
  }
}
```

## Monitoring

### View Cloud Function Logs

```bash
# Live logs
firebase functions:log

# Last 50 logs with timestamps
firebase functions:log --limit 50

# Filter by function name
firebase functions:log | grep uploadToGoogleDrive
```

### Monitor Performance

1. Go to Firebase Console > Functions
2. Click on `uploadToGoogleDrive` function
3. View metrics: invocations, duration, errors

### Common Issues to Monitor

- Execution time (should be < 30 seconds for typical uploads)
- Memory usage (configured for 512MB)
- Error rate (should be 0%)
- Cold starts (first invocation may be slower)

## Rollback

If deployment fails or has issues:

```bash
# View deployment history
firebase functions:list

# Rollback to previous version
firebase deploy --only functions:uploadToGoogleDrive --force
```

## Next Steps

After successful deployment:

1. ✅ Cloud Function deployed
2. ⏳ **Create mcuFiles table in Supabase** (see: `docs/migrations/004_create_mcu_files_table.md`)
3. ⏳ **Integrate FileUploadWidget** into MCU forms (see: `docs/INTEGRATION_GUIDE.md`)
4. ⏳ **Test end-to-end** file upload and retrieval

---

**Questions?** Refer to:
- Cloud Function code: `functions/uploadToGoogleDrive.js`
- Integration guide: `docs/INTEGRATION_GUIDE.md`
- Quick reference: `QUICK_REFERENCE.md`
