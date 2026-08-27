# Rencana Implementasi Optimasi Performa dan Loading MADIS

**Desain:**
`docs/superpowers/specs/2026-08-28-optimasi-performa-dan-loading-madis-design.md`

## Sasaran Implementasi

Menerapkan lifecycle loading yang konsisten pada seluruh MADIS tanpa mengubah
aplikasi menjadi SPA, tanpa mengubah schema database, dan tanpa mengubah hasil
perhitungan medis. Pekerjaan dilakukan bertahap agar setiap kelompok perubahan
dapat diuji, dirilis, dan di-rollback secara mandiri.

Baseline produksi yang harus dipertahankan sebagai pembanding:

- Dashboard: TTFB 152 ms, LCP 513 ms, CLS 0,02, 834 request, dan aktivitas
  jaringan masih berlangsung hingga sekitar enam detik.
- Kelola Karyawan: TTFB 110 ms, LCP 993 ms, INP 49 ms, CLS 0,00, dan load event
  sekitar 1,6 detik tanpa throttling.
- Jumlah karyawan, MCU, hasil laboratorium, KPI, dan hasil analisis sebelum
  perubahan harus dicatat dan dibandingkan setelah perubahan.

## Aturan Keselamatan

- Gunakan test-first untuk kontrak lifecycle, batch, cache, dan service worker.
- Jangan mengubah schema, RLS, data produksi, atau aturan workflow.
- Jangan menyimpan token, dokumen, respons API privat, atau data medis di cache
  publik.
- Jangan mengganti navigasi native dengan router JavaScript.
- Jangan menampilkan hasil analisis parsial ketika salah satu batch gagal.
- Pertahankan file duplikat yang tidak terkait di luar staging dan commit.
- Setiap task menghasilkan commit terpisah setelah test fokus dan `git diff
  --check` lulus.

## Task 1: Kunci Kontrak Performa dan Lifecycle

**Files:**

- `tests/performance/page-lifecycle-contract.test.js` (baru)
- `tests/performance/dashboard-batch.test.js` (baru)
- `tests/performance/service-worker-update.test.js` (baru)
- `tests/workflow/frontend-contract.test.js`

**Langkah:**

1. Inventarisasi `mcu-management/index.html`, `pages/login.html`, dan seluruh HTML
   pada `mcu-management/pages/` sebagai daftar halaman produksi.
2. Tambahkan kontrak bahwa halaman tidak menyembunyikan seluruh `body`, memiliki
   shell yang dapat dirender tanpa data, dan menyediakan region loading utama.
3. Tambahkan kontrak bahwa error region mempunyai tombol retry dan tidak hanya
   dicatat ke console.
4. Tambahkan test pure-function untuk pembagian ID MCU ke batch 100, batas
   concurrency tiga, penggabungan hasil tanpa duplikasi, dan kegagalan satu batch.
5. Tambahkan kontrak service worker: instalasi pertama tidak memicu reload,
   pembaruan maksimal satu reload, dan respons API privat tidak dicache.
6. Jalankan test fokus dan pastikan assertion baru gagal sebelum implementasi.

**Verifikasi:**

```bash
node --test tests/performance/*.test.js tests/workflow/frontend-contract.test.js
```

## Task 2: Buat Fondasi Lifecycle Bersama

**Files:**

- `mcu-management/js/utils/pageLifecycleManager.js` (baru)
- `mcu-management/css/sidebar.css`
- `mcu-management/js/appBootstrap.js`
- `tests/performance/page-lifecycle-contract.test.js`

**Kontrak API:**

- `createPageLifecycle(pageId, options)` membuat lifecycle satu halaman.
- `registerRegion(name, element, options)` mendaftarkan area data.
- `setLoading(name)`, `setReady(name)`, `setEmpty(name)`, dan
  `setError(name, error, retry)` mengubah state region.
- `markShellReady()` mengakhiri progress navigasi setelah shell terlihat.
- `markInteractive()` menandai fungsi utama siap tanpa menunggu data sekunder.
- `runDeferred(name, task)` menjalankan pekerjaan sekunder dan melokalisasi
  kegagalannya.
- `destroy()` membersihkan timer dan listener untuk test serta pagehide.

**Langkah:**

1. Implementasikan state region melalui atribut `data-lifecycle-state` agar dapat
   diuji tanpa framework.
2. Tambahkan timer status lambat pada tiga detik dan timeout default pada 15
   detik. Operasi upload, kompresi, simpan, dan pembuatan dokumen tidak memakai
   timeout ini.
3. Buat kode error aman dengan format `PAGE-COMPONENT-HHMMSS` tanpa payload,
   token, employee ID, atau data medis.
