# Cloudflare R2 Troubleshooting Guide

## Issue: Files Upload Successfully But Don't Appear in R2

### Root Cause
When files appear to upload successfully but don't show in the R2 console, it's usually one of these issues:

1. **R2 Bucket public access is not enabled**
2. **Credentials are invalid or don't have write permissions**
3. **Network connectivity issues**
4. **Bucket doesn't exist or name is incorrect**

### Solution Checklist

#### Step 1: Verify R2 Bucket Public Access

1. Log in to Cloudflare dashboard
2. Go to **R2** section
3. Find your bucket: **mcu-files**
4. Click on the bucket settings
5. Look for **Public access** settings

**Important:** You need to enable public access on your R2 bucket. Follow these steps:

```
Cloudflare R2 Dashboard
└── R2 (in left sidebar)
    └── mcu-files (your bucket)
        └── Settings
            └── CORS Configuration
                └── Enable public access for uploads
```

#### Step 2: Configure CORS for R2 Bucket (if needed)

If you need to allow cross-origin uploads, add this CORS policy:

```json
[
  {
    "AllowedOrigins": ["https://your-app-domain.com"],
    "AllowedMethods": ["GET", "POST", "PUT", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

#### Step 3: Verify Environment Variables in Vercel

Check that ALL these variables are set in Vercel project settings:

```
CLOUDFLARE_R2_ENDPOINT=https://fd1c39fefc64308d6692bb137a7a55c0.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=9c414074a10f8be1f5832b17833048ea
CLOUDFLARE_R2_SECRET_ACCESS_KEY=d63c43da985786e1a6a2563d870a0deedb01674212f208c6b8ef7a29f51e123a
CLOUDFLARE_R2_BUCKET_NAME=mcu-files
CLOUDFLARE_ACCOUNT_ID=fd1c39fefc64308d6692bb137a7a55c0
```

**Note:** Make sure to redeploy after adding environment variables:
```bash
vercel deploy --prod
```

#### Step 4: Check API Logs

Deploy to Vercel and test file upload. Check the Vercel logs for error messages:

```bash
vercel logs [your-deployment-url]
```

Look for messages like:
- `✅ R2 configuration loaded and validated` - Good, config is correct
- `❌ R2 Config Error - Missing: [variable names]` - Missing env vars
- `🔄 Sending upload command to R2...` - Upload is in progress
- `✅ Upload command succeeded` - File was uploaded
- `❌ Upload error:` - Check the error message

#### Step 5: Verify Credentials

Test your credentials using AWS CLI (optional):

```bash
# Install AWS CLI if you don't have it
aws configure --profile r2

# When prompted, enter:
# AWS Access Key ID: 9c414074a10f8be1f5832b17833048ea
# AWS Secret Access Key: d63c43da985786e1a6a2563d870a0deedb01674212f208c6b8ef7a29f51e123a
# Default region: auto
# Default output: json

# Test listing bucket contents
aws s3 ls s3://mcu-files --profile r2 --endpoint-url https://fd1c39fefc64308d6692bb137a7a55c0.r2.cloudflarestorage.com
```

### Common Error Messages & Solutions

#### Error: "Missing R2 environment variables"
**Solution:** Add all 5 environment variables to Vercel project settings and redeploy.

#### Error: "R2 upload returned no response"
**Solution:**
- Check credentials are correct in Vercel settings
- Verify bucket name is exactly `mcu-files` (case-sensitive)
- Check R2 bucket public access is enabled

#### Error: "File buffer is empty"
**Solution:** File upload failed before reaching R2 service. Check:
- File size is under 2MB
- File type is PDF, JPG, or PNG
- File upload from frontend completed successfully

#### Error: "Metadata save error"
**Solution:** File uploaded to R2 but database save failed. Check:
- Supabase credentials are correct
- mcufiles table exists and has write permissions
- SUPABASE_SERVICE_ROLE_KEY has correct permissions

### File Upload Flow Diagram

```
User selects file
    ↓
Frontend validates file (size, type)
    ↓
POST to /api/compress-upload
    ↓
Vercel API receives request
    ↓
Busboy parses multipart data
    ↓
r2StorageService validates inputs
    ↓
S3Client.send(PutObjectCommand)
    ↓
Upload to R2
    ↓
Generate public URL
    ↓
Save metadata to Supabase
    ↓
Return success response
    ↓
File appears in R2 bucket
```

### Testing File Upload Manually

Create a simple test script:

```bash
#!/bin/bash

# Set your variables
EMPLOYEE_ID="EMP001"
MCU_ID="MCU-2024-001"
FILE_PATH="./test-document.pdf"
API_ENDPOINT="https://your-api-domain.com/api/compress-upload"

# Upload file
curl -X POST \
  -F "file=@$FILE_PATH" \
  -F "employeeId=$EMPLOYEE_ID" \
  -F "mcuId=$MCU_ID" \
  "$API_ENDPOINT"
```

### Verifying Files in R2

Once working, files should appear at:

```
https://{CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/mcu-files/mcu_files/{EmployeeName}_{EmployeeId}/{MCU-ID}/{filename}
```

Example:
```
https://fd1c39fefc64308d6692bb137a7a55c0.r2.cloudflarestorage.com/mcu-files/mcu_files/John_Doe_EMP001/MCU-2024-001/medical_report.pdf
```

### Database Verification

Check that metadata is saved in Supabase:

```sql
SELECT
  fileid,
  filename,
  supabase_storage_path,
  google_drive_link,
  uploadedat
FROM mcufiles
WHERE mcuid = 'MCU-2024-001'
ORDER BY uploadedat DESC;
```

Expected result:
```
fileid              | filename         | supabase_storage_path          | google_drive_link
MCU-2024-001-xxxxx  | report.pdf       | mcu_files/John_Doe_EMP001/...  | https://fd1c39...
```

### Performance Tips

1. **Enable R2 Cache**: Configure Cloudflare cache rules to cache files for faster downloads
2. **Use Custom Domain**: Set up a custom domain for R2 for branded URLs
3. **Optimize Uploads**: Keep files under 1MB when possible for faster uploads
4. **Batch Uploads**: Upload multiple files in sequence, not parallel

### Getting Help

If files still don't appear in R2 after these steps:

1. Check Vercel deployment logs: `vercel logs`
2. Check browser console for upload errors (F12 -> Console)
3. Check if error messages mention specific R2 failures
4. Verify all 5 environment variables are exactly as configured
5. Try redeploy after updating environment variables: `vercel deploy --prod`

### Advanced Debugging

Enable detailed logging in r2StorageService.js by temporarily adding:

```javascript
// Add after s3Client initialization
s3Client.on('debug', (msg) => console.log('[R2 DEBUG]', msg));
```

Then check detailed logs of what's happening during upload attempts.
