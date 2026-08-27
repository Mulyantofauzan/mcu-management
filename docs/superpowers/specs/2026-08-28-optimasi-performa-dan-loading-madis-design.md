# Desain Optimasi Performa dan Loading MADIS

## Latar Belakang

MADIS saat ini menggunakan arsitektur multi-page. Setiap menu membuka dokumen HTML
baru, memuat modul halaman, memeriksa autentikasi, lalu mengambil data yang
dibutuhkan halaman tersebut. Arsitektur ini tetap layak dipertahankan, tetapi pola
inisialisasi antarhalaman belum seragam.

Beberapa halaman menunggu seluruh data utama dan data sekunder selesai sebelum
menandai halaman sebagai siap. Pada koneksi yang lambat, pengguna dapat melihat
layar kosong tanpa penjelasan. Halaman Kelola Karyawan, misalnya, menunggu
Supabase, bootstrap workflow, data penyakit, jabatan, departemen, dokter, data
karyawan, dan antrean koreksi sebelum menyelesaikan fase inisialisasi.

Audit produksi menggunakan Chrome DevTools menghasilkan baseline berikut:

- Dashboard: TTFB 152 ms, LCP 513 ms, dan CLS 0,02.
- Kelola Karyawan: TTFB 110 ms, LCP 993 ms, INP 49 ms, CLS 0,00, dan load event
  sekitar 1,6 detik pada koneksi tanpa throttling.
- Critical path Kelola Karyawan mencapai sekitar 1,8 detik.
- Dashboard menghasilkan 834 request, termasuk 791 request `fetch`. Mayoritas
  berasal dari pengambilan hasil laboratorium satu request untuk setiap MCU.
- Kunjungan login pertama dapat melakukan dua navigasi akibat aktivasi service
  worker dan sinkronisasi versi aplikasi.

Nilai Core Web Vitals visual sudah baik. Masalah utama adalah layar tanpa status,
pekerjaan data yang menghalangi kesiapan halaman, query berulang, dan pola loading
yang tidak konsisten.

## Tujuan

Membuat seluruh MADIS terasa cepat, stabil, dan dapat dipahami saat jaringan atau
backend lambat tanpa mengubah aplikasi menjadi SPA.

Keberhasilan desain ini berarti:

- tidak ada layar putih selama perpindahan menu atau inisialisasi halaman;
- sidebar, header, breadcrumb, judul, dan struktur halaman langsung terlihat;
- area data menggunakan skeleton atau status loading yang sesuai;
- fungsi utama halaman tersedia tanpa menunggu data sekunder;
- kegagalan satu komponen tidak membuat seluruh halaman gagal;
- jumlah dan isi data tetap sama sebelum dan sesudah optimasi;
- navigasi native, URL langsung, back/forward, autentikasi, dan pembagian role
  tetap berfungsi;
- tidak ada perubahan atau penghapusan data produksi sebagai bagian dari
  optimasi presentasi dan pengambilan data ini.

## Bukan Tujuan

- Mengubah MADIS menjadi SPA penuh.
- Mengganti framework frontend atau menambah framework baru.
- Mengubah schema database, RLS, kontrak autentikasi, atau workflow MCU.
- Mengubah aturan klinis, hasil analisis, atau perhitungan medis.
- Menyimpan data medis sensitif pada cache publik.
- Mempertahankan form yang belum disimpan setelah pengguna meninggalkan halaman.

## Pendekatan yang Dipilih

MADIS tetap menggunakan arsitektur multi-page dengan progressive enhancement.
Satu pengelola lifecycle bersama akan menyeragamkan fase loading, error, dan
kesiapan halaman. Navigasi tetap memakai tautan HTML asli agar kompatibel dengan
direct URL, history browser, Safari, dan fallback ketika JavaScript bermasalah.

Pendekatan hybrid yang mengganti isi halaman menggunakan `fetch` tidak dipilih
karena setiap halaman MADIS masih memiliki lifecycle, event listener, dan state
globalnya sendiri. Memasukkan beberapa halaman ke satu dokumen akan meningkatkan
risiko listener ganda dan state lama yang tertinggal. SPA penuh juga tidak dipilih
karena membutuhkan penulisan dan pengujian ulang hampir seluruh aplikasi.

## Arsitektur Lifecycle Halaman

Modul bersama `pageLifecycleManager` menjadi kontrak presentasi untuk halaman
MADIS. Modul ini tidak mengambil data medis dan tidak mengetahui logika bisnis.
Tanggung jawabnya hanya:

- mengaktifkan status awal halaman;
- mengatur skeleton per area;
- menandai area berhasil, kosong, atau gagal;
- menampilkan status koneksi lambat dan timeout;
- menjalankan pekerjaan sekunder tanpa menghalangi tampilan utama;
- menghapus indikator navigasi setelah shell halaman tujuan terlihat;
- menyediakan kode referensi error yang aman dan tidak mengandung data medis.

