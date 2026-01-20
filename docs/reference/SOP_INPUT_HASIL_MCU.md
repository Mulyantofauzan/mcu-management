# PANDUAN OPERASIONAL
# INPUT HASIL PEMERIKSAAN KESEHATAN (MCU) KE SISTEM
## PT. [NAMA PERUSAHAAN PERTAMBANGAN]

**Versi**: 1.0
**Tanggal**: November 2024
**Berlaku Untuk**: Petugas Medis, SHE Manager, HRD

---

## 1. TUJUAN

Panduan ini memberikan instruksi praktis untuk **memasukkan hasil pemeriksaan MCU ke dalam Sistem MCU Management** dengan benar dan sesuai standar.

**Fokus**: Pencatatan dan input data hasil MCU
**Tidak termasuk**: Prosedur pemeriksaan medis, analisis klinis, diagnosis

---

## 2. PENGGUNA & PERAN

| Peran | Tanggung Jawab |
|------|-----------------|
| **Petugas Medis** | Melakukan pemeriksaan, input hasil ke sistem |
| **SHE Manager** | Monitor progress, manage follow-up, cek completion |
| **HRD** | Register karyawan baru, schedule MCU |
| **Admin Sistem** | Manage access, backup, troubleshooting |

---

## 3. PERSIAPAN SEBELUM INPUT

### 3.1 Data yang Harus Disiapkan

**Sebelum membuka sistem, pastikan sudah punya:**

1. ✓ Identitas karyawan:
   - Employee ID
   - Nama lengkap
   - Tanggal lahir
   - Posisi/Department

2. ✓ Hasil pemeriksaan klinis (sudah dicatat di form fisik):
   - Tekanan darah (BP)
   - Detak jantung (Pulse)
   - Respirasi (RR)
   - Temperatur
   - Tinggi/Berat badan & BMI

3. ✓ Hasil pemeriksaan laboratorium (dari lab):
   - 14 jenis lab standard (SGOT, SGPT, Hemoglobin, dll)
   - Masing-masing dengan value + unit

4. ✓ Tipe MCU yang dilakukan:
   - Pre-Employment / Annual / Special / Follow-up / Final

5. ✓ Tanggal pemeriksaan

### 3.2 Akses Sistem

**Login ke aplikasi MCU Management**:
1. Buka: `http://[server-ip]/mcu-management`
2. Masukkan Username & Password
3. Role akan otomatis determine apa yang bisa diakses

---

## 4. STEP-BY-STEP: INPUT HASIL MCU

### STEP 1: Pilih Menu "Kelola Karyawan" atau "Tambah Karyawan"

**Untuk Karyawan Baru:**
- Klik **"Tambah Karyawan"**
- Masukkan data personal
- Sistem akan auto-generate Employee ID
- Proceed ke Step 2

**Untuk Karyawan Existing:**
- Klik **"Kelola Karyawan"**
- Cari karyawan (by name/ID)
- Klik tombol **"Edit"** atau **"Tambah MCU"**
- Proceed ke Step 2

---

### STEP 2: Tentukan Tipe MCU

Sistem akan menampilkan form dengan pilihan tipe MCU:

```
Tipe MCU:
○ Pre-Employment (Pemeriksaan calon karyawan)
○ Annual (Pemeriksaan tahunan)
○ Special (Pemeriksaan khusus)
○ Follow-up (Pemeriksaan lanjutan)
○ Final Assessment (Pemeriksaan saat keluar)
```

**Pilih sesuai jenis pemeriksaan yang sedang dilakukan.**

---

### STEP 3: Input Data Dasar MCU

Form akan tampil dengan field-field:

| Field | Format | Contoh | Mandatory |
|-------|--------|--------|-----------|
| MCU Date | YYYY-MM-DD | 2024-11-20 | ✓ Yes |
| Doctor | Dropdown | Dr. Budi Santoso | ✓ Yes |
| Notes | Text | Pemeriksaan rutin tahunan | ○ Optional |

