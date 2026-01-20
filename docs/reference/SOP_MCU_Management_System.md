# STANDAR OPERASIONAL PROSEDUR (SOP)
# SISTEM MANAJEMEN DATA PEMERIKSAAN KESEHATAN (MCU)
## PT. [NAMA PERUSAHAAN PERTAMBANGAN]

**Tanggal Berlaku:** November 2024
**Periode Review:** Tahunan / Sesuai Kebutuhan
**Versi:** 1.0
**Status:** Approved

---

## 1. PENDAHULUAN

### 1.1 Latar Belakang

Sistem Manajemen Data Pemeriksaan Kesehatan (MCU Management System) adalah aplikasi terintegrasi yang dirancang untuk mengelola, menyimpan, dan menganalisis data pemeriksaan kesehatan karyawan sesuai dengan peraturan perundang-undangan yang berlaku di Indonesia, khususnya di sektor pertambangan.

### 1.2 Dasar Hukum

Standar Operasional Prosedur ini berpedoman pada:

1. **Undang-Undang No. 1 Tahun 1970** tentang Keselamatan Kerja
   - Pasal 3: Pengusaha wajib melaksanakan syarat-syarat kesehatan dan keselamatan kerja
   - Pasal 12: Pengusaha wajib menyediakan dan menyelenggarakan pembinaan bagi tenaga kerja

2. **Peraturan Pemerintah No. 50 Tahun 2012** tentang Penerapan Sistem Manajemen Keselamatan dan Kesehatan Kerja (SMK3)
   - Bagian V: Pemeriksaan Kesehatan Kerja
   - Pasal 22-24: Perencanaan, pelaksanaan, dan evaluasi pemeriksaan kesehatan

3. **Peraturan Menteri Ketenagakerjaan No. 4 Tahun 2016** tentang Kesehatan dan Keselamatan Kerja di Sektor Pertambangan
   - Bab VI: Kesehatan Kerja dan Pemeriksaan Kesehatan
   - Pasal 126-135: Jenis, frekuensi, dan standar pemeriksaan kesehatan

4. **Peraturan Menteri Kesehatan No. 48 Tahun 2016** tentang Standar Keselamatan dan Kesehatan Kerja di Perkantoran
   - Pasal 7: Pemeriksaan Kesehatan Berkala

5. **Undang-Undang No. 8 Tahun 1997** tentang Dokumen Perusahaan
   - Pasal 1-3: Penyimpanan dokumen harus aman dan dapat diakses

6. **Peraturan Pemerintah No. 18 Tahun 2016** tentang Perangkat Daerah
   - Pasal 46: Pemeliharaan arsip dan dokumentasi

### 1.3 Tujuan

Tujuan SOP Sistem MCU Management System adalah:

1. **Keselamatan Kerja**: Memastikan setiap karyawan mendapatkan pemeriksaan kesehatan berkala sesuai standar industri pertambangan
2. **Kepatuhan Regulasi**: Mematuhi semua peraturan perundang-undangan yang berlaku
3. **Dokumentasi Komprehensif**: Menyimpan data pemeriksaan kesehatan dengan aman dan terstruktur
4. **Analisis Data**: Mengidentifikasi tren kesehatan dan risiko kesehatan karyawan
5. **Manajemen Intervensi**: Melacak dan mengelola tindak lanjut kesehatan karyawan
6. **Transparansi**: Memberikan akses informasi kesehatan kepada stakeholder yang berwenang

### 1.4 Ruang Lingkup

SOP ini berlaku untuk:

- **Pengguna**: Petugas Medis (Dokter/Perawat), Petugas Kesehatan & Keselamatan Kerja (SHE Manager), HRD
- **Data**: Semua data pemeriksaan kesehatan karyawan (Pre-Employment, Annual, Khusus, Follow-up, Final)
- **Sistem**: Aplikasi MCU Management System terintegrasi dengan database
- **Proses**: Pendaftaran, pemeriksaan, input data, analisis, reporting, dan dokumentasi

---

## 2. DEFINISI & ISTILAH

| Istilah | Definisi |
|---------|----------|
| **MCU** | Medical Check Up - Pemeriksaan Kesehatan Berkala |
| **Karyawan** | Tenaga kerja yang bekerja di perusahaan |
| **Petugas Medis** | Dokter, perawat, atau ahli kesehatan bersertifikat |
| **SHE Manager** | Petugas Kesehatan & Keselamatan Kerja |
| **Lab Item** | Jenis pemeriksaan laboratorium (SGOT, Hemoglobin, dll) |
| **Pemeriksaan Lab** | Hasil dari item pemeriksaan tertentu |
| **Status Kesehatan** | Fit, Fit with Note, Temporary Unfit, Follow-up, Unfit |
| **Risk Level** | Klasifikasi risiko kesehatan (Green/Yellow/Red) |
| **Audit Trail** | Catatan perubahan data untuk keperluan audit |
| **Follow-up** | Tindak lanjut pemeriksaan kesehatan |
| **Final Assessment** | Hasil evaluasi kesehatan akhir |

---

## 3. STRUKTUR ORGANISASI & TANGGUNG JAWAB

### 3.1 Petugas Medis (Dokter/Perawat)