Lifecycle setiap halaman dibagi menjadi empat fase:

1. **Shell**: HTML statis, sidebar, header, breadcrumb, judul, filter dasar, dan
   container konten langsung dirender oleh browser.
2. **Data utama**: data minimum agar fungsi pokok halaman dapat digunakan dimuat
   secara paralel.
3. **Interaktif**: skeleton utama diganti data dan kontrol utama diaktifkan.
4. **Data sekunder**: badge, dropdown modal, antrean tambahan, statistik lanjutan,
   dan modul berat dimuat di belakang layar.

Halaman tidak boleh menunggu fase keempat untuk menandai dirinya interaktif.
Class `initialized` hanya menandai shell siap dan tidak boleh digunakan untuk
menyembunyikan seluruh `body`.

## Kontrak Loading Bersama

Setiap area data harus memiliki empat tampilan eksplisit:

- `loading`: skeleton dengan ukuran yang mendekati konten akhir;
- `ready`: data berhasil ditampilkan;
- `empty`: request berhasil tetapi tidak ada data;
- `error`: request gagal dengan penjelasan singkat dan tombol `Coba Lagi`.

Aturan waktu:

- shell ditargetkan terlihat maksimal 300 ms setelah klik navigasi;
- skeleton langsung tersedia dari HTML sehingga tidak menunggu modul JavaScript;
- setelah 3 detik, tampilkan teks bahwa koneksi atau server masih diproses;
- setelah 15 detik untuk pembacaan data biasa, tampilkan timeout dan tindakan
  `Coba Lagi`;
- upload, kompresi, dan pembuatan dokumen menggunakan timeout khusus yang sudah
  ditentukan oleh fitur masing-masing dan tidak mengikuti batas 15 detik.

Indikator operasi seperti simpan, hapus, upload, dan kompres tetap berbeda dari
loading awal halaman. Overlay penuh hanya boleh dipakai saat operasi tersebut
memang harus mencegah input ganda.

## Strategi Pemuatan Data

### Data Utama dan Sekunder

Setiap halaman mendefinisikan data utama dan sekundernya. Request yang tidak
saling bergantung dijalankan paralel menggunakan `Promise.allSettled`. Hasil yang
berhasil tetap digunakan ketika request sekunder lain gagal.

Contoh Kelola Karyawan:

- utama: autentikasi lokal yang sudah tervalidasi, departemen, jabatan, dan daftar
  karyawan aktif;
- sekunder: dokter, penyakit, formulir laboratorium, bootstrap workflow, dan
  antrean koreksi;
- tabel karyawan dirender segera setelah data utama tersedia;
- modul detail MCU, upload, dan edit laboratorium dimuat ketika modal terkait
  pertama kali dibuka.

### Dashboard

Pengambilan hasil laboratorium menggunakan batch maksimal 100 MCU per request.
Semua batch harus selesai, divalidasi, lalu digabungkan sebelum analisis dibuat.
Batch adalah batas transport, bukan batas data yang ditampilkan. Jika terdapat
767 MCU, seluruh 767 MCU tetap dianalisis melalui sekitar delapan batch.

Maksimal tiga batch dijalankan bersamaan agar perbaikan tidak berubah menjadi
lonjakan request baru ke Supabase. Ketika satu batch gagal, area analisis
menampilkan error dan tidak boleh menampilkan angka parsial sebagai hasil final.

Hasil laboratorium yang sudah digabungkan dipetakan berdasarkan `mcu_id` satu
kali. Grafik Top Penyakit Komorbid dan ringkasan statistik memakai hasil agregasi
yang sama. Tidak boleh ada perhitungan atau request ulang hanya untuk membentuk
ringkasan kedua.

Target dashboard setelah migrasi adalah kurang dari 100 request untuk satu load
normal dan tanpa query laboratorium per MCU.

### Tabel dan Daftar Besar

- Daftar besar menggunakan pagination.
- Browser hanya merender baris pada halaman aktif.
- Pencarian dan filter mempertahankan hasil yang sama seperti perilaku saat ini.
- Server-side pagination dipakai pada endpoint yang sudah mendukung count dan
  range. Client-side pagination tetap diperbolehkan untuk dataset yang memang
  sudah dibutuhkan penuh oleh fungsi halaman.
- Perubahan halaman tidak memicu pengambilan ulang data master yang masih valid.

## Kebijakan Cache

Cache dibagi berdasarkan jenis data:

- aset statis berversi: cache browser jangka panjang;
- HTML, `version.json`, dan service worker: selalu dapat direvalidasi;
- data master seperti departemen, jabatan, dokter, penyakit, dan vendor: cache
  memori maksimal lima menit;