**Cara isi:**
1. **MCU Date**: Klik field → pilih tanggal dari calendar
2. **Doctor**: Click dropdown → pilih nama dokter yang melakukan pemeriksaan
3. **Notes**: Ketik catatan jika ada (optional)

---

### STEP 4: Input Pemeriksaan Klinis

Sistem akan menampilkan field-field untuk hasil klinis:

| Field | Unit | Normal Range | Contoh Input |
|-------|------|--------------|--------------|
| BMI | - | - | 22.5 |
| Blood Pressure (BP) | mmHg | 90-120/60-80 | 120/80 |
| Pulse Rate | bpm | 60-100 | 75 |
| Respiratory Rate | /min | 12-20 | 16 |
| Temperature | °C | 36.5-37.5 | 37.0 |

**Cara isi:**
1. Klik field untuk BMI
2. Ketik nilai numerik
3. Lanjut ke field berikutnya (BP, Pulse, dll)
4. Sistem otomatis akan highlight jika nilai out of range

**Tips:**
- Gunakan decimal point (.) bukan comma (,)
- Untuk BP: tulis format `120/80` (systolic/diastolic)

---

### STEP 5: Input Pemeriksaan Laboratorium (14 Item)

Sistem akan menampilkan **form grid dengan 14 item lab**:

```
┌────────────────────────────────────────────────────────────┐
│ PEMERIKSAAN LAB - Semua field WAJIB diisi                  │
└────────────────────────────────────────────────────────────┘

┌──────────────┬──────────┬──────────┬──────────────┐
│ Item Name    │ Value    │ Unit     │ Status       │
├──────────────┼──────────┼──────────┼──────────────┤
│ SGOT         │ [input]  │ IU/L     │ [auto]       │
│ SGPT         │ [input]  │ IU/L     │ [auto]       │
│ Hemoglobin   │ [input]  │ g/dL     │ [auto]       │
│ ...          │   ...    │ ...      │ ...          │
└──────────────┴──────────┴──────────┴──────────────┘
```

**14 Item Lab yang harus diisi:**

| # | Item | Unit | Normal Range | Contoh |
|---|------|------|--------------|--------|
| 1 | SGOT | IU/L | 0-40 | 32 |
| 2 | SGPT | IU/L | 0-44 | 28 |
| 3 | Hemoglobin | g/dL | 12-16 | 14.5 |
| 4 | Hematocrit | % | 36-46 | 43 |
| 5 | Leukosit | 10³/μL | 4.5-11 | 7.2 |
| 6 | Trombosit | 10³/μL | 150-400 | 250 |
| 7 | Glukosa Puasa | mg/dL | 70-100 | 95 |
| 8 | Kolesterol Total | mg/dL | <200 | 180 |
| 9 | Trigliserida | mg/dL | <150 | 120 |
| 10 | HDL | mg/dL | >40 | 50 |
| 11 | LDL | mg/dL | <100 | 85 |
| 12 | Ureum | mg/dL | 10-50 | 35 |
| 13 | Kreatinin | mg/dL | 0.6-1.2 | 0.9 |
| 14 | Bilirubin Total | mg/dL | 0.1-1.2 | 0.8 |

**Cara isi:**

1. **Klik input field** untuk item pertama (SGOT)
2. **Ketik nilai numerik** (contoh: 32)
3. **Tekan Tab atau Enter** → move ke item berikutnya
4. **Repeat untuk semua 14 item** (mandatory)
5. **Status otomatis berubah**:
   - Green ✓ = Normal (dalam range)
   - Yellow ⚠ = Borderline (mendekati limit)
   - Red ✗ = Abnormal (di luar range)

**PENTING:**
- ✗ **JANGAN** lewatkan item apapun - semua harus diisi
- ✓ Gunakan nilai dari hasil lab asli (lab report)
- ✓ Decimal points jika ada (contoh: 14.5, bukan 14,5)
- ✓ Sistem otomatis compare dengan normal range

---

### STEP 6: Input Pemeriksaan Penunjang (Conditional)

Sesuai tipe MCU dan job requirement, ada field tambahan:

**Contoh untuk Mining High-Risk Area:**

