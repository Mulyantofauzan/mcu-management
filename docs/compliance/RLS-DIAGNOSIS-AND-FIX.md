# RLS Blocking Issue - Diagnosis & Final Solution

## Problem Summary

File uploads fail with error:
```
StorageApiError: new row violates row-level security policy
POST https://.../storage/v1/object/mcu-documents/... 400 (Bad Request)
```

Despite:
- ✅ Creating permissive RLS policies via Dashboard UI
- ✅ Policies with `USING (true)` and `WITH CHECK (true)`
- ✅ Policies set to `FOR ALL` operations
- ✅ User being authenticated (logged in)
- ✅ User being project owner

## Root Causes (Priority Order)

### 1. **Bucket-Level Restrictions (Most Likely)**
Supabase buckets can enforce MIME type restrictions **independently of RLS policies**. The bucket `mcu-documents` may be configured to:
- Only accept certain file types
- Require signed URLs
- Enforce other access controls

**Solution**: Check bucket configuration in Supabase Dashboard:
- Go to Storage → mcu-documents → Settings
- Look for "Allowed MIME types" or similar restrictions
- If restricted, either disable restrictions or update allowed types

### 2. **Missing Bucket Configuration (Very Likely)**
Buckets need explicit configuration for RLS policies to work:
- Public/Private setting
- Policy scope (row-level vs bucket-level)
- Authentication requirements

**Solution**:
- Ensure bucket is NOT marked as "Private: Restrict access via RLS" if you want public uploads
- OR if RLS-only, ensure RLS is properly configured (next section)

### 3. **RLS Policy Not Syncing (Possible)**
Sometimes RLS policies created via UI don't sync properly to the storage layer.

**Solutions**:
```sql
-- First, disable ALL RLS to test
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Try upload
-- If this works, RLS is the problem - recreate policies

-- If it still fails, problem is not RLS (check bucket config instead)
```

### 4. **Authentication Context Issue (Less Likely)**
The JWT token might not have proper claims for storage access.

**Solution**: Verify authentication:
```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('Authenticated user:', user);
console.log('User ID:', user?.id);
```

---

## Diagnostic Steps (Do These First)

### Step 1: Check Bucket Settings
1. Go to Supabase Dashboard → Storage
2. Click **mcu-documents** bucket
3. Click **Settings** tab
4. Screenshot or note the settings:
   - Is it marked as "Private"?
   - Are there MIME type restrictions?
   - What's the Access level (Public, Private, etc.)?

### Step 2: Check Current RLS Policies
1. Go to Supabase Dashboard → Storage
2. Click **mcu-documents** bucket
3. Click **Policies** tab
4. Take note of ALL existing policies:
   - What operations do they allow?
   - What are their USING/WITH CHECK clauses?
   - Are there conflicts (overlapping policies)?

### Step 3: Verify Authentication
Run in browser console:
```javascript
const { data: { user } } = await window._supabaseClient.auth.getUser();
console.log('User:', user);
console.log('User has ID:', !!user?.id);
```

### Step 4: Test Upload Without RLS (Nuclear Option)
**WARNING: This makes uploads public. Use only for testing.**

Run in Supabase SQL Editor:
```sql
-- DISABLE RLS COMPLETELY (testing only)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Then try uploading a file
-- Check if it works

-- If successful, re-enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- If still fails, problem is NOT RLS
-- Check bucket configuration and MIME type restrictions instead
```

---

## Solutions (In Order of Likelihood)

### Solution A: Remove Bucket MIME Restrictions (MOST LIKELY)

If bucket has MIME type restrictions:

1. Go to Supabase Dashboard → Storage → mcu-documents → Settings
2. Find "Allowed MIME types" or similar
3. If it says something like "only image/jpeg" - that's your problem
4. Remove restrictions OR add:
   - `application/pdf`
   - `image/jpeg`
   - `image/png`
   - `image/jpg`

### Solution B: Fix RLS Policies (If RLS is the issue)

If `ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY` WORKS, then:

1. Delete all existing RLS policies on storage.objects
2. Create a single permissive policy using SQL:

```sql
CREATE POLICY "Allow authenticated users all operations"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'mcu-documents')
WITH CHECK (bucket_id = 'mcu-documents');
```

3. Then re-enable RLS:
```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

### Solution C: Create New Bucket (Nuclear Option)

If all else fails and the problem is specific to this bucket:

1. Create a new bucket: `mcu-files-v2`
2. Don't add ANY RLS policies initially
3. Test if uploads work
4. If yes, use this bucket instead
5. If no, problem is your auth credentials (check those)

---

## Testing Procedure

### Test 1: Disable RLS and Try Upload

```javascript
// This requires admin access via SQL Editor
// Only test owners can do this

// In Supabase SQL Editor:
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

// Then in your app:
const result = await window._supabaseClient.storage
    .from('mcu-documents')
    .upload('test-' + Date.now() + '.txt', new File(["test"], 'test.txt'));

console.log('Result:', result);
```

If this works: **RLS is the problem** → Go to Solution B
If this fails: **Problem is not RLS** → Go to Solution A (bucket restrictions)

### Test 2: Check Bucket Configuration

```javascript
// Check what the bucket actually allows
const { data, error } = await window._supabaseClient.storage.listBuckets();
console.log('Buckets:', data);

// Find mcu-documents and check its properties
const mcu = data?.find(b => b.name === 'mcu-documents');
console.log('MCU bucket:', mcu);
```

---

## Quick Action Items

**Do This NOW (Assuming RLS is correct):**

1. ✅ Go to Supabase Dashboard
2. ✅ Open Storage → mcu-documents → Settings
3. ✅ Check for "Allowed MIME types" field
4. ✅ If it exists and is restricted, either:
   - Remove the restriction entirely, OR
   - Add `application/pdf`, `image/jpeg`, `image/png`
5. ✅ Save settings
6. ✅ Go back to your app, hard refresh (Cmd+Shift+R)
7. ✅ Try uploading a PDF

If still doesn't work:
1. ✅ Run the RLS disable test above
2. ✅ Try uploading again
3. ✅ If it works when RLS disabled: use Solution B
4. ✅ If it still fails: problem is bucket config, go back to Solution A

---

## Expected Outcomes

### If You See This: ✅ WORKS
```
📤 Uploading: test.pdf (245.3KB)
✅ File uploaded successfully: 7f8a9b2c-1d3e...
```

### If You See This: ❌ RLS Issue
```
Error: StorageApiError: new row violates row-level security policy
```
→ Use Solution B

### If You See This: ❌ Bucket Config Issue
```
Error: StorageApiError: The bucket [mcu-documents] does not exist
OR
Error: StorageApiError: Invalid request body [reason]
```
→ Use Solution A

---

## Prevention for Future

Once uploads are working:

1. Document the exact bucket settings that work
2. Document the exact RLS policies that work
3. Save SQL commands to recreate in case of deletion
4. Test quarterly to ensure policies still work
5. Never disable RLS permanently - always re-enable

---

## Still Stuck?

If none of these solutions work:

1. **Check authentication**: User must be logged in (not anonymous)
2. **Check JWT token**: Must have `sub` claim with user ID
3. **Check bucket exists**: Verify bucket name is exactly `mcu-documents`
4. **Check Supabase quota**: If storage quota exceeded, uploads fail
5. **Contact Supabase support**: With error message and bucket details

---

**Next Step**: Follow the diagnostic steps above and report findings.

Created: November 8, 2025