**Tanggung Jawab:**
- Melaksanakan pemeriksaan kesehatan sesuai standar medis
- Input data hasil pemeriksaan ke sistem MCU
- Menentukan status kesehatan (Fit/Unfit)
- Membuat rujukan untuk follow-up atau penanganan lebih lanjut
- Menjaga kerahasiaan data medis karyawan (privacy)
- Memastikan akurasi data laboratorium

**Wewenang:**
- Akses penuh ke data medis karyawan
- Merekomendasikan tindakan kesehatan
- Merujuk ke spesialis jika diperlukan

### 3.2 SHE Manager (Kesehatan & Keselamatan Kerja)

**Tanggung Jawab:**
- Merencanakan jadwal pemeriksaan kesehatan
- Mengidentifikasi karyawan yang due untuk MCU
- Melakukan analisis tren kesehatan
- Membuat laporan kesehatan berkala
- Mengelola follow-up kesehatan
- Memastikan compliance dengan regulasi K3

**Wewenang:**
- Akses ke data agregat kesehatan karyawan
- Membuat rekomendasi program kesehatan
- Mengisi dashboard analytics

### 3.3 HRD (Human Resources Department)

**Tanggung Jawab:**
- Mengelola data karyawan (nama, ID, department, job title)
- Koordinasi pemeriksaan kesehatan dengan medis
- Input data karyawan baru ke sistem
- Memastikan karyawan mengikuti MCU tepat waktu

**Wewenang:**
- Akses ke data karyawan (bukan medis)
- Membuat laporan kehadiran MCU

### 3.4 Administrator Sistem

**Tanggung Jawab:**
- Mengelola akses pengguna dan permission
- Backup dan maintenance database
- Troubleshooting teknis
- Audit trail monitoring

**Wewenang:**
- Super admin access
- Manajemen user dan role

---

## 4. JENIS-JENIS PEMERIKSAAN KESEHATAN

Berdasarkan **Permenaker No. 4 Tahun 2016**, pemeriksaan kesehatan dibagi menjadi:

### 4.1 Pre-Employment Medical Check Up

**Definisi**: Pemeriksaan kesehatan calon karyawan sebelum masuk bekerja

**Kapan**: Sebelum kontrak kerja ditandatangani

**Tujuan**:
- Memastikan calon karyawan fit untuk posisi yang ditawarkan
- Mengidentifikasi kondisi kesehatan pre-existing
- Baseline data kesehatan

**Frekuensi**: 1 kali per calon karyawan

**Item Pemeriksaan**:
- Pemeriksaan klinis lengkap
- 14 jenis pemeriksaan lab standar (sesuai job requirement)
- Pemeriksaan khusus (radiologi, audiometri, spirometri, EKG) sesuai kebutuhan

**Output Sistem**:
- Laporan kesehatan Pre-Employment
- Status Fit/Unfit
- Rekomendasi penempatan

---

### 4.2 Annual Medical Check Up (Pemeriksaan Kesehatan Berkala)

**Definisi**: Pemeriksaan kesehatan berkala tahunan untuk semua karyawan

**Kapan**: Setiap tahun, biasanya pada periode tertentu (Januari-Maret atau sesuai jadwal perusahaan)

**Tujuan**:
- Memantau status kesehatan karyawan
- Mendeteksi penyakit dini
- Mengidentifikasi perubahan kesehatan dari tahun sebelumnya
- Basis perencanaan program kesehatan

**Frekuensi**: 1 kali per tahun per karyawan

**Item Pemeriksaan**:
- 14 jenis pemeriksaan lab standar
- Pemeriksaan klinis (tekanan darah, BMI, temperatur, dll)
- Pemeriksaan penunjang sesuai age group dan job risk

**Output Sistem**:
- Laporan annual MCU
- Tren kesehatan tahunan
- Risk assessment

---

### 4.3 Special/Periodic Medical Check Up

**Definisi**: Pemeriksaan kesehatan khusus untuk karyawan di area kerja dengan risiko tinggi atau atas indikasi medis

**Kapan**: Sesuai job exposure (Mining: 6 bulan - 1 tahun tergantung area kerja)

**Tujuan**:
- Monitoring kesehatan untuk high-risk occupations
- Deteksi occupational diseases
- Evaluasi efektivitas kontrol risiko

**Frekuensi**: Disesuaikan dengan exposure risk (6 bulan - 1 tahun)

**Item Pemeriksaan**:
- Pemeriksaan sesuai occupational hazard
- Contoh untuk mining: spirometri, radiologi paru, hearing test
- Lab khusus (heavy metals, asbestos fiber) jika applicable

**Output Sistem**:
- Laporan pemeriksaan khusus
- Alerting untuk abnormal findings

---

### 4.4 Follow-Up Medical Check Up

**Definisi**: Pemeriksaan lanjutan berdasarkan hasil MCU sebelumnya yang menunjukkan kondisi abnormal atau incomplete follow-up

**Kapan**: Sesuai rekomendasi dari petugas medis (2 minggu - 3 bulan)

**Tujuan**:
- Verifikasi temuan abnormal
- Monitoring kondisi kesehatan karyawan
- Evaluasi efektivitas treatment

**Frekuensi**: Sesuai kebutuhan medis

**Item Pemeriksaan**:
- Disesuaikan dengan kondisi spesifik karyawan
- Focused pada area yang memerlukan follow-up

**Output Sistem**:
- Status follow-up (Complete/Pending/Overdue)
- Hasil follow-up dan tindak lanjut

---

### 4.5 Final Assessment Medical Check Up

