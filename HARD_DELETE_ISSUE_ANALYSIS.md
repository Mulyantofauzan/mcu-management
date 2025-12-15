# Hard Delete File - Issue Analysis & Solution

**Date:** 2025-12-15
**Status:** Enhanced Error Handling Deployed
**Issue:** HTTP 500 error when permanently deleting MCU files

---

## Good News ✅

**File upload works perfectly**, yang berarti:
- ✅ Environment variables (Supabase & Cloudflare R2) sudah lengkap
- ✅ Database connection bekerja dengan baik
- ✅ R2 storage configuration valid
- ✅ Field names di database sudah benar (`supabase_storage_path`)

---

## Why Delete Fails tapi Upload Berhasil?

Perbedaan key antara upload dan delete:

### Upload Flow (✅ Works):
```
Client → /api/compress-upload (file diupload)
                ↓
        saveFileMetadata()
                ↓
        mcufiles.insert() ← INSERT statement, biasanya lebih permissive
                ↓
        File saved ke R2
```

### Delete Flow (❌ Fails with 500):
```
Client → /api/hard-delete-file (request delete)
                ↓
        mcufiles.select().eq() ← SELECT dengan filter
                ↓ (jika ditemukan)
        r2.deleteObject() ← DELETE dari R2
                ↓ (jika berhasil)
        mcufiles.delete().eq() ← DELETE dari database
```

**Kemungkinan penyebab 500 error:**

1. **SELECT query filter tidak match** (paling mungkin)
   - File ada di database, tapi query tidak menemukan dengan parameter yang dikirim
   - Bisa karena: URL encoding issue, data type mismatch, atau field value tidak match persis

2. **R2 deletion gagal kemudian proses stop**
   - File tidak bisa dihapus dari R2 (permissions, file not found, etc)
   - Menyebabkan exception yang return 500

3. **RLS atau database permissions issue**
   - Meskipun upload bekerja, delete mungkin butuh permission berbeda

---

## Debugging Steps (Langkah demi langkah)

### Step 1: Check Vercel Logs untuk melihat actual error
```
Buka: Vercel Dashboard
  → Deployments
  → Latest deployment
  → Functions tab
  → hard-delete-file
  → Lihat console logs
```

**Catat error message yang muncul.**

---

### Step 2: Verify File Exists di Database

Buka Supabase SQL Editor dan jalankan:

```sql
-- Cek struktur table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'mcufiles'
ORDER BY ordinal_position;

-- Cek contoh file yang ada
SELECT
  fileid,
  filename,
  supabase_storage_path,
  uploadedat
FROM mcufiles
LIMIT 5;

-- Cek file spesifik yang mau didelete
-- Ganti "SYARIFUDDIN" dengan nama file yang mau didelete
SELECT
  fileid,
  filename,
  supabase_storage_path
FROM mcufiles
WHERE filename ILIKE '%SYARIFUDDIN%'
LIMIT 10;
```

**Catat hasil:**
- Ada file-nya?
- Field names sesuai dengan yang API cari?
- `supabase_storage_path` value format-nya apa?

---

### Step 3: Test Delete dengan Query yang sama

Dari SQL Editor, coba query yang API gunakan:

```sql
-- Simulasi query yang API gunakan
-- (ganti dengan actual storagePath dari file yang mau didelete)

SELECT *
FROM mcufiles
WHERE supabase_storage_path = 'mcu_files/EMP-20251206-miuai392-O4G40/MCU-20251206-miuai4n3-A6U7R/SYARIFUDDIN PT. PUTRA SARANA TRANSBORNEO SITE MMI.pdf'
LIMIT 1;

-- Jika ^ tidak balik data, coba variations:
SELECT *
FROM mcufiles
WHERE supabase_storage_path ILIKE '%SYARIFUDDIN%'
LIMIT 5;
```

---

### Step 4: Check R2 File Existence (Optional)

Jika ingin pastikan file ada di R2:

```bash
# Test R2 config (API endpoint)
curl "https://your-deployed-app.vercel.app/api/test-r2-config"

# Ini akan tell you apakah R2 credentials valid
```

---

## Kemungkinan Root Causes & Solutions

### Cause #1: URL Encoding Issue ⚠️

**Problem:**
```
URL yang dikirim:
/api/hard-delete-file?storagePath=mcu_files%2FEMP-xxx%2F...

Setelah di-decode:
mcu_files/EMP-xxx/...

Tapi di database store sebagai:
"mcu_files/EMP-xxx/..." (mungkin dengan escape char berbeda)
```

**Solution:**
Cek di Vercel logs - lihat apa yang diterim API sebelum dan sesudah decode.

---

### Cause #2: Space Handling di Filename ⚠️

**Problem:**
```
Filename: "SYARIFUDDIN PT. PUTRA SARANA TRANSBORNEO SITE MMI.pdf"
         ↑ Ada banyak spaces

Database store: "...TRANSBORNEO  SITE..." (double space?)
Query cari: "...TRANSBORNEO SITE..." (single space)
→ Tidak match!
```

**Solution:**
Check database - lihat exact value di `supabase_storage_path` field.

---

### Cause #3: Character Encoding Issue ⚠️

**Problem:**
```
Special characters mungkin ter-encode berbeda:
- Space bisa jadi %20 atau +
- UTF-8 vs ASCII encoding mismatch
```

**Solution:**
Lihat raw value di database - compare dengan request parameter.

---

## Recommended Actions

### 🔴 IMMEDIATE (Do Now):
1. ✅ Check Vercel logs untuk actual error message
2. ✅ Query database untuk verify file exists
3. ✅ Compare exact `supabase_storage_path` value

### 🟡 SHORT TERM (Next Steps):
1. Share Vercel log error dengan saya
2. Share database query results
3. Kita identify exact mismatch

### 🟢 LONG TERM (Future Prevention):
1. Add URL decode validation di API
2. Add more comprehensive logging sebelum query execute
3. Consider menggunakan `fileid` untuk delete (lebih reliable daripada path string)

---

## Quick Workaround (Temporary)

Jika mau delete file dengan cara lain sementara ini:

```sql
-- Direct database deletion (if you have access)
DELETE FROM mcufiles
WHERE filename = 'SYARIFUDDIN PT. PUTRA SARANA TRANSBORNEO SITE MMI.pdf'
  AND uploadedat > NOW() - INTERVAL '7 days';

-- Note: File akan hilang dari database tapi tetap ada di R2 storage
```

---

## Recent Improvements Made

✅ **Enhanced Error Handling:**
- Environment variable validation
- Detailed logging di setiap step
- Better error messages

✅ **Improved Diagnostics:**
- Show exact search parameters yang digunakan
- Check database accessibility
- Separate R2 errors dari DB errors

✅ **API will now return:**
```json
{
  "error": "File not found in database",
  "searchedWith": "storagePath",
  "searchValue": "mcu_files/EMP-xxx/MCU-yyy/filename.pdf"
}
```

---

## Commits:
- `189dae5` - Initial error handling improvements
- `bef4715` - Added debugging guide
- `c08ad83` - Better diagnostics for file not found

---

## Next Action

**Please check Vercel logs dan share error message yang muncul!**

Dengan log message, saya bisa identify exact root cause dan provide targeted fix.

---

**Status:** Waiting for Vercel logs / Database query results
**Contact:** Check Vercel Dashboard → Deployments → Functions → hard-delete-file