- data master harus langsung diinvalidasi setelah create, update, atau delete;
- data karyawan, MCU, workflow, dan keputusan bergabung: selalu mengambil sumber
  terbaru untuk load halaman dan tidak memakai cache publik;
- token, dokumen MCU, hasil medis, dan respons API privat tidak boleh disimpan
  dalam Cache Storage publik.

JS dan CSS hanya boleh diberi cache jangka panjang setelah URL-nya memiliki versi
aset. HTML tetap memakai revalidasi sehingga dapat menunjuk ke versi aset terbaru.
Implementasi dapat memakai nama file hasil build atau parameter versi terpusat,
tetapi hanya satu mekanisme yang boleh menjadi sumber versi.

## Navigasi dan Service Worker

- Sidebar mempertahankan `href` asli untuk seluruh menu.
- Hover, focus keyboard, atau touch intent hanya mem-prefetch dokumen HTML tujuan
  dan aset publiknya. Data API privat tidak diprefetch.
- Halaman lama tetap terlihat sampai browser menampilkan shell halaman tujuan.
- Progress bar navigasi tampil selama perpindahan dan selesai saat shell tujuan
  tersedia, bukan setelah seluruh request sekunder selesai.
- Cross-document View Transition tetap menjadi progressive enhancement. Browser
  yang tidak mendukungnya memakai navigasi normal tanpa kehilangan fungsi.
- `prefers-reduced-motion` harus dihormati.

Service worker tidak boleh memaksa reload ketika pertama kali dipasang. Ketika
versi baru tersedia, aplikasi menampilkan pemberitahuan yang jelas dan melakukan
reload hanya setelah persetujuan pengguna atau pada navigasi aman berikutnya.
Satu aksi pembaruan hanya boleh menghasilkan satu reload.

## Strategi Per Kelompok Halaman

### Dashboard dan Analisis

- prioritaskan KPI dan grafik utama;
- batch hasil laboratorium;
- tunda aktivitas terbaru, badge, dan statistik tambahan;
- gunakan satu hasil agregasi untuk beberapa komponen.

### Kelola dan Tambah Karyawan

- tampilkan tabel atau form shell segera;
- paralelkan data master yang independen;
- tunda workflow queue dan isi modal;
- lazy-load upload, kompresi, laboratorium, dan detail MCU.

### Workflow Administrator dan Dokter

- daftar kerja utama menjadi data prioritas;
- riwayat dan detail dokumen dimuat saat tab atau item dibuka;
- keputusan atau review yang gagal tidak boleh menghilangkan daftar utama;
- badge sidebar dimuat sekunder.

### Laporan

- filter dan judul tampil terlebih dahulu;
- hasil laporan menggunakan skeleton lokal;
- library atau modul chart dimuat hanya pada halaman yang memerlukannya;
- ekspor baru diaktifkan setelah dataset laporan siap.

### Login dan Profil

- login hanya memuat modul autentikasi yang dibutuhkan;
- proses seed dan modul database umum tidak menjadi critical path produksi;
- instalasi service worker pertama tidak memicu reload ganda;
- profil dokter memuat identitas terlebih dahulu dan tanda tangan privat secara
  terpisah dengan error lokal.

## Penanganan Error

SweetAlert digunakan untuk error global atau aksi yang membutuhkan keputusan
pengguna, misalnya sesi berakhir, konfirmasi simpan, dan kegagalan operasi. Error
yang hanya memengaruhi satu widget menggunakan panel lokal agar popup tidak
menghalangi seluruh halaman.

Kategori error:

- autentikasi gagal: jelaskan bahwa sesi berakhir lalu arahkan ke login;
- data utama gagal: tampilkan panel error pada area utama dan tombol `Coba Lagi`;
- data sekunder gagal: pertahankan fungsi utama dan tandai komponen yang gagal;
- offline: tampilkan status jaringan dan jangan menyamarkan kondisi sebagai data
  kosong;
- timeout: hentikan skeleton dan beri pilihan mencoba ulang;
- data tidak valid: jangan menampilkan hasil agregasi parsial sebagai data final.

Kode referensi error menggunakan format `PAGE-COMPONENT-TIME`, misalnya
`EMP-LIST-143522`. Kode hanya untuk korelasi QA dan tidak mengandung nama,
employee ID, token, atau data medis. Detail teknis tetap dicatat melalui logger
yang sudah ada tanpa memperlihatkan secret kepada pengguna.

## Observability

Lifecycle manager mencatat metrik nonmedis berikut dalam mode pengembangan dan QA:

- waktu shell terlihat;
- waktu data utama siap;
- waktu data sekunder selesai;
- jumlah request per halaman;
- jumlah retry dan timeout;
- nama komponen yang gagal tanpa payload medis.

