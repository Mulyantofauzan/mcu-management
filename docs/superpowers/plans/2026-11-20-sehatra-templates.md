# Template UI Sehatra Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Template HTML statis untuk 14 halaman aplikasi MCU (13 halaman sekarang + halaman Login baru) dengan gaya desain Sehatra, terang dan gelap, responsif, siap jadi acuan rebuild Svelte.

**Architecture:** Folder `design/sehatra/` berisi CSS bersama (token dan komponen dari artifact pengguna), tiga skrip klasik kecil (tema, shell, perilaku), dan satu HTML per halaman. Shell (menu samping dan topbar) dirender dari satu sumber (`shell.js`) supaya menu tidak ditulis ulang di 14 file. Kualitas dijaga oleh tes kontrak `node --test` di `tests/design/` (kontras token, struktur halaman, tombol tidak mati, kosakata status).

**Tech Stack:** HTML, CSS (variabel CSS), JavaScript klasik (UMD, tanpa module supaya bisa dibuka lewat `file://`), `node:test`. Tanpa build, tanpa dependensi baru.

**Spec:** `docs/superpowers/specs/2026-11-20-sehatra-templates-design.md`

## Global Constraints

- Gaya mengikuti artifact pengguna (`claude.ai/artifact/5t5AGNEBYtKeaWnCDgh3Ss`): font `Plus Jakarta Sans` (fallback `system-ui`), menu samping 252px, topbar lengket, kartu radius 12px, pill status, drawer dan modal, grafik SVG.
- Nama produk "Sehatra". Judul halaman `<Nama Halaman> - Sehatra`. Bahasa Indonesia, `lang="id"`.
- Nama file halaman = kunci halaman aplikasi di `mcu-management/js/utils/roleAccess.mjs` (`PAGE_ROLES`): `dashboard`, `kelola-karyawan`, `tambah-karyawan`, `follow-up`, `data-master`, `mcu-expiry-management`, `assessment-rahma`, `analysis`, `report-period`, `employee-health-history`, `kelola-user`, `activity-log`, `data-terhapus`, ditambah `login`. Label menu berbahasa Indonesia.
- Status MCU hanya: `Fit`, `Fit With Note`, `Temporary Unfit`, `Follow-Up`, `Unfit`, plus `Belum ada MCU`. Dilarang "Fit dengan pembatasan".
- Dilarang karakter em dash di semua file di `design/sehatra/` (teks UI dan komentar).
- Semua angka, nama, dan tanggal adalah data contoh berlabel (`.sample-note`). Tanpa klaim fabrikasi.
- Kontras teks minimal WCAG AA (4.5:1) di tema terang dan gelap. Bila token artifact gagal, gelapkan token seminimal mungkin tanpa mengubah hue, dan catat di komentar CSS.
- Tanpa `outline:none` kecuali pengganti fokus yang terlihat. Semua tabel di dalam `.tbl-wrap`. Semua `<button>` punya `type`.
- Judul halaman, kondisi kosong, memuat, galat (`[data-states]`), dan keyboard (Tab, Enter, Esc) wajib ada pada setiap halaman data.
- Logika bisnis (Framingham, Skor Jakarta, validasi) tidak diubah. Skor Jakarta: poin usia >=65 adalah asumsi, tampilkan catatan verifikasi.
- Pekerjaan dilakukan di branch `feat/sehatra-templates`, dibuat dari branch saat ini.

## Review Focus

- Pasangan warna token gagal AA di salah satu tema (mis. `--faint` dan `--accent` dari artifact): diuji di Task 1.
- Tabel lebar meluap di ponsel: tiap `<table>` harus di `.tbl-wrap`: diuji di Task 3.
- Tombol atau formulir yang tidak melakukan apa pun: tiap `<button>` punya `type="submit"` atau salah satu `data-open`, `data-close`, `data-toggle`, `data-tab`, `data-state-set`, `data-demo`, `data-theme-toggle`, `data-menu-toggle`, dan tiap `<form>` punya `data-demo-submit`: diuji di Task 3.
- `localStorage` diblokir atau tema sistem gelap: `resolveTheme` dan `readStored` tidak melempar galat: diuji di Task 2.
- Status di luar kosakata aplikasi atau em dash di teks: diuji di Task 3.

