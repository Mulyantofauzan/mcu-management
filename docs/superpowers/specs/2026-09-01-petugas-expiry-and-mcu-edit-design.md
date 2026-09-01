# Desain Akses Petugas ke MCU Expired dan Edit MCU

## Masalah

Petugas belum memiliki menu menuju daftar MCU expired/warning. Halaman yang
menampilkan daftar tersebut juga menolak semua role selain Administrator dan
selalu memuat pengaturan masa berlaku yang hanya boleh diubah Administrator.

Tombol `Edit MCU` sebenarnya masih ada pada detail MCU di Kelola Karyawan,
tetapi saat workflow aktif tombol hanya muncul untuk status
`correction_required`. Akibatnya MCU yang masih `pending_review` tidak dapat
diperbaiki Petugas sebelum Dokter mulai review.

## Tujuan

- Menu Petugas yang ada tetap tidak berubah.
- Petugas mendapat satu menu tambahan: `MCU Expired`.
- Petugas dapat melihat daftar MCU expired/warning.
- Pengaturan masa berlaku MCU tetap khusus Administrator.
- Petugas dapat mengedit MCU berstatus `pending_review` atau
  `correction_required`.
- MCU yang sedang direview atau sudah final tetap tidak dapat diedit.
- Tidak mengubah atau menghapus data MCU lama.

## Menu dan Role

Definisi menu role tetap memakai `sidebar-manager.js` sebagai sumber tunggal.
Menu `MCU Expired` ditambahkan ke daftar Petugas tanpa mengubah menu lain.
Administrator tetap memakai menu `Pengaturan MCU` yang menuju halaman sama.

Halaman `mcu-expiry-management.html` menerima role `Admin` dan `Petugas`:

- `Admin`: melihat daftar serta mengubah ambang masa berlaku MCU;
- `Petugas`: melihat daftar saja;
- role lain: tetap ditolak dan diarahkan ke dashboard.

Endpoint `settings`, `expiry-preview`, dan `update-expiry-setting` tetap hanya
untuk Administrator. Petugas tidak memanggil endpoint tersebut. Bagian
pengaturan disembunyikan dari Petugas, sedangkan daftar, pencarian, filter,
sorting, dan pagination tetap tersedia.

## Akses Edit MCU

Fitur memakai modal Edit MCU yang sudah ada pada halaman Kelola Karyawan.
Tidak dibuat halaman atau form baru.

Saat workflow aktif, tombol dan proses simpan hanya tersedia untuk Petugas dan
Administrator bila status MCU:

- `pending_review`; atau
- `correction_required`.

Status berikut tidak dapat diedit:

- `in_review`, karena sedang diklaim Dokter;
- `followup_required`, karena perubahan mengikuti alur Follow-Up;
- `completed` dan `approved_legacy`, karena hasil sudah final;
- status lain di luar daftar yang diizinkan.

MCU expired yang sudah final tidak diedit. Petugas membuat MCU baru agar
riwayat pemeriksaan lama tetap utuh.

## Alur Simpan

Sebelum form dibuka dan sebelum disimpan, aplikasi membaca ulang detail
workflow. Perubahan ditolak bila status sudah berubah menjadi `in_review` atau
status final.

- Dari `pending_review`: data diperbarui dan status tetap `pending_review`;
  tidak menjalankan transisi submit ulang.
- Dari `correction_required`: data diperbarui lalu memakai transisi submit
  koreksi yang sudah ada untuk kembali ke `pending_review`.

Hasil medis Dokter tidak menjadi field edit Petugas saat workflow aktif.
Riwayat perubahan data tetap dicatat memakai mekanisme yang sekarang.

## Error

- Status berubah saat form terbuka: tampilkan SweetAlert bahwa MCU sedang
  direview atau sudah final, lalu muat ulang detail.
- Data expiry gagal dimuat: tampilkan state error dan tombol coba lagi.
- Petugas mencoba URL/endpoint konfigurasi secara langsung: server tetap
  mengembalikan `WORKFLOW_FORBIDDEN`.
- Simpan gagal: form tetap terbuka dan data input tidak dibuang.

## Pengujian

- Sidebar Petugas memuat seluruh menu lama plus `MCU Expired`.
- Sidebar Administrator tetap memuat `Pengaturan MCU`.
- Petugas dapat membuka dan memuat daftar expired/warning.
- Bagian konfigurasi tidak tampil dan endpoint konfigurasi tidak dipanggil
  untuk Petugas.
- Administrator tetap dapat melihat preview dan menyimpan ambang masa berlaku.
- Tombol Edit muncul untuk `pending_review` dan `correction_required`.
- Tombol Edit tidak muncul untuk `in_review`, `followup_required`, `completed`,
  dan `approved_legacy`.
- Simpan `pending_review` tidak memanggil submit koreksi.
- Simpan `correction_required` mengirim ulang MCU ke antrean Dokter.
- Perubahan status di tengah proses menghentikan simpan dengan pesan khusus.
- Seluruh test suite dan build produksi lulus sebelum push.

## Kriteria Selesai

- Petugas dapat mengakses daftar MCU expired/warning dari sidebar.
- Petugas tidak mendapat hak mengubah konfigurasi masa berlaku.
- Edit MCU kembali tersedia pada dua status yang disepakati.
- MCU yang sedang direview, final, atau expired lama tetap terlindungi.
