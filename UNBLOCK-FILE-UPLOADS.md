# Unblock File Uploads - Action Required

## 🚨 Current Status

**Everything is coded and ready. File uploads are blocked by RLS policy configuration.**

Your attempt to disable RLS with SQL failed because you don't have owner permissions on `storage.objects` table:

```
ERROR: 42501: must be owner of table objects
```

## ✅ Solution: 3 Simple Steps (15 minutes)

### Step 1: Go to Supabase Dashboard

1. Open: https://app.supabase.com
2. Select your **MCU project**
3. In left sidebar, click: **Storage**
4. Click the **mcu-documents** bucket

### Step 2: Click "Policies" Tab

You should see tabs at the top of the bucket page:
- Buckets
- Files
- **Policies** ← Click this
- Settings
- Activity

### Step 3: Create Policies via Dashboard UI

**DO NOT use SQL Editor** (that's what caused the permission error)

**Instead, click: "New Policy" or "+ Add Policy" button**

A form dialog will appear. Fill it in like this:

#### Policy 1: Allow Upload

**Form Fields:**
- **Statement**: CREATE POLICY
- **For role**: authenticated
- **Operate on**: All
- **Operations to allow**: INSERT
- **Policy editor** (bottom): Click **"+ Add new row policy expression"**
  - Add: `bucket_id = 'mcu-documents'`

Click **Save Policy** or **Create Policy**

#### Policy 2: Allow Download

**Form Fields:**
- **Statement**: CREATE POLICY
- **For role**: authenticated
- **Operations to allow**: SELECT
- **Policy editor**: Add expression: `bucket_id = 'mcu-documents'`

Click **Save Policy**

#### Policy 3: Allow Delete

**Form Fields:**
- **Statement**: CREATE POLICY
- **For role**: authenticated
- **Operations to allow**: DELETE
- **Policy editor**: Add expression: `bucket_id = 'mcu-documents'`

Click **Save Policy**

#### Policy 4: Allow Update (Optional)

**Form Fields:**
- **Statement**: CREATE POLICY
- **For role**: authenticated
- **Operations to allow**: UPDATE
- **Policy editor**: Add expression: `bucket_id = 'mcu-documents'`

Click **Save Policy**

### Expected Result

After creating all 4 policies, you should see them listed in the Policies tab:

```
✅ [Some policy name]
✅ [Some policy name]
✅ [Some policy name]
✅ [Some policy name]
```

Each should have status: **Active** or **Enabled**

---

## 🧪 Test It Works

### Test 1: Reload Application

1. Go to your MCU application (http://localhost:5173 or your URL)
2. Hard refresh: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows)
3. Wait 2-3 seconds for page to fully load

### Test 2: Try File Upload

1. Click: **Tambah Karyawan** page
2. Click: **Tambah MCU** button (to open the modal)
3. Scroll down to: **File Upload** section
4. Click: **Choose Files** (or drag a PDF file)
5. Select a PDF file from your computer

### Expected Result (in browser console - F12 → Console)

```
✅ Supabase client is ready and enabled

📤 Uploading: mydocument.pdf (245.3KB)
✅ Compressed: 245.3KB → 78.2KB (68.1% reduction)
✅ File uploaded successfully: 7f8a9b2c-1d3e-4f5a-9b8c-7d6e5f4a3b2c
```

If you see this, **file uploads are working!** 🎉

---

## 🔍 Verify Files

### In Supabase Storage

1. Go to: Supabase Dashboard → Storage → **mcu-documents** bucket
2. You should see folder structure:
   ```
   mcu-documents/
   └── EMPLOYEE_ID/
       └── MCU_ID/
           └── [timestamp]-filename.pdf.gz
   ```

### In Database

1. Go to: Supabase Dashboard → **SQL Editor**
2. Run:
   ```sql
   SELECT filename, filesize, uploadedat
   FROM mcufiles
   WHERE deletedat IS NULL
   ORDER BY uploadedat DESC
   LIMIT 1;
   ```

3. Should show your uploaded file

---

## ❌ If It Still Doesn't Work

### Checklist:

- [ ] Did you create policies via **Dashboard UI** (not SQL)?
- [ ] Did you hard refresh the browser (**Cmd+Shift+R**)?
- [ ] Are you logged in to the application?
- [ ] Do all 4 policies show as **Active/Enabled**?
- [ ] Is the bucket name exactly **mcu-documents** (case-sensitive)?

### Try This:

1. **Check policies exist**
   - Go to: Storage → mcu-documents → Policies
   - Should see 4 policies listed
   - If empty, you need to create them

2. **Check user login**
   - Open browser console (F12)
   - Make sure you're logged into the app
   - Try logging out and back in

3. **Check policy expressions**
   - Each policy should have: `bucket_id = 'mcu-documents'`
   - If different, edit and fix it

4. **Hard refresh again**
   - Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Wait 5 seconds before testing

---

## 📚 Reference

- **RLS Policy Setup Details**: [RLS-POLICY-ALTERNATIVE.md](RLS-POLICY-ALTERNATIVE.md)
- **Complete Testing Guide**: [FILE-UPLOAD-TESTING.md](FILE-UPLOAD-TESTING.md)
- **Quick Start Guide**: [FILE-UPLOAD-QUICK-START.md](FILE-UPLOAD-QUICK-START.md)

---

## ⏱️ Time Estimate

- **Create 4 policies**: 5 minutes
- **Test file upload**: 2 minutes
- **Verify in storage**: 2 minutes
- **Total**: ~10 minutes

---

## 🎯 That's It!

Once RLS policies are created and you see the success message in console, **file uploads are fully working**.

Then you can:
1. Upload PDFs (will compress 50-70%)
2. Upload images (JPG, PNG)
3. Download files
4. Delete files

Everything else is already implemented.

---

**Your code is ready. Just set up RLS policies via the Dashboard UI and you're done!**

---

## Why This Approach Works

| Method | Result |
|--------|--------|
| SQL Editor | ❌ "must be owner of table" error |
| Dashboard UI | ✅ Uses admin role, works fine |

The Dashboard UI uses your project's admin/service role which has full permissions to create policies, even if your user account doesn't have owner role on storage.objects table.

---

**Created: November 8, 2025**