4. Tambahkan skeleton, empty state, error panel, retry button, animasi ringan,
   dan fallback `prefers-reduced-motion` pada stylesheet bersama.
5. Pertahankan konten shell ketika JavaScript gagal; helper hanya meningkatkan
   presentasi, bukan menjadi syarat navigasi.
6. Dispatch event `madis:shell-ready` dan `madis:page-interactive` untuk QA dan
   progress navigasi.
7. Jalankan test lifecycle hingga lulus.

## Task 3: Terapkan Kontrak Shell pada Seluruh HTML

**Files:**

- `mcu-management/index.html`
- `mcu-management/pages/activity-log.html`
- `mcu-management/pages/analysis.html`
- `mcu-management/pages/assessment-rahma.html`
- `mcu-management/pages/data-master.html`
- `mcu-management/pages/data-terhapus.html`
- `mcu-management/pages/employee-health-history.html`
- `mcu-management/pages/follow-up.html`
- `mcu-management/pages/kelola-karyawan.html`
- `mcu-management/pages/kelola-user.html`
- `mcu-management/pages/keputusan-bergabung.html`
- `mcu-management/pages/login.html`
- `mcu-management/pages/mcu-expiry-management.html`
- `mcu-management/pages/profil-dokter.html`
- `mcu-management/pages/report-period.html`
- `mcu-management/pages/tambah-karyawan.html`
- `mcu-management/pages/validasi-mcu.html`
- `tests/performance/page-lifecycle-contract.test.js`

**Langkah:**

1. Beri setiap halaman `data-page-id` yang stabil.
2. Pastikan sidebar, header, breadcrumb, judul, filter dasar, dan container utama
   berada di shell dan tidak bergantung pada hasil request.
3. Tambahkan skeleton statis pada region data utama sehingga indikator sudah ada
   sebelum JavaScript dieksekusi.
4. Hapus atau sempitkan overlay startup yang menutup seluruh halaman. Overlay
   operasi upload/simpan tetap dipertahankan.
5. Pastikan class `initialized` tidak lagi mengontrol visibility seluruh dokumen.
6. Pertahankan struktur form, ID field, modal, dan handler bisnis yang ada.
7. Jalankan test kontrak untuk memastikan seluruh halaman sudah terdaftar.

## Task 4: Tambahkan Batch Reader Laboratorium

**Files:**

- `mcu-management/js/utils/batchRunner.mjs` (baru)
- `mcu-management/js/services/labService.js`
- `mcu-management/js/services/abnormalitiesService.js`
- `mcu-management/js/components/topAbnormalitiesChart.js`
- `tests/performance/dashboard-batch.test.js`
- `tests/workflow/frontend-contract.test.js`

**Langkah:**

1. Buat helper pure-function untuk memecah ID unik menjadi batch 100 dan
   menjalankan maksimal tiga batch bersamaan.
2. Tambahkan `labService.getPemeriksaanLabByMcuIds(mcuIds)` yang:
   - menormalisasi dan mendeduplikasi ID;
   - mengambil semua batch dengan kolom yang sama seperti reader lama;
   - mempertahankan filter `deleted_at` dan validasi nilai;
   - menggabungkan seluruh hasil;
   - mengembalikan error ketika satu batch gagal;
   - mengisi cache per MCU setelah seluruh batch valid.
3. Ubah `collectLabAbnormalities` agar menggunakan batch reader sekali, bukan
   memanggil reader per MCU.
4. Ubah service abnormalitas agar satu perhitungan menghasilkan daftar terurut
   dan summary sekaligus.
5. Ubah komponen Top Penyakit Komorbid agar tidak memanggil pengumpulan data
   kedua untuk summary.
6. Bandingkan hasil agregasi sebelum dan sesudah menggunakan fixture yang sama.
7. Pastikan 767 ID menghasilkan delapan batch dan seluruh 767 tetap diproses.

**Verifikasi:**

```bash
node --test tests/performance/dashboard-batch.test.js tests/workflow/frontend-contract.test.js
```

## Task 5: Migrasikan Dashboard ke Progressive Loading

**Files:**

- `mcu-management/js/pages/dashboard.js`
- `mcu-management/index.html`
- `mcu-management/js/services/analysisDashboardService.js`
- `mcu-management/js/services/abnormalitiesService.js`
- `tests/performance/page-lifecycle-contract.test.js`

**Langkah:**

1. Tampilkan shell, filter, dan skeleton KPI sebelum menunggu Supabase.
2. Jadikan autentikasi, data eligibility, departemen, dan jabatan sebagai data
   utama. Paralelkan request yang tidak saling bergantung.