**Definisi**: Pemeriksaan kesehatan saat karyawan keluar/pensiun dari perusahaan

**Kapan**: Sebelum karyawan resmi keluar/pensiun

**Tujuan**:
- Dokumentasi final status kesehatan
- Baseline untuk benefit/claim pasca kerja
- Dokumentasi untuk keperluan legal

**Frekuensi**: 1 kali per karyawan (saat keluar)

**Item Pemeriksaan**:
- Pemeriksaan komprehensif (lab + klinis)
- Dibandingkan dengan baseline pre-employment

**Output Sistem**:
- Final Assessment Report
- Health Status Summary (perjalanan kesehatan selama bekerja)

---

## 5. PROSEDUR OPERASIONAL

### 5.1 PROSEDUR: Registrasi/Pendaftaran Karyawan

**Tujuan**: Memasukkan data karyawan baru ke dalam sistem

**Penanggung Jawab**: HRD / Admin Sistem

**Frekuensi**: Setiap ada karyawan baru

**Langkah-Langkah**:

1. **Input Data Karyawan Dasar**
   - Employee ID (unique, format: EMP-YYYY-NNNN)
   - Nama lengkap
   - Tanggal lahir
   - Jenis kelamin
   - Nomor identitas (KTP/Paspor)
   - Alamat
   - Nomor telepon/email

2. **Input Data Pekerjaan**
   - Posisi/Job Title
   - Department
   - Tanggal masuk (hire date)
   - Status (Aktif/Non-Aktif)
   - Area kerja (jika applicable untuk mining)

3. **Verifikasi Data**
   - Pastikan tidak ada duplikasi Employee ID
   - Cek kelengkapan data
   - Validasi format data

4. **Simpan ke Database**
   - Sistem secara otomatis membuat record
   - Generate employee profile

5. **Dokumentasi**
   - Print/simpan receipt registrasi
   - Arsip dokumen pendukung

**Dokumentasi Output**:
- Employee Registration Form
- Employee ID Card (jika perlu)

**Audit Trail**: Sistem otomatis mencatat waktu input, user, dan perubahan data

---

### 5.2 PROSEDUR: Pre-Employment Medical Check Up

**Tujuan**: Melakukan pemeriksaan kesehatan calon karyawan sebelum employment

**Penanggung Jawab**: Petugas Medis dengan koordinasi HRD

**Frekuensi**: Setiap ada calon karyawan

**Waktu Pelaksanaan**: Sebaiknya dalam 2 minggu setelah job offer

**Langkah-Langkah**:

#### Phase 1: Persiapan (HRD)
1. Koordinasikan dengan calon karyawan untuk jadwal pemeriksaan
2. Sediakan form medical history (riwayat kesehatan)
3. Verifikasi data calon karyawan
4. Pastikan pemeriksaan dilakukan di faskes terakreditasi

#### Phase 2: Pemeriksaan Medis (Petugas Medis)
1. **Anamnesis (Wawancara Medis)**
   - Riwayat kesehatan sebelumnya
   - Obat-obatan yang dikonsumsi
   - Alergi
   - Kebiasaan (merokok, alkohol)
   - Riwayat penyakit keluarga

2. **Pemeriksaan Klinis**
   - Tekanan darah (BP)
   - Detak jantung (Pulse rate)
   - Respirasi (RR)
   - Temperatur
   - Tinggi/Berat badan (BMI)
   - Pemeriksaan fisik (mata, telinga, hidung, tenggorokan)
   - Auskultasi paru
   - Palpasi abdomen

3. **Pemeriksaan Laboratorium** (14 item standar):
   - SGOT (Serum Glutamic-Oxaloacetic Transaminase)
   - SGPT (Serum Glutamic-Pyruvic Transaminase)
   - Hemoglobin
   - Hematocrit
   - Leukosit (WBC)
   - Trombosit (Platelet)
   - Glukosa Puasa
   - Kolesterol Total
   - Trigliserida
   - HDL
   - LDL
   - Ureum
   - Kreatinin
   - Bilirubin Total

4. **Pemeriksaan Penunjang** (sesuai job requirement):
   - X-Ray (Foto Paru PA - untuk mining/high dust exposure)
   - EKG (Elektrokardiografi - untuk posisi >45 tahun atau dengan risk factors)
   - Audiometri (Hearing test - untuk high noise area)
   - Spirometri (Lung function - untuk high dust exposure)
   - Tes kesehatan khusus lainnya sesuai job

5. **Integrasi dengan Sistem**:
   - Buka aplikasi MCU Management System
   - Pilih "Tambah Karyawan"
   - Pilih tipe MCU: "Pre-Employment"
   - Input semua hasil pemeriksaan:
     - Data pribadi karyawan
     - Hasil pemeriksaan klinis
     - Hasil lab 14 item (sistem auto-calculate status: Normal/Low/High)
     - Hasil pemeriksaan penunjang
     - Catatan medis

6. **Evaluasi & Assessment**
   - Dokter mengevaluasi semua hasil
   - Tentukan status kesehatan:
     - **FIT**: Karyawan dapat bekerja tanpa pembatasan
     - **FIT WITH NOTE**: Karyawan dapat bekerja dengan pembatasan/monitoring tertentu
     - **TEMPORARY UNFIT**: Karyawan tidak dapat bekerja untuk periode tertentu
     - **UNFIT**: Karyawan tidak dapat bekerja di posisi yang ditawarkan
   - Buat rekomendasi (jika ada)

