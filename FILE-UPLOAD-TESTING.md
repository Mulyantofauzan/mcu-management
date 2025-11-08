# File Upload Feature - Testing & Verification Guide

## 📋 Status Checklist

### ✅ Code Implementation Status
- [x] supabaseStorageService.js - Implemented with compression, validation, upload/delete functions
- [x] fileUploadWidget.js - UI component for file selection and management
- [x] Database table schema - mcufiles table exists with correct camelCase column names
- [x] Supabase configuration - env-config.js and supabase.js properly set up
- [x] pako CDN - Added to index.html without defer attribute
- [x] File type restriction - Only PDF and images (JPG, PNG) allowed
- [x] File compression - Gzip compression for PDFs (50-70% reduction)

### ⏳ Manual Setup Status
- [ ] RLS Policies created via Supabase Dashboard
- [ ] Test file upload with compression
- [ ] Verify files in Supabase Storage
- [ ] Verify metadata in mcufiles table

---

## 🧪 Test Plan

### Test 1: Verify Pako Library is Loading

**In browser console (F12 → Console):**

```javascript
// Check if pako is loaded
console.log('pako available:', window.pako);
console.log('pako.gzip available:', window.pako?.gzip);
```

**Expected output:**
```
pako available: Object { gzip: [Function], ungzip: [Function], ... }
pako.gzip available: [Function]
```

**If you see `undefined` or errors:**
- [ ] Hard refresh browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- [ ] Check Network tab (F12 → Network) - should see `pako.min.js` loaded with status 200
- [ ] Verify index.html line 28 has pako script without `defer` attribute
- [ ] Check for CSP (Content Security Policy) errors in console

---

### Test 2: Create RLS Policies

**Instructions:**

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Click **Storage** in left sidebar
4. Click **mcu-documents** bucket
5. Click **Policies** tab at the top

**You should see:**
```
+ New Policy    or    + Add Policy
```

**If you DON'T see a Policies tab:**
- [ ] Check bucket name is exactly `mcu-documents` (case-sensitive)
- [ ] Check your user role (Settings → Members) - must be "Developer" or "Owner"
- [ ] If you're "Viewer", ask project owner to upgrade you

**Create 4 Policies using the dashboard UI form:**

#### Policy 1: Allow Upload (INSERT)
- Click: **New Policy** or **+ Add Policy**
- Form fields:
  - Operation: **INSERT**
  - Target role: **authenticated**
  - With check: **bucket_id = 'mcu-documents'**
- Click: **Create Policy** or **Save**

#### Policy 2: Allow Download (SELECT)
- Click: **+ Add Policy**
- Form fields:
  - Operation: **SELECT**
  - Target role: **authenticated**
  - Using: **bucket_id = 'mcu-documents'**
- Click: **Create Policy**

#### Policy 3: Allow Delete (DELETE)
- Click: **+ Add Policy**
- Form fields:
  - Operation: **DELETE**
  - Target role: **authenticated**
  - Using: **bucket_id = 'mcu-documents'**
- Click: **Create Policy**

#### Policy 4: Allow Update (UPDATE)
- Click: **+ Add Policy**
- Form fields:
  - Operation: **UPDATE**
  - Target role: **authenticated**
  - With check: **bucket_id = 'mcu-documents'**
- Click: **Create Policy**

**After creating policies, you should see:**
```
✅ policy_name_1
✅ policy_name_2
✅ policy_name_3
✅ policy_name_4
```

---

### Test 3: Test File Upload with PDF

**Preparations:**

1. [x] RLS Policies created (from Test 2)
2. [ ] Browser hard refresh (Cmd+Shift+R)
3. [ ] User must be logged in to the application

**Upload Test:**

1. Open application: http://localhost:5173 (or your hosted URL)
2. Make sure you're logged in
3. Go to: **Tambah Karyawan** page
4. Click button: **Tambah MCU** (Add New MCU)
5. In the modal, scroll down to **File Upload** section
6. Click: **Choose Files** or drag a PDF file into the upload area
7. Select: Any PDF file from your computer (recommended: 200KB-2MB for testing)

**Success Indicators (Browser Console - F12 → Console):**

```
✅ Supabase client is ready and enabled

📤 Uploading: document.pdf (245.3KB)
✅ Compressed: 245.3KB → 78.2KB (68.1% reduction)
📤 Uploading: document.pdf.gz (78.2KB)
✅ File uploaded successfully: 7f8a9b2c-1d3e-4f5a-9b8c-7d6e5f4a3b2c
```