3. Render KPI dan grafik dasar segera setelah data utama siap.
4. Jalankan expiry, aktivitas terbaru, follow-up, badge, dan abnormalitas sebagai
   task sekunder dengan error region masing-masing.
5. Pastikan kegagalan grafik abnormalitas tidak menghilangkan KPI atau grafik
   lain.
6. Hapus jeda visual buatan yang tidak diperlukan setelah state ready.
7. Ukur cold dan warm load. Target total request kurang dari 100 dan tidak ada
   request `pemeriksaan_lab` per MCU.
8. Bandingkan seluruh KPI dan hasil grafik dengan baseline produksi.

## Task 6: Migrasikan Kelola Karyawan sebagai Referensi Halaman Tabel

**Files:**

- `mcu-management/js/pages/kelola-karyawan.js`
- `mcu-management/pages/kelola-karyawan.html`
- `mcu-management/js/components/staticLabForm.js`
- `mcu-management/js/components/fileUploadWidget.js`
- `tests/performance/page-lifecycle-contract.test.js`
- `tests/workflow/frontend-contract.test.js`

**Langkah:**

1. Buat region terpisah untuk statistik, filter, tabel, dan antrean koreksi.
2. Muat job title, departemen, dan karyawan aktif dengan
   `Promise.allSettled`; hentikan tabel hanya jika data karyawan gagal.
3. Render tabel dan pagination segera setelah data utama siap.
4. Pindahkan dokter, penyakit, bootstrap workflow, dan antrean koreksi ke fase
   sekunder.
5. Inisialisasi formulir laboratorium dan upload saat modal MCU pertama kali
   dibuka. Deduplicasikan promise dynamic import agar tidak dimuat dua kali.
6. Tampilkan error lokal dan retry pada tabel tanpa menutup sidebar atau filter.
7. Pastikan pencarian, filter, inactive toggle, detail, edit, tambah MCU, upload,
   dan pagination tidak berubah perilakunya.
8. Ukur event `madis:shell-ready` dan `madis:page-interactive` pada normal dan
   Slow 4G.

## Task 7: Migrasikan Jalur Input dan Follow-Up

**Files:**

- `mcu-management/pages/tambah-karyawan.html`
- `mcu-management/js/pages/tambah-karyawan.js`
- `mcu-management/pages/follow-up.html`
- `mcu-management/js/pages/follow-up.js`
- `mcu-management/js/components/fileUploadWidget.js`
- `tests/workflow/frontend-contract.test.js`
- `tests/performance/page-lifecycle-contract.test.js`

**Langkah:**

1. Tampilkan shell dan field identitas dasar tanpa menunggu dropdown sekunder.
2. Muat data master form secara paralel dan beri state error pada dropdown yang
   gagal.
3. Lazy-load modul file, detail laboratorium, dan surat follow-up saat dibutuhkan.
4. Pertahankan form reader, urutan form MCU, upload langsung, rollback file, dan
   workflow review yang sudah diuji.
5. Bedakan loading awal, loading upload, dan loading simpan agar overlay operasi
   tidak muncul saat halaman baru dibuka.
6. Pastikan role Administrator dan Petugas tetap memiliki akses yang sama seperti
   sebelum perubahan.

## Task 8: Migrasikan Halaman Workflow Administrator dan Dokter

**Files:**

- `mcu-management/pages/keputusan-bergabung.html`
- `mcu-management/js/pages/keputusan-bergabung.js`
- `mcu-management/pages/validasi-mcu.html`
- `mcu-management/js/pages/validasi-mcu.js`
- `mcu-management/pages/profil-dokter.html`
- `mcu-management/js/pages/profil-dokter.js`
- `mcu-management/js/services/workflowService.js`
- `mcu-management/js/utils/workflowErrorPresenter.js`
- `tests/workflow/frontend-contract.test.js`

**Langkah:**

1. Jadikan daftar tunggu atau antrean review sebagai data utama.
2. Muat tab riwayat, detail siklus, dokumen, tanda tangan, dan badge setelah daftar
   utama siap atau ketika tab dibuka.
3. Pertahankan pagination keputusan bergabung dan status workflow.
4. Lokalisasi error dokumen, storage, dan signature pada komponen terkait.
5. Pastikan retry tidak menggandakan mutasi dengan mempertahankan idempotency key.
6. Uji Administrator, Petugas, dan Dokter tidak melihat menu atau aksi di luar
   role masing-masing.

## Task 9: Migrasikan Halaman Administrasi dan Master Data

**Files:**