7. **Dokumentasi**
   - Simpan laporan ke sistem (auto-save saat input selesai)
   - Print laporan resmi dengan stempel & tanda tangan dokter
   - Arsip dokumen fisik

8. **Follow-up** (jika needed)
   - Jika ada hasil abnormal, schedule follow-up
   - Komunikasikan hasil kepada calon karyawan
   - Jika unfit, konsultasi dengan HR untuk alternatif

**Dokumentasi Output**:
- Pre-Employment Medical Report (signed by doctor)
- Lab Results
- Radiologi/Penunjang Report (jika ada)
- Recommendation Letter (jika ada)

**Audit Trail**: Sistem mencatat tanggal, petugas medis, semua input data, dan perubahan status

**Standar Waktu**: Hasil pemeriksaan harus tersedia dalam 3-5 hari kerja

---

### 5.3 PROSEDUR: Annual Medical Check Up

**Tujuan**: Melakukan pemeriksaan kesehatan berkala tahunan

**Penanggung Jawab**: SHE Manager (planning), Petugas Medis (execution)

**Frekuensi**: 1 kali per tahun per karyawan

**Waktu Pelaksanaan**: Periode yang ditentukan (mis: Januari-Februari setiap tahun)

**Langkah-Langkah**:

#### Phase 1: Planning & Scheduling (SHE Manager)
1. **Tentukan Periode MCU**
   - Tetapkan bulan MCU tahunan (mis: Januari-Februari)
   - Informasikan ke semua karyawan minimal 2 minggu sebelumnya

2. **Identifikasi Karyawan**
   - Pull list semua karyawan aktif dari sistem
   - Verifikasi yang sudah/belum MCU tahun ini
   - Prioritaskan karyawan dengan overdue MCU

3. **Scheduling**
   - Buat jadwal MCU per department
   - Koordinasikan dengan department manager
   - Informasikan kepada karyawan via email/notice

4. **Persiapan Logistik**
   - Konfirmasi slot dengan faskes medis
   - Siapkan form pengisian data
   - Siapkan transport (jika perlu)

#### Phase 2: Pemeriksaan (Petugas Medis)
1. **Pre-Check**
   - Verifikasi identitas karyawan
   - Tanyakan kondisi kesehatan terkini
   - Ambil tekanan darah awal

2. **Anamnesis**
   - Tanyakan perkembangan kesehatan sejak tahun lalu
   - Keluhan kesehatan saat ini
   - Obat-obatan
   - Perubahan gaya hidup

3. **Pemeriksaan Klinis** (same as Pre-Employment):
   - BP, Pulse, RR, Temperature, BMI
   - Pemeriksaan fisik
   - Auskultasi paru
   - Palpasi abdomen

4. **Pemeriksaan Laboratorium** (14 item standar)

5. **Pemeriksaan Penunjang** (sesuai job risk & history):
   - Minimal X-Ray untuk mining exposure
   - EKG untuk age >45 tahun
   - Audiometri/Spirometri untuk high risk area
   - Follow-up spesifik untuk keluhan tahun lalu

6. **Input ke Sistem MCU**
   - Buka aplikasi MCU Management
   - Pilih "Kelola Karyawan" → cari karyawan
   - Pilih "Tambah MCU" atau "Edit MCU"
   - Pilih tipe: "Annual MCU"
   - Input semua hasil pemeriksaan
   - Sistem auto-calculate normal ranges berdasarkan lab item definitions
   - Status (Normal/Low/High) auto-generate untuk setiap item
   - Dokter tentukan final assessment: Fit/Fit with Note/Unfit/Follow-up

7. **Review & Comparison**
   - Sistem otomatis tampilkan hasil tahun lalu (trend)
   - Identifikasi perubahan signifikan
   - Buat catatan jika ada perubahan status

8. **Assessment & Recommendation**
   - Tentukan status kesehatan final
   - Buat rekomendasi (if any):
     - Dietary changes
     - Lifestyle modification
     - Treatment
     - Follow-up test
     - Work restriction
   - Jika abnormal: schedule follow-up dalam 2-4 minggu

9. **Dokumentasi**
   - Sistem auto-save semua input
   - Print report official (dengan header perusahaan, stempel dokter)
   - Arsip dokumen fisik + scan digital

#### Phase 3: Post-MCU (SHE Manager)

1. **Follow-up Tracking**
   - Monitor karyawan dengan status Fit with Note/Follow-up
   - Buat reminder untuk follow-up appointment
   - Track completion status

2. **Analytics & Reporting**
   - Dashboard MCU secara otomatis generate:
     - Total MCU completion rate
     - Status distribution (Fit/Unfit/etc)
     - Top abnormalities found
     - Department comparison
   - Identifikasi tren kesehatan
   - Highlight areas yang memerlukan intervensi

3. **Program Kesehatan**
   - Berdasarkan analisis data, rekomendasikan program:
     - Health education
     - Wellness program
     - Safety improvement
     - Occupational health control
   - Sosialisasikan ke manajemen

4. **Reporting**
   - Monthly: Monitor progress MCU
   - Quarterly: Management report dengan analytics
   - Annual: Comprehensive health report (untuk compliance regulasi)

