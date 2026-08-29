# Implementasi Optimasi Performa dan Loading MADIS

Tanggal: 29 Agustus 2026  
Versi: 1.2.12  
Status: diterapkan ke production

## Tujuan

Optimasi ini menghilangkan layar kosong saat perpindahan halaman, mempercepat
tampilan data utama, dan mengurangi query berulang tanpa mengubah alur kerja,
skema database, maupun isi data production.

## Perubahan Utama

### 1. Siklus Loading Bersama

- Semua halaman memiliki shell yang langsung terlihat.
- Loading, empty state, error, timeout, dan tombol `Coba Lagi` ditampilkan pada
  area data terkait, bukan menutup seluruh halaman.
- Sidebar tidak lagi menghambat tampilan konten utama.
- Setiap halaman menandai status siap-interaksi agar QA dapat memeriksa kondisi
  loading secara konsisten.

### 2. Dashboard dan Kelola Karyawan

- Data utama dirender sebelum widget sekunder.
- Query independen dijalankan paralel.
- Modul modal, upload, laboratorium, dan koreksi dimuat saat dibutuhkan.
- Daftar karyawan tidak menunggu dependensi yang hanya dipakai dalam modal.
- Pemeriksaan laboratorium dibaca dalam batch maksimal 100 ID per request.

Batch 100 tidak membatasi hasil menjadi 100 data. Seluruh ID dibagi menjadi
beberapa request, lalu hasil setiap batch digabung kembali. Pengujian 767 ID
menghasilkan 8 batch dan tetap mengembalikan keseluruhan hasil.

### 3. Form MCU dan Follow-Up

- Form dasar tampil sebelum modul MCU tambahan selesai dimuat.
- Data master independen dimuat paralel dan memakai cache lima menit.
- Modul upload serta laboratorium dimuat saat form MCU dibuka.
- Validasi file, kebijakan upload, dan alur penyimpanan MCU tidak diubah.

### 4. Workflow dan Administrasi

- Antrian Dokter tampil tanpa menunggu riwayat review.
- Riwayat review baru dimuat saat tab dibuka.
- Keputusan bergabung, profil Dokter, data master, user, activity log, expiry,
  dan data terhapus memakai status loading lokal.
- Data sensitif seperti user, activity log, data terhapus, dan hasil expiry tidak
  disimpan sebagai cache publik.

### 5. Laporan

- Analysis, Jakarta Cardiovascular, Laporan Periode, dan Riwayat Kesehatan
  menampilkan filter serta struktur halaman lebih awal.
- Query laboratorium per MCU dihapus dan diganti batch reader bersama.
- Kegagalan satu grafik tidak menghentikan grafik lain.
- ExcelJS dimuat hanya saat pengguna menekan ekspor.
- Chart.js pada Riwayat Kesehatan dimuat hanya setelah karyawan dipilih.
- Laporan Periode memakai dataset yang sudah dimuat untuk ekspor, sehingga tidak
  mengulang empat query besar.
- Tabel Laporan Periode merender 50 baris per halaman; ekspor tetap memakai semua
  data hasil filter.

### 6. Login, Service Worker, dan Cache

- Login production tidak lagi memuat seed demo, Dexie, atau Supabase browser
  bundle. Dependensi tersebut hanya dimuat pada lingkungan lokal.
- Instalasi service worker pertama tidak memicu reload.
- Update aplikasi memakai satu jalur aktivasi dan satu reload setelah persetujuan.
- HTML dan `version.json` tetap network-first atau network-only.
- Endpoint `/api/` tetap network-only dan tidak disimpan dalam cache.
- JS/CSS lokal memakai stale-while-revalidate: navigasi hangat memakai cache,
  lalu kode diperbarui di latar belakang.
- Versi aplikasi dan cache service worker diselaraskan ke 1.2.12.

## Jaminan Data

- Tidak ada migration SQL.
- Tidak ada perubahan skema Supabase.
- Tidak ada penghapusan atau pemindahan data karyawan, MCU, review, atau file.
- Tidak ada perubahan aturan approval dan role.
- Cache hanya mempercepat pembacaan; sumber kebenaran tetap database production.

## Hasil QA Otomatis

- `npm test`: 140/140 lulus.
- `npm run test:workflow`: 84/84 lulus.
- `node --test tests/performance/*.test.js`: 24/24 lulus.
- Syntax modul eksternal dan inline yang berubah: lulus.
- `npm run build`: lulus.
- `git diff --check`: lulus.

Cakupan kontrak meliputi upload MCU, JWT dan role, workflow Dokter, keputusan
bergabung, pagination, lifecycle halaman, batch laboratorium, service worker,
private storage, referral letter, dan keepalive Supabase.

## Hasil QA Production

Chrome DevTools pada `https://madis.sabdamu.my.id/pages/login.html`:

- Versi terdeteksi: 1.2.12.
- LCP: 269 ms.
- TTFB: 111 ms.
- CLS: 0.00.
- Request awal login: 9 request.
- Dexie, Supabase browser bundle, dan seed demo tidak termuat pada login.
- Tidak ada error HTTP pada request awal.
- Dua label form yang ditemukan belum terhubung telah diperbaiki dengan atribut
  `for` yang sesuai.

QA production terautentikasi tidak melakukan mutasi data. Alur terautentikasi
divalidasi melalui test kontrak dan workflow agar tidak membuat, mengubah, atau
menghapus data MCU production selama audit performa.

## Rollback

Rollback dilakukan per checkpoint commit, urutan terbaru:

1. `4f5d207` - login, service worker, dan release cache.
2. `9e17d93` - laporan dan lazy asset.
3. `b80c793` - halaman administrasi.
4. `c5944f3` - workflow dan loading lokal.
5. `d7a24ab` - form MCU dan Follow-Up.
6. `fe4dd59` - Dashboard dan Kelola Karyawan.
7. `ebe5f90` - lifecycle bersama dan batch reader.

Rollback kode tidak memerlukan rollback database karena optimasi ini tidak
memiliki migration atau perubahan data.
