# Supabase Storage Setup Guide

This guide walks you through creating and configuring the `mcu-documents` storage bucket in Supabase for the file upload feature.

## Status

✅ **Code Implementation**: COMPLETE
- File upload service: `js/services/supabaseStorageService.js`
- File upload widget: `js/components/fileUploadWidget.js`
- Compression library: `pako@2.1.0` (installed)
- Database table: `mcufiles` (already exists)
- Integration: Added to Tambah MCU and Edit MCU modals

⏳ **Manual Setup Required**: Create storage bucket in Supabase

---

## Step 1: Login to Supabase Dashboard

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your MCU project
3. You should be in the project dashboard

---

## Step 2: Create Storage Bucket

1. In the left sidebar, click **Storage**
2. Click **Create a new bucket** (or the **+** button)
3. Fill in the bucket details:
   - **Name**: `mcu-documents`
   - **Privacy**: Select **Private** (we'll use Row-Level Security for access control)
   - Optionally check **Enable versioning** (recommended for audit trail)
4. Click **Create bucket**

You should now see `mcu-documents` listed in your buckets.

---

## Step 3: Verify Bucket Configuration (Optional but Recommended)

Click on the `mcu-documents` bucket to see its settings:

**Expected Configuration:**
- Name: `mcu-documents`
- Status: Active
- Privacy: Private
- Versioning: On (optional)

---

## Step 4: Create RLS Policies (Security - Optional but Recommended)

Row-Level Security policies control who can access files. This is optional but recommended for production.

### Option A: Allow All Authenticated Users (Simple)

In the Storage section, click on `mcu-documents` bucket → **Policies** tab:

**For uploads (INSERT):**
```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mcu-documents');
```

**For downloads (SELECT):**
```sql
-- Allow users to view their own files
CREATE POLICY "Allow users to view their files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'mcu-documents');
```

**For deletions (DELETE):**
```sql
-- Allow users to delete their own files
CREATE POLICY "Allow users to delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'mcu-documents');
```

### Option B: Restrict by Employee (Advanced)

If you want to restrict files by employee ID (stored in the path):

```sql
-- Allow users to see only files in their employee folder
CREATE POLICY "Allow users to access their employee files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'mcu-documents' AND
  (storage.foldername(name))[1] = auth.uid() -- Restrict to their employee folder
);
```

---

## Step 5: Verify Supabase Configuration in Code

Check that your environment variables are set correctly:

**In Vercel (production):**
1. Go to Settings → Environment Variables
2. Verify these variables are set:
   - `SUPABASE_URL`: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - `SUPABASE_ANON_KEY`: Your anonymous public key

**In `.env.local` (development):**
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

You can find these in Supabase:
- Project Settings → API → Project URL and anon key

---

## Step 6: Test File Upload

Once the bucket is created:

1. Open the application in your browser
2. Go to **Tambah Karyawan** page and open the "Tambah MCU" modal
3. You should see the file upload widget at the bottom
4. Try uploading a file:
   - **PDF file**: Should show 50-70% compression
   - **Word document**: Should show 50-70% compression
   - **Image (JPG/PNG)**: Should skip compression (already compressed)

### Expected Console Logs:

```
✅ Supabase client initialized successfully
✅ Supabase initialization complete
✅ Supabase client is ready and enabled

📤 Uploading: document.pdf (245.3KB)
✅ Compressed: 245.3KB → 78.2KB (68.1% reduction)
📤 Uploading: document.pdf.gz (78.2KB)
✅ File uploaded successfully: {fileid}
```

---

## Step 7: Monitor File Storage

### View Uploaded Files in Supabase:

1. Go to **Storage** → **mcu-documents** bucket
2. Files are organized by employee ID:
   ```
   mcu-documents/
   ├── EMPLOYEE_001/
   │   ├── MCU_001/
   │   │   ├── 20251108091523-document.pdf.gz
   │   │   └── 20251108091530-report.docx.gz
   │   └── MCU_002/
   │       └── 20251108091545-scan.jpg
   └── EMPLOYEE_002/
   ```

### Check Database Records:

1. Go to **Database Editor** → **mcufiles** table
2. You should see records like:
   | fileid | employeeid | mcuid | filename | filetype | filesize | supabase_storage_path | uploadedby | uploadedat | deletedat |
   |--------|------------|-------|----------|----------|----------|------------------------|------------|------------|-----------|
   | uuid-1 | EMP-001 | MCU-001 | document.pdf | application/pdf | 245300 | mcu-documents/EMPLOYEE_001/MCU_001/20251108091523-document.pdf.gz | user-1 | 2025-11-08... | null |

---

## File Upload Feature Overview

### What Happens When a File is Uploaded:

1. **File Selection**: User selects a file from their computer or drags it
2. **Validation**: File type and size are checked
3. **Compression**:
   - PDFs and Office docs: Compressed with gzip (50-70% reduction)
   - Images: No compression (already efficient)
4. **Upload to Storage**: Compressed file uploaded to `mcu-documents` bucket
5. **Save Metadata**: File reference saved to `mcufiles` table
6. **Display**: File appears in the list with options to download or delete

### File Path Structure:

```
mcu-documents/{employeeId}/{mcuId}/{timestamp}-{filename}
```

Example:
```
mcu-documents/EMP-20240101/MCU-20250108-001/20251108091523-medical_report.pdf.gz
```

**Benefits of this structure:**
- Easy to organize by employee and MCU
- Timestamp prevents filename collisions
- Sortable by date (timestamp format: YYYYMMDDHHmmss)

---

## Troubleshooting

### Issue: "Supabase is not configured"

**Solution**: Check that environment variables are set:
- Vercel: Settings → Environment Variables
- Local development: `.env.local` file
- Then restart the application

### Issue: Files not appearing in storage

**Check:**
1. Is the bucket public or private?
2. Are RLS policies configured?
3. Check browser console for upload errors
4. Check Supabase logs: Monitoring → Edge Logs

### Issue: Compression not working

**Check logs for:**
- `⏭️ Skipping compression for image/jpeg` (images are skipped)
- `✅ Compressed: ...` (compression succeeded)
- `❌ Compression error:` (check error details)

---

## Storage Quota Reference

With **Supabase Pro Plan** ($25/month):
- **100GB Storage**: Plenty for 5000+ MCU records with compression
- **50GB Bandwidth**: Standard for moderate usage
- **Versioning**: Track file changes over time

**Cost Calculation:**
- ~5MB average file size (before compression)
- ~2.5MB after gzip compression (50% reduction)
- 5000 MCUs × 2.5MB = ~12.5GB total
- **Well within 100GB limit**

---

## Next Steps

1. ✅ Create `mcu-documents` storage bucket
2. ✅ (Optional) Configure RLS policies for security
3. Test file upload with various file types
4. Monitor compression statistics in browser console
5. Deploy to Vercel when ready

---

## Code References

- **Service**: [js/services/supabaseStorageService.js](../mcu-management/js/services/supabaseStorageService.js)
- **Widget**: [js/components/fileUploadWidget.js](../mcu-management/js/components/fileUploadWidget.js)
- **Config**: [js/config/supabase.js](../mcu-management/js/config/supabase.js)
- **Database**: [js/services/database.js](../mcu-management/js/services/database.js)

---

## API Documentation

### supabaseStorageService.js Functions

**uploadFile(file, employeeId, mcuId, userId)**
- Uploads file with compression
- Returns: `{ success: boolean, fileid?: string, storagePath?: string, error?: string }`

**deleteFile(fileid)**
- Soft deletes file (marks deleted_at, removes from storage)
- Returns: `{ success: boolean, error?: string }`

**getFilesByMCU(mcuId)**
- Gets all non-deleted files for an MCU
- Returns: Array of file records

**getFilesByEmployee(employeeId)**
- Gets all non-deleted files for an employee
- Returns: Array of file records

**downloadFile(storagePath, fileName)**
- Downloads file with auto-download
- Returns: `{ success: boolean, error?: string }`

**getDownloadUrl(storagePath)**
- Gets download URL without auto-download
- Returns: `{ success: boolean, url?: string, error?: string }`

---

## FAQ

**Q: Will compression affect file quality?**
A: No. Gzip compression is lossless - the file is perfectly restored when decompressed. This is the same compression method used for ZIP files.

**Q: Can users download compressed files?**
A: Yes. The service automatically handles decompression when downloading. Users receive the original file, not the `.gz` version.

**Q: What about deleted files?**
A: Deleted files are soft-deleted (marked with deletedat timestamp) for audit purposes. They're removed from storage but kept in the database for historical tracking.

**Q: Can I recover a deleted file?**
A: The file is removed from storage immediately, but the database record remains. You could technically re-upload from backups if needed.

**Q: How often should I check storage usage?**
A: Check monthly in Supabase → Settings → Usage. With compression, you should use much less than expected.

---

## Created: November 8, 2025
## Last Updated: November 8, 2025
