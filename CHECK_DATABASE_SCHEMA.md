# Check Database Schema untuk mcufiles Table

**Untuk diagnose field names di Supabase:**

1. Buka [Supabase Dashboard](https://supabase.com)
2. Pilih project Anda
3. Go to "SQL Editor"
4. Jalankan query ini:

```sql
-- Check table structure
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'mcufiles'
ORDER BY ordinal_position;
```

5. Lihat hasilnya - catat **SEMUA field names**

---

## Expected Fields

API saat ini mencari:
- `fileid` - file ID
- `supabase_storage_path` ATAU `storage_path` - lokasi file di storage

Jika field names berbeda, kita perlu update API untuk match dengan actual field names.

---

## Contoh hasil yang mungkin:

Jika hasilnya begini:
```
column_name          | data_type
--------------------|----------
fileid               | uuid
filename             | text
file_path            | text        ← Field name berbeda!
bucket_name          | text
created_at           | timestamp
```

Maka API harus mencari `file_path` bukan `supabase_storage_path`.

---

**Silakan run query ini dan share hasilnya!**
