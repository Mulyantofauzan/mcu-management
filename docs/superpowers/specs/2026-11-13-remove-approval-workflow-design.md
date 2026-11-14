# Hapus Sistem Review/Approval, MCU Langsung Tersimpan

Tanggal: 2026-11-13. Status: menunggu persetujuan pengguna.

## Tujuan
MCU yang diinput Petugas/Admin langsung tersimpan dan aktif di aplikasi, tanpa review Dokter dan tanpa keputusan bergabung Admin. Form input MCU kembali ke bentuk sebelum workflow. Database, login, R2, dan fitur lain tetap.

## Keputusan pengguna
| Hal | Keputusan |
|---|---|
| Cara hapus | Hapus kode workflow sampai bersih (bukan hanya matikan flag) |
| Bentuk form | Seperti sebelum 2 Agustus 2026 (commit `cf1fd5d`): urutan lama, kolom Hasil dan Catatan Awal wajib |
| Surat Sehat dan masa berlaku (commit `6e43d00`) | Dibuang. Masa berlaku kembali tetap 365 hari, dihitung di browser |
| MCU yang sedang mengantri | Dibiarkan; hasil diisi manual lewat Edit |
| Role Dokter | Dihapus, akun Dokter dinonaktifkan |

## Bukan tujuan
- Tidak menghapus tabel/kolom workflow di database (data histori aman). Pembersihan skema bisa tahap terpisah.
- Tidak `git checkout` file lama: file form yang sama menerima perbaikan upload, performa, dan keamanan sejak itu. Workflow dibuang dari kode sekarang.
- Tidak mengubah login, bcrypt, `/api/users`, guard role selain pencabutan role Dokter.

## Fakta dari kode
- Flag `app_settings.mcu_approval_workflow_enabled` bawaan `false`. Saat mati, trigger `workflow_apply_compatibility_defaults` memberi MCU baru `workflow_status='approved_legacy'` dan karyawan `joining_status='joined'`; trigger penjaga (`workflow_guard_mcus`) tidak memblokir.
- Frontend sudah punya cabang `workflowEnabled === false` di `tambah-karyawan.js`, `follow-up.js`, `kelola-karyawan.js`.
- Masa berlaku sekarang: view `v_mcu_expiry_overview` dan fungsi `workflow_mcu_validity_months` (12/3 bulan), serta pengaturan ambang Admin lewat `workflowService.settings()`.

## Rancangan

### 1. Database (SQL dijalankan manual oleh pengguna)
File baru `migrations/20261113_01_remove_approval_workflow.sql`:
1. Matikan flag `mcu_approval_workflow_enabled`.
2. Ubah MCU berstatus `draft, pending_review, in_review, correction_required, followup_required, completed` yang bukan `approved_legacy` menjadi `approved_legacy`, kosongkan klaim (`claimed_by`, `claim_expires_at`). Hasil medis yang belum ada tetap kosong untuk diisi lewat Edit.
3. Karyawan `joining_status='candidate'` menjadi `joined`.
4. Hapus pembatas `mcu_type` yang menyertakan `Surat Sehat` dan trigger `zzz_validate_health_certificate_history`. MCU bertipe `Surat Sehat` yang sudah ada diubah ke `Annual` (daftar dicatat di komentar hasil query sebelum eksekusi).
5. Kembalikan `v_mcu_expiry_overview` ke 365 hari tetap, tanpa fungsi validitas per tipe.
6. Nonaktifkan akun `role='Dokter'` (`is_active=false`). Role tidak dihapus dari tabel agar histori `reviewed_by` tetap utuh.
Tabel, kolom, dan RPC workflow lain dibiarkan.

### 2. Server
- Hapus `api/workflow/`, `server/workflow/`, rute di `vercel.json`. Fungsi serverless 12 menjadi 11.
- `server/r2SignedUrlService.js`, `api/download-file`, `api/delete-file`: buang cabang workflow/Dokter.
- `/api/users` dan `/api/login`: role sah hanya Admin dan Petugas; login Dokter ditolak.
- `js/utils/roleAccess.mjs`: hapus Dokter dan halaman `validasi-mcu`, `profil-dokter`, `keputusan-bergabung`.

### 3. Halaman dan menu
- Hapus: `validasi-mcu`, `profil-dokter`, `keputusan-bergabung` (html + js), `css/workflow.css`, `workflowService.js`, `workflowErrorPresenter.js`, `workflowIdempotency.js`, `whatsappShare.js` jika hanya dipakai workflow (diverifikasi saat implementasi).
- `sidebar-manager.js`: hapus menu dan badge workflow, menu Dokter.
- `kelola-user`: pilihan role Dokter dihapus.
- `follow-up`: Petugas/Admin mengisi Hasil Akhir dan Catatan langsung. Surat rujukan lewat PDF di browser.
- `mcu-expiry-management`: hapus panel pengaturan ambang; tampilkan masa berlaku tetap 365 hari.
- Halaman yang memanggil `workflowService.bootstrap()` (tambah/kelola karyawan, follow-up, dashboard) tidak lagi memanggilnya.

### 4. Form input MCU (tambah, edit, follow-up)
- Kolom **Hasil** dan **Catatan Awal** tampil lagi dan wajib; notice "Menunggu review Dokter" dihapus.
- Simpan langsung lewat `mcuBatchService.saveMCUWithLabResults`; langkah `submit-review` dan logika "reuse draft" dihapus.
- Urutan bagian kembali ke susunan sebelum 21 Agustus: Pemeriksaan, Audiometri dan Spirometri, Kebiasaan, Penglihatan, Lab, Penunjang, Riwayat Kesehatan, Rujukan, Dokumen, Hasil. `mcuFormOrder.js` dan atribut `data-mcu-order` dihapus. Judul "Diberikan Oleh (Dokter)" dikembalikan.
- Opsi "Surat Sehat" dan semua logika mode ringkas dihapus.

### 5. Pengujian
- Hapus tes workflow usang (`tests/workflow/*` yang menguji state machine, review, privat storage workflow, `mcu-form-order`). Pertahankan yang masih relevan (parsing form `mcu-form-reader`, R2).
- Tes baru: simpan MCU langsung tanpa `submit-review`; Hasil wajib; Dokter ditolak di login, `/api/users`, dan guard halaman; menu tanpa halaman workflow; masa berlaku 365 hari; tidak ada impor ke modul yang dihapus.
- Cek statis: tidak ada impor rusak, `npm test`, `npm run build`.

## Urutan rilis (wajib)
1. Jalankan SQL (flag mati, status dinormalkan). Aplikasi lama tetap jalan karena cabang legacy.
2. Deploy aplikasi baru.
3. Isi hasil MCU yang kosong lewat Edit.
Jika deploy lebih dulu daripada SQL: MCU baru masuk `draft` dan tidak ada yang bisa meninjau.

## Tahapan implementasi
1. Server dan database (SQL, hapus API, role).
2. Halaman dan menu.
3. Form (tambah, edit, follow-up) dan masa berlaku.
4. Tes dan pembersihan.
Tiap tahap diuji sebelum lanjut.

## Risiko
- `kelola-karyawan.js` (3300 baris) paling banyak percabangan workflow; salah hapus bisa mematahkan edit. Mitigasi: hapus per fungsi, tes tiap langkah.
- Belum ada uji browser; daftar uji manual akan disertakan di akhir.
- MCU `Surat Sehat` lama berubah menjadi `Annual`; ini perubahan data. Daftar akan dicetak sebelum SQL jalan.
- Analitik/dashboard memakai view workflow; diperiksa satu per satu agar angka tetap sama untuk data `approved_legacy`.