---

### Task 1: Branch, referensi, token, dan `sehatra.css`

**Files:**
- Create: `design/sehatra/reference/artifact.html` (salinan sumber artifact, hanya acuan)
- Create: `design/sehatra/sehatra.css`
- Create: `tests/design/_lib.js`
- Test: `tests/design/tokens.test.js`

**Interfaces:**
- Produces (`tests/design/_lib.js`, CommonJS): `ROOT: string` (path absolut `design/sehatra`), `listPages(): string[]` (nama file `*.html` di ROOT, tanpa folder `reference`), `read(rel: string): string`, `tokens(css: string, theme: 'light'|'dark'): Record<string,string>` (pasangan `--nama` ke `#hex` dari blok `:root{...}` atau `:root[data-theme="dark"]{...}`), `ratio(hexA: string, hexB: string): number` (rasio kontras WCAG).
- Produces (`sehatra.css`): token `--bg --surface --surface-2 --line --line-2 --fg --muted --faint --accent --accent-ink --accent-soft --accent-strong --good --good-bg --info --info-bg --warn --warn-bg --crit --crit-bg --crit-ink`, kelas komponen dari artifact (`.app .side .brand .nav .cycle .main .topbar .search .icon-btn .me .ava .content .ph .btn .card .grid .kpi .pill .tag .list .li .tools .field .seg .tbl-wrap .pager .empty .scrim .panel .form .toast`), serta tambahan: `.skip`, `.sample-note`, status `.s-fit .s-note .s-followup .s-temp .s-unfit .s-none`, `[data-state]` (tersembunyi kecuali aktif), `.scrim[hidden]`.

- [ ] **Step 1:** `git checkout -b feat/sehatra-templates`, lalu salin sumber artifact ke `design/sehatra/reference/artifact.html` (ambil dengan `Artifact read` pada URL artifact, path file hasil baca tercantum di keluarannya, atau `cp` dari path itu). Tambahkan baris awal `<!-- Salinan acuan dari artifact pengguna. Jangan dipakai langsung. -->`.
- [ ] **Step 2: Tulis tes gagal** `tests/design/tokens.test.js`: untuk tema `light` dan `dark`, tegaskan `ratio(fg,bg)`, `(fg,surface)`, `(muted,bg)`, `(muted,surface)`, `(muted,surface-2)`, `(faint,surface)`, `(accent-ink,accent)`, `(accent-strong,accent-soft)`, `(accent-strong,surface)`, `(good,good-bg)`, `(info,info-bg)`, `(warn,warn-bg)`, `(crit,crit-bg)`, `(crit-ink,crit)` masing-masing `>= 4.5`, serta `(accent,surface) >= 3`. Satu `test()` per pasangan per tema.
- [ ] **Step 3:** Jalankan `node --test tests/design/tokens.test.js`. Expected: FAIL (file CSS belum ada).
- [ ] **Step 4:** Tulis `tests/design/_lib.js` sesuai Interfaces.
- [ ] **Step 5:** Buat `design/sehatra/sehatra.css` dari blok `<style>` di artifact dengan perubahan: (a) hapus blok `@media (prefers-color-scheme:dark)` ganda, pertahankan hanya `:root[data-theme="dark"]` (tema ditetapkan oleh `theme-init.js`); (b) tambah token `--crit-ink:#FFFFFF` (terang) dan `#1A0707` (gelap); (c) tambah komponen baru sesuai Interfaces: `.s-fit` memakai good, `.s-note` info, `.s-followup` warn, `.s-temp` crit (tinted), `.s-unfit` latar `--crit` teks `--crit-ink`, `.s-none` muted; `.skip` tersembunyi sampai fokus; `.sample-note` kotak kecil `--surface-2`; `[data-state]` `display:none` kecuali atribut `data-active`; `.scrim[hidden]{display:none}`. Pertahankan media query 1000, 900, 520 px dan `prefers-reduced-motion`.
- [ ] **Step 6:** Jalankan tes token. Untuk tiap pasangan yang gagal, gelapkan (tema terang) atau terangkan (tema gelap) token terkait dengan langkah kecil sampai lulus, catat di komentar CSS `/* AA: dari #xxxxxx */`. Expected akhir: semua PASS.
- [ ] **Step 7:** Commit dokumen spec, plan, referensi, CSS, dan tes: `git add docs/superpowers design tests/design && git commit -m "feat(design): sehatra tokens and base styles with AA contrast tests"`.