| Field | Input Type | Contoh |
|-------|-----------|--------|
| X-Ray Paru | Text/Select | Normal / Infiltrat / Pleuritis |
| Audiometri | Text | Normal / Gangguan Pendengaran |
| Spirometri | Text | Normal / Restritif / Obstruktif |

**Cara isi:**
- Dropdown atau text sesuai tipe field
- Ambil hasil dari form pemeriksaan penunjang
- **Optional** - boleh kosong jika tidak dilakukan

---

### STEP 7: Tentukan Status Akhir & Catatan

Sistem akan menampilkan field untuk assessment final:

**Status Kesehatan:**
```
○ Fit (Layak bekerja tanpa batasan)
○ Fit with Note (Layak dengan pembatasan/monitoring)
○ Temporary Unfit (Tidak layak untuk periode tertentu)
○ Follow-up Required (Perlu follow-up pemeriksaan)
○ Unfit (Tidak layak untuk posisi ini)
```

**Catatan/Notes:**
```
[Text field untuk catatan dokter]
Contoh: "Hasil lab normal, namun BP sedikit tinggi.
Recommend lifestyle modification dan recheck dalam 4 minggu"
```

**Cara isi:**
1. **Pilih satu status** berdasarkan evaluasi klinis
2. **Ketik catatan** (opsional tapi recommended)
3. Sistem akan save semuanya

---

### STEP 8: Review & Simpan

Sebelum klik "Simpan", **review seluruh data:**

**Checklist:**
- [ ] Semua data personal benar
- [ ] Tanggal MCU tepat
- [ ] Semua 14 lab items terisi
- [ ] Status dipilih
- [ ] Tidak ada error message di form

**Klik tombol "Simpan Hasil MCU"**

```
System akan:
1. Validate semua mandatory fields
2. Save data ke database
3. Generate MCU ID otomatis (jika baru)
4. Tampilkan confirmation message
5. Redirect ke summary/list view
```

---

## 5. COMMON INPUT SCENARIOS

### Scenario A: Input Annual MCU untuk Karyawan Existing

**Flow:**
1. Kelola Karyawan → Search karyawan by name
2. Klik "Edit" pada karyawan
3. Pilih "Tambah MCU"
4. Tipe MCU: **Annual**
5. Fill semua data (klinis + lab 14 item)
6. Status: **Fit** / **Fit with Note** / **Follow-up** (sesuai kondisi)
7. Klik Simpan

**Durasi**: 10-15 menit per karyawan

---

### Scenario B: Input Follow-Up MCU (karena hasil abnormal)

**Flow:**
1. Kelola Karyawan → Cari karyawan
2. Klik "Lihat Detail MCU Sebelumnya"
3. Review hasil MCU sebelumnya (sistem auto-show)
4. Klik "Tambah Follow-up"
5. Tipe MCU: **Follow-up**
6. Fill hasil follow-up (bisa partial, focused pada area abnormal)
7. Status: apakah sekarang **Normal** atau **Masih Abnormal**?
8. Klik Simpan

**Sistem akan:**
- Auto-compare dengan MCU sebelumnya
- Highlight perubahan (naik/turun)
- Track completion status

---

### Scenario C: Karyawan Baru Pre-Employment

**Flow:**
1. Klik "Tambah Karyawan"
2. Masukkan data personal
3. Langsung lanjut ke MCU form
4. Tipe MCU: **Pre-Employment**
5. Fill semua hasil pemeriksaan
6. Status: **Fit** atau **Unfit untuk posisi ini**
7. Klik Simpan
8. Sistem auto-generate Employee ID

---

## 6. ERROR HANDLING

### Error: "Field wajib diisi"

**Penyebab**: Ada field mandatory yang kosong
**Solusi**:
- Lihat field mana yang highlight merah
- Isi dengan nilai numerik (jangan kosong)
- Khusus 14 lab items: semua harus ada nilai

---

### Error: "Nilai tidak valid"

**Penyebab**: Format input salah (text, simbol, dll)
**Solusi**:
- Gunakan angka saja (0-9, decimal point)
- Jangan pakai: koma, tanda khusus, text
- Contoh ✓: `14.5`, bukan `14,5` atau `tinggi`

