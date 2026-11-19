# Template UI Sehatra untuk seluruh halaman aplikasi

Tanggal: 2026-11-20. Status: disetujui pengguna (rancangan singkat).

## Tujuan dan alasan

Pengguna menilai tampilan aplikasi sekarang sulit dipakai, ribet, kadang berat, dan strukturnya menumpuk karena fitur terus bertambah. Mereka ingin UI dibangun ulang. Langkah pertama adalah template UI untuk setiap halaman aplikasi, memakai gaya desain "Sehatra" yang mereka buat sendiri (artifact `claude.ai/artifact/5t5AGNEBYtKeaWnCDgh3Ss`). Alur kerja dan fitur aplikasi tidak berubah.

Template ini menjadi acuan visual untuk rebuild berikutnya (Vite + Svelte 5, backend Supabase dan `/api` R2 tetap).

## Sasaran

- Satu template per halaman aplikasi sekarang, konsisten dengan gaya Sehatra.
- Tema terang dan gelap berfungsi penuh di semua halaman.
- Responsif sampai lebar ponsel, tanpa overflow horizontal.
- Setiap tampilan data punya kondisi kosong, memuat, dan galat.
- Bisa dipakai dengan keyboard, dengan indikator fokus terlihat, kontras minimal WCAG AA.

## Bukan sasaran

- Tidak menyambung ke backend atau database. Semua data adalah contoh berlabel.
- Tidak mengubah rumus atau logika bisnis (Framingham, Skor Jakarta, validasi, kebijakan file).
- Tidak membangun aplikasi Svelte pada tahap ini.
- Tidak mengganti istilah status MCU milik aplikasi.

## Gagal jika

- Template terlihat generik atau menyalin template admin populer.
- Ada angka, nama, atau klaim yang tampak seperti data asli tapi karangan.
- Ada kontrol interaktif yang tidak berfungsi tanpa label.

## Batasan

- Sumber gaya: file artifact pengguna (token warna, Plus Jakarta Sans, komponen: menu samping dengan widget cakupan, topbar lengket, kartu KPI, pill status, drawer, modal, tabel, grafik SVG).
- Nama produk: Sehatra (menggantikan "MADIS" di judul halaman).
- Istilah hasil MCU mengikuti aplikasi: Fit, Fit With Note, Temporary Unfit, Follow-Up, Unfit.
- Logo belum ada: pakai penanda `[LOGO]` atau tanda merek dari artifact sampai logo asli diberikan.
- Catatan di desain asli: poin usia >=65 pada Skor Jakarta adalah asumsi. Template hanya memakai tabel itu sebagai tata letak, dan memberi catatan agar diverifikasi sebelum pemakaian klinis.

## Pendekatan

Dipertimbangkan:
1. Satu folder HTML statis dengan CSS dan JS bersama, satu file per halaman. Cepat ditinjau, tanpa build.
2. Langsung membangun aplikasi Svelte. Lebih lambat ditinjau dan mengikat desain ke kode sebelum disetujui.
3. Satu file HTML tunggal berisi semua halaman seperti artifact. Sulit dirawat dan tidak mencerminkan struktur halaman.

Dipilih: nomor 1. Alasannya, desain ditinjau dulu per halaman tanpa alat build, lalu dipindah ke komponen Svelte.

## Rancangan

Lokasi: `design/sehatra/`

- `sehatra.css`: token (warna, jari-jari, bayangan, tema terang dan gelap), tata letak shell, dan komponen bersama.
- `sehatra.js`: pengalih tema (tersimpan di `localStorage` dengan `try/catch`), buka-tutup menu samping di ponsel, drawer dan modal (Esc menutup, fokus kembali), tab dan segmen.
- `index.html` sebagai daftar isi semua template.
- Satu HTML per halaman.

Menu (dikelompokkan):
- Utama: Dashboard
- Data: Kelola Karyawan, Tambah Karyawan, Follow-up, Masa Berlaku MCU, Riwayat Kesehatan
- Analisis: Analisis, Laporan Periode, Assessment Rahma (Skor Jakarta)
- Pengaturan (Admin saja): Data Master, Kelola User, Log Aktivitas, Data Terhapus

Halaman:
| Template | Sumber |
|---|---|
| login | halaman baru, gaya Sehatra |
| dashboard | artifact (dashboard) |
| kelola-karyawan (daftar, detail MCU, edit MCU) | artifact (karyawan, data MCU, drawer) diperluas |
| tambah-karyawan (data karyawan + form MCU panjang) | artifact (tambah karyawan, input hasil) diperluas: penglihatan 8 kolom, lab, riwayat, dokumen |
| follow-up | halaman asli, gaya Sehatra |
| masa-berlaku-mcu | halaman asli |
| riwayat-kesehatan | halaman asli |
| analisis | artifact (laporan) |
| laporan-periode | artifact (laporan) |
| assessment-rahma | artifact (skor Jakarta) |
| data-master | halaman asli |
| kelola-user | halaman asli |
| log-aktivitas | halaman asli |
| data-terhapus | halaman asli |

Nama file halaman memakai kunci halaman aplikasi di `roleAccess.mjs` (mis. `analysis.html`, `report-period.html`, `mcu-expiry-management.html`, `employee-health-history.html`, `activity-log.html`), supaya pemetaan ke rute Svelte nanti langsung. Label menu tetap berbahasa Indonesia. Pilihan ini dibuat saat menyusun rencana.

Untuk halaman "halaman asli", isi kolom, filter, dan aksi diambil dengan membaca halaman aplikasi sekarang, supaya alurnya sama.

## Urutan kerja

1. `sehatra.css` dan `sehatra.js` dari file artifact.
2. Login, Dashboard, Kelola Karyawan. Tinjau bersama pengguna.
3. Sisa halaman, per kelompok menu.
4. `index.html` dan pemeriksaan akhir (klik semua kontrol, kedua tema, lebar ponsel).

## Diserahkan ke pembangun

Tata letak detail halaman yang tidak ada di artifact, isi data contoh, dan nama penanda. Setiap pilihan yang diambil sendiri dicatat singkat di bagian atas file HTML terkait.