**Dokumentasi Output**:
- Annual MCU Report
- Lab Results
- Trend Analysis (sistem auto-generate)
- Management Report (analytics dashboard)
- Follow-up Schedule (untuk abnormal findings)

**Audit Trail**: Sistem mencatat semua input, perubahan, waktu, user untuk setiap pemeriksaan

**Standar Waktu**:
- Hasil lab dalam 3-5 hari
- Input ke sistem dalam 5-7 hari
- Report completed dalam 2 minggu

**Target Completion**: 100% karyawan aktif MCU dalam periode yang ditentukan

---

### 5.4 PROSEDUR: Follow-Up Medical Check Up

**Tujuan**: Melakukan pemeriksaan lanjutan untuk karyawan dengan abnormal findings

**Penanggung Jawab**: Petugas Medis dengan reminder dari SHE Manager

**Frekuensi**: Sesuai kebutuhan medis (triggered oleh hasil MCU abnormal)

**Waktu Pelaksanaan**: Sesuai rekomendasi dokter (2-12 minggu setelah MCU)

**Langkah-Langkah**:

#### Phase 1: Identification & Scheduling (SHE Manager)
1. **Identify Cases**
   - Review MCU reports dengan status abnormal
   - Identify karyawan yang perlu follow-up
   - Prioritaskan berdasarkan severity

2. **Schedule Follow-up**
   - Tentukan jadwal follow-up per rekomendasi dokter
   - Input ke sistem dengan status "Pending"
   - Kirim notifikasi ke karyawan

3. **Track Status**
   - Monitor yang sudah completed vs overdue
   - Send reminder untuk overdue follow-up
   - Eskalasi ke HR jika perlu

#### Phase 2: Follow-Up Examination (Petugas Medis)
1. **Pre-Examination**
   - Review original MCU report
   - Identifikasi area yang perlu re-check
   - Verifikasi keluhan/treatment sejak MCU

2. **Focused Examination**
   - Sesuai dengan area abnormal (not full MCU)
   - Contoh: jika SGOT tinggi → fokus liver function
   - Contoh: jika BP tinggi → fokus cardiovascular

3. **Follow-up Investigations**
   - Repeat lab test yang abnormal
   - Additional test jika diperlukan (ultrasound, ECG, dll)
   - Specialist referral jika needed

4. **Input ke Sistem**
   - Buka karyawan di sistem
   - Buka MCU yang abnormal → "Edit MCU" atau "Add Follow-up"
   - Input hasil follow-up examination
   - Update status (Completed/Referred to Specialist/Etc)
   - Buat catatan tindak lanjut

5. **Assessment & Action**
   - Evaluasi: apakah sudah normal atau masih abnormal
   - Jika normal: close the follow-up case
   - Jika masih abnormal:
     - Refer to specialist
     - Recommend treatment
     - Schedule another follow-up
     - Consider work restriction
   - Jika severe: coordinate dengan HR untuk intervention

6. **Dokumentasi**
   - Print follow-up report
   - Arsip di employee medical file
   - Update sistem dengan final status

#### Phase 3: Closure & Monitoring
1. **Case Closure**
   - Mark follow-up sebagai completed di sistem
   - Archive documentation
   - Send notification ke karyawan

2. **Ongoing Monitoring**
   - Jika ada treatment: monitor compliance
   - Schedule next check jika perlu
   - Document in employee health profile

**Dokumentasi Output**:
- Follow-up Examination Report
- Lab/Investigation Results
- Clinical Assessment
- Action Plan & Recommendations
- Specialist Referral (jika ada)

**Audit Trail**: Sistem mencatat semua follow-up activities, dates, findings

**Standard Timeline**:
- Follow-up appointment: dalam 2-12 minggu sesuai rekomendasi
- Result availability: dalam 5-7 hari
- Case closure: max 15 hari setelah completed examination

---

### 5.5 PROSEDUR: Exit/Final Assessment Medical Check Up

**Tujuan**: Dokumentasi final status kesehatan saat karyawan keluar/pensiun

**Penanggung Jawab**: HRD (notification), Petugas Medis (examination)

**Frekuensi**: Setiap karyawan yang keluar/pensiun

**Waktu Pelaksanaan**: Dalam 2 minggu sebelum last working day

**Langkah-Langkah**:

1. **Notification** (HRD)
   - Terima notifikasi exit dari HR (resignation/retirement/etc)
   - Schedule final MCU
   - Komunikasikan ke karyawan dan medis

2. **Examination** (Petugas Medis)
   - Lakukan pemeriksaan komprehensif (similar to Annual MCU)
   - Compare dengan baseline pre-employment data
   - Identifikasi perubahan kesehatan selama masa kerja
   - Khusus mining: evaluate occupational health exposure impact

3. **Input ke Sistem**
   - Buka aplikasi MCU Management
   - Pilih "Kelola Karyawan" → cari karyawan
   - Pilih "Tambah MCU"
   - Pilih tipe: "Final Assessment"
   - Input semua hasil
   - Sistem auto-show comparison dengan pre-employment baseline
   - Buat summary: evaluasi perjalanan kesehatan selama bekerja

4. **Report & Documentation**
   - Print final assessment report
   - Include: baseline → current comparison
   - Include: summary of health journey
   - Signed by doctor + authorized personnel
   - Archive documentation

5. **Handover**
   - Serahkan copy report ke karyawan
   - Copy untuk employee file
   - Copy untuk HR/legal files (jika needed untuk benefit claim)

