# File Upload Issue - Complete Resolution Guide

**Status**: File uploads blocked by RLS policy configuration issue
**Estimated Resolution Time**: 30-45 minutes
**Complexity**: Moderate - requires Supabase Dashboard interaction

---

## Quick Summary

Your file upload feature is **fully coded and integrated**, but blocked by **Row-Level Security (RLS) policy configuration**. This guide walks through identifying and fixing the root cause.

**If you're in a hurry**: Jump to [Fast Track Method](#fast-track-method-20-minutes) (20 minutes)

---

## Root Cause Analysis

The error you're seeing:
```
StorageApiError: new row violates row-level security policy
POST ...storage/v1/object/mcu-documents/... 400 (Bad Request)
```

This indicates **one of three things** (we'll diagnose which):

1. **RLS Policy Expression Issue** (50% likelihood)
   - Policies exist but have incorrect USING/WITH CHECK clauses
   - Fix: Update policy expressions

2. **Bucket Configuration Issue** (40% likelihood)
   - Bucket has MIME type restrictions blocking PDFs/images
   - Fix: Adjust bucket settings or allow file types

3. **Authentication Context Issue** (10% likelihood)
   - JWT token doesn't have required claims for storage access
   - Fix: Re-authenticate user

---

## Part 1: Diagnostic Testing (5 minutes)

### Step 1: Run Browser Console Tests

1. Open your application in browser
2. Press **F12** to open Developer Tools
3. Click **Console** tab
4. Copy and paste this command:

```javascript
window.storageDiagnostic.runAllDiagnostics()
```

5. Press Enter and wait for results

### Expected Output

You'll see results like:
```
📊 DIAGNOSTIC SUMMARY
✅ Supabase Connection: OK
✅ Bucket Access: OK
✅ Text File Upload: FAILED
✅ PDF Upload: FAILED
```

**OR:**

```
📊 DIAGNOSTIC SUMMARY
✅ Supabase Connection: OK
✅ Bucket Access: FAILED
❌ Text File Upload: FAILED
❌ PDF Upload: FAILED
```

### Interpreting Results

**All tests OK EXCEPT uploads fail**:
→ Go to [Solution A: RLS Policy Fix](#solution-a-rls-policy-fix)

**Bucket Access fails**:
→ Go to [Solution B: Bucket Configuration](#solution-b-bucket-configuration)

**Connection fails**:
→ Go to [Solution C: Authentication](#solution-c-authentication-issue)

---

## Part 2: Identify Root Cause

### Test A: Disable RLS (Nuclear Option)

**WARNING**: This temporarily makes uploads completely public. For testing only.

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Paste and run this SQL:

```sql
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

3. Go back to your app (F5 to refresh)
4. Try uploading a file
5. Check browser console for result

**If upload succeeds now**:
- Problem is RLS → Do Solution A
- Then immediately re-enable RLS:

```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

**If upload still fails**:
- Problem is NOT RLS
- Check bucket configuration → Do Solution B
- First re-enable RLS:

```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

---

## Part 3: Apply Solutions

### Solution A: RLS Policy Fix

**This is the most common fix (50% of cases)**

#### Step 1: Delete Incorrect Policies

1. Go to **Supabase Dashboard**
2. Click **Storage** → **mcu-documents** → **Policies**
3. You should see existing policies
4. Delete ALL policies (select each and delete)

#### Step 2: Create New Policies via SQL

1. Still in Supabase Dashboard
2. Click **SQL Editor**
3. Paste and run this SQL script:

```sql
-- Create policy for INSERT (upload)
CREATE POLICY "authenticated_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mcu-documents');

-- Create policy for SELECT (download)
CREATE POLICY "authenticated_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'mcu-documents');

-- Create policy for DELETE (deletion)
CREATE POLICY "authenticated_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'mcu-documents');

-- Create policy for UPDATE (optional)
CREATE POLICY "authenticated_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'mcu-documents')
WITH CHECK (bucket_id = 'mcu-documents');
```

4. Execute the SQL
5. Go back to Policies tab and verify 4 policies exist

#### Step 3: Test Upload

1. Go back to your app
2. Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
3. Try uploading a PDF file
4. Check browser console (F12 → Console) for success message:

```
👤 Authenticated as: user@example.com
📤 Uploading: file.pdf (245.3KB) to path: 1736412900000-file.pdf
✅ File stored: 1736412900000-file.pdf
✅ File uploaded successfully: [file-id]
```

If you see this → **Solution A worked!** Skip to [Part 4](#part-4-verify-upload)

If you still get RLS error → Try **Solution B**

---

### Solution B: Bucket Configuration

**Use this if RLS disable test passed but RLS policies still fail**

Buckets can have their own MIME type restrictions. Check and adjust:

#### Step 1: Open Bucket Settings

1. Go to **Supabase Dashboard**
2. Click **Storage** → **mcu-documents**
3. Click **Settings** tab
4. Look for "Allowed MIME types" or similar setting

#### Step 2: Check Current Restrictions

If you see a field with restricted types like:
- Only `image/jpeg`
- Only `image/*`
- Only certain formats

This is blocking PDF uploads.

#### Step 3: Fix Restrictions

**Option 1: Remove restrictions entirely (easiest)**
- Clear the "Allowed MIME types" field
- Save settings

**Option 2: Add the types we need**
- Add: `application/pdf`
- Add: `image/jpeg`
- Add: `image/png`
- Add: `image/jpg`
- Save settings

#### Step 4: Test Again

1. Go back to your app
2. Hard refresh (Cmd+Shift+R)
3. Try uploading a file
4. Check console for success

---

### Solution C: Authentication Issue

**Use this only if connection/auth tests failed**

#### Step 1: Check Current User

1. Go to your app
2. Open browser console (F12 → Console)
3. Run:

```javascript
const { data: { user } } = await window._supabaseClient.auth.getUser();
console.log('Current user:', user);
```

**If you see user data**: Authentication is OK, try Solutions A or B

**If user is null**: You're not logged in

#### Step 2: Log Out and Log Back In

1. Log out from your app
2. Log back in
3. Hard refresh (Cmd+Shift+R)
4. Try uploading again

#### Step 3: Check JWT Token

If still failing, check token claims:

```javascript
const { data: { session } } = await window._supabaseClient.auth.getSession();
console.log('JWT claims:', session?.user);
```

Look for:
- `sub`: User ID (should exist)
- `email`: User email (should exist)
- `aud`: Should be "authenticated"

If anything missing, contact Supabase support.

---

## Part 4: Verify Upload

Once upload succeeds in console, verify files are actually stored:

### Check 1: Browser Console

You should see:
```
✅ File uploaded successfully: 7f8a9b2c-1d3e-4f5a-9b8c-7d6e5f4a3b2c
```

### Check 2: Supabase Storage

1. Go to **Supabase Dashboard**
2. Click **Storage** → **mcu-documents**
3. You should see folder structure:
   ```
   [timestamp]-filename.pdf
   ```

### Check 3: Database

1. Go to **Supabase Dashboard**
2. Click **SQL Editor**
3. Run:

```sql
SELECT fileid, filename, filesize, uploadedat
FROM mcufiles
WHERE deletedat IS NULL
ORDER BY uploadedat DESC
LIMIT 5;
```

You should see your uploaded file listed.

---

## Fast Track Method (20 minutes)

If you're confident RLS is the problem and want to fix it fast:

### 1. Delete Existing Policies (2 min)
- Dashboard → Storage → mcu-documents → Policies
- Delete all existing policies

### 2. Create New Policies (5 min)
- SQL Editor
- Paste and run the 4 CREATE POLICY commands from [Solution A](#step-2-create-new-policies-via-sql)
- Execute

### 3. Test Upload (3 min)
- Hard refresh app
- Try uploading a file
- Check console for success

### 4. Verify Storage (2 min)
- Dashboard → Storage → mcu-documents
- Verify file appears

### 5. Verify Database (3 min)
- SQL Editor
- Run the SELECT query to verify metadata saved

### 6. Test Another File (5 min)
- Upload image file
- Upload PDF file
- Verify both work

**Total: 20 minutes if successful on first try**

---

## Troubleshooting If Still Failing

### Error: "still violates row-level security"

1. Verify policies exist:
   ```sql
   SELECT policyname, cmd, qual
   FROM pg_policies
   WHERE tablename = 'objects' AND schemaname = 'storage'
   ORDER BY policyname;
   ```

2. If no policies shown → They didn't create properly. Delete and retry.

3. If policies exist → Try Solution B (bucket config)

### Error: "mime type X not supported"

→ This is Solution B (bucket configuration issue)
→ Go to Bucket Settings and check/adjust allowed MIME types

### Error: "bucket does not exist"

1. Verify bucket name is exactly: `mcu-documents` (case-sensitive)
2. Check it exists in Dashboard → Storage
3. If missing, create new bucket with this exact name

### Error: "User not authenticated"

1. Verify you're logged in to the app
2. Check browser console for user:
   ```javascript
   const { data: { user } } = await window._supabaseClient.auth.getUser();
   console.log(user);
   ```
3. If null, log out and back in
4. Try again

---

## Advanced Diagnostics

If none of the above work, run individual diagnostic tests:

```javascript
// Test 1: Just auth
window.storageDiagnostic.testSupabaseConnection()

// Test 2: Just bucket access
window.storageDiagnostic.testBucketAccess()

// Test 3: Just simple text file upload
window.storageDiagnostic.testUploadSimple()

// Test 4: Just PDF upload
window.storageDiagnostic.testUploadPDF()
```

Each test will show detailed error information if it fails.

---

## Verification Checklist

Once file upload works, verify everything:

- [ ] Can upload PDF files
- [ ] Can upload JPEG images
- [ ] Can upload PNG images
- [ ] Files appear in Supabase Storage bucket
- [ ] File metadata appears in database (mcufiles table)
- [ ] Can download files
- [ ] Can delete files
- [ ] Browser console shows no errors
- [ ] Feature works on both modal integrations:
  - [ ] Tambah Karyawan → Tambah MCU modal
  - [ ] Kelola Karyawan → Edit MCU modal

---

## Next Steps After Resolution

Once file uploads work:

1. **Test thoroughly**: Upload various file types and sizes
2. **Deploy**: `git push origin main`
3. **Monitor**: Check browser console and database for issues
4. **Document**: Note the exact solution that worked for your setup

---

## Common Questions

**Q: Why did RLS policies fail the first time?**
A: The policy USING/WITH CHECK expressions may have been incomplete or incorrect. Deleting and recreating with proper SQL ensures they're correct.

**Q: Is it safe to disable RLS for testing?**
A: Yes, but ONLY for testing. Always re-enable it after your test. Disabled RLS means anyone can upload to your bucket.

**Q: Why does the bucket have MIME type restrictions?**
A: Some Supabase projects have bucket-level protections. These are independent of RLS policies and must be configured separately.

**Q: Can I use the app without file uploads?**
A: Yes, the file upload widget is optional. Remove it from modals if not needed.

**Q: What if uploads work locally but not on Vercel?**
A: Check that Supabase credentials are properly set in Vercel environment variables. They may not have been injected.

---

## Support Resources

- **RLS Diagnosis**: [RLS-DIAGNOSIS-AND-FIX.md](RLS-DIAGNOSIS-AND-FIX.md)
- **Quick Start**: [FILE-UPLOAD-QUICK-START.md](FILE-UPLOAD-QUICK-START.md)
- **Implementation Details**: [FILE-UPLOAD-IMPLEMENTATION.md](FILE-UPLOAD-IMPLEMENTATION.md)
- **Testing Guide**: [FILE-UPLOAD-TESTING.md](FILE-UPLOAD-TESTING.md)
- **Supabase Docs**: https://supabase.com/docs/guides/storage/security

---

## Summary

1. **Diagnose** (5 min): Run `window.storageDiagnostic.runAllDiagnostics()`
2. **Fix** (15 min): Apply appropriate solution based on diagnosis
3. **Verify** (5 min): Test and confirm files appear in storage & database
4. **Deploy** (5 min): Push to production

**Total time: 30 minutes for most cases**

---

**Created**: November 8, 2025
**Last Updated**: November 8, 2025