- `mcu-management/pages/data-master.html`
- `mcu-management/js/pages/data-master.js`
- `mcu-management/pages/kelola-user.html`
- `mcu-management/js/pages/kelola-user.js`
- `mcu-management/pages/activity-log.html`
- `mcu-management/pages/data-terhapus.html`
- `mcu-management/js/pages/data-terhapus.js`
- `mcu-management/pages/mcu-expiry-management.html`
- `mcu-management/js/pages/mcu-expiry-management.js`
- `mcu-management/js/services/masterDataService.js`
- `mcu-management/js/services/cacheManager.js`
- `mcu-management/js/utils/cacheManager.js`

**Langkah:**

1. Terapkan region loading per tabel dan pertahankan shell/filter selalu terlihat.
2. Jalankan request master independen secara paralel.
3. Verifikasi cache memori lima menit sudah digunakan untuk seluruh data master
   yang aman dicache.
4. Audit dan lengkapi invalidasi cache setelah setiap create, update, dan delete.
5. Jangan cache daftar user, activity log, data terhapus, atau hasil expiry sebagai
   data publik.
6. Terapkan pagination atau render terbatas pada daftar besar.
7. Uji empty state, retry, serta aksi CRUD setelah migrasi.

## Task 10: Migrasikan Seluruh Halaman Laporan

**Files:**

- `mcu-management/pages/analysis.html`
- `mcu-management/pages/assessment-rahma.html`
- `mcu-management/js/pages/assessment-rahma.js`
- `mcu-management/js/pages/assessment-rahma-dashboard.js`
- `mcu-management/pages/report-period.html`
- `mcu-management/pages/employee-health-history.html`
- `mcu-management/js/services/analysisDashboardService.js`
- `mcu-management/js/services/reportExportService.js`

**Langkah:**

1. Tampilkan filter dan struktur laporan sebelum dataset selesai.
2. Gunakan skeleton per grafik atau tabel, bukan overlay seluruh halaman.
3. Pakai eligibility service dan batch result yang sama agar tidak membuat jalur
   query laboratorium baru.
4. Muat chart dan exporter hanya pada halaman atau aksi yang memerlukannya.
5. Aktifkan tombol ekspor setelah dataset final siap.
6. Pastikan kegagalan satu grafik tidak menggagalkan grafik lain.
7. Bandingkan jumlah dan nilai laporan dengan baseline menggunakan filter yang
   sama.

## Task 11: Hilangkan Reload Ganda Login dan Pembaruan Aplikasi

**Files:**

- `mcu-management/js/appBootstrap.js`
- `mcu-management/pages/login.html`
- `mcu-management/sw.js`
- `mcu-management/version.json`
- `tests/performance/service-worker-update.test.js`
- `tests/workflow/frontend-contract.test.js`

**Langkah:**

1. Catat apakah halaman sudah memiliki service worker controller sebelum proses
   registrasi.
2. Abaikan `controllerchange` dari instalasi pertama.
3. Bedakan instalasi awal, worker update, dan perubahan `version.json` sebagai
   state yang eksplisit.
4. Jangan langsung `SKIP_WAITING` dan reload pada dua jalur yang berbeda.
5. Tampilkan pemberitahuan versi baru melalui UI bersama. Lakukan reload sekali
   setelah persetujuan atau navigasi aman.
6. Hapus parameter `appVersion` setelah tidak lagi diperlukan sebagai guard
   reload.
7. Pastikan login production hanya memuat modul autentikasi penting. Pindahkan
   seed/fallback database dari critical path produksi.
8. Uji first visit, existing controller, update tersedia, offline, login gagal,
   dan login berhasil untuk seluruh role.

## Task 12: Selaraskan Cache Aset dan Release Version

**Files:**

- `mcu-management/sw.js`
- `mcu-management/version.json`
- `mcu-management/package.json`
- `vercel.json`
- `tests/performance/service-worker-update.test.js`

**Langkah:**

1. Pertahankan HTML, `version.json`, `sw.js`, dan API sebagai network-first atau
   network-only sesuai sensitivitasnya.
2. Jadikan cache version service worker sebagai sumber versi aset pada tahap ini;
   jangan memberi `immutable` pada URL kode yang belum berversi.
3. Gunakan stale-while-revalidate untuk JS/CSS publik yang ada di cache versi
   aktif agar warm navigation cepat tanpa menyimpan API privat.
4. Tambahkan `pageLifecycleManager.js` dan aset shared baru ke manifest cache.
5. Rapikan helper service worker yang tidak terpakai agar kebijakan cache mudah
   diaudit.
