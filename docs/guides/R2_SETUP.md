# Cloudflare R2 Storage Setup Guide

## Overview
This project has been migrated from Supabase Storage to Cloudflare R2 for cost optimization while maintaining the same file structure and API interface.

## Architecture
- **Frontend**: Sends files to Vercel API endpoint (`/api/compress-upload`)
- **Backend API**: Validates files and uploads to Cloudflare R2 (server-side only)
- **Database**: Supabase (stores file metadata and URLs)
- **Storage**: Cloudflare R2 (stores actual files)

## Environment Variables Required

Add the following environment variables to your Vercel project settings:

```
CLOUDFLARE_R2_ENDPOINT=https://fd1c39fefc64308d6692bb137a7a55c0.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=9c414074a10f8be1f5832b17833048ea
CLOUDFLARE_R2_SECRET_ACCESS_KEY=d63c43da985786e1a6a2563d870a0deedb01674212f208c6b8ef7a29f51e123a
CLOUDFLARE_R2_BUCKET_NAME=mcu-files
CLOUDFLARE_ACCOUNT_ID=fd1c39fefc64308d6692bb137a7a55c0

# Existing variables (still required)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
```

## File Structure in R2

Files are organized with this structure:
```
mcu-files/
├── {EmployeeName}_{EmployeeId}/
│   ├── {MCU-ID}/
│   │   ├── file1.pdf
│   │   ├── file2.jpg
│   │   └── file3.png
```

Example:
```
mcu-files/
├── John_Doe_EMP001/
│   ├── MCU-2024-001/
│   │   ├── medical_report.pdf
│   │   └── xray.jpg
```

## Implementation Details

### Modified Files

1. **`/api/r2StorageService.js`** (NEW)
   - S3-compatible client configured for R2
   - Handles file uploads to R2 bucket
   - Generates public URLs
   - Saves metadata to Supabase
   - Functions exported:
     - `uploadFileToStorage()` - Main upload function
     - `generateStoragePath()` - Create folder structure
     - `getEmployeeName()` - Resolve employee names
     - `generatePublicUrl()` - Create public URLs

2. **`/api/compress-upload/index.js`** (UPDATED)
   - Changed import from `supabaseStorageService` to `r2StorageService`
   - Updated documentation header

3. **`/api/supabaseStorageService.js`** (DEPRECATED)
   - No longer used, but kept for reference
   - Can be deleted if needed

4. **Frontend Services** (UNCHANGED)
   - `/mcu-management/js/services/supabaseStorageService.js` - Still works without changes
   - Upload interface remains the same
   - No frontend code modifications needed

## Upload Flow

1. User selects file in frontend
2. Frontend sends POST to `/api/compress-upload` with:
   - `file` (multipart)
   - `employeeId`
   - `mcuId`

3. Backend processes:
   - Validates file type and size (max 2MB)
   - Generates folder path: `mcu_files/{EmployeeName}_{EmployeeId}/{MCU-ID}/{filename}`
   - Uploads to R2 bucket
   - Generates public URL: `https://{account-id}.r2.cloudflarestorage.com/mcu-files/{path}`
   - Saves metadata to Supabase mcufiles table
   - Returns success response with file details

4. Response includes:
   - Success status
   - File name and size
   - R2 storage path
   - Public URL for downloading

## Public URL Access

Files are accessible via:
```
https://{CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/mcu-files/{storage-path}
```

Or if custom domain is configured:
```
https://{custom-domain}/mcu-files/{storage-path}
```

## Configuration for Custom Domain (Optional)

To use a custom domain instead of the R2 account URL:
1. Configure custom domain in Cloudflare R2 settings
2. Add `CLOUDFLARE_R2_PUBLIC_URL` environment variable with your domain

## Troubleshooting

### Files not uploading
- Check that all environment variables are set in Vercel
- Verify R2 bucket name matches `CLOUDFLARE_R2_BUCKET_NAME`
- Check file size is under 2MB
- Verify file type is PDF, JPG, or PNG

### Metadata not saving
- Verify Supabase credentials are correct
- Check that mcufiles table exists in Supabase
- Verify SUPABASE_SERVICE_ROLE_KEY has permission to insert records

### URLs not working
- Verify CLOUDFLARE_ACCOUNT_ID is correct
- Check that files were actually uploaded to R2
- Ensure R2 bucket is configured for public access if needed

## Migration from Supabase Storage

This setup replaces Supabase Storage while keeping:
- Same API endpoint URL (`/api/compress-upload`)
- Same frontend code
- Same metadata structure in Supabase database
- Same folder organization logic

Only the storage backend changed (R2 instead of Supabase Storage).

## Cost Comparison

- **Supabase Storage**: $0.025/GB (after free tier)
- **Cloudflare R2**: $0.015/GB (after free 10GB)
- **Bandwidth**: Free for both

## Next Steps

1. Set environment variables in Vercel project settings
2. Deploy to Vercel: `vercel deploy`
3. Test file upload through UI
4. Verify files appear in R2 bucket with correct folder structure
5. Verify metadata is saved in Supabase mcufiles table
6. Test file download via public URL
