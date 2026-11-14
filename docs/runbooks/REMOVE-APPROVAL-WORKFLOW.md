# Runbook: Hapus Sistem Review/Approval MCU

Versi aplikasi 1.2.21. Spec: `docs/superpowers/specs/2026-11-13-remove-approval-workflow-design.md`.

Setelah rilis ini, MCU yang diinput Petugas/Admin langsung tersimpan dan aktif. Tidak ada review Dokter, keputusan bergabung, Surat Sehat, maupun role Dokter.

## Urutan rilis (wajib)
1. **Cek data (SQL Editor Supabase)**, simpan hasilnya:
   ```sql
   SELECT workflow_status, COUNT(*) FROM public.mcus WHERE deleted_at IS NULL GROUP BY 1;
   SELECT mcu_id, employee_id, mcu_date FROM public.mcus WHERE mcu_type = 'Surat Sehat';
   SELECT username, role, active FROM public.users WHERE role = 'Dokter';
   SELECT setting_key, setting_value FROM public.app_settings WHERE setting_key = 'mcu_approval_workflow_enabled';
   ```
2. **Jalankan** `migrations/20261113_01_remove_approval_workflow.sql` sekali (satu transaksi; jika gagal otomatis batal).
3. **Verifikasi setelah SQL**:
   ```sql
   SELECT setting_value FROM public.app_settings WHERE setting_key = 'mcu_approval_workflow_enabled'; -- false
   SELECT DISTINCT workflow_status FROM public.mcus;                       -- hanya approved_legacy
   SELECT COUNT(*) FROM public.mcus WHERE mcu_type = 'Surat Sehat';        -- 0
   SELECT COUNT(*) FROM public.users WHERE role = 'Dokter' AND active;     -- 0
   SELECT COUNT(*) FROM public.v_mcu_expiry_overview;                      -- ada baris
   ```
4. **Deploy aplikasi** (Vercel). Jika terbalik (deploy lebih dulu), MCU baru masuk status `draft` dan tidak ada yang bisa meninjau.
5. Buka aplikasi, hard refresh sekali agar service worker memakai versi 1.2.21.
6. **Isi hasil MCU yang kosong**: MCU yang dulu mengantri review kini aktif tetapi hasil medisnya kosong (badge "Belum ada hasil"). Isi lewat Kelola Karyawan, buka detail MCU, Edit.

Urutan dengan migrasi sebelumnya yang belum dijalankan: `20261110_01_restrict_data_access_by_role.sql` dan `20261111_01_users_server_write_only.sql` tetap mengikuti catatan di `docs/qa/QA-REPORT-2026-11-09.md`. Migrasi ini tidak bergantung pada keduanya.

## Daftar uji manual (belum diuji di browser)
- [ ] Login Admin dan Petugas berhasil; akun Dokter lama ditolak ("Username atau password salah").
- [ ] Sidebar Admin/Petugas tidak memuat Validasi MCU, Keputusan Bergabung, Profil Dokter.
- [ ] Tambah Karyawan & MCU: kolom Hasil Awal dan Catatan Awal wajib; MCU langsung muncul di Kelola Karyawan tanpa antrian.
- [ ] Urutan form: Pemeriksaan, Audiometri/Spirometri, Kebiasaan, Penglihatan, Lab, Penunjang, Riwayat Kesehatan, Rujukan, Dokumen, Hasil.
- [ ] Tipe MCU tidak memuat "Surat Sehat" di Tambah, Kelola Karyawan (tambah dan edit), dan Follow-Up.
- [ ] Tambah MCU dari Kelola Karyawan (tombol per karyawan): simpan langsung, modal sukses tampil.
- [ ] Edit MCU lama dengan hasil kosong: bisa diisi dan disimpan; badge hasil tidak menampilkan "undefined".
- [ ] MCU dengan hasil Follow-Up tampil di halaman Follow-Up; selesaikan dengan Hasil Akhir + Catatan; tombol Rujukan mengunduh PDF.
- [ ] MCU Expired: kolom "Jenis Dokumen" tidak ada; subjudul "MCU berlaku 12 bulan"; ekspor CSV berisi 9 kolom.
- [ ] Upload dan hapus lampiran pada MCU yang sudah aktif berhasil.
- [ ] Dashboard dan Laporan memuat data (dibaca dari view analitik yang dipulihkan SQL).
- [ ] Buka langsung `/pages/validasi-mcu.html`: 404 (tidak ada halaman), bukan halaman kosong.
- [ ] Sesi lama dengan role Dokter di browser: diarahkan ke login.

## Yang sengaja tidak dihapus
Tabel/kolom/RPC workflow di database (`review_cycles`, `doctor_profiles`, kolom `workflow_*`, dll.) dan dependensi `pdfkit` di root `package.json` (dulu dipakai surat rujukan server). Bersihkan di tahap terpisah jika diinginkan.