### Task 2: Tema, shell, dan perilaku

**Files:**
- Create: `design/sehatra/theme-init.js`, `design/sehatra/shell.js`, `design/sehatra/sehatra.js`
- Test: `tests/design/theme.test.js`, `tests/design/shell.test.js`

**Interfaces:**
- Consumes: `PAGE_ROLES` dari `mcu-management/js/utils/roleAccess.mjs` (diimpor dinamis di tes).
- Produces `theme-init.js` (UMD, `module.exports` atau `window.SehatraTheme`): `STORAGE_KEY = 'sehatra-theme'`; `readStored(storage?: {getItem(k: string): string|null}): 'light'|'dark'|null` (mengembalikan `null` bila `storage` kosong atau `getItem` melempar); `resolveTheme(stored: string|null, prefersDark: boolean): 'light'|'dark'`. Di browser, saat dimuat sinkron di `<head>`, menetapkan `document.documentElement.dataset.theme`; `window.SehatraTheme.toggle(): 'light'|'dark'` menyimpan pilihan dengan `try/catch`.
- Produces `shell.js` (UMD): `NAV: Array<{ label: string, adminOnly?: true, items: Array<{ key: string, label: string, icon: string }> }>` dengan kelompok Utama (`dashboard`), Data (`kelola-karyawan`, `tambah-karyawan`, `follow-up`, `mcu-expiry-management`, `employee-health-history`), Analisis (`analysis`, `report-period`, `assessment-rahma`), Pengaturan `adminOnly` (`data-master`, `kelola-user`, `activity-log`, `data-terhapus`); `ICONS: Record<string,string>` (markup dalam `<svg>`, minimal `dash users file chart heart plus x dl moon sun menu search cal gear`); `pageHref(key: string): string` (`'<key>.html'`); `renderShell(opts: { page: string, role: 'Admin'|'Petugas', user: { name: string, title: string } }): { sidebar: string, topbar: string, sprite: string }`. Item aktif membawa `aria-current="page"`; kelompok `adminOnly` tidak dirender untuk `Petugas`. Widget siklus `.cycle` berlabel "Cakupan MCU 2026" dan `.sample-note` "Contoh". Di browser mengisi `#shell-side`, `#shell-top`, menambah sprite `<svg>` tersembunyi ke `body`, dan membaca `data-page` dan `data-role` dari `<body>` (default `Admin`).
- Produces `sehatra.js` (klasik, delegasi klik pada `document`): `[data-open="#id"]` membuka dialog (hapus `hidden`, simpan elemen pemicu, fokus ke `[data-first]` atau tombol tutup), `[data-close]` dan klik latar `.scrim` serta `Esc` menutup dan mengembalikan fokus, `Tab` terjebak dalam dialog; `[data-demo="pesan"]` menampilkan toast `Prototipe: pesan`; `form[data-demo-submit]` mencegah submit dan menampilkan toast; `[data-tab]` mengatur `aria-selected` dan panel `[data-panel]`; `[data-state-set="normal|loading|empty|error"]` mengaktifkan `[data-state]` di `[data-states]` terdekat; `[data-theme-toggle]`, `[data-menu-toggle]`.

