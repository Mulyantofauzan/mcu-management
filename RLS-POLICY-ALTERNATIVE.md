# RLS Policy Configuration - Alternative Method (No Admin Required)

## Current Issue
```
Error: ERROR: 42501: must be owner of table objects
```
This error appears when trying to create or modify policies via SQL Editor. You don't have owner permissions on the storage.objects table.

---

## ✅ Solution: Use Supabase Dashboard UI (No SQL Required)

The Supabase Dashboard Policies interface uses your project's administrative role automatically, so you CAN create policies even if you can't run raw SQL.

### Step 1: Go to Supabase Dashboard → Storage

1. Open [https://app.supabase.com](https://app.supabase.com)
2. Select your MCU project
3. Click **Storage** in the left sidebar
4. You should see the **mcu-documents** bucket

### Step 2: Open the Bucket Policies Tab

1. Click on the **mcu-documents** bucket
2. Look for the **Policies** tab at the top
3. You should see it near **Settings**, **Logs**, etc.

### Step 3: Create First Policy (Upload/INSERT)

1. Click **New Policy** or **+ Add Policy** button
2. A dialog will appear with options
3. Select/fill in:
   - **Operation**: `INSERT` (or "Upload")
   - **Target role**: `authenticated` (or "For authenticated users")
   - **Using expression**: Leave blank or set to allow all
   - **With check expression**: Add `bucket_id = 'mcu-documents'`

**If prompted for SQL instead:**
- Click **"Use SQL Editor"** if you see that option
- But dashboard method is preferred - use the form-based UI

### Step 4: Create Second Policy (Download/SELECT)

Click **+ Add Policy** again and create:
- **Operation**: `SELECT` (or "Download")
- **Target role**: `authenticated`
- **Using expression**: `bucket_id = 'mcu-documents'`

### Step 5: Create Third Policy (Delete/DELETE)

Click **+ Add Policy** again and create:
- **Operation**: `DELETE`
- **Target role**: `authenticated`
- **Using expression**: `bucket_id = 'mcu-documents'`

### Step 6: Create Fourth Policy (Update/UPDATE) - Optional

Click **+ Add Policy** again and create:
- **Operation**: `UPDATE`
- **Target role**: `authenticated`
- **With check expression**: `bucket_id = 'mcu-documents'`

---

## Expected Result

After adding all 4 policies via dashboard, you should see in the **Policies** tab:

```
✅ Allow authenticated users to insert
✅ Allow authenticated users to select
✅ Allow authenticated users to delete
✅ Allow authenticated users to update
```

(Or similar names depending on how Supabase generated them)

---

## 🧪 Test After Configuration

1. **Reload your application**: Ctrl+R or Cmd+R
2. **Open browser console**: F12 → Console tab
3. **Go to Tambah Karyawan page**
4. **Open "Tambah MCU" modal**
5. **Upload a PDF file**

### Success Indicators:

✅ **In console, you should see:**
```
✅ Supabase client is ready and enabled
📤 Uploading: document.pdf (245.3KB)
✅ File uploaded successfully: [fileid-uuid]
```

✅ **In Supabase Dashboard:**
- Go to Storage → mcu-documents bucket
- You should see a folder structure like:
  ```
  mcu-documents/
  └── EMPLOYEE_ID/
      └── MCU_ID/
          └── 20251108091523-document.pdf.gz
  ```

✅ **In Database:**
- Go to Database Editor → mcufiles table
- You should see a new record with your uploaded file

---

## If Dashboard UI Method Also Fails

### Workaround: Use Supabase CLI

If the dashboard UI doesn't work, you can try using the Supabase CLI (which uses your project token):

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link to your project**
   ```bash
   supabase link --project-ref YOUR_PROJECT_ID
   ```

4. **Create a SQL file**: Create `policies.sql` with the content from **Section 3 below**

5. **Run the migration**
   ```bash
   supabase migration up
   ```

---

## Section 3: SQL Commands (For Reference / CLI Use)

If you can access via CLI or a different method, use these SQL commands:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'mcu-documents');

-- Allow authenticated users to download files
CREATE POLICY "Allow authenticated users to download"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'mcu-documents');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated users to delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'mcu-documents');

-- Allow authenticated users to update files
CREATE POLICY "Allow authenticated users to update"
ON storage.objects FOR UPDATE TO authenticated
WITH CHECK (bucket_id = 'mcu-documents');
```

---

## 📋 Troubleshooting Checklist

- [ ] Can you see the **Policies** tab on the mcu-documents bucket page?
- [ ] Does the **New Policy** / **+ Add Policy** button exist?
- [ ] Are you logged in to Supabase as a project member (not just viewer)?
- [ ] Is the bucket name exactly `mcu-documents` (case-sensitive)?
- [ ] Did you reload the browser after creating policies?
- [ ] Is the user logged in to the application?

### Permission Levels

Your role in the project determines what you can do:

| Role | Can Create RLS Policies | Can Disable RLS | Can Run SQL |
|------|------------------------|-----------------|-------------|
| **Owner** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Developer** | ✅ Yes | ❌ No | ⚠️ Limited |
| **Viewer** | ❌ No | ❌ No | ❌ No |

If you're a **Viewer**, contact the project owner to upgrade your role to **Developer** or **Owner**.

---

## 💡 Why Dashboard UI Works When SQL Doesn't

When you use the dashboard UI to create policies:
1. Supabase Dashboard uses your project's **admin/service role**
2. This has full permissions to create policies
3. It bypasses the "must be owner" restriction

When you use SQL Editor directly:
1. It runs under your **user role**
2. Your user role may not have owner permissions
3. Hence the "must be owner" error

---

## Next Steps

1. ✅ Use the dashboard Policies UI to create 4 policies
2. ✅ Reload your application
3. ✅ Test file upload
4. ✅ Check browser console for success messages
5. ✅ Verify files in Supabase Storage bucket

---

## Support

If dashboard UI method still doesn't work:
1. Check your project role (Settings → Members)
2. You may need to ask the project owner to create policies
3. Or contact Supabase support: https://supabase.com/docs/support

---

## References

- Supabase Storage RLS: https://supabase.com/docs/guides/storage/security/access-control
- Row-Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security

---

**Created: November 8, 2025**
**Last Updated: November 8, 2025**
