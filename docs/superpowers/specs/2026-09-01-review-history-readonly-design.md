# Desain Riwayat Review Read-Only

## Masalah

Daftar riwayat review hanya memuat ID MCU dan ID Dokter. Saat item dibuka,
detail memakai konteks MCU aktif sehingga kontrol claim dan keputusan dapat
muncul kembali. Hasil siklus yang dipilih juga belum dipetakan ke form view.

## Tujuan

- Riwayat review tidak dapat mengubah keputusan yang sudah final.
- Nama karyawan tampil pada setiap baris riwayat.
- View menampilkan nilai review dari siklus yang dipilih.
- WhatsApp tetap dapat digunakan tanpa mengubah hasil medis.
- Tidak menambah migrasi atau mengubah data review lama.

## Data Riwayat

`getReviewHistory()` tetap membaca `mcu_review_cycles` sebagai sumber keputusan.
Server mengambil MCU terkait dalam satu query batch, lalu memakai enrichment
karyawan yang sudah ada. Setiap row mengandung:

- data siklus review;
- ringkasan MCU;
- data karyawan, termasuk nama, Employee ID, dan departemen.

Tidak ada query tambahan per row.

## Daftar

Setiap row menampilkan:

1. nama karyawan sebagai informasi utama;
2. Employee ID dan MCU ID sebagai informasi sekunder;
3. hasil, tahap, nomor siklus, keputusan, waktu, dan Dokter;
4. tombol `Lihat` yang membawa `mcuId` dan `reviewCycleId`.

## View Read-Only

Detail menyimpan mode pembukaan dan `reviewCycleId`. Dalam mode riwayat:

- siklus dipilih dari `mcu_review_cycles` yang dikembalikan API;
- hasil medis dan catatan klinis/alasan pengembalian diisi dari siklus tersebut;
- select hasil disabled;
- textarea catatan dan alasan read-only;
- tombol claim, lepas claim, setujui, dan kembalikan disabled;
- timer claim dihentikan;
- pesan menjelaskan bahwa keputusan final hanya dapat dilihat;
- tombol `Bagikan ke WhatsApp` aktif hanya untuk siklus approved.

Mode antrean Pending dan Follow-Up tetap memakai perilaku claim serta keputusan
yang sekarang.

## Siklus Berulang

- Hasil terminal membagikan siklus approved yang dipilih.
- Bila siklus terpilih berhasil approved sebagai `Follow-Up` atau
  `Temporary Unfit`, view tetap menyorot siklus pilihan dan menampilkan seluruh
  rangkaian pada Riwayat Review.
- Share menggunakan siklus approved terbaru dalam rangkaian MCU tersebut.
- Surat diunduh bila hasil yang benar-benar dibagikan masih `Follow-Up` atau
  `Temporary Unfit`.
- Jika target share bukan `current_share_cycle_id`, status share MCU saat ini
  tidak ditimpa.

Siklus rejected tidak memiliki tombol WhatsApp.

## Keamanan Data

`mcu_review_cycles` tetap append-only sesuai migrasi yang sudah ada. Perubahan
ini menambah pembatasan UI dan pemetaan data; tidak menambah operasi update
keputusan, tidak menghapus data, dan tidak membutuhkan perubahan skema.

## Error

- `reviewCycleId` tidak ditemukan pada MCU: tampilkan error data tidak ditemukan.
- Karyawan tidak ditemukan saat enrichment: fallback ke Employee ID.
- Share gagal: gunakan presenter WhatsApp yang sudah ada.
- Detail API gagal: pertahankan tombol retry.

## Pengujian

- Riwayat diperkaya dengan nama karyawan memakai query batch.
- Row menampilkan nama, Employee ID, dan MCU ID.
- Tombol row membawa `reviewCycleId`.
- Mode riwayat mengisi hasil/catatan dari siklus terpilih dan menonaktifkan semua
  kontrol perubahan.
- Siklus rejected tidak dapat dibagikan.
- Siklus terminal membagikan pilihan.
- Follow-Up/Temporary Unfit membagikan siklus approved terbaru.
- Seluruh test suite dan build produksi harus lulus sebelum push.

## Kriteria Selesai

- Riwayat approved tidak dapat diklaim atau diputuskan ulang.
- Hasil tersimpan terlihat tanpa menjadi editable.
- Nama karyawan tampil pada daftar.
- WhatsApp membagikan siklus yang benar.