**Dokumentasi Output**:
- Final Assessment Medical Report
- Health Journey Summary
- Baseline Comparison Report
- Clearance Certificate (jika Fit for exit)

**Audit Trail**: Sistem mencatat exit date, final status, comparison data

---

## 6. DATA MANAGEMENT & SYSTEM SPECIFICATION

### 6.1 Data Structure

#### Database Schema (Reference)

```
TABLES:
├── employees (Master data karyawan)
│   ├── employee_id (PK)
│   ├── name
│   ├── date_of_birth
│   ├── gender
│   ├── identity_number (KTP/Paspor)
│   ├── department
│   ├── job_title
│   ├── hire_date
│   ├── status (Active/Inactive/Exit)
│   └── created_at, updated_at
│
├── mcus (Pemeriksaan MCU)
│   ├── mcu_id (PK) - Format: MCU-YYYY-EMP-SEQ
│   ├── employee_id (FK)
│   ├── mcu_type (Pre-Employment / Annual / Special / Follow-up / Final)
│   ├── mcu_date
│   ├── initial_result (status hasil)
│   ├── initial_notes
│   ├── final_result
│   ├── final_notes
│   ├── created_by (user/doctor)
│   ├── updated_by
│   └── deleted_at (soft delete)
│
├── lab_items (Master item pemeriksaan lab)
│   ├── id (PK)
│   ├── name (SGOT, SGPT, Hemoglobin, etc)
│   ├── unit (IU/L, g/dL, etc)
│   ├── min_range_reference (normal range bawah)
│   ├── max_range_reference (normal range atas)
│   ├── is_active
│   └── created_at, updated_at
│
├── pemeriksaan_lab (Hasil pemeriksaan lab per MCU)
│   ├── id (PK)
│   ├── mcu_id (FK)
│   ├── lab_item_id (FK)
│   ├── value (hasil pemeriksaan)
│   ├── unit
│   ├── min_range_reference (from lab_items)
│   ├── max_range_reference (from lab_items)
│   ├── notes (Normal/Low/High)
│   ├── created_by, updated_by
│   ├── deleted_at
│   └── created_at, updated_at
│
├── users (Pengguna sistem)
│   ├── user_id (PK)
│   ├── username
│   ├── role (Doctor / SHE Manager / HRD / Admin)
│   ├── name
│   ├── email
│   ├── is_active
│   └── created_at, updated_at
│
└── audit_trail (Audit log untuk compliance)
    ├── id (PK)
    ├── user_id (FK)
    ├── action (CREATE / UPDATE / DELETE / VIEW)
    ├── table_name
    ├── record_id
    ├── old_value
    ├── new_value
    ├── timestamp
    └── ip_address
```

### 6.2 Data Entry Standards

**Data Input Requirements:**

1. **Mandatory Fields** (wajib diisi):
   - Employee data: name, ID, department, job title, hire date
   - MCU data: mcu_date, mcu_type, initial_result
   - Lab results: value, lab_item_id (semua 14 item)
   - User info: doctor/petugas yang input

2. **Data Validation**:
   - Lab values harus numeric, > 0
   - Date format: YYYY-MM-DD
   - Status: hanya Fit/Unfit/Fit with Note/Follow-up/Temporary Unfit
   - No special characters kecuali "-" dan "("

3. **Data Format Standards**:
   - Phone: 62-xxx-xxxx
   - Email: valid format
   - Identity: numeric, length sesuai (KTP 16 digit, Paspor format)

### 6.3 Data Privacy & Security

Sesuai dengan **Undang-Undang No. 8 Tahun 1997** tentang Dokumen Perusahaan:

#### Access Control
- **Doctor**: Full access ke semua medical data
- **SHE Manager**: Access ke aggregate data saja (no individual medical details)
- **HRD**: Access ke employee data saja (no medical data)
- **Admin**: System-level access only

#### Data Protection
1. **Encryption**: Sensitive data (lab results, medical notes) encrypted at rest
2. **Password Policy**: Min 8 characters, alphanumeric + special char, expire 90 days
3. **Session Timeout**: Auto-logout setelah 30 menit idle
4. **Audit Trail**: Semua access dan perubahan dicatat dengan timestamp + user ID

#### Confidentiality
- Medical data adalah confidential dan protected by doctor-patient privilege
- Hanya authorized personnel yang dapat akses
- Pelanggaran privacy → disciplinary action

### 6.4 Data Retention & Archival

Berdasarkan **Peraturan Pemerintah No. 18 Tahun 2016** tentang Arsip:

**Retention Period**:
- Active MCU data: Stored permanently in active database
- Inactive employee data: Retained 5 years setelah exit (untuk potential claim/dispute)
- Follow-up data: 3 tahun (sufficient untuk occupational health follow-up)

**Archival Method**:
- Offline backup: Monthly encrypted backup to secure external drive
- Cloud backup: Daily encrypted backup to secure cloud (jika implementasi)
- Physical files: Stored in locked cabinet, fire-proof (jika ada physical copies)

**Disposal**:
- Setelah retention period: securely destroy atau anonymize
- Physical documents: shred atau burn
- Digital data: secure wipe atau encryption key destruction

### 6.5 System Availability & Maintenance

**Uptime SLA**: 99.5% (max 3.6 hours downtime/month)

