# Hapus Field "kidney_liver_function" dari Supabase

## Instruksi Manual (UI Dashboard)

### Step 1: Login ke Supabase
```
Go to: https://app.supabase.com
Login dengan credentials Anda
```

### Step 2: Buka SQL Editor
```
1. Pilih project MCU APP
2. Go to: SQL Editor (di sidebar kiri)
3. Click "New Query"
```

### Step 3: Run SQL untuk Drop Column
Copy-paste SQL berikut:

```sql
-- Drop kidney_liver_function column from mcus table
ALTER TABLE public.mcus
DROP COLUMN IF EXISTS kidney_liver_function;
```

Kemudian:
```
1. Click "Run" button
2. Wait for query to complete
3. Should see: "Query Successful"
```

### Step 4: Verify Column Removed
```
1. Go to: Table Editor (di sidebar)
2. Select: mcus table
3. Check column list - kidney_liver_function harus sudah hilang
```

---

## Instruksi via SQL Migration (Recommended)

Jika Anda ingin menggunakan migration script yang sudah disediakan:

```bash
# Copy migration file ke Supabase migrations folder
cp migrations/remove_kidney_liver_function.sql ./supabase/migrations/

# Atau run direct SQL di Supabase CLI
supabase migration add remove_kidney_liver_function
```

---

## Via Supabase CLI (Jika sudah setup)

```bash
# Run SQL script
supabase migration up remove_kidney_liver_function

# Or direct SQL
supabase db execute --sql "$(cat migrations/remove_kidney_liver_function.sql)"
```

---

## Apa yang Terjadi?

### Before
MCUs table columns:
```
- mcu_id
- employee_id
- mcu_type
- mcu_date
- ... (other fields)
- kidney_liver_function  ← AKAN DIHAPUS
- hbsag
- napza
- ... (other fields)
```

### After
MCUs table columns:
```
- mcu_id
- employee_id
- mcu_type
- mcu_date
- ... (other fields)
- hbsag
- napza
- ... (other fields)
```

---

## Important Notes

⚠️ **BACKUP SEBELUM JALANKAN!**

```sql
-- OPTIONAL: Backup data terlebih dahulu (jika ada data penting)
CREATE TABLE public.mcus_backup AS
SELECT * FROM public.mcus;
```

✅ **Data lama tidak hilang** (kecuali Anda benar-benar drop column)
✅ **App sudah updated** - tidak akan referencing field ini
✅ **Supabase schema akan match dengan app code**

---

## Troubleshooting

### Error: "column does not exist"
```sql
-- Column mungkin sudah dihapus sebelumnya
-- Gunakan IF EXISTS untuk aman:
ALTER TABLE public.mcus
DROP COLUMN IF EXISTS kidney_liver_function;
```

### Error: "permission denied"
```
1. Check Supabase user role (harus admin atau editor)
2. Check RLS policies di table
3. Kontak Supabase support jika masih error
```

### Ingin undo/restore column
```sql
-- Restore column (jika masih ada backup)
ALTER TABLE public.mcus
ADD COLUMN kidney_liver_function TEXT;

-- Atau restore dari backup table
INSERT INTO public.mcus
SELECT * FROM public.mcus_backup;
```

---

## Checklist Setelah Selesai

- [ ] Login ke Supabase dashboard
- [ ] SQL query sudah executed (Success message)
- [ ] Column "kidney_liver_function" sudah hilang dari Table Editor
- [ ] Tidak ada error messages
- [ ] Test app untuk memastikan semuanya jalan normal
- [ ] Backup sudah disimpan (optional tapi recommended)

---

## Catatan Database

**Supabase MCUs Table Current Schema** (sebelum removal):

```
Column Name              | Type      | Notes
-----------------------|-----------|------------------
mcu_id                  | uuid      | Primary Key
employee_id             | uuid      | FK to employees
mcu_type                | text      | Normal, Follow-Up
mcu_date                | date      | MCU date
bmi                     | numeric   | Body Mass Index
blood_pressure          | text      | BP reading
respiratory_rate        | numeric   | RR value
pulse                   | numeric   | Pulse rate
temperature             | numeric   | Body temp
vision                  | text      | Vision result
audiometry              | text      | Hearing test
spirometry              | text      | Lung function
xray                    | text      | X-Ray result
ekg                     | text      | EKG result
treadmill               | text      | Treadmill test
kidney_liver_function   | text      | ← AKAN DIHAPUS
hbsag                   | text      | Hepatitis B test
sgot                    | numeric   | Liver enzyme
sgpt                    | numeric   | Liver enzyme
cbc                     | text      | Blood count
napza                   | text      | Drug screening
colorblind              | text      | Color blindness test
doctor                  | integer   | FK to doctors
recipient               | text      | Referral recipient
keluhan_utama           | text      | Main complaint
diagnosis_kerja         | text      | Working diagnosis
alasan_rujuk            | text      | Referral reason
initial_result          | text      | Initial result
initial_notes           | text      | Initial notes
final_result            | text      | Final result (follow-up)
final_notes             | text      | Final notes
status                  | text      | Current status
created_at              | timestamp | Creation time
updated_at              | timestamp | Last update
deleted_at              | timestamp | Soft delete marker
created_by              | uuid      | Who created
updated_by              | uuid      | Who updated
```

**Setelah Migration:**
Baris "kidney_liver_function" akan dihapus dari struktur di atas.

---

## Questions?

Jika ada error atau pertanyaan:
1. Check Supabase documentation: https://supabase.com/docs/reference/sql
2. Check error message di Supabase SQL Editor
3. Verify column name (case-sensitive: `kidney_liver_function`)
4. Make sure authenticated dengan proper role