6. Naikkan versi aplikasi dan cache bersama hanya setelah seluruh test lulus.
7. Pertahankan header revalidasi Vercel sampai build menghasilkan URL content
   hash. Long-term immutable browser cache menjadi task terpisah dan tidak boleh
   diaktifkan setengah jadi.

## Task 13: QA Otomatis dan Build Penuh

**Langkah:**

1. Jalankan test performa dan kontrak frontend.
2. Jalankan seluruh test Node dan workflow.
3. Jalankan build produksi.
4. Jalankan pemeriksaan syntax pada modul yang berubah.
5. Jalankan `git diff --check`.
6. Pastikan tidak ada migration SQL, perubahan schema, secret, fixture produksi,
   atau file duplikat tidak terkait di staged diff.

**Perintah:**

```bash
node --test tests/performance/*.test.js
npm run test:workflow
npm test
npm run build
git diff --check
```

## Task 14: QA Browser dan Validasi Data

**Tools:** Chrome DevTools MCP, Chrome, dan Safari.

**Files:**

- `docs/qa/QA-PERFORMANCE-LOADING-MADIS-2026-08-28.md` (baru)

**Langkah:**

1. Uji role Administrator, Petugas, dan Dokter pada desktop dan viewport mobile.
2. Uji cold cache, warm cache, koneksi normal, dan Slow 4G.
3. Rekam trace Dashboard dan Kelola Karyawan. Catat TTFB, LCP, INP, CLS, waktu
   shell, waktu interaktif, request count, dan network quiet.
4. Navigasikan seluruh menu, submenu laporan, back/forward, hard refresh, direct
   URL, login, logout, dan update aplikasi.
5. Simulasikan Supabase lambat, request gagal, offline, timeout, dan token
   kedaluwarsa. Pastikan tidak ada halaman blank atau skeleton permanen.
6. Uji alur tambah karyawan, tambah MCU, upload PDF/JPG/PNG, approval dokter,
   follow-up, keputusan bergabung, laporan, dan tanda tangan menggunakan akun
   serta data uji yang sudah ditentukan. Bersihkan data uji melalui alur aplikasi,
   bukan penghapusan langsung di database.
7. Bandingkan KPI, jumlah karyawan, jumlah MCU, hasil laboratorium, grafik, dan
   laporan dengan baseline.
8. Pastikan Dashboard memiliki kurang dari 100 request dan semua MCU tetap masuk
   analisis.
9. Dokumentasikan hasil pada `docs/qa/QA-PERFORMANCE-LOADING-MADIS-2026-08-28.md`.

## Task 15: Rollout Bertahap ke Produksi

**Files:**

- `mcu-management/version.json`
- `mcu-management/sw.js`
- `docs/qa/QA-PERFORMANCE-LOADING-MADIS-2026-08-28.md`

**Langkah:**

1. Deploy preview Vercel dari commit yang sudah lulus test.
2. Jalankan smoke test read-only pada preview untuk seluruh role.
3. Verifikasi cache version, service worker update, dan tidak ada reload ganda.
4. Push ke branch produksi setelah preview disetujui.
5. Pantau Vercel logs, error UI, request Supabase, dan keluhan pengguna setelah
   deployment.
6. Jika terjadi regresi, rollback hanya kelompok commit yang bermasalah. Navigasi
   native dan data tetap tidak berubah.

## Urutan Commit yang Disarankan

1. `test(perf): lock page lifecycle contracts`
2. `feat(ui): add shared page lifecycle states`
3. `feat(ui): add loading shells to MADIS pages`
4. `perf(dashboard): batch laboratory reads`
5. `perf(dashboard): render primary data first`
6. `perf(employees): defer secondary page data`
7. `perf(forms): defer MCU support modules`
8. `perf(workflow): localize page loading states`
9. `perf(admin): migrate list page lifecycle`
10. `perf(reports): render report regions progressively`
11. `fix(pwa): prevent first-install reload`
12. `perf(cache): align versioned service worker cache`
13. `test(qa): document performance verification`
14. `chore(release): publish MADIS loading update`

## Kriteria Akhir

Implementasi dinyatakan selesai hanya ketika:

- seluruh halaman yang tercantum pada Task 3 menggunakan lifecycle bersama;
- tidak ada layar putih saat navigasi normal atau Slow 4G;
- seluruh region mempunyai state loading, ready, empty, dan error;
- Dashboard kurang dari 100 request dan tidak melakukan query lab per MCU;
- seluruh data dan hasil analisis sama dengan baseline;
- instalasi pertama service worker tidak memicu reload ganda;
- seluruh test, build, QA browser, dan matriks role lulus;
- hasil QA dan prosedur rollback terdokumentasi.
