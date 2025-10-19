# 📁 Panduan SQL Files untuk Supabase

Ada beberapa file SQL di folder ini. Berikut urutan yang benar untuk setup Supabase:

---

## ✅ YANG HARUS DIJALANKAN (Urutan Ini!)

### **1️⃣ supabase-schema.sql** ⭐ JALANKAN PERTAMA

**Fungsi:** Membuat semua tables dan struktur database

**Isi:**
- ✅ Users table
- ✅ Employees table
- ✅ MCUs table
- ✅ MCU Changes table
- ✅ Job Titles table
- ✅ Departments table
- ✅ Vendors table
- ✅ Activity Log table
- ✅ Indexes untuk performance
- ✅ Foreign key constraints

**Cara Jalankan:**
1. Buka Supabase Dashboard: https://app.supabase.com/
2. Pilih project Anda
3. Klik **SQL Editor** di sidebar kiri
4. Klik **New query**
5. Copy-paste isi file `supabase-schema.sql`
6. Klik **Run** (atau Ctrl/Cmd + Enter)
7. Tunggu sampai muncul: **"Success"**

---

### **2️⃣ supabase-enable-rls.sql** ⭐ JALANKAN KEDUA

**Fungsi:** Enable Row Level Security (RLS) dan create policies

**Isi:**
- ✅ Enable RLS untuk semua tables
- ✅ Create permissive policies (allow all access dengan anon key)
- ✅ Verification query untuk cek RLS enabled

**⚠️ PENTING:** Tanpa file ini, Anda akan dapat error:
```
Error 401: new row violates row-level security policy for table "departments"
```

**Cara Jalankan:**
1. Di Supabase SQL Editor
2. Klik **New query**
3. Copy-paste isi file `supabase-enable-rls.sql`
4. Klik **Run**
5. Tunggu sampai **"Success"**
6. Di bagian bawah hasil, harus muncul tabel verification showing `rowsecurity = true` untuk semua tables

---

## ❌ FILE LAIN (JANGAN JALANKAN)

### **supabase-fix-users-table-complete.sql**
- ❌ Jangan jalankan
- File migration lama untuk fix users table
- Sudah include di `supabase-schema.sql`

### **supabase-add-active-column.sql**
- ❌ Jangan jalankan
- File migration lama untuk add column
- Sudah include di `supabase-schema.sql`

### **supabase-migration-follow-up.sql**
- ❌ Jangan jalankan
- File migration lama untuk follow-up feature
- Sudah include di `supabase-schema.sql`

---

## 🧪 Cara Verifikasi Setup Berhasil

Setelah jalankan kedua file di atas, test dengan query ini di SQL Editor:

```sql
-- 1. Cek semua tables ada
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected result: 8 tables
-- activity_log, departments, employees, job_titles, mcu_changes, mcus, users, vendors

-- 2. Cek RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected: rowsecurity = true untuk semua tables

-- 3. Cek policies ada
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- Expected: 4 policies per table (SELECT, INSERT, UPDATE, DELETE)
-- Total: 32 policies (8 tables × 4 operations)
```

---

## 📋 Checklist Setup Supabase

- [ ] **1. Create Project** di Supabase Dashboard
- [ ] **2. Get Credentials:**
  - [ ] Copy **Project URL** dari Settings → API
  - [ ] Copy **anon public** key dari Settings → API
- [ ] **3. Run SQL:**
  - [ ] Jalankan `supabase-schema.sql` di SQL Editor ✅
  - [ ] Jalankan `supabase-enable-rls.sql` di SQL Editor ✅
  - [ ] Verify: 8 tables created
  - [ ] Verify: RLS enabled untuk semua tables
  - [ ] Verify: 32 policies created
- [ ] **4. Set Environment Variables di Netlify:**
  - [ ] `SUPABASE_URL` = Project URL
  - [ ] `SUPABASE_ANON_KEY` = anon public key
- [ ] **5. Deploy:**
  - [ ] Trigger deploy di Netlify
  - [ ] Wait for build to complete
- [ ] **6. Test:**
  - [ ] Hard refresh browser (Cmd+Shift+R)
  - [ ] Console: `console.log(window.ENV)` harus ada values
  - [ ] Console: harus muncul "✅ Supabase client initialized"
  - [ ] Login dengan admin/admin123
  - [ ] Data harus tersimpan di Supabase (bukan IndexedDB)

---

## 🆘 Troubleshooting

### Error: "relation 'users' does not exist"
**Problem:** Schema belum dibuat
**Solution:** Jalankan `supabase-schema.sql`

### Error: "new row violates row-level security policy"
**Problem:** RLS enabled tapi policies belum dibuat
**Solution:** Jalankan `supabase-enable-rls.sql`

### Error: "policy already exists"
**Problem:** Policies sudah dibuat sebelumnya
**Solution:** Ini OK, skip error atau drop policies dulu:
```sql
-- Drop all policies (hati-hati!)
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
-- ... ulangi untuk semua policies
-- Lalu jalankan ulang supabase-enable-rls.sql
```

### Tables sudah ada, mau reset?
```sql
-- HATI-HATI: Ini akan HAPUS semua data!
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS mcu_changes CASCADE;
DROP TABLE IF EXISTS mcus CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS job_titles CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;

-- Lalu jalankan ulang supabase-schema.sql
```

---

## 🎯 Summary

**HANYA JALANKAN 2 FILE INI (URUTAN INI!):**

1. ✅ **supabase-schema.sql** (create tables)
2. ✅ **supabase-enable-rls.sql** (enable RLS + policies)

**FILE LAIN: IGNORE!** ❌

Setelah itu, set environment variables di Netlify dan deploy!