- [ ] **Step 1: Tulis tes gagal** `theme.test.js`: `resolveTheme('dark', false) === 'dark'`; `resolveTheme(null, true) === 'dark'`; `resolveTheme(null, false) === 'light'`; `resolveTheme('rusak', true) === 'dark'`; `readStored({ getItem() { throw new Error('blocked') } }) === null`; `readStored(undefined) === null`.
- [ ] **Step 2: Tulis tes gagal** `shell.test.js`: setiap kunci di `PAGE_ROLES` muncul tepat sekali di `NAV` dan tidak ada kunci lain; item di kelompok `adminOnly` persis kunci dengan `PAGE_ROLES[key]` hanya `['Admin']`; `renderShell({page:'follow-up', role:'Petugas', ...}).sidebar` memuat `aria-current="page"` pada link `follow-up.html`, tidak memuat `kelola-user.html`; peran `Admin` memuatnya; sprite memuat `id="i-<nama>"` untuk setiap kunci `ICONS`; keluaran tidak mengandung `—`.
- [ ] **Step 3:** Jalankan `node --test tests/design/theme.test.js tests/design/shell.test.js`. Expected: FAIL (modul belum ada).
- [ ] **Step 4:** Implementasikan `theme-init.js`, `shell.js`, `sehatra.js` sesuai Interfaces. Ikon dibuat dari `ICONS` artifact (`reference/artifact.html`, objek `ic`) ditambah ikon yang belum ada; markup nav dan topbar mengikuti kelas di `sehatra.css` dan struktur artifact.
- [ ] **Step 5:** Jalankan semua tes `tests/design`. Expected: PASS.
- [ ] **Step 6:** Commit: `git add design tests/design && git commit -m "feat(design): theme, shell and behaviour scripts"`.

### Task 3: Kerangka halaman dan tes kontrak

**Files:**
- Create: `design/sehatra/_template.html`
- Test: `tests/design/pages.test.js`

**Interfaces:**
- Consumes: `listPages`, `read` dari `_lib.js`; `NAV`, `pageHref` dari `shell.js`; `STORAGE_KEY` tidak diperlukan.
- Produces: `_template.html` yang lulus semua aturan di bawah sebagai pola salin untuk tiap halaman. Aturan kontrak (diterapkan ke setiap file `*.html` di `design/sehatra`, termasuk `_template.html`): 
  1. `<html lang="id">`, meta viewport, `<title>` berakhiran ` - Sehatra`, `<link>` ke `sehatra.css`, `theme-init.js` dimuat di `<head>` tanpa `defer`.
  2. Ada `.skip` link ke `#main` dan `<main id="main">`; ada `#shell-side` dan `#shell-top` (kecuali `login.html`); `<body data-page="<kunci>">` kecuali `login` dan `_template`.
  3. Setiap `<table>` berada di dalam `.tbl-wrap`; setiap `tr.row` punya `tabindex="0"`.
  4. Setiap `<button>` punya `type="submit"` atau salah satu atribut `data-open`, `data-close`, `data-toggle`, `data-tab`, `data-state-set`, `data-demo`, `data-theme-toggle`, `data-menu-toggle`; setiap `<form>` punya `data-demo-submit`; tidak ada `href="#"` kosong.
  5. Setiap `data-open="#x"` menunjuk elemen `id="x"` di halaman yang sama; setiap `role="dialog"` punya `aria-labelledby` yang valid dan satu `[data-close]`.
  6. Setiap `[data-states]` memuat `[data-state="loading"]`, `[data-state="empty"]`, `[data-state="error"]`.
  7. Setiap `data-status` bernilai salah satu kosakata status dan teksnya sama dengan nilainya.
  8. Tidak ada `—`; ada tepat satu komentar awal berisi baris `Sumber:`; halaman selain `login` dan `_template` memuat `.sample-note`.
  9. Setiap `<a href="*.html">` internal menunjuk halaman di daftar kunci halaman (keberadaan file dicek di Task 9).
  10. `sehatra.css` tidak memuat `outline:none` dan `outline:0` hanya pada selektor `.search input` dan `.field:focus`; memuat media query `max-width:900px`, `max-width:520px`, dan `prefers-reduced-motion`.

- [ ] **Step 1: Tulis tes gagal** `pages.test.js` yang menerapkan aturan 1 sampai 10 per file (satu `test()` per aturan per file, nama memuat nama file). Parser: regex sederhana atas string HTML, tanpa dependensi.
- [ ] **Step 2:** Jalankan tes. Expected: FAIL (belum ada halaman).
- [ ] **Step 3:** Buat `_template.html`: struktur lengkap dengan `#shell-side`, `#shell-top`, `<main id="main" class="content">`, satu `.ph` judul, satu `.card` dengan `[data-states]` (tiga status demo, kontrol `.seg` untuk `data-state-set`), satu dialog contoh, `.sample-note`, skrip `shell.js` dan `sehatra.js` di akhir `<body>`.
- [ ] **Step 4:** Jalankan semua tes `tests/design`. Expected: PASS. Jalankan juga `node --test` penuh, Expected: semua tes proyek lulus.
- [ ] **Step 5:** Commit: `git add design tests/design && git commit -m "feat(design): page template and contract tests"`.