**Backup Schedule**:
- Daily: Automated database backup
- Weekly: Full system backup
- Monthly: Offline archival backup

**Maintenance Window**:
- Scheduled maintenance: Monthly, non-business hours (22:00-06:00)
- Emergency maintenance: As needed, dengan notification

**Disaster Recovery**:
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 1 hour
- Alternate access method: PDF report copies untuk critical data

---

## 7. MCU ANALYSIS & REPORTING

### 7.1 Individual MCU Analysis

**Sistem otomatis generate untuk setiap MCU:**

1. **Lab Value Status**:
   - Green (Normal): Nilai dalam range
   - Yellow (At Risk): Nilai mendekati batas abnormal
   - Red (Abnormal): Nilai di luar normal range

2. **Risk Classification** (Weighted score):
   ```
   Risk Score = Σ(abnormal_items × weight)

   HIGH RISK (Red): Score ≥ 6 points
   - 3+ abnormal critical items (liver, kidney, cardiac)
   - Atau 5+ abnormal items total
   - Recommendation: Immediate follow-up, specialist referral

   MEDIUM RISK (Yellow): Score 3-5 points
   - 1-2 abnormal items
   - Atau borderline values
   - Recommendation: Follow-up in 4-8 weeks

   LOW RISK (Green): Score < 3 points
   - Normal values
   - Recommendation: Annual routine MCU
   ```

3. **Trend Analysis**:
   - Auto-compare dengan MCU tahun sebelumnya
   - Highlight significant changes (↑↓)
   - Flag new abnormalities
   - Track improvement/deterioration

### 7.2 Departmental Analysis

**Analytics Dashboard untuk SHE Manager:**

1. **Health Status Distribution**:
   - % Fit / Fit with Note / Unfit per department
   - Comparison dengan company average
   - Trend over time

2. **Top Health Concerns** (per department):
   - Most common abnormalities
   - Prevalence rate
   - Correlation dengan job/environment

3. **Follow-up Management**:
   - Pending follow-ups (overdue/upcoming)
   - Completion rate
   - Time to complete

4. **MCU Compliance**:
   - % of workforce completed MCU
   - Average MCU completion rate per month
   - Departments needing attention

### 7.3 Reports

#### Monthly Report (SHE Manager):
- MCU statistics: total conducted, compliance rate
- Key findings: new cases, trends
- Follow-up status: pending, completed, overdue
- Action items: recommendations for next month

#### Quarterly Report (Management):
- Department health profiles
- Risk assessment per department
- Health program recommendations
- Budget implications (if any healthcare interventions needed)

#### Annual Report (Compliance):
- Comprehensive health report
- MCU completion rates by category
- Occupational health analysis
- Trend analysis (3-5 years)
- Regulatory compliance statement
- Program effectiveness evaluation

---

## 8. QUALITY ASSURANCE & COMPLIANCE

### 8.1 Quality Standards

**Data Accuracy**:
- Lab results verified dengan lab report asli
- Double-check untuk critical values
- Monthly QC check: 10% random sample audit

**Timeliness**:
- MCU result input: max 7 hari
- Follow-up scheduling: max 3 hari
- Report generation: within 2 weeks

**Completeness**:
- All mandatory fields filled
- No incomplete or partial MCU records
- 100% employee coverage untuk annual MCU

### 8.2 Audit & Control

**Internal Audit**:
- Quarterly review of data accuracy
- Monthly review of follow-up compliance
- Random validation of 5-10 MCU records

**External Audit** (if required):
- Annual audit by certified occupational health provider
- Verification of regulatory compliance
- Assessment of data integrity

**Control Mechanisms**:
1. Input validation (system-level):
   - Data type checking
   - Range validation
   - Mandatory field checking

2. User role-based access:
   - Doctor: view + edit medical data
   - SHE: view aggregate data only
   - HRD: view employee data only
   - Admin: system management

