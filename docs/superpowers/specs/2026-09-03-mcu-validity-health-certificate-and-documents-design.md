# Masa Berlaku MCU, Surat Sehat, dan Dokumen Workflow

## Tujuan

Membetulkan pemilihan MCU aktif dan tanggal kedaluwarsa, menambahkan Surat Sehat sebagai dokumen kesehatan terbatas, memulihkan surat rujukan yang belum terbentuk, serta membuat penghapusan lampiran MCU konsisten dengan status workflow.

## Aturan Masa Berlaku

- Tipe `Pre-Employee`, `Annual`, `Khusus`, dan `Final` diperlakukan sebagai MCU penuh dengan masa berlaku 12 bulan kalender.
- Tipe `Surat Sehat` berlaku 3 bulan kalender.
- Tanggal kedaluwarsa selalu dihitung dari `mcu_date`, bukan `activated_at`, `created_at`, atau tanggal migrasi data.
- Record aktif dipilih berdasarkan `mcu_date` terbaru. Jika tanggal sama, gunakan `updated_at` lalu `mcu_id` sebagai urutan stabil.
- Bila karyawan memiliki MCU penuh yang tidak terhapus, Surat Sehat tidak boleh menjadi record aktif walaupun tanggalnya lebih baru.
- Daftar expired/warning, KPI dashboard, dan data analitik memakai aturan yang sama.
- Pengaturan masa berlaku global lama tidak lagi digunakan karena durasi kini tetap berdasarkan jenis dokumen. Halaman Administrator dan Petugas hanya menampilkan daftar expired/warning.

## Aturan Surat Sehat

- `Surat Sehat` ditambahkan sebagai pilihan jenis pemeriksaan pada form tambah dan edit MCU.
- Karyawan tanpa riwayat MCU penuh boleh memakai dan memperpanjang Surat Sehat.
- Karyawan yang pernah memiliki MCU penuh aktif/tidak terhapus tidak boleh menambah atau mengubah record menjadi Surat Sehat.
- Perubahan dari Surat Sehat ke MCU penuh diperbolehkan.
- Larangan divalidasi di database agar tidak dapat dilewati lewat API atau browser lama. UI melakukan pemeriksaan awal untuk memberi pesan yang cepat dan jelas.
- Form Surat Sehat hanya menampilkan metadata, dokter pemeriksa/sumber data, informasi rujukan/catatan yang relevan, dokumen, dan bagian hasil yang berlaku pada mode workflow.
- Pemeriksaan fisik, kebiasaan, penglihatan, laboratorium, penunjang, dan riwayat kesehatan disembunyikan serta tidak diwajibkan untuk Surat Sehat. Nilainya disimpan `NULL`; tidak dibuat data pemeriksaan palsu.
- Dokter tetap menjadi pemilik keputusan medis saat approval workflow aktif.

## Surat Rujukan

- Tombol Rujukan tetap menggunakan review cycle yang sudah disetujui.
- Saat dokumen referral belum ada, server membuat ulang dokumen untuk cycle tersebut lalu mengembalikan URL download.
- Satu aksi pengguna cukup untuk regenerate dan download; tidak perlu menutup modal atau menekan dua tombol.
- `Petugas` mendapat hak regenerate referral, tetapi tidak mendapat hak mengubah hasil review Dokter.
- Regenerasi tetap idempotent: satu review cycle hanya memiliki satu dokumen referral aktif.
- Kegagalan profil/tanda tangan dokter atau storage ditampilkan sebagai error dokumen yang spesifik, bukan `Data workflow tidak ditemukan`.

## Penghapusan Lampiran MCU

- File lokal yang belum diunggah cukup dihapus dari antrian browser.
- File yang sudah tersimpan hanya dapat dihapus oleh `Admin` atau `Petugas` ketika MCU berstatus `draft`, `pending_review`, atau `correction_required`.
- MCU `completed`, `followup_required`, `approved_legacy`, atau record final lain tetap terkunci.
- Server mengambil file berdasarkan `fileId`, memverifikasi MCU dan status workflow, lalu menghapus objek R2 terlebih dahulu.
- Metadata `mcufiles` dihapus hanya setelah penghapusan R2 berhasil. Jika R2 gagal, metadata dipertahankan agar file tidak menjadi orphan tanpa jejak.
- UI menghapus baris file hanya setelah server mengonfirmasi sukses.
- MCU wajib memiliki minimal satu lampiran sebelum dikirim ke Dokter.

## Perubahan Teknis

- Tambah migration untuk tipe `Surat Sehat`, validasi riwayat, serta view current/eligible/expiry berbasis `mcu_date` dan durasi 12/3 bulan.
- Gunakan helper frontend bersama untuk mengganti mode form MCU penuh dan Surat Sehat tanpa menduplikasi logika.
- Ubah `download-referral` agar memastikan dokumen tersedia sebelum membuat signed URL.
- Perluas otorisasi `regenerate-referral` kepada Petugas.
- Ubah `/api/delete-file` menjadi penghapusan terotorisasi dan state-aware untuk R2 serta database.
- Tidak ada perubahan ID karyawan, ID MCU, struktur review cycle, atau format file upload.

## Error Handling

- Pelanggaran riwayat Surat Sehat menghasilkan pesan: `Karyawan dengan riwayat MCU tidak dapat diperpanjang memakai Surat Sehat.`
- Record atau file tidak ditemukan menghasilkan 404 aman tanpa detail database.
- Status MCU terkunci menghasilkan 409/403 dengan pesan bahwa dokumen review final tidak dapat diubah.
- Gagal menghapus R2 menghentikan penghapusan metadata dan menawarkan retry.
- Gagal membuat referral tidak mengubah keputusan Dokter yang sudah tersimpan.

## Verifikasi

- Migration contract memeriksa durasi 12/3 bulan, urutan `mcu_date`, dan larangan Surat Sehat setelah MCU penuh.
- Test expiry mencakup record lama yang memiliki `activated_at` lebih baru tetapi `mcu_date` lebih tua.
- Frontend contract memeriksa opsi Surat Sehat, mode form ringkas, serta penghapusan atribut `required` pada bagian tersembunyi.
- API test memeriksa role dan status penghapusan file, urutan R2 sebelum metadata, serta kegagalan storage.
- Workflow test memeriksa auto-regenerate referral dan akses Petugas.
- Seluruh `npm test`, build, dan pemeriksaan sintaks harus lulus.

## Deployment

- Kode dan migration dipush bersama.
- Migration dijalankan manual oleh pemilik proyek di Supabase sebelum verifikasi produksi.
- Setelah migration berhasil, lakukan hard refresh agar service worker memuat versi baru.
