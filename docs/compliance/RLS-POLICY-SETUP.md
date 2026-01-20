# Supabase Storage RLS Policy Setup

## Error Explanation

Kamu dapat error ini:
```
new row violates row-level security policy
```

Ini terjadi karena storage bucket `mcu-documents` belum memiliki Row-Level Security (RLS) policy yang mengizinkan upload.

---

## ✅ Solusi: Setup RLS Policy di Supabase

### Step 1: Go to Supabase Dashboard

1. Buka [app.supabase.com](https://app.supabase.com)
2. Pilih project kamu
3. Klik **Storage** di sidebar kiri
4. Klik bucket **mcu-documents**

### Step 2: Buka Policies Tab

Di halaman bucket `mcu-documents`, cari tab **Policies** (atau **Security**)

### Step 3: Add Policy untuk Upload (INSERT)

Klik **New Policy** atau **+ Add policy**

Pilih: **CREATE POLICY → For authenticated users → Allow (all operations)**

Atau klik "Use SQL Editor" dan paste SQL ini:

```sql
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mcu-documents');
```

**Keterangan:**
- Mengizinkan user yang sudah login untuk upload file
- Policy hanya berlaku untuk bucket `mcu-documents`

### Step 4: Add Policy untuk Download (SELECT)

Buat policy baru untuk download:

```sql
CREATE POLICY "Allow authenticated users to download"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'mcu-documents');
```

**Keterangan:**
- Mengizinkan user yang sudah login untuk download/view file

### Step 5: Add Policy untuk Delete (DELETE)

Buat policy baru untuk delete:

```sql
CREATE POLICY "Allow authenticated users to delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'mcu-documents');
```

**Keterangan:**
- Mengizinkan user yang sudah login untuk delete file mereka

### Step 6: Update (UPDATE - Optional)

```sql
CREATE POLICY "Allow authenticated users to update"
ON storage.objects
FOR UPDATE
TO authenticated
WITH CHECK (bucket_id = 'mcu-documents');
```

---

## ✅ Verifikasi

Setelah menambahkan policies, kamu harus melihat:

```
✅ Allow authenticated users to upload
✅ Allow authenticated users to download
✅ Allow authenticated users to delete
✅ Allow authenticated users to update
```

Di halaman Policies bucket `mcu-documents`

---

## 🔄 Try Upload Again

Setelah setup RLS policies:

1. Reload aplikasi kamu
2. Coba upload PDF atau foto
3. Seharusnya file berhasil upload sekarang
4. Lihat file di Supabase Storage → mcu-documents bucket

---

## Troubleshooting

### Masih dapat error "violates row-level security"?

✅ **Checklist:**
- [ ] Policies sudah dibuat? (Check di tab Policies)
- [ ] User sudah login? (Cek di console jika ada current user)
- [ ] Bucket name benar? (Harus `mcu-documents`)
- [ ] Reload browser? (F5 atau Cmd+R)

### Jika masih error, coba:

1. **Go to Supabase Dashboard → SQL Editor**
2. Copy & paste semua SQL ini sekaligus:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'mcu-documents');

-- Allow authenticated users to download
CREATE POLICY "Allow authenticated users to download"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'mcu-documents');

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated users to delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'mcu-documents');

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated users to update"
ON storage.objects FOR UPDATE TO authenticated
WITH CHECK (bucket_id = 'mcu-documents');
```

3. Klik **Run** (atau Cmd+Enter)

---

## Expected Success

Setelah policies aktif, upload file akan:

1. ✅ Validasi file type (PDF, JPG, PNG only)
2. ✅ Kompresi PDF (50-70% reduction)
3. ✅ Upload ke storage bucket
4. ✅ Save metadata ke mcufiles table
5. ✅ Show success message

Console output:
```
✅ Compressed: 245.3KB → 78.2KB (68.1% reduction)
✅ File uploaded successfully: {fileid}
```

---

## Reference

- **Supabase RLS Docs**: https://supabase.com/docs/guides/database/postgres/row-level-security
- **Storage RLS**: https://supabase.com/docs/guides/storage/security/access-control
