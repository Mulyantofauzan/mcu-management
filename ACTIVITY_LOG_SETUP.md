# Activity Log Setup Guide

## Status

Aplikasi MCU Management sudah dilengkapi dengan fitur Activity Log untuk melacak semua aktivitas user (create, update, delete).

## Apa itu Activity Log?

Activity Log adalah fitur yang mencatat setiap aksi user pada data:
- Menambah karyawan baru
- Mengupdate data karyawan
- Menghapus karyawan
- Membuat MCU record
- Update/Follow-up MCU
- Dan aktivitas lainnya

Activity Log ditampilkan di **Dashboard → Aktivitas Terbaru** dengan informasi:
- Siapa yang melakukan aksi (user name)
- Apa yang dilakukan (create/update/delete)
- Data apa yang diubah (nama karyawan, ID karyawan, dll)
- Kapan aksi dilakukan (timestamp)

## Cara Setup Activity Log di Supabase

Activity Log memerlukan 1 table di Supabase: `activity_log`

### Option 1: Menggunakan SQL Editor (Recommended)

1. **Buka Supabase Dashboard**
   - Kunjungi https://supabase.com
   - Login ke project Anda
   - Pilih project "mcu-management" (atau nama project Anda)

2. **Buka SQL Editor**
   - Klik menu "SQL Editor" di sidebar kiri
   - Klik tombol "+" atau "New Query"

3. **Copy & Paste SQL dibawah ini:**

```sql
-- Create activity_log table for tracking user activities
CREATE TABLE IF NOT EXISTS activity_log (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT,
    user_name VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    target VARCHAR(100),
    details TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_target ON activity_log(target);

-- Add comments for documentation
COMMENT ON TABLE activity_log IS 'Activity log for tracking user actions on entities';
COMMENT ON COLUMN activity_log.user_id IS 'User ID who performed the action';
COMMENT ON COLUMN activity_log.user_name IS 'User display name at the time of action';
COMMENT ON COLUMN activity_log.action IS 'Type of action (create, update, delete)';
COMMENT ON COLUMN activity_log.target IS 'Entity type (Employee, MCU, User, etc)';
COMMENT ON COLUMN activity_log.details IS 'Entity ID or additional details';
COMMENT ON COLUMN activity_log.timestamp IS 'When the action was performed';
```

4. **Execute Query**
   - Klik tombol "RUN" atau tekan Ctrl+Enter
   - Tunggu hingga selesai (akan muncul notifikasi sukses)

5. **Verifikasi Berhasil**
   - Klik menu "Table Editor"
   - Cari table "activity_log" di list
   - Jika muncul, setup berhasil! ✅

### Option 2: Menggunakan File Migration

Jika Anda punya cara lain untuk run migrations, bisa gunakan file:
- File: `supabase-migrations/create-activity-log-table.sql`
- Jalankan file tersebut di database Anda

## Verifikasi Setup Berhasil

Setelah menjalankan SQL:

1. **Di Supabase Dashboard:**
   - Buka "Table Editor"
   - Lihat list tables
   - Pastikan ada table: `activity_log`

2. **Di Aplikasi MCU Management:**
   - Refresh halaman (Ctrl+F5)
   - Buat/update karyawan atau MCU (akan ada activity log)
   - Buka Dashboard
   - Lihat card "Aktivitas Terbaru"
   - Seharusnya muncul aktivitas terbaru

## Apa Jika Activity Log Masih Tidak Muncul?

### Kemungkinan 1: Table Belum Dibuat
- Solusi: Jalankan SQL migration di atas dengan benar

### Kemungkinan 2: Belum Ada Aktivitas Baru
- Setelah table dibuat, lakukan aksi baru (tambah karyawan, update MCU, dll)
- Aktivitas akan dicatat secara otomatis
- Refresh dashboard untuk melihat aktivitas terbaru

### Kemungkinan 3: RLS Policy Blocking
- Jika Anda gunakan RLS (Row Level Security) di Supabase
- Pastikan policy membolehkan INSERT ke table `activity_log`
- Tanya admin database Anda untuk verifikasi

### Kemungkinan 4: Browser Cache
- Coba refresh dengan Ctrl+Shift+R (hard refresh)
- Atau clear browser cache
- Tutup dan buka kembali aplikasi

## Fitur Activity Log - Apa yang Dicatat?

### Employee Actions
- ✅ Create Employee: "Admin menambahkan karyawan John Doe"
- ✅ Update Employee: "Admin mengupdate data karyawan John Doe"
- ✅ Delete Employee: "Admin menghapus karyawan John Doe"

### MCU Actions
- ✅ Create MCU: "John Doe baru saja MCU"
- ✅ Update MCU (Follow-up): "John Doe baru saja Follow-Up"
- ✅ Delete MCU: "Admin menghapus data MCU"

## Data Structure

Table `activity_log` memiliki columns:

| Column | Type | Deskripsi |
|--------|------|-----------|
| `id` | BIGSERIAL | Primary key (auto-increment) |
| `user_id` | TEXT | ID user yang melakukan aksi |
| `user_name` | VARCHAR(255) | Nama user yang melakukan aksi |
| `action` | VARCHAR(50) | Tipe aksi: create, update, delete |
| `target` | VARCHAR(100) | Entity type: Employee, MCU, User, dll |
| `details` | TEXT | ID dari entity yang diubah |
| `timestamp` | TIMESTAMP | Waktu aksi dilakukan |
| `created_at` | TIMESTAMP | Waktu record dibuat di database |

## Indexes

Table memiliki 4 indexes untuk performa:
- `idx_activity_log_timestamp` - Query berdasarkan waktu (paling sering digunakan)
- `idx_activity_log_user_id` - Query berdasarkan user
- `idx_activity_log_action` - Query berdasarkan tipe aksi
- `idx_activity_log_target` - Query berdasarkan entity type

## Troubleshooting

### Error: "permission denied for schema public"
- Anda perlu role yang tepat di Supabase
- Contact admin database atau ganti ke service_role key (di SQL Editor)

### Error: "relation 'activity_log' does not exist"
- Table belum dibuat
- Run SQL migration yang benar

### Activity tidak muncul di dashboard meski sudah buat employee
- Tunggu beberapa detik (sinkronisasi data)
- Refresh halaman (Ctrl+F5)
- Cek browser console (F12 → Console) untuk error messages

## Kesimpulan

Activity Log akan berjalan otomatis setelah table `activity_log` dibuat di Supabase. Tidak perlu setup tambahan di aplikasi - semua aksi akan dicatat dan ditampilkan di Dashboard.

Jika ada pertanyaan atau masalah, cek file-file berikut:
- `js/services/database.js` - logActivity function
- `js/services/databaseAdapter.js` - ActivityLog implementation
- `js/pages/dashboard.js` - updateActivityList function
