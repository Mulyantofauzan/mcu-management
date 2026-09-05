# Panduan Migrasi MCU dan Surat Sehat

Migration ini menambahkan tipe `Surat Sehat`, aturan masa berlaku 12/3 bulan,
serta pemilihan record kesehatan aktif berdasarkan tanggal pemeriksaan.
Migration tidak mengubah atau menghapus data MCU lama.

## Urutan Penerapan

1. Buka proyek MADIS yang benar di Supabase Dashboard.
2. Pilih **SQL Editor** lalu **New query**.
3. Buka file `migrations/20260903_01_mcu_validity_and_health_certificate.sql`.
4. Salin seluruh isi file ke SQL Editor.
5. Klik **Run** satu kali dan pastikan muncul `Success. No rows returned`.
6. Setelah deployment Vercel selesai, buka MADIS lalu lakukan hard refresh.

Migration dibungkus `BEGIN` dan `COMMIT`. Jika salah satu langkah gagal,
seluruh perubahan dalam migration dibatalkan otomatis.

## Verifikasi

Jalankan query berikut setelah migration berhasil:

```sql
SELECT
  public.workflow_mcu_validity_months('Annual') AS mcu_bulan,
  public.workflow_mcu_validity_months('Surat Sehat') AS surat_sehat_bulan;
```

Hasil yang benar: `mcu_bulan = 12` dan `surat_sehat_bulan = 3`.

```sql
SELECT
  document_type,
  last_mcu_date,
  expiry_date,
  expiry_months,
  expiry_status
FROM public.v_mcu_expiry_overview
WHERE mcu_id IS NOT NULL
ORDER BY last_mcu_date DESC
LIMIT 10;
```

Pastikan `expiry_date` berjarak 12 bulan dari `last_mcu_date` untuk MCU penuh,
atau 3 bulan untuk `Surat Sehat`.

```sql
SELECT tgname
FROM pg_trigger
WHERE tgrelid = 'public.mcus'::regclass
  AND tgname = 'zzz_validate_health_certificate_history'
  AND NOT tgisinternal;
```

Hasil harus berisi satu baris trigger tersebut.

## Uji Singkat di MADIS

1. Tambah `Surat Sehat` pada karyawan tanpa riwayat MCU penuh; harus berhasil.
2. Form `Surat Sehat` hanya meminta data ringkas dan satu lampiran.
3. Coba tambah `Surat Sehat` pada karyawan yang pernah memiliki MCU penuh;
   sistem harus menolak dengan pesan riwayat MCU.
4. Pastikan halaman **MCU Expired** menampilkan jenis dokumen, tanggal
   pemeriksaan, dan tanggal berlaku sampai.
5. Pastikan lampiran dapat dihapus sebelum hasil review final.
6. Pastikan tombol **Rujukan** membuat ulang dokumen yang hilang lalu langsung
   mengunduhnya.
