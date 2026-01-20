# FIX ACTIVITY LOG - SCHEMA MISMATCH

## Error yang Terjadi:
```
❌ Could not find the 'target_id' column of 'activity_log' in the schema cache (code: PGRST204)
```

## Root Cause:
Kolom `target_id` yang kami coba insert **TIDAK ADA** atau **NAMED BERBEDA** di tabel `activity_log` di Supabase.

---

## SOLUSI YANG DITERAPKAN (Commit: 72bf15d)

File yang diubah: `mcu-management/js/services/databaseAdapter.js` (lines 949-1026)

### Strategi Fallback:
```
Try #1: Insert dengan semua columns (user_id, action, timestamp, user_name, target, target_id, details)
         ↓
         Jika error "target_id not found"
         ↓
Try #2: Retry tanpa target_id column (user_id, action, timestamp, user_name, target, details)
         ↓
         Jika error lainnya → Log error dan stop
```

### Code Pattern:
```javascript
// First attempt with all columns
let result = await supabase
    .from('activity_log')
    .insert([insertData])
    .select();

// If target_id column error, retry without it
if (result.error?.message?.includes('target_id')) {
    console.warn('⚠️ target_id column not found, retrying without it...');
    // Rebuild insertData WITHOUT target_id
    result = await supabase
        .from('activity_log')
        .insert([insertDataMinimal])
        .select();
}
```

---

## TESTING INSTRUCTIONS

### Step 1: Backup & Run Migration
Sebelum test, pastikan migration sudah di-run di Supabase:

```sql
-- Buka Supabase Dashboard → SQL Editor → Run query ini:

CREATE TABLE IF NOT EXISTS public.activity_log (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT,
    user_name VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    target VARCHAR(100),
    target_id TEXT,
    details TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON public.activity_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON public.activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_target ON public.activity_log(target);
CREATE INDEX IF NOT EXISTS idx_activity_log_target_id ON public.activity_log(target_id);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.activity_log
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.activity_log
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for admins" ON public.activity_log
    FOR UPDATE USING (true);
```

**PENTING:** Jika error "table already exists", gunakan query ini untuk check struktur:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'activity_log'
ORDER BY ordinal_position;
```

Lihat hasilnya - apakah ada kolom `target_id`? Jika tidak, buat dengan:
```sql
ALTER TABLE public.activity_log ADD COLUMN target_id TEXT;
```

### Step 2: Test Activity Logging
1. Refresh browser (hard refresh: Ctrl+F5 atau Cmd+Shift+R)
2. Buka **DevTools → Console**
3. Buka **"Tambah Karyawan"** page
4. **Isi form dan klik "Simpan"**
5. **Lihat console log:**
   - `✅ Supabase client initialized successfully` ← Supabase ready
   - `📝 [ActivityLog] Attempting insert with columns: [...]` ← Attempt #1
   - `✅ [ActivityLog] INSERT successful` ← Success!

   ATAU jika ada schema issue:
   - `⚠️ [ActivityLog] target_id column not found, retrying without it...` ← Fallback
   - `✅ [ActivityLog] INSERT successful` ← Success with fallback!

### Step 3: Verify Data di Supabase
1. Buka Supabase Dashboard
2. Klik **"activity_log"** table
3. Lihat apakah ada row baru dengan data yang Anda input
4. Check kolom: `user_id`, `action`, `target`, `timestamp` harus populated

### Step 4: Check Dashboard Aktivitas
1. Buka **Dashboard** page
2. Scroll ke section **"Aktivitas Terbaru"**
3. Seharusnya ada activity baru dari aksi yang Anda lakukan di step 2

---

## JIKA MASIH ERROR

### Kemungkinan 1: Table masih tidak ada
```sql
-- Check apakah table exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'activity_log'
);
-- Hasil: true atau false
```

Jika `false`, jalankan CREATE TABLE query dari Step 1 di atas.

### Kemungkinan 2: Kolom berbeda nama
```sql
-- Check exact column names
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'activity_log'
ORDER BY ordinal_position;
```

Lihat hasilnya, bandingkan dengan schema kita:
- `id` ✓
- `user_id` ✓
- `user_name` ✓
- `action` ✓
- `target` ✓
- `target_id` ✓
- `details` ✓
- `timestamp` ✓
- `created_at` ✓

Jika ada yang berbeda (misal `targetId` instead of `target_id`), update databaseAdapter.js untuk match actual schema.

### Kemungkinan 3: RLS Policy blocking insert
```sql
-- Check RLS policies
SELECT * FROM pg_policies
WHERE tablename = 'activity_log';

-- Check if RLS is enabled
SELECT relrowsecurity FROM pg_class
WHERE relname = 'activity_log';
-- Result: true = RLS enabled
```

Jika RLS enabled tapi insert masih gagal, ensure ada policy:
```sql
CREATE POLICY "Enable insert access for all users" ON public.activity_log
    FOR INSERT WITH CHECK (true);
```

---

## PERUBAHAN DIBANDING SEBELUMNYA

| Aspek | Sebelum | Sesudah |
|-------|---------|---------|
| Columns | Always include target_id | Try with, fallback without |
| Error Handling | Throw error langsung | Retry dengan fallback |
| Compatibility | Hanya cocok dengan specific schema | Cocok dengan berbagai schema |
| Logging | Minimal | Detailed untuk troubleshooting |

---

## COMMIT HISTORY

```
72bf15d - Fix: Perbaiki Activity Log schema mismatch
9bd44bf - Fix: Perbaiki Activity Log insertion dan dropdown master data
```

---

## NEXT STEPS

1. ✅ Sudah apply fallback fix
2. ⏳ Test dengan steps di atas
3. ⏳ Report hasil:
   - Apakah insert success atau masih error?
   - Jika error, copy-paste error message lengkap dari console
4. ⏳ Jika masih gagal, run diagnostic queries dari section "Jika Masih Error"
5. ⏳ Update schema migration jika perlu

---

## DIAGNOSTIC QUICK CHECKLIST

Copy-paste ke Supabase SQL Editor:

```sql
-- 1. Check table exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'activity_log'
) as table_exists;

-- 2. Check columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'activity_log'
ORDER BY ordinal_position;

-- 3. Check RLS
SELECT relrowsecurity FROM pg_class
WHERE relname = 'activity_log';

-- 4. Check latest activity logs
SELECT id, user_id, action, target, timestamp
FROM activity_log
ORDER BY timestamp DESC
LIMIT 5;
```

Run ini dan share hasilnya jika masih ada issue.