### Task 4: Login, Dashboard, Kelola Karyawan (titik tinjau)

**Files:**
- Create: `design/sehatra/login.html`, `dashboard.html`, `kelola-karyawan.html`

**Interfaces:**
- Consumes: kerangka dan kelas dari Task 1 sampai 3.
- Produces: tiga halaman yang lulus tes kontrak.

- [ ] **Step 1:** Baca `mcu-management/pages/login.html`, `kelola-karyawan.html` dan `js/pages/kelola-karyawan.js` untuk menyalin semua kolom, filter, dan aksi ke komentar `Sumber:` serta daftar paritas di komentar awal.
- [ ] **Step 2:** `login.html`: kartu tunggal di tengah, tanpa shell, field pengguna dan kata sandi, tombol `type="submit"` dengan `data-demo-submit` pada form, status galat dan memuat, tombol tema. Ikuti alur login aplikasi (cek `login.html` untuk field yang ada).
- [ ] **Step 3:** `dashboard.html`: ambil dari artifact (`VIEWS.dashboard`): KPI, grafik batang per bulan, donat kelayakan dan risiko, temuan terbanyak, perlu tindak lanjut, belum ada MCU, perubahan skor. Status memakai kelas `s-*` dengan `data-status`. Angka statis berlabel `.sample-note`.
- [ ] **Step 4:** `kelola-karyawan.html`: tab `Karyawan` dan `Data MCU` (`data-tab`), toolbar cari dan filter, tabel di `.tbl-wrap`, pager, drawer detail karyawan dan detail MCU (`role="dialog"`), tombol `Edit MCU` berupa link ke `tambah-karyawan.html`, tombol `Tambah karyawan` membuka dialog form, kondisi kosong, memuat, dan galat. Jabatan memakai label "Jabatan" dan tampil terisi.
- [ ] **Step 5:** Jalankan `node --test tests/design`. Expected: PASS.
- [ ] **Step 6:** Buka ketiga halaman di browser pada lebar 1280 dan 390 px, tema terang dan gelap, klik tiap kontrol; catat hasilnya di pesan commit.
- [ ] **Step 7:** Commit: `git add design && git commit -m "feat(design): login, dashboard and kelola-karyawan templates"`.
- [ ] **Step 8: BERHENTI.** Tunjukkan ketiga halaman ke pengguna dan tunggu persetujuan atau koreksi sebelum Task 5.

### Task 5: Tambah Karyawan (form MCU panjang)

**Files:**
- Create: `design/sehatra/tambah-karyawan.html`

- [ ] **Step 1:** Baca `mcu-management/pages/tambah-karyawan.html` dan `kelola-karyawan.html` (modal Tambah dan Edit MCU) untuk daftar lengkap field. Tulis ke komentar awal.
- [ ] **Step 2:** Halaman satu kolom konten dengan indeks bagian di kiri dan bilah simpan lengket: Data karyawan, Pemeriksaan fisik, Penglihatan (8 kolom), Pemeriksaan penunjang, Hasil lab, Riwayat kesehatan, Hasil dan catatan, Dokumen MCU. Pilihan hasil memakai lima status aplikasi.
- [ ] **Step 3:** Widget dokumen: zona unggah, baris file dengan tombol `Hapus` bertipe `type="button"` dan `data-demo`, batas ukuran PDF 10 MB dan gambar 3 MB sebagai teks bantu. Form punya `data-demo-submit`.
- [ ] **Step 4:** Jalankan `node --test tests/design`, periksa di browser (dua tema, 390 px), lalu `git add design && git commit -m "feat(design): tambah-karyawan long form template"`.

### Task 6: Follow-up, Masa Berlaku MCU, Riwayat Kesehatan

**Files:**
- Create: `design/sehatra/follow-up.html`, `mcu-expiry-management.html`, `employee-health-history.html`

