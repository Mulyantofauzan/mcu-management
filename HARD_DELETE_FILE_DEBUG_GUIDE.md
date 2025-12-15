# Hard Delete File - Debug Guide

**Date:** 2025-12-15
**Issue:** HTTP 500 error when trying to permanently delete MCU files
**File Path:** `/api/hard-delete-file/index.js`

---

## Problem Description

When attempting to permanently delete an MCU file, the API returns a 500 error:

```
Failed to load resource: the server responded with a status of 500 ()
```

Example failing request:
```
/api/hard-delete-file?storagePath=mcu_files%2FEMP-20251206-miuai392-O4G40%2FMCU-20251206-miuai4n3-A6U7R%2FSYARIFUDDIN%20PT.%20PUTRA%20SARANA%20TRANSBORNEO%20SITE%20MMI.pdf
```

---

## Root Causes (Most Likely)

### 1. **Missing Environment Variables** ⚠️ (Most Common)

The hard-delete-file API requires these environment variables to be set:

**Required Supabase credentials:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for database operations)

**Required Cloudflare R2 credentials:**
- `CLOUDFLARE_R2_ACCESS_KEY_ID` - R2 bucket access key
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY` - R2 bucket secret key
- `CLOUDFLARE_R2_ENDPOINT` - R2 endpoint URL (e.g., `https://abc123.r2.cloudflarestorage.com`)
- `CLOUDFLARE_R2_BUCKET_NAME` - R2 bucket name

**How to verify:**
1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to Settings → Environment Variables
4. Check if all above variables are present
5. If missing, add them with correct values

---

### 2. **Mismatched Database Field Names**

The API tries to match the `supabase_storage_path` or `storage_path` field in the `mcufiles` table.

**Possible issues:**
- The field might be named differently in your database (e.g., `file_path`, `path`, etc.)
- The storagePath parameter format doesn't match what's stored in the database

**How to check:**
1. Open [Supabase Dashboard](https://supabase.com)
2. Go to your database
3. Check the `mcufiles` table structure
4. See what field names actually exist
5. Compare with what the API is looking for

---

### 3. **Supabase Row-Level Security (RLS) Issues**

The API uses the **SERVICE_ROLE_KEY** which should bypass RLS, but there might be:
- Wrong service role key
- RLS policies preventing deletion even with service role
- Database permissions issues

---

### 4. **R2 Credentials or Configuration Issues**

Even if the database deletion succeeds, R2 deletion might fail, causing the overall operation to fail.

**Possible issues:**
- Wrong bucket name
- Wrong endpoint URL
- Invalid access keys
- Bucket doesn't exist
- Object doesn't exist in bucket (but this shouldn't cause a 500 error)

---

## How to Debug

### Step 1: Check Vercel Logs

1. Go to [Vercel Dashboard](https://vercel.com) → Your Project
2. Click "Deployments" tab
3. Click the most recent deployment
4. Click "Functions" tab
5. Find `api/hard-delete-file` in the list
6. Click it to see the logs
7. Look for log messages starting with `[hard-delete-file]`

**Expected log output if successful:**
```
[hard-delete-file] Processing delete request: fileId=undefined, storagePath=mcu_files/EMP-xxx/MCU-yyy/filename.pdf
[hard-delete-file] Found file record: { fileid: 'abc123', supabase_storage_path: 'mcu_files/EMP-xxx/MCU-yyy/filename.pdf' }
[hard-delete-file] Deleting from R2 storage: mcu_files/EMP-xxx/MCU-yyy/filename.pdf
[hard-delete-file] Successfully deleted from R2
[hard-delete-file] Deleting from database: fileid=abc123
[hard-delete-file] Successfully deleted file from database
```

**Expected error if missing credentials:**
```
[hard-delete-file] Missing Supabase credentials
[hard-delete-file] Missing Cloudflare R2 credentials
```

### Step 2: Check Browser Console

When you see the 500 error in the UI:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for error messages from `deleteFileFromStorage()`
4. The error should now show the actual API error message

**Example error output:**
```
[deleteFileFromStorage] API Error: {
  status: 500,
  error: "Server configuration error: Missing Supabase credentials",
  details: undefined
}
```

### Step 3: Verify Database Schema

```sql
-- Check the mcufiles table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'mcufiles'
ORDER BY ordinal_position;

-- Check if the file exists in database
SELECT fileid, filename, supabase_storage_path
FROM mcufiles
WHERE supabase_storage_path LIKE '%SYARIFUDDIN%'
LIMIT 5;
```

### Step 4: Test R2 Connection Separately

You can use the test endpoint to verify R2 credentials:
```
GET /api/test-r2-config
```

This will tell you if R2 credentials are correct.

---

## Solution Checklist

- [ ] **Verify all environment variables are set in Vercel** - Go to Project Settings → Environment Variables
- [ ] **Check Vercel Logs** - See actual error messages in Vercel dashboard
- [ ] **Verify database schema** - Check that `mcufiles` table has correct field names
- [ ] **Test R2 credentials** - Use the test-r2-config endpoint
- [ ] **Check RLS policies** - Make sure RLS isn't blocking service role deletions
- [ ] **Verify storagePath format** - Make sure the path matches what's in the database

---

## Recent Improvements (v1.1)

The hard-delete-file API has been updated with:

1. ✅ **Environment variable validation** - Clear error messages if credentials are missing
2. ✅ **Comprehensive logging** - Detailed logs at each step for easier debugging
3. ✅ **Better error handling** - Errors are no longer silently hidden
4. ✅ **Error details in responses** - Stack traces included for debugging

These improvements make it much easier to identify exactly where the failure is occurring.

---

## Contact Support

If you've checked everything above and still have issues:

1. Collect the logs from Vercel
2. Screenshot the browser console errors
3. Note the exact file you're trying to delete
4. Check if the file actually exists in Supabase `mcufiles` table
5. Verify R2 credentials are valid using the test endpoint

---

**Last Updated:** 2025-12-15
**API Version:** 1.1
**Status:** Enhanced error handling deployed
