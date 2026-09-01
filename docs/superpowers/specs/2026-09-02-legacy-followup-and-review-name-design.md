# Desain Kompatibilitas Follow-Up Legacy dan Nama Riwayat Review

## Tujuan

1. Menyamakan angka Follow-Up dan Temporary Unfit pada Dashboard dengan daftar yang dapat diproses Petugas.
2. Memasukkan data legacy yang masih membutuhkan tindak lanjut ke workflow review baru tanpa membuat riwayat Dokter palsu.
3. Menampilkan nama karyawan pada daftar Riwayat Validasi MCU, dengan Employee ID dan MCU ID sebagai informasi pendamping.

## Ruang Lingkup

Perubahan mencakup antrean Follow-Up Petugas, pengiriman bukti follow-up legacy, badge/count antrean, dan daftar Riwayat Validasi Dokter. Perubahan tidak mengubah hasil MCU lama, tidak menghapus data, tidak membuat review cycle retroaktif, dan tidak mencakup perhitungan MCU Expired atau jenis pemeriksaan Surat Sehat.

## Sumber Masalah

Dashboard menghitung MCU aktif dari view analitik, termasuk status `approved_legacy`. Halaman Follow-Up hanya membaca antrean dengan status `followup_required`. Akibatnya MCU legacy dengan hasil `Follow-Up` atau `Temporary Unfit` dihitung Dashboard tetapi tidak tampil untuk Petugas.

Daftar Riwayat Validasi membaca baris `mcu_review_cycles` secara langsung. Baris siklus hanya membawa MCU ID, sehingga UI menggunakan kode tersebut sebagai judul dan tidak memiliki nama karyawan.

## Desain Antrean Follow-Up

Server mengembalikan dua kelompok MCU yang dapat ditindaklanjuti:

- MCU workflow baru dengan status `followup_required`.
- MCU legacy dengan status `approved_legacy` dan hasil medis aktif `Follow-Up` atau `Temporary Unfit`.

Kedua kelompok digabungkan dan dideduplikasi berdasarkan MCU ID sebelum diperkaya dengan data karyawan. Data legacy tetap mempertahankan status dan hasil lamanya sampai Petugas benar-benar mengirim bukti baru.

Badge/count Petugas memakai aturan yang sama dengan daftar agar jumlah pada navigasi tidak berbeda dari data yang dapat dibuka.

## Pengiriman Bukti Legacy

Petugas dapat mengunggah bukti dan catatan follow-up untuk MCU legacy. Operasi server memvalidasi bahwa:

- MCU berstatus `approved_legacy`.
- Hasil medis aktif adalah `Follow-Up` atau `Temporary Unfit`.
- Bukti yang diwajibkan tersedia.
- Versi record masih sesuai untuk mencegah perubahan bersamaan.

Setelah berhasil, status MCU menjadi `pending_review` dan masuk antrean Dokter. Submission legacy boleh tidak memiliki `prior_review_cycle_id`, karena memang belum pernah memiliki siklus review workflow. Kondisi ini hanya diperbolehkan untuk transisi legacy tersebut; submission workflow normal tetap wajib menunjuk siklus sebelumnya.

Sistem tidak membuat Dokter, keputusan, surat rujukan, atau review cycle palsu. Tombol surat rujukan lama tidak ditampilkan pada item legacy yang belum mempunyai siklus review. Setelah Dokter menyelesaikan review pertama, proses berikutnya memakai siklus workflow normal.

## Nama pada Riwayat Validasi

Server memperkaya daftar review secara batch:

1. Ambil maksimal 200 review cycle seperti perilaku saat ini.
2. Ambil MCU terkait menggunakan kumpulan MCU ID unik.
3. Ambil karyawan terkait menggunakan kumpulan Employee ID unik.
4. Gabungkan hasil di memori tanpa query per baris.

Tampilan setiap baris menggunakan:

- Nama karyawan sebagai judul utama.
- Employee ID dan MCU ID sebagai teks pendamping.
- MCU ID sebagai fallback bila data karyawan tidak tersedia.

## Penanganan Kesalahan

- Kegagalan mengambil salah satu sumber data menampilkan UI error workflow yang sudah tersedia dan menyediakan aksi muat ulang.
- Konflik versi menolak submission dan meminta Petugas memuat data terbaru.
- MCU legacy dengan hasil selain Follow-Up atau Temporary Unfit ditolak server meskipun request dibuat manual.
- Ketiadaan review cycle pada data legacy bukan error selama transisi legacy yang tervalidasi.

## Pengujian

Pengujian kontrak dan perilaku mencakup:

- `approved_legacy` + `Follow-Up` tampil dan dapat dikirim ke Dokter.
- `approved_legacy` + `Temporary Unfit` tampil dan dapat dikirim ke Dokter.
- `approved_legacy` dengan hasil terminal tidak masuk antrean.
- Workflow normal tetap mewajibkan `prior_review_cycle_id`.
- Submission legacy menghasilkan status `pending_review` tanpa review cycle palsu.
- Badge/count dan daftar memakai cakupan status yang sama.
- Riwayat review menampilkan nama, Employee ID, dan MCU ID.
- Riwayat review tetap dapat dirender ketika karyawan tidak ditemukan.
- Seluruh test workflow dan build frontend tetap lulus.

## Batasan

Riwayat maksimum tetap 200 item sesuai batas saat ini. Pagination riwayat, perubahan perhitungan expiry, dan formulir Surat Sehat tidak ditambahkan dalam pekerjaan ini.