3. Audit trail:
   - Every action logged with user/timestamp
   - Immutable records (can't delete, only soft-delete)
   - Export audit trail for compliance review

### 8.3 Regulatory Compliance Checklist

✓ **UU No. 1 Tahun 1970**:
- [ ] Pemeriksaan kesehatan dilakukan secara berkala
- [ ] Dokumentasi lengkap dan aman
- [ ] Hasil MCU dikomunikasikan ke karyawan

✓ **PP No. 50 Tahun 2012**:
- [ ] MCU program terencana dan terdokumentasi
- [ ] Follow-up untuk abnormal findings
- [ ] Data retention sesuai regulasi
- [ ] Involvement petugas medis bersertifikat

✓ **Permenaker No. 4 Tahun 2016** (Mining specific):
- [ ] Pre-employment MCU sebelum kerja
- [ ] Periodic MCU sesuai exposure (6-12 bulan)
- [ ] Special examination untuk high-risk areas
- [ ] Documentation of occupational exposure assessment

✓ **Permenkes No. 48 Tahun 2016**:
- [ ] All standard lab items included
- [ ] Doctor-conducted examination
- [ ] Professional report with recommendations

✓ **UU No. 8 Tahun 1997**:
- [ ] Secure document storage
- [ ] Proper archival and retention
- [ ] Access control and confidentiality

---

## 9. TRAINING & DOCUMENTATION

### 9.1 User Training

**For Petugas Medis**:
- System navigation (2 hours)
- Data entry procedures (3 hours)
- Clinical assessment in system (1 hour)
- Privacy & security (1 hour)
- Total: ~7 hours

**For SHE Manager**:
- Dashboard & analytics (2 hours)
- Report generation (1 hour)
- Follow-up management (1 hour)
- Data interpretation (2 hours)
- Total: ~6 hours

**For HRD**:
- Employee management (1 hour)
- System basics (1 hour)
- Reporting (1 hour)
- Total: ~3 hours

### 9.2 Documentation

All users must have access to:
- User manual (for each role)
- Quick reference guide (laminated card)
- Troubleshooting guide
- Contact person for support (Admin)

### 9.3 Continuous Improvement

**Review Schedule**:
- Quarterly: System performance review
- Semi-annual: Process improvement assessment
- Annual: Full SOP review and update

**Change Management**:
- Any process change requires documentation
- Staff retraining if major change
- Update SOP and user manual
- Version control and approval tracking

---

## 10. INCIDENT & ESCALATION

### 10.1 Common Issues & Resolution

| Issue | Solution | Escalation |
|-------|----------|-----------|
| Lab result not available | Contact lab directly | Admin if 5+ days late |
| System not accessible | Restart browser/computer | Admin if persist > 1 hour |
| Data entry error | Can edit if <24h old | Cannot edit if >24h old, create addendum |
| Abnormal finding | Immediate doctor review | SHE Manager for follow-up |
| Missing follow-up | SHE Manager reminder | HR if karyawan non-cooperative |

### 10.2 Escalation Path

1. **Level 1**: User self-service (check manual, restart)
2. **Level 2**: Admin support (data entry help, access issues)
3. **Level 3**: Medical supervisor (clinical decision, assessment)
4. **Level 4**: Management (policy exception, resources)

---

## 11. ATTACHMENT & APPENDIX

### Appendix A: Form Templates

- [ ] Pre-Employment MCU Form
- [ ] Annual MCU Form
- [ ] Follow-up Request Form
- [ ] Medical History Questionnaire
- [ ] Informed Consent Form

### Appendix B: Lab Reference Values

| Lab Item | Normal Range | Unit |
|----------|--------------|------|
| SGOT | 0-40 | IU/L |
| SGPT | 0-44 | IU/L |
| Hemoglobin | 12-16 (women), 13-17 (men) | g/dL |
| Hematocrit | 36-46 | % |
| Leukosit | 4.5-11 | 10^3/μL |
| Trombosit | 150-400 | 10^3/μL |
| Glukosa Puasa | 70-100 | mg/dL |
| Kolesterol Total | <200 | mg/dL |
| Trigliserida | <150 | mg/dL |
| HDL | >40 | mg/dL |
| LDL | <100 | mg/dL |
| Ureum | 10-50 | mg/dL |
| Kreatinin | 0.6-1.2 | mg/dL |
| Bilirubin Total | 0.1-1.2 | mg/dL |

### Appendix C: Health Risk Classification

**Mining-Specific Occupational Health Considerations**:

1. **High Dust Exposure** (open pit, drilling, blasting):
   - Additional screening: CXR, spirometry, dust exposure assessment
   - Frequency: 6-monthly

2. **Noise Exposure** (heavy equipment, drilling):
   - Additional screening: Audiometry
   - Frequency: Annual

3. **Heat Exposure** (underground, tropical climate):
   - Additional screening: Electrolyte, kidney function
   - Frequency: 6-monthly

4. **Chemical Exposure** (processing, smelting):
   - Additional screening: Heavy metals, specific chemicals
   - Frequency: Based on exposure assessment

---

## 12. APPROVAL & SIGNATURE

**Document Information**:
- Version: 1.0
- Date: November 2024
- Effective Date: [DATE]
- Next Review: November 2025

**Approval**:

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Medical Director / Chief Medic | _________________ | __________ | ________ |
| SHE Manager / HSE Director | _________________ | __________ | ________ |
| HR Manager | _________________ | __________ | ________ |
| Company Management Representative | _________________ | __________ | ________ |

---

**End of Document**

---

## NOTES FOR IMPLEMENTATION:

1. **Customize untuk perusahaan Anda**:
   - Ganti [NAMA PERUSAHAAN PERTAMBANGAN] dengan nama perusahaan
   - Sesuaikan departement structure
   - Adjust MCU period sesuai mining type

2. **Untuk area mining yang specific**:
   - Tambahkan occupational hazard assessment
   - Adjust lab items jika ada specific exposure (heavy metals, asbestos, dll)
   - Increase monitoring frequency sesuai risk

3. **Regulasi tambahan yang mungkin applicable**:
   - Check dengan local mining authority untuk updated regulations
   - Peraturan daerah (provinsi/kabupaten) mungkin punya requirement tambahan
   - Peraturan operator (IUP holder) mungkin lebih strict

4. **Para implementasi aplikasi**:
   - Pastikan fitur analytics & reporting di sistem MCU management sudah sesuai SOP
   - Training staff berdasarkan materi yang disediakan
   - Start dengan pilot untuk 1-2 department dulu
   - Scale up setelah process mature

5. **Maintenance SOP**:
   - Review tahunan dengan stakeholder
   - Update sesuai regulatory changes
   - Document semua improvement
   - Archive old versions untuk compliance/audit

---

**Dokumen ini adalah template comprehensive dan dapat di-customize sesuai kebutuhan spesifik perusahaan Anda.**
