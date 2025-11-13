# Cloudflare R2 Bucket Configuration

## Quick Setup Guide

### Step 1: Enable Public Access on R2 Bucket

To allow your application to upload files and make them publicly accessible:

#### Via Cloudflare Dashboard:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **R2** in the left sidebar
3. Find and click the **mcu-files** bucket
4. Go to **Settings** tab
5. Look for **Public Access** or **CORS** section

#### Enable Public Read Access:

If your bucket is private, you need to make it public:

```
Settings → Public Access
→ Allow access to this bucket
→ Enable "public read"
```

OR configure a public bucket policy. The policy should allow:
- GET (read/download files)
- PUT (upload files via signed URLs or with proper auth)

#### Example Bucket Policy (if needed):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::mcu-files/*"
    },
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::*:user/*"
      },
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::mcu-files/*"
    }
  ]
}
```

### Step 2: Verify Environment Variables

Ensure all variables are set in Vercel:

```bash
CLOUDFLARE_R2_ENDPOINT=https://fd1c39fefc64308d6692bb137a7a55c0.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=9c414074a10f8be1f5832b17833048ea
CLOUDFLARE_R2_SECRET_ACCESS_KEY=d63c43da985786e1a6a2563d870a0deedb01674212f208c6b8ef7a29f51e123a
CLOUDFLARE_R2_BUCKET_NAME=mcu-files
CLOUDFLARE_ACCOUNT_ID=fd1c39fefc64308d6692bb137a7a55c0
```

### Step 3: Redeploy Application

After updating bucket settings:

```bash
# From your local machine
vercel deploy --prod
```

Or push to GitHub and let Vercel auto-deploy.

### Step 4: Test Upload

Try uploading a file through the MCU app:
1. Go to Manage Employees
2. Click on an employee
3. Click "Tambah MCU"
4. Upload a file

### Step 5: Verify in R2 Console

Check that files appear:

1. Go to Cloudflare R2 dashboard
2. Click **mcu-files** bucket
3. Navigate: `mcu_files/` folder
4. You should see a folder with employee name: `John_Doe_EMP001/`
5. Inside: MCU folder like `MCU-2024-001/`
6. Inside: Your uploaded file like `report.pdf`

### File Structure in R2:

```
mcu-files/
├── mcu_files/
│   ├── John_Doe_EMP001/
│   │   ├── MCU-2024-001/
│   │   │   ├── medical_report.pdf
│   │   │   └── xray_scan.jpg
│   │   └── MCU-2024-002/
│   │       └── lab_results.pdf
│   └── Jane_Smith_EMP002/
│       └── MCU-2024-101/
│           └── report.pdf
```

### Access Public URLs:

Files can be accessed at:

```
https://{ACCOUNT_ID}.r2.cloudflarestorage.com/mcu-files/mcu_files/{Employee}_{EmployeeId}/{MCU-ID}/{filename}
```

Example:
```
https://fd1c39fefc64308d6692bb137a7a55c0.r2.cloudflarestorage.com/mcu-files/mcu_files/John_Doe_EMP001/MCU-2024-001/medical_report.pdf
```

### Using Custom Domain (Optional):

Instead of the long R2 URL, you can use a custom domain:

1. In Cloudflare R2 settings, find "Custom Domain"
2. Add your domain: `files.yourdomain.com`
3. Verify DNS records
4. Files will be at: `https://files.yourdomain.com/mcu_files/...`

Then update `CLOUDFLARE_R2_PUBLIC_URL` environment variable:

```
CLOUDFLARE_R2_PUBLIC_URL=https://files.yourdomain.com
```

### Troubleshooting

#### Files uploaded but not visible:
- Check bucket public access is enabled
- Verify folder path is correct: `mcu_files/...`
- Wait 30 seconds for console refresh
- Try accessing URL directly in browser

#### 403 Forbidden error:
- Bucket public access is disabled
- Enable public read access in R2 settings

#### 404 Not Found:
- File path is incorrect
- Folder structure doesn't match
- File upload failed (check API logs)

#### Slow uploads:
- Normal for first upload
- R2 is geographically distributed
- Files are cached after first access

### API Endpoint Configuration (Already Done)

The `/api/compress-upload` endpoint is already configured to:
- Accept file uploads
- Validate file type (PDF, JPG, PNG)
- Validate file size (max 2MB)
- Upload to R2
- Save metadata to Supabase
- Return public URL

No additional configuration needed on the API side.

### Next Steps

1. Enable R2 public access (if not already done)
2. Redeploy to Vercel: `vercel deploy --prod`
3. Test file upload through the app
4. Verify files appear in R2 console
5. Check metadata in Supabase database

If files still don't appear, see [R2_TROUBLESHOOTING.md](./R2_TROUBLESHOOTING.md).
