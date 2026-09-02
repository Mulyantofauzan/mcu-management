# Kolom Identitas Karyawan pada Assessment

## Tujuan

Melengkapi tabel Jakarta Cardiovascular Score agar pengguna dapat mengenali posisi kerja setiap karyawan tanpa membuka halaman lain.

## Desain

- Urutan kolom awal menjadi `No`, `Nama`, `Jabatan`, `Departemen`, lalu kolom penilaian yang sudah ada.
- Empat kolom identitas tetap terlihat saat tabel digeser horizontal.
- Nilai Jabatan dan Departemen memakai data employee yang sudah dimuat oleh halaman. Nilai kosong ditampilkan sebagai `-`.
- Pencarian dan filter yang sudah ada tidak berubah.
- Export Excel memakai urutan kolom yang sama dengan tabel.
- Jumlah kolom pada empty state, merge header, pewarnaan, lebar kolom, dan freeze pane disesuaikan.

## Data dan Keamanan

Tidak ada perubahan database, API, role, atau perhitungan risiko. Perubahan hanya pada presentasi tabel dan export Excel.

## Verifikasi

- Test kontrak memastikan header serta data Jabatan/Departemen muncul pada tabel.
- Test kontrak memastikan struktur Excel memuat dua kolom baru.
- Seluruh test dan build proyek harus lulus.