- [ ] **Step 1:** Untuk tiap halaman baca `mcu-management/pages/<kunci>.html` dan `js/pages/<kunci>.js` (bila ada). Catat kolom, filter, aksi, modal ke komentar `Sumber:` dan daftar paritas.
- [ ] **Step 2:** Bangun tiap halaman dari `_template.html` memakai komponen yang ada (`.tools`, `.tbl-wrap`, `.pager`, drawer, `[data-states]`, `.pill s-*`). Follow-up menyediakan aksi hasil akhir sesuai aplikasi. Riwayat kesehatan memakai tren dan daftar riwayat seperti drawer karyawan di artifact.
- [ ] **Step 3:** Jalankan `node --test tests/design`, periksa di browser, lalu `git add design && git commit -m "feat(design): follow-up, expiry and health-history templates"`.

### Task 7: Analisis, Laporan Periode, Assessment Rahma

**Files:**
- Create: `design/sehatra/analysis.html`, `report-period.html`, `assessment-rahma.html`

- [ ] **Step 1:** Baca halaman sumber (`analysis.html`, `report-period.html`, `assessment-rahma.html`, `html/assessment-rahma-*.html`) dan catat paritas.
- [ ] **Step 2:** `analysis.html` dan `report-period.html`: tata letak dari artifact (`VIEWS.laporan`): filter, wawasan, bilah bertumpuk per departemen, tren, peta panas, tombol ekspor memakai `data-demo`. Semua `<svg>` grafik memakai `role="img"` dan `aria-label`.
- [ ] **Step 3:** `assessment-rahma.html`: kalkulator dan tabel poin dari artifact (`VIEWS['skor-jakarta']`) sebagai tata letak, plus catatan verifikasi poin usia >=65. Tidak mengubah rumus.
- [ ] **Step 4:** Jalankan `node --test tests/design`, periksa di browser, lalu `git add design && git commit -m "feat(design): analysis, report and assessment templates"`.

### Task 8: Pengaturan (Admin)

**Files:**
- Create: `design/sehatra/data-master.html`, `kelola-user.html`, `activity-log.html`, `data-terhapus.html`

- [ ] **Step 1:** Baca halaman sumber dan JS-nya, catat paritas (data master: jabatan, departemen, vendor, dokter, penyakit, item lab; kelola user: peran Admin dan Petugas, masa berlaku Petugas; log aktivitas: filter dan audit; data terhapus: pulihkan dan hapus permanen).
- [ ] **Step 2:** Bangun tiap halaman dari `_template.html`. Aksi merusak (hapus permanen) memakai dialog konfirmasi `role="dialog"`, bukan klik langsung.
- [ ] **Step 3:** Jalankan `node --test tests/design`, periksa di browser (menu Pengaturan hanya muncul untuk `Admin`: ganti `data-role` di `<body>` untuk uji), lalu `git add design && git commit -m "feat(design): admin settings templates"`.

### Task 9: Indeks, kelengkapan, dan verifikasi akhir

**Files:**
- Create: `design/sehatra/index.html`
- Test: `tests/design/complete.test.js`

- [ ] **Step 1: Tulis tes gagal** `complete.test.js`: keempat belas file halaman ada (`login` dan 13 kunci `PAGE_ROLES`); setiap link `*.html` internal di semua halaman dan di `shell.js` menunjuk file yang ada; `index.html` menautkan keempat belas halaman.
- [ ] **Step 2:** Jalankan; bila ada yang belum ada, Expected: FAIL menyebut file yang hilang.
- [ ] **Step 3:** Buat `index.html` (daftar isi bergaya Sehatra dengan tautan ke semua halaman, catatan bahwa ini template dan data contoh). Perbaiki halaman yang hilang atau link rusak.
- [ ] **Step 4:** Jalankan `node --test`. Expected: seluruh suite lulus, termasuk tes proyek lama.
- [ ] **Step 5:** Verifikasi akhir di browser untuk keempat belas halaman: tema terang dan gelap, lebar 1280 dan 390 px, tanpa overflow horizontal, tanpa galat konsol, klik tiap tombol, tab menu, dialog (Esc menutup, fokus kembali), pengalih kondisi memuat, kosong, galat, dan navigasi keyboard. Tulis hasil per halaman sebagai daftar singkat di pesan commit.
- [ ] **Step 6:** Commit: `git add design tests/design && git commit -m "feat(design): sehatra index and completeness checks"`.