---

### Error: "Nilai di luar range"

**Penyebab**: Bukan error, hanya warning
**Solusi**:
- Sistem akan highlight dengan warna (Yellow/Red)
- Ini normal untuk abnormal findings
- Review ulang nilai dari lab report
- Jika benar abnormal, status auto-set ke Yellow/Red

---

### Error: Data tidak tersimpan

**Penyebab**: Internet disconnect, session timeout, atau error server
**Solusi**:
1. Cek internet connection
2. Refresh page (data belum tentu hilang)
3. Coba login lagi
4. Hubungi Admin jika persist
5. **Backup**: Sebelum input panjang, catat di form fisik juga

---

## 7. AFTER INPUT: NEXT STEPS

### Setelah Klik "Simpan":

1. **Sistem auto-generate:**
   - MCU ID (format: MCU-YYYY-EMP-SEQ)
   - Timestamp
   - User who input

2. **Laporan otomatis di-generate:**
   - Print-friendly report
   - Klik "Print" untuk hardcopy

3. **Follow-up (jika status abnormal):**
   - SHE Manager akan notifikasi untuk follow-up
   - Schedule ulang pemeriksaan
   - Track completion

4. **Data tersimpan di:**
   - Database (backup otomatis daily)
   - Employee health file
   - MCU history (dapat dilihat tahun depan untuk trend)

---

## 8. DATA PRIVACY & SECURITY

**PENTING - Confidentiality:**

- ✗ **JANGAN share** hasil MCU ke orang yang tidak authorized
- ✗ **JANGAN biarkan** screen tertinggal terbuka
- ✓ **ALWAYS logout** saat selesai input
- ✓ **PASSWORD** change setiap 3 bulan
- ✓ **LOCK screen** jika perlu keluar sebentar (Ctrl+Alt+L)

**Akses Data:**
- **Petugas Medis**: Full access ke semua medical data
- **SHE Manager**: Only aggregate data (no individual details)
- **HRD**: Only employee data (no medical data)

---

## 9. QUICK REFERENCE

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Simpan | Ctrl+S |
| Cancel | Esc |
| Next Field | Tab |
| Previous Field | Shift+Tab |
| Submit Form | Enter (tombol Submit focused) |

### Copy-Paste Lab Values

**Jika lab report sudah digital (PDF):**
1. Copy table dari lab report
2. Paste ke excel dulu (organize)
3. Input manual ke sistem (untuk accuracy)
4. Verify dengan lab report asli

---

## 10. SUPPORT & TROUBLESHOOTING

| Issue | Contact | Response Time |
|-------|---------|----------------|
| Login problem | Admin Sistem | Within 1 hour |
| Data entry bug | IT Support | Within 2 hours |
| Clinical question | Medical Supervisor | Within 30 min |
| Lost password | Admin | Within 2 hours |

**Contact Detail:**
- Admin: [email/phone]
- Medical Supervisor: [name/phone]
- IT Support: [helpdesk number]

---

## 11. SUMMARY CHECKLIST

**Sebelum input MCU:**
- [ ] Data karyawan sudah terdaftar
- [ ] Form pemeriksaan fisik sudah lengkap
- [ ] Hasil lab sudah dari lab (hard copy)
- [ ] Sudah login ke sistem
- [ ] Tahu tipe MCU apa (Annual/Pre-emp/etc)

**Saat input:**
- [ ] Tanggal MCU tepat
- [ ] Nama dokter dipilih
- [ ] Semua 14 lab items diisi (mandatory)
- [ ] Status dipilih
- [ ] Review ulang sebelum simpan

**Setelah input:**
- [ ] Konfirmasi message muncul
- [ ] MCU ID ter-generate
- [ ] Print laporan untuk hardcopy
- [ ] Logout sistem
- [ ] Archive form fisik

---

**END OF GUIDE**

Untuk pertanyaan lebih lanjut, hubungi Medical Supervisor atau Admin Sistem.
