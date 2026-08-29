# Desain Perbaikan Identitas Upload MCU

## Latar Belakang

Upload MCU produksi berhasil melewati `prepare-file-upload`, tetapi gagal pada
`confirm-file-upload` dengan `UPLOAD_VALIDATION_FAILED`. Employee ID pada form
dan database valid. Kegagalan terjadi karena proses konfirmasi mengambil
Employee ID dan MCU ID dari custom metadata objek sementara R2, sementara
metadata tersebut tidak tersimpan pada PUT browser.

## Tujuan

- Menghilangkan ketergantungan konfirmasi upload pada custom metadata R2.
- Mempertahankan direct upload browser ke R2.
- Mendukung PDF, PNG, JPG, dan JPEG dengan batas ukuran yang berlaku.
- Tidak menambah tabel database atau Serverless Function Vercel.
- Tidak mengubah atau menghapus file MCU yang sudah tersimpan.

## Pendekatan Terpilih

Server menyimpan konteks upload pada object key sementara yang dibuat setelah
autentikasi dan validasi:

```text
pending/mcu-uploads/{userId}/{employeeId}/{mcuId}/{uuid}.{extension}
```

Object key final tetap:

```text
mcu_files/{employeeId}/{mcuId}/{uuid}.{extension}
```

Employee ID dan MCU ID bukan input bebas pada tahap konfirmasi. Server
mengekstraknya dari object key yang sebelumnya dibuat dan ditandatangani oleh
server.

## Alur Data

1. Frontend memanggil `prepare-file-upload` dengan Employee ID, MCU ID, nama,
   dan ukuran file.
2. API memvalidasi sesi, format setiap ID, keberadaan karyawan, ekstensi, dan
   ukuran file.
3. API membuat object key sementara berisi user, Employee ID, dan MCU ID lalu
   mengembalikan signed PUT URL.
4. Browser mengunggah file langsung ke R2 menggunakan `Content-Type` yang
   diwajibkan signed URL.
5. Frontend memanggil `confirm-file-upload` dengan object key dan nama file.
6. API memvalidasi bentuk object key, kecocokan user, Employee ID, MCU ID,
   ekstensi, ukuran, dan tipe objek R2.
7. API menyalin objek ke key final, menulis metadata final dari konteks yang
   sudah divalidasi, menyimpan metadata file ke database, lalu menghapus objek
   sementara.

## Endpoint

Endpoint kanonis menjadi:

```text
POST /api/mcu-file-upload
```

Endpoint lama tetap kompatibel melalui rewrite Vercel:

```text
/api/compress-upload -> /api/mcu-file-upload
```

Folder fungsi lama dipindahkan, bukan digandakan. Jumlah Serverless Function
tidak bertambah.

## Validasi dan Keamanan

- Object key harus memiliki jumlah segmen dan prefix yang tepat.
- `userId` pada object key harus sama dengan user JWT yang melakukan konfirmasi.
- Employee ID dan MCU ID harus lolos aturan safe segment.
- Employee ID diperiksa kembali terhadap database saat konfirmasi.
- Ekstensi object key harus sama dengan ekstensi nama file.
- Konfirmasi tidak membaca `head.Metadata.employeeid` atau
  `head.Metadata.mcuid`.
- Metadata final hanya ditulis server saat proses copy.
- Object key milik user lain ditolak dengan `UPLOAD_FORBIDDEN`.

## Penanganan Error

- Key rusak atau tidak lengkap: `UPLOAD_KEY_INVALID`.
- User tidak cocok: `UPLOAD_FORBIDDEN`.
- Karyawan hilang setelah prepare: `UPLOAD_EMPLOYEE_NOT_FOUND`.
- File tidak ditemukan atau PUT gagal: error upload R2 yang spesifik.
- Penyimpanan metadata DB gagal: objek final dan sementara dibersihkan seperti
  perilaku saat ini.
- UI tetap menggunakan presenter upload terpusat dan menampilkan pesan yang
  dapat ditindaklanjuti.

## Kompatibilitas

- Client baru memakai `/api/mcu-file-upload`.
- Client lama yang masih memanggil `/api/compress-upload` masuk ke fungsi yang
  sama melalui rewrite.
- Konfirmasi object key format lama ditolak dengan pesan sesi upload kedaluwarsa
  dan pengguna diminta memilih file kembali. Objek pending lama tetap ditangani
  lifecycle R2; data MCU final tidak terpengaruh.

## Pengujian

- Prepare menerima Employee ID produksi
  `EMP-20251128-miix34l2-JE5CH`.
- Prepare menghasilkan key dengan user, Employee ID, dan MCU ID yang tepat.
- Confirm berhasil ketika custom metadata R2 kosong.
- Confirm menolak key malformed, traversal, user berbeda, dan ID tidak aman.
- Confirm menolak Employee ID yang tidak ada.
- PDF, PNG, JPG, dan JPEG diuji pada batas ukuran masing-masing.
- Rollback dan pembersihan saat metadata DB gagal tetap lulus.
- Kontrak frontend memastikan endpoint kanonis dan action prepare/confirm.
- Seluruh test suite dan build produksi harus lulus sebelum push.

## Kriteria Selesai

- Upload satu file MCU produksi mencapai `confirm-file-upload` dan berhasil.
- Metadata database menyimpan Employee ID dan MCU ID yang benar.
- File berada pada key final yang benar dan objek pending terhapus.
- Tidak muncul lagi `Employee ID tidak valid` akibat metadata R2 kosong.
- Deployment tidak melebihi batas Serverless Function Vercel Hobby.