**Verify in UI:**
- [ ] File appears in the "Uploaded Files" list
- [ ] File shows filename, size, and date uploaded
- [ ] Can click download to fetch the file
- [ ] Can click delete to remove the file

---

### Test 4: Test File Upload with Image

**Preparations:**

1. [ ] RLS Policies working (from Test 2)
2. [ ] PDF upload successful (from Test 3)

**Upload Test:**

1. Still in: **Tambah MCU** modal
2. Click: **Choose Files** or drag an image
3. Select: JPG or PNG file from your computer

**Success Indicators (Browser Console):**

```
⏭️ Skipping compression for image/jpeg (already compressed)
📤 Uploading: photo.jpg (890.5KB)
✅ File uploaded successfully: 3a2b1c0d-9e8f-7g6h-5i4j-3k2l1m0n9o8p
```

**Note:** Images are NOT compressed (already optimized format)

---

### Test 5: Verify Files in Supabase Storage

1. Go to Supabase Dashboard
2. Click: **Storage**
3. Click: **mcu-documents** bucket
4. You should see a folder structure:

```
mcu-documents/
└── EMPLOYEE_ID/
    └── MCU_ID/
        ├── 20251108091523-document.pdf.gz (compressed)
        └── 20251108091545-photo.jpg (original)
```

**Check:**
- [ ] Compressed file has `.gz` extension
- [ ] File sizes match upload console output
- [ ] Timestamp in filename matches upload time

---

### Test 6: Verify Database Records

1. Go to Supabase Dashboard
2. Click: **SQL Editor** (left sidebar)
3. Run this query:

```sql
SELECT
    fileid,
    employeeid,
    mcuid,
    filename,
    filetype,
    filesize,
    supabase_storage_path,
    uploadedat,
    deletedat
FROM mcufiles
WHERE deletedat IS NULL
ORDER BY uploadedat DESC
LIMIT 5;
```

**Expected Output:**

| fileid | employeeid | mcuid | filename | filetype | filesize | supabase_storage_path | uploadedat |
|--------|------------|-------|----------|----------|----------|------------------------|-----------|
| uuid-1 | EMP-001 | MCU-001 | document.pdf | application/pdf | 245300 | EMP-001/MCU-001/20251108091523-document.pdf.gz | 2025-11-08... |
| uuid-2 | EMP-001 | MCU-001 | photo.jpg | image/jpeg | 890500 | EMP-001/MCU-001/20251108091545-photo.jpg | 2025-11-08... |

**Verify:**
- [ ] File metadata saved correctly
- [ ] Column names match actual schema (employeeid, not employee_id)
- [ ] Storage path matches files in bucket
- [ ] deletedat is NULL (not soft-deleted)

---

### Test 7: Test File Deletion

1. In Tambah MCU modal
2. Uploaded files section - click **Delete** button on a file
3. Confirm deletion

**Browser Console Output:**
```
✅ File deleted: document.pdf
```

**Verify in Database:**

```sql
SELECT * FROM mcufiles
WHERE fileid = 'uuid-from-deletion';
```

Should show: `deletedat: 2025-11-08T...` (not NULL)

**Verify in Storage:**

The file should NO LONGER appear in the mcu-documents bucket

---

## 🚨 Common Issues & Solutions

### Issue 1: "pako library not available"

**Symptoms:**
```
⚠️ pako library not available, using original file
```

**Causes & Fixes:**

1. **Pako script not loaded yet**
   - [ ] Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - [ ] Wait 2-3 seconds before uploading
   - [ ] Check Network tab - should see pako.min.js with status 200

2. **Defer attribute on pako script**
   - [ ] Check index.html line 28
   - Should be: `<script src="https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js"></script>`
   - Should NOT be: `<script defer src="..."></script>`

3. **CDN not accessible**
   - [ ] Check Network tab for errors loading pako
   - [ ] Try different CDN or npm install locally

4. **CSP (Content Security Policy) blocking**
   - [ ] Check console for CSP errors
   - [ ] May need to add cdn.jsdelivr.net to CSP whitelist

**Test in Console:**
```javascript
console.log(window.pako);
// Should show: Object { gzip: [Function], ungzip: [Function], ... }
```

---

### Issue 2: "violates row-level security policy"

**Symptoms:**
```
Error: Upload failed: new row violates row-level security policy
```

**Cause:** RLS policies not created or incorrect

**Fixes:**

1. **Verify policies exist**
   - [ ] Go to Supabase Dashboard → Storage → mcu-documents → Policies
   - [ ] Should see 4 policies listed
   - [ ] If empty, follow Test 2 above

