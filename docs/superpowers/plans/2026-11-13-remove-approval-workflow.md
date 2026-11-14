# Hapus Sistem Review/Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (metode **Native** dipilih pengguna) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MCU yang diinput langsung tersimpan dan aktif; sistem review Dokter, keputusan bergabung, role Dokter, Surat Sehat, dan pengaturan masa berlaku dihapus; form MCU kembali ke bentuk sebelum workflow.

**Architecture:** Hapus kode workflow dari kode sekarang (bukan `git checkout` file lama). Database memakai jalur kompatibilitas yang sudah ada: flag `mcu_approval_workflow_enabled=false` membuat MCU baru langsung `approved_legacy`. Satu file SQL baru menormalkan data. Frontend tetap JS vanilla.

**Tech Stack:** Vanilla JS (ES modules) di `mcu-management/`, fungsi serverless Node (CommonJS) di `api/` dan `server/`, Supabase Postgres, tes `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-13-remove-approval-workflow-design.md`

## Global Constraints
- Tidak commit/push kecuali pengguna minta. Tiap tugas berakhir dengan "Checkpoint" (jalankan tes), bukan commit. Jika pengguna minta commit, akhiri pesan dengan `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Jangan ubah `mcu-management/index.html` dan `mcu-management/pages/login.html` kecuali baris yang disebut tugas (login.html: hanya redirect Dokter). Ada perubahan lama pengguna di kedua file itu; sunting dengan `Edit`, jangan timpa.
- Tabel, kolom, dan RPC workflow di database **tidak dihapus**. Tabel master `doctors` dan kolom `mcu-doctor` (nama dokter pemeriksa) **tetap**: itu data master, bukan role.
- Role sah hanya `Admin` dan `Petugas`.
- Masa berlaku MCU tetap 365 hari, dihitung di browser (`mcuExpiryService`, `expiryPeriodDays = 365`, `warningPeriodDays = 60`).
- Urutan form: Pemeriksaan, Audiometri dan Spirometri, Kebiasaan, Penglihatan, Lab, Penunjang, Riwayat Kesehatan, Rujukan, Dokumen, Hasil. Hasil dan Catatan Awal wajib.
- Tidak ada karakter em dash di teks UI.
- Urutan rilis: SQL dulu, baru deploy.
- Tes: `npm test` di root (`node --test`) harus hijau di akhir tiap tugas; `npm run build` hijau di Tugas 9.

## Review Focus
1. Sesi/JWT lama berisi role `Dokter`: `/api/users`, `/api/download-file`, `/api/delete-file`, dan login harus menolak (403/401), bukan lolos.
2. `sw.js` masih mendaftar berkas yang dihapus: `cache.addAll` gagal total dan service worker tidak terpasang. Tes: setiap path pra-cache harus ada di disk.
3. MCU lama dengan hasil kosong (`initial_result` null, `workflow_status` apa pun) tampil di daftar, detail, dan edit tanpa error; badge hasil menampilkan "-" atau "Belum ada hasil".
4. MCU bertipe `Surat Sehat` yang belum sempat dikonversi SQL tidak membuat halaman crash (tipe tak dikenal ditampilkan apa adanya).
5. Hasil `Follow-Up` / `Temporary Unfit` pada form tambah tetap muncul di halaman Follow-Up, dan Follow-Up bisa menyelesaikannya dengan hasil akhir + catatan.

## File Structure
- Buat: `migrations/20261113_01_remove_approval_workflow.sql`, `server/activeUser.js`, `tests/legacy/no-workflow.test.js`, `tests/legacy/migration-remove-workflow.test.js`, `docs/runbooks/REMOVE-APPROVAL-WORKFLOW.md`.
- Hapus: `api/workflow/`, `server/workflow/`, `mcu-management/pages/{validasi-mcu,profil-dokter,keputusan-bergabung}.html`, `mcu-management/js/pages/{validasi-mcu,profil-dokter,keputusan-bergabung}.js`, `mcu-management/css/workflow.css`, `mcu-management/js/services/{workflowService,analyticsEligibilityService}.js`, `mcu-management/js/utils/{workflowErrorPresenter,workflowIdempotency,whatsappShare,mcuFormOrder}.js`, `tests/workflow/*` yang menguji workflow.
- Ubah: lihat tiap tugas.

---

### Task 1: Migrasi SQL penghapusan workflow

**Files:**
- Create: `migrations/20261113_01_remove_approval_workflow.sql`
- Test: `tests/legacy/migration-remove-workflow.test.js`

**Interfaces:** Produces: berkas SQL satu transaksi (`BEGIN`/`COMMIT`) yang dijalankan manual.

- [ ] **Step 1: Tulis tes yang gagal.** `migration-remove-workflow.test.js` membaca berkas SQL dan menegaskan: berisi `mcu_approval_workflow_enabled` dengan `'false'::jsonb`; `UPDATE public.mcus` ke `'approved_legacy'` dengan `claimed_by = NULL`; `UPDATE public.employees` `joining_status = 'joined'`; `UPDATE public.mcus SET mcu_type = 'Annual'` untuk `'Surat Sehat'`; `DROP TRIGGER IF EXISTS zzz_validate_health_certificate_history`; `mcus_mcu_type_check` tanpa `Surat Sehat`; `UPDATE public.users SET active = false` untuk `role = 'Dokter'`; diawali `BEGIN;` dan diakhiri `COMMIT;`; tidak berisi `DROP TABLE` maupun `DELETE FROM`.
- [ ] **Step 2: Jalankan** `node --test tests/legacy/migration-remove-workflow.test.js`. Harapan: FAIL (berkas belum ada).
- [ ] **Step 3: Tulis SQL** dengan urutan: (a) komentar blok "daftar Surat Sehat" berisi `SELECT mcu_id, employee_id, mcu_date FROM public.mcus WHERE mcu_type='Surat Sehat'` untuk dicek manual (tidak mengubah apa pun); (b) flag off lewat `UPDATE public.app_settings SET setting_value='false'::jsonb, version=version+1 WHERE setting_key='mcu_approval_workflow_enabled'`; (c) normalisasi status MCU dan karyawan (nonaktifkan trigger penjaga sementara tidak perlu: flag sudah off di langkah b dalam transaksi yang sama, tetapi `workflow_is_enabled()` membaca setting, jadi urutan b sebelum c wajib); (d) tipe `Surat Sehat` jadi `Annual`, ganti constraint `mcus_mcu_type_check` ke `('Pre-Employee','Annual','Khusus','Final')`, drop trigger dan fungsi `workflow_validate_health_certificate_history`; (e) buat ulang tiga view (`v_current_reviewed_mcu`, `v_analytics_eligible_current`, `v_mcu_expiry_overview`) dari definisi `20260802_07_mcu_analytics_views.sql` dengan kolom yang sama, masa berlaku tetap 12 bulan (`expiry_months` = 12, `document_type` = `m.mcu_type`) tanpa pemanggilan `workflow_mcu_validity_months`, lalu `DROP FUNCTION public.workflow_mcu_validity_months(TEXT)`; (f) `UPDATE public.users SET active=false WHERE role='Dokter'`.
- [ ] **Step 4: Jalankan tes.** Harapan: PASS.
- [ ] **Step 5: Checkpoint.** `npm test`: hijau.

### Task 2: Server: hapus API workflow, rapikan API lain

**Files:**
- Create: `server/activeUser.js`
- Delete: `api/workflow/`, `server/workflow/`
- Modify: `vercel.json` (hapus `api/workflow/index.js` di `functions`), `api/delete-file/index.js`, `api/download-file/index.js`, `api/users/index.js`, `api/login/index.js`, `server/auth-utils.js` bila perlu, `server/r2SignedUrlService.js:43`, `tests/storage/delete-file-api.test.js`, `tests/security/users-api.test.js`, `tests/security/login.test.js`, `tests/workflow/r2-access.test.js`
- Test: ketiga berkas tes di atas

**Interfaces:**
- Produces: `loadActiveUser(claims, supabase?) -> Promise<{userId, username, displayName, role}>` di `server/activeUser.js`. Melempar `Error` dengan `statusCode = 401` bila token tanpa user (`UNAUTHORIZED`), `403` bila user tidak aktif, `500` bila gagal baca. Peran selain `Admin`/`Petugas` dianggap `403` dengan pesan `Peran tidak dikenali.`
- Consumes: pola penanganan error di `api/delete-file/index.js` (tangkap `error.statusCode`).

- [ ] **Step 1: Tulis tes yang gagal.** (a) delete-file: MCU dengan `workflow_status` apa pun menghapus file (200); user `role='Dokter'` ditolak 403. (b) users-api: `create` dengan `role: 'Dokter'` menghasilkan 400 dan tidak menulis ke DB; ROLES hanya dua. (c) login: akun `role='Dokter'` ditolak dengan pesan seragam `Username atau password salah` (401). (d) download-file / r2SignedUrlService: peran `Dokter` ditolak `canAccess` (fungsi di `r2SignedUrlService.js:43`).
- [ ] **Step 2: Jalankan** `node --test tests/storage tests/security`. Harapan: FAIL pada 4 kasus baru.
- [ ] **Step 3: Implementasi.** Salin `loadActiveUser` dan `getClaimUserId` ke `server/activeUser.js` (error biasa dengan `statusCode`, tanpa `WorkflowError`); ganti `require('../../server/workflow/authorization')` di delete-file dan download-file; hapus `EDITABLE_STATUSES` dan pengecekan status di delete-file (file MCU boleh dihapus selama pemanggil Admin/Petugas); `ROLES = ['Admin','Petugas']` di users; login menolak role selain dua itu sebelum menerbitkan JWT; `r2SignedUrlService.js:43` hanya `['Admin','Petugas']`. Hapus `api/workflow/` dan `server/workflow/` seluruhnya (font Poppins dan logo di `server/workflow/assets` ikut hilang; cek bahwa tidak ada pemakai lain: `grep -rn "workflow/assets" api server mcu-management`).
- [ ] **Step 4: Hapus tes workflow yang menguji kode terhapus:** `tests/workflow/{api-router,authorization,contracts,private-storage,referral-letter,workflow-service,migration-contract}.test.js`, `tests/workflow/security.sql`, `tests/workflow/state-machine.sql`, `tests/workflow/fixtures/`. Pindahkan `r2-access.test.js` ke `tests/storage/` dan sesuaikan impor agar tidak merujuk `server/workflow`.
- [ ] **Step 5: Verifikasi.** `node --test tests/storage tests/security`: PASS. `grep -rn "server/workflow\|api/workflow" api server vercel.json tests`: kosong.
- [ ] **Step 6: Checkpoint.** `npm test`: hijau (tes frontend workflow lama dibereskan di Tugas 8).

### Task 3: Role Dokter dicabut di sisi frontend

**Files:**
- Modify: `mcu-management/js/utils/roleAccess.mjs`, `mcu-management/js/services/authService.js:363` (hapus `isDoctor`), `mcu-management/pages/login.html:221`, `mcu-management/pages/kelola-user.html:174,216`, `mcu-management/js/pages/kelola-user.js:180`, `mcu-management/js/sidebar-manager.js`
- Test: `tests/resilience/role-access.test.js`

**Interfaces:** Produces: `PAGE_ROLES` tanpa kunci `validasi-mcu`, `profil-dokter`, `keputusan-bergabung`; `resolveAccess({role:'Dokter', page})` selalu `{allowed:false, redirectPage:null}`.

- [ ] **Step 1: Ubah tes.** Hapus kasus Dokter-ke-validasi; tambah: `resolveAccess({role:'Dokter', page:'dashboard'}).allowed === false` dengan `redirectPage === null`; `PAGE_ROLES` tidak punya kunci tiga halaman itu; semua nilai `PAGE_ROLES` hanya berisi `Admin`/`Petugas`.
- [ ] **Step 2: Jalankan** `node --test tests/resilience/role-access.test.js`. Harapan: FAIL.
- [ ] **Step 3: Implementasi.** Hapus `DOCTOR`, tiga kunci halaman, dan entri `Dokter` di `HOME_PAGE`. Di `login.html` redirect selalu `../index.html` (edit satu baris). Di kelola-user hapus dua `<option value="Dokter">` dan cabang badge Dokter. Di `sidebar-manager.js` hapus menu Dokter (Validasi MCU, Review Follow-Up, Riwayat Review, Profil & Tanda Tangan), menu Keputusan Bergabung, fungsi badge `data-workflow-badge`, dan pemanggilan `/api/workflow?action=bootstrap` (sekitar baris 257).
- [ ] **Step 4: Verifikasi.** Tes role-access PASS; `grep -n "Dokter\|workflow\|keputusan\|validasi-mcu" mcu-management/js/sidebar-manager.js mcu-management/js/utils/roleAccess.mjs`: kosong.
- [ ] **Step 5: Checkpoint.**

### Task 4: Hapus halaman dan aset workflow

**Files:**
- Delete: tiga pasang halaman + js (lihat File Structure), `mcu-management/css/workflow.css`, `workflowService.js`, `workflowErrorPresenter.js`, `workflowIdempotency.js`, `whatsappShare.js`
- Modify: `mcu-management/sw.js` (hapus path terhapus dari pra-cache, naikkan `CACHE_VERSION` sesuai pola berkas), `mcu-management/version.json` dan `mcu-management/package.json` (naikkan versi sesuai pola), `mcu-management/js/router/spaRouter.js`, `mcu-management/js/components/fileUploadWidget.js:17`, `mcu-management/js/services/databaseAdapter-transforms.js:114-115`, `mcu-management/js/pages/mcu-expiry-management.js`, `mcu-management/js/utils/diffHelpers.js` (hanya jika memetakan field workflow), `tests/performance/page-lifecycle-contract.test.js`
- Test: `tests/legacy/no-workflow.test.js`

**Interfaces:** Produces: tes kontrak `no-workflow` dengan tiga pernyataan: (1) tidak ada berkas di `mcu-management/{js,pages,css}`, `api`, `server` yang mengandung `/workflow|Workflow|validasi-mcu|keputusan-bergabung|profil-dokter|Surat Sehat|mcuFormOrder/` (pengecualian: komentar `// legacy` bila perlu, daftar pengecualian eksplisit di tes); (2) setiap path pra-cache di `sw.js` ada di disk (relatif ke `mcu-management/`); (3) setiap impor relatif `.js/.mjs` di `mcu-management/js` menunjuk berkas yang ada.

- [ ] **Step 1: Tulis tes `no-workflow`** seperti di atas. Jalankan: FAIL (daftar pelanggaran jadi daftar kerja).
- [ ] **Step 2: Hapus berkas** dan ganti pemakai: `fileUploadWidget.js` memakai `showToast` / `Swal` biasa sebagai pengganti `ensureWorkflowAlerts`; hapus impor dan kunci `workflowStatus`/`workflowVersion` dari transform; spaRouter tidak lagi mengenal tiga halaman.
- [ ] **Step 3: `mcu-expiry-management.js` dan `.html`:** hapus panel pengaturan ambang (`data-lifecycle-region="expiry-setting"`, tombol preview/apply, input bulan), `bindExpirySettingActions`, `previewExpiryImpact`, `applyExpirySetting`, `loadExpirySetting`; teks subjudul: `MCU berlaku 12 bulan sejak tanggal pemeriksaan.`
- [ ] **Step 4: Perbarui `page-lifecycle-contract.test.js`** agar tidak menyebut region/halaman terhapus.
- [ ] **Step 5: Verifikasi.** Kasus (2) dan (3) PASS; kasus (1) masih menyisakan hanya `tambah-karyawan`, `kelola-karyawan`, `follow-up`, `mcuExpiryService` (dikerjakan Tugas 5 sampai 8).
- [ ] **Step 6: Checkpoint.**

### Task 5: Form Tambah Karyawan & MCU

**Files:**
- Modify: `mcu-management/pages/tambah-karyawan.html`, `mcu-management/js/pages/tambah-karyawan.js`
- Test: `tests/legacy/no-workflow.test.js` (tambah kasus form)

**Interfaces:** Consumes: `mcuBatchService.saveMCUWithLabResults(mcuData, labResults, currentUser) -> {success, errors, data:{mcu, labSaved, labFailed}}`. Produces: form dengan `#mcu-result` dan `#mcu-notes` selalu tampil dan `required`.

- [ ] **Step 1: Tulis tes kontrak.** Untuk `tambah-karyawan.html`: ada `id="mcu-result"` dan `id="mcu-notes"` dengan atribut `required`; tidak ada `workflow-review-notice`, `data-mcu-order`, `data-mcu-canonical-order`, `mcuFormOrder.js`, `Surat Sehat`; urutan indeks teks heading: `Pemeriksaan` < `Kebiasaan`/Lifestyle < `Pemeriksaan Penglihatan` < `Pemeriksaan Lab` < `Pemeriksaan Penunjang` < `Riwayat Kesehatan` < `Data Rujukan` < `Hasil`. Untuk `tambah-karyawan.js`: tidak ada `workflowService`, `workflowEnabled`, `submitCreatedMcuForReview`, `configureWorkflowMode`; `initialResult` dibaca dari `#mcu-result`.
- [ ] **Step 2: Jalankan.** FAIL.
- [ ] **Step 3: HTML.** Kembalikan judul sesuai versi `git show cf1fd5d^:mcu-management/pages/tambah-karyawan.html` (heading "Pemeriksaan", "Pemeriksaan Lab", label "Diberikan Oleh (Dokter) *"); hapus semua atribut `data-mcu-*`, script `mcuFormOrder.js`, opsi Surat Sehat, notice workflow; bungkus `#mcu-result-section` dihapus (Hasil tampil biasa).
- [ ] **Step 4: JS.** Hapus `configureWorkflowMode`, `submitCreatedMcuForReview`, variabel `workflowEnabled`/`workflowStateKnown`, impor workflow, logika `savedDraft`; `initialResult`/`initialNotes` dibaca langsung dari form; toast sukses `MCU berhasil disimpan!`; hapus pemakaian `normalizeMcuDataForType`/`isHealthCertificate`.
- [ ] **Step 5: Verifikasi.** Tes kontrak PASS; `node --check mcu-management/js/pages/tambah-karyawan.js`.
- [ ] **Step 6: Checkpoint.**

### Task 6: Kelola Karyawan (detail, edit, tambah MCU, antrian koreksi)

**Files:**
- Modify: `mcu-management/pages/kelola-karyawan.html`, `mcu-management/js/pages/kelola-karyawan.js` (±114 baris bersangkutan)
- Test: `tests/legacy/no-workflow.test.js`

**Interfaces:** Consumes: `mcuService.update(mcuId, updateData, currentUser)` dan `mcuService.getById`. Produces: edit MCU yang boleh mengubah `initialResult`, `initialNotes`, `finalResult` langsung.

- [ ] **Step 1: Tulis tes kontrak.** `kelola-karyawan.html` tidak memuat `workflow-correction-section`, `data-mcu-order`, `mcuFormOrder.js`, `Surat Sehat`; `kelola-karyawan.js` tidak memuat `workflow`, `isEditableWorkflowStatus`, `currentWorkflowDetail`, `correctionQueue`; ada `edit-mcu-final-result` yang diterapkan tanpa kondisi `workflowEnabled`.
- [ ] **Step 2: Jalankan.** FAIL.
- [ ] **Step 3: HTML.** Hapus seksi "Tindakan MCU" (`workflow-correction-*`), atribut urutan, opsi Surat Sehat; kembalikan judul sesuai `git show cf1fd5d^:mcu-management/pages/kelola-karyawan.html` hanya untuk heading/label, bukan struktur lain.
- [ ] **Step 4: JS, per fungsi** (jangan sapu sekaligus): hapus antrian koreksi (~baris 360-380), cek `isEditableWorkflowStatus` (baris 65), `currentWorkflowDetail`/`workflowEditStatus`/`freshVersion` pada simpan edit (~2440-2630), cabang `if (!workflowEnabled && finalResult)` jadi tanpa kondisi, status MCU di detail memakai `finalResult || initialResult` (fungsi hasil efektif baris ~121-135 tetap). MCU berhasil dibuka dan dapat diedit semua status. Jalankan `node --check` setelah tiap kelompok perubahan.
- [ ] **Step 5: Hasil kosong aman.** Pada `getStatusBadge` (atau pembuat badge yang dipakai kolom hasil) pastikan nilai kosong menampilkan `Belum ada hasil`, bukan `undefined`/error. Tes: kontrak string `Belum ada hasil` hadir di `kelola-karyawan.js`.
- [ ] **Step 6: Verifikasi.** Tes PASS; `grep -nE "workflow|Workflow|Surat Sehat|Dokter" mcu-management/js/pages/kelola-karyawan.js`: hanya sisa label "Diberikan Oleh (Dokter)" / nama dokter pemeriksa.
- [ ] **Step 7: Checkpoint.**

### Task 7: Follow-Up

**Files:**
- Modify: `mcu-management/pages/follow-up.html`, `mcu-management/js/pages/follow-up.js` (±67 baris bersangkutan)
- Test: `tests/legacy/no-workflow.test.js`

**Interfaces:** Produces: halaman Follow-Up dengan alur lama (Petugas/Admin mengisi hasil akhir + catatan; tombol "Rujukan" memanggil `window.downloadRujukanPDFAction(mcuId)` yang sudah ada di `follow-up.js:234`).

- [ ] **Step 1: Tulis tes kontrak.** `follow-up.js`: tidak ada `workflowEnabled`, `workflowService`, `referralButton`, `submit-followup`; ada `downloadRujukanPDFAction`. `follow-up.html`: tidak ada `Surat Sehat`, `mcuFormOrder.js`, `data-mcu-order`, `followup-result-field` dengan kelas `hidden` awal.
- [ ] **Step 2: Jalankan.** FAIL.
- [ ] **Step 3: Implementasi.** Ambil cabang `!workflowEnabled` sebagai satu-satunya jalur di setiap `if (workflowEnabled) {...} else {...}`; hasil akhir dan catatan wajib (baris ~732 dan ~343-346); daftar follow-up menyaring MCU dengan hasil `Follow-Up`/`Temporary Unfit` (logika pra-workflow; bandingkan `git show cf1fd5d^:mcu-management/js/pages/follow-up.js`). Hapus bagian "evidence"/siklus review bila hanya melayani workflow.
- [ ] **Step 4: Verifikasi.** `node --check`; tes PASS; `grep -nE "workflow|Workflow" mcu-management/js/pages/follow-up.js`: kosong.
- [ ] **Step 5: Checkpoint.**

### Task 8: Hapus Surat Sehat, mcuFormOrder, dan sisa tes lama

**Files:**
- Delete: `mcu-management/js/utils/mcuFormOrder.js`, `tests/workflow/mcu-form-order.test.js`, `tests/workflow/frontend-contract.test.js`
- Modify: `mcu-management/js/services/mcuExpiryService.js`, `mcu-management/js/pages/dashboard.js`, `mcu-management/js/services/analysisDashboardService.js`, `mcu-management/js/utils/mcuFormReader.js` (hanya bila memakai fungsi terhapus), `tests/workflow/mcu-form-reader.test.js` (pindah ke `tests/legacy/` bila masih relevan)
- Test: `tests/legacy/no-workflow.test.js`, `tests/legacy/expiry.test.js`

**Interfaces:** Produces: `mcuExpiryService.calculateExpiry(mcuDate: string, today?: Date) -> {expiryDate: Date, daysLeft: number, status: 'EXPIRED'|'WARNING'|'OK'}` (ekstrak logika yang sudah ada di `loadEmployeesWithMCU`, 365 hari, peringatan 60 hari).

- [ ] **Step 1: Tulis tes.** `expiry.test.js`: `calculateExpiry('2026-01-01', new Date('2026-12-01'))` -> `daysLeft` 31, `status` `WARNING`; `'2025-01-01'` dengan `today` 2026-11-13 -> `EXPIRED`; `'2026-10-01'` -> `OK`; `no-workflow` test: kasus (1) penuh (tanpa sisa pelanggaran).
- [ ] **Step 2: Jalankan.** FAIL.
- [ ] **Step 3: Implementasi.** Buat/ekstrak `calculateExpiry` di `mcuExpiryService.js` (pembacaan view `v_mcu_expiry_overview` dan hitungan per tipe dihapus bila ada; baca langsung tabel `employees` + `mcus`). Hapus sisa referensi `Surat Sehat`/`validity` di dashboard dan analysis. Hapus `mcuFormOrder.js` dan tesnya.
- [ ] **Step 4: Verifikasi.** `npm test`: semua hijau, termasuk kasus (1) bersih. `grep -rniE "workflow|surat sehat|health.?certificate" mcu-management/js mcu-management/pages api server`: kosong.
- [ ] **Step 5: Checkpoint.**

### Task 9: Build, dokumentasi rilis, daftar uji manual

**Files:**
- Create: `docs/runbooks/REMOVE-APPROVAL-WORKFLOW.md`
- Modify: `docs/qa/QA-REPORT-2026-11-09.md` (tambah baris status), `mcu-management/sw.js` / `version.json` bila belum dinaikkan di Tugas 4

- [ ] **Step 1: `npm test` dan `npm run build`** dari root. Harapan: semua tes lulus; build sukses; `dist/` tidak memuat `validasi-mcu`, `profil-dokter`, `keputusan-bergabung`, `workflow`.
- [ ] **Step 2: Tulis runbook** berisi: urutan rilis (SQL, deploy, isi hasil MCU kosong); query pemeriksaan sebelum SQL (daftar Surat Sehat, jumlah MCU per `workflow_status`, akun Dokter); query verifikasi sesudah SQL (flag `false`, tidak ada status selain `approved_legacy`, Dokter nonaktif); daftar uji manual: login Admin/Petugas, login Dokter ditolak, tambah MCU langsung muncul di Kelola Karyawan tanpa antrian, Hasil/Catatan wajib, urutan form, edit MCU lama dengan hasil kosong lalu isi, Follow-Up selesai dengan hasil akhir, unduh Rujukan, halaman MCU Expired tampil 12 bulan, upload dan hapus lampiran di semua status, hard refresh memperbarui service worker, menu tanpa Validasi/Keputusan/Profil Dokter.
- [ ] **Step 3: Perbarui laporan QA** (baris "Approval workflow dihapus: kode + tes selesai, SQL belum dijalankan, belum diuji browser").
- [ ] **Step 4: Checkpoint akhir.** Laporkan ke pengguna: hasil tes dan build, file yang dihapus, apa yang belum diuji, dan tanya apakah mau di-commit.