Produksi tidak menampilkan log debug mentah. Pengumpulan telemetry eksternal baru
tidak termasuk scope desain ini.

## Target Performa

Target pengujian laboratorium:

- shell terlihat maksimal 300 ms setelah klik pada kondisi normal;
- LCP kurang dari atau sama dengan 2,5 detik;
- INP kurang dari atau sama dengan 200 ms;
- CLS kurang dari atau sama dengan 0,1;
- tidak ada long task lebih dari 200 ms yang berasal dari render daftar;
- dashboard kurang dari 100 request pada load normal;
- tidak ada layar putih lebih dari satu frame selama navigasi yang didukung;
- halaman tetap memberikan status yang jelas pada Slow 4G;
- seluruh angka KPI, jumlah tabel, dan hasil analisis sama dengan baseline data.

Target tersebut diukur pada cold cache dan warm cache. Hasil laboratorium lokal
tidak dianggap sebagai pengganti data lapangan; setelah rollout, keluhan pengguna
dan pengukuran nyata tetap dipantau.

## QA dan Pengujian

### Otomatis

- unit test lifecycle state: loading, ready, empty, error, slow, dan timeout;
- unit test penggabungan batch memastikan seluruh MCU masuk tepat satu kali;
- unit test kegagalan salah satu batch tidak menghasilkan angka parsial;
- test cache TTL dan invalidasi data master;
- test navigasi mempertahankan tautan native dan modified click;
- test service worker tidak reload pada instalasi pertama dan maksimal satu reload
  pada pembaruan;
- regression test role dan workflow yang sudah ada;
- build produksi harus lulus.

### Manual

Matriks QA mencakup:

- role Administrator, Petugas, dan Dokter;
- Chrome dan Safari;
- desktop dan viewport mobile;
- cold cache dan warm cache;
- koneksi normal dan Slow 4G;
- direct URL, klik sidebar, submenu, back/forward, hard refresh, login, dan logout;
- Supabase lambat, request gagal, timeout, offline, serta token kedaluwarsa;
- dashboard, data karyawan, input MCU, upload, approval, follow-up, keputusan
  bergabung, laporan, dan profil dokter;
- verifikasi jumlah data sebelum dan sesudah perubahan menggunakan dataset yang
  sama.

QA produksi menggunakan operasi baca sejauh memungkinkan. Aksi tulis hanya memakai
akun dan data uji yang telah ditentukan dan harus dibersihkan melalui alur aplikasi,
bukan melalui penghapusan database langsung.

## Tahapan Implementasi

1. **Fondasi bersama**: lifecycle manager, skeleton dasar, error panel, progress
   navigasi, dan test unit.
2. **Halaman prioritas**: Dashboard dan Kelola Karyawan sebagai acuan implementasi
   dan pengukuran baseline baru.
3. **Optimasi query**: batch laboratorium, satu agregasi abnormalitas, paralelisasi
   request utama, dan pagination daftar besar.
4. **Migrasi seluruh halaman**: Tambah Karyawan, workflow, Dokter, laporan, data
   master, activity log, expiry, keputusan bergabung, profil, dan halaman lain.
5. **Cache dan service worker**: versi aset, kebijakan cache, perbaikan reload
   pertama, dan pemberitahuan update.
6. **QA lintas role dan browser**: otomatis, manual, Slow 4G, dan validasi data.
7. **Rollout bertahap**: deploy produksi melalui GitHub dan Vercel, pantau error,
   lalu lanjutkan kelompok halaman berikutnya.

Setiap tahap harus dapat dirilis dan dikembalikan secara independen. Migrasi satu
halaman tidak boleh menunggu seluruh MADIS selesai.

## Strategi Rollback

- Lifecycle manager hanya mengatur presentasi dan dapat dinonaktifkan per halaman.
- Navigasi tetap menggunakan tautan native sehingga tidak membutuhkan fallback
  router.
- Optimasi batch tidak mengubah data; rollback mengembalikan cara baca lama.
- Cache aset hanya diaktifkan setelah versioning tersedia sehingga rollback tidak
  terjebak aset lama.
- Tidak ada migration database atau backfill dalam desain ini.

## Kriteria Selesai

Pekerjaan dinyatakan selesai ketika:

- seluruh halaman MADIS mengikuti kontrak lifecycle bersama;
- tidak ada halaman yang menyembunyikan seluruh body sambil menunggu data;
- seluruh area dinamis memiliki state loading, ready, empty, dan error;
- dashboard memenuhi batas request dan memakai batch seluruh MCU;
- login tidak reload dua kali pada instalasi service worker pertama;
- target Core Web Vitals dan matriks QA lulus;
- data, role, workflow, hasil medis, dan jumlah laporan tidak mengalami regresi;
- dokumentasi implementasi, hasil QA, dan prosedur rollback tersedia.