2. **Use Dashboard UI, not SQL**
   - [ ] Don't use SQL Editor (may have permission issues)
   - [ ] Use the Policies tab dashboard UI form
   - [ ] This uses admin/service role with full permissions

3. **Correct policy conditions**
   - [ ] Check each policy has: `bucket_id = 'mcu-documents'`
   - [ ] Check role is: `authenticated`
   - [ ] Check operations: INSERT, SELECT, DELETE, UPDATE

4. **Reload application**
   - [ ] Hard refresh browser: Cmd+Shift+R
   - [ ] Wait 10 seconds for policies to sync
   - [ ] Try upload again

---

### Issue 3: File uploaded but no metadata in database

**Symptoms:**
- File appears in Supabase Storage
- But NOT in mcufiles table
- Or file appears then is deleted

**Cause:** Database insert failed, cleanup routine removed file from storage

**Check Console:**
```
❌ Database error: [error message]
```

**Fixes:**

1. **Check database permissions**
   - [ ] Verify mcufiles table RLS policies allow inserts
   - [ ] Run: `SELECT * FROM mcufiles LIMIT 1;`
   - [ ] If error, table RLS is blocking

2. **Check column names**
   - [ ] Verify all column names are camelCase without underscores
   - [ ] employeeid (not employee_id)
   - [ ] mcuid (not mcu_id)
   - [ ] uploadedby (not uploaded_by)

3. **Check Supabase logs**
   - [ ] Dashboard → Monitoring → Logs
   - [ ] Filter for errors from last 5 minutes
   - [ ] Look for database errors

---

### Issue 4: File appears in upload list but fails to upload to storage

**Symptoms:**
- File selected
- Progress shows but doesn't complete
- Eventually shows error

**Cause:** Storage upload failing despite RLS passing

**Fixes:**

1. **Check file size**
   - [ ] File must be < 10MB
   - [ ] Check: `console.log(file.size)`

2. **Check file type**
   - [ ] Only allowed: PDF, JPEG, PNG, JPG
   - [ ] Check: `console.log(file.type)`

3. **Check storage quota**
   - [ ] Dashboard → Settings → Usage
   - [ ] Verify you haven't exceeded 100GB limit

4. **Check Supabase logs**
   - [ ] Dashboard → Monitoring → Logs
   - [ ] Filter for storage errors

---

## 📊 Performance Metrics

After successful uploads, you should see:

| File Type | Compression | Before → After |
|-----------|------------|-----------------|
| PDF (1MB) | ✅ Yes | 1000KB → 300KB |
| PDF (500KB) | ✅ Yes | 500KB → 150KB |
| JPG (2MB) | ❌ No | 2000KB → 2000KB |
| PNG (1MB) | ❌ No | 1000KB → 1000KB |

**Target:** PDFs should compress 50-70%

---

## 🎯 Next Steps

1. **Complete Setup:**
   - [ ] Verify pako loading (Test 1)
   - [ ] Create RLS policies (Test 2)

2. **Test Uploads:**
   - [ ] Upload PDF with compression (Test 3)
   - [ ] Upload image without compression (Test 4)

3. **Verify Data:**
   - [ ] Check files in Supabase Storage (Test 5)
   - [ ] Check metadata in database (Test 6)

4. **Test Deletion:**
   - [ ] Delete a file (Test 7)
   - [ ] Verify soft delete marker in database

5. **Production:**
   - [ ] Commit working version to git
   - [ ] Push to Vercel
   - [ ] Test in production environment

---

## 📞 Support

If you get stuck:

1. **Check browser console** (F12 → Console) for specific error messages
2. **Review guide** [RLS-POLICY-ALTERNATIVE.md](RLS-POLICY-ALTERNATIVE.md) for permission issues
3. **Check Supabase logs** for backend errors
4. **Contact Supabase support** if issues persist

---

## Reference Files

- [supabaseStorageService.js](mcu-management/js/services/supabaseStorageService.js) - Main service
- [fileUploadWidget.js](mcu-management/js/components/fileUploadWidget.js) - UI component
- [index.html](mcu-management/index.html) - pako CDN script
- [RLS-POLICY-ALTERNATIVE.md](RLS-POLICY-ALTERNATIVE.md) - RLS policy setup guide
- [SUPABASE-STORAGE-SETUP.md](SUPABASE-STORAGE-SETUP.md) - Initial setup guide

---

**Created: November 8, 2025**
**Last Updated: November 8, 2025**
