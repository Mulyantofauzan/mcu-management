# 🧪 MCU Management - Quick Testing Reference

## Lokasi Menu & Features

### 1. **Tambah Karyawan** (Add Employee & MCU)
**URL/Menu:** Sidebar → "Tambah Karyawan"
**Path:** `/mcu-management/pages/tambah-karyawan.html`

**Form Sections:**
```
┌─ Employee Data (required)
│  ├─ Nama: Text input
│  ├─ Jabatan: Datalist (job titles)
│  ├─ Departemen: Dropdown (departments)
│  ├─ Tanggal Lahir: Date picker
│  ├─ Jenis Kelamin: Dropdown [Laki-laki, Perempuan] ✨ NEW
│  ├─ Golongan Darah: Dropdown
│  └─ Status Karyawan: Dropdown [Company, Vendor]
│
├─ MCU Data (can fill now or later)
│  ├─ Pemeriksaan Section:
│  │  ├─ BMI: Number
│  │  ├─ Tekanan Darah: Text (e.g., 120/80)
│  │  ├─ RR (Frequensi Nafas): Text ✨ NEW (e.g., 20 /m)
│  │  ├─ Nadi: Text ✨ NEW (e.g., 80 /m)
│  │  ├─ Suhu: Text ✨ NEW (e.g., 36.5 °C)
│  │  ├─ Penglihatan: Text
│  │  └─ ... (other exam fields)
│  │
│  ├─ Rujukan Section (opsional): ✨ NEW
│  │  ├─ Keluhan Utama: Textarea
│  │  ├─ Diagnosis Kerja: Textarea
│  │  └─ Alasan Dirujuk: Textarea
│  │
│  └─ Hasil Section:
│     ├─ Hasil Awal: Dropdown [Fit, Fit With Note, ...]
│     └─ Catatan Awal: Textarea
│
└─ Behavior:
   ├─ Click "Simpan MCU" → Saves successfully
   ├─ Modal does NOT auto-close ✨ CHANGED
   ├─ Success message says: "Silakan copy data sebelum menutup"
   └─ User manually clicks "Batal" to close

```

**Test Scenario 1: Add Employee dengan Jenis Kelamin**
```
1. Click "Tambah Karyawan"
2. Fill employee form:
   - Nama: Budi Santoso
   - Jabatan: Manager
   - Departemen: IT
   - Tanggal Lahir: 1990-05-15
   - Jenis Kelamin: Perempuan ← Baru!
   - Golongan Darah: O+
   - Status: Company
3. Click "Tambah MCU"
4. Fill MCU form with all fields (including RR, Nadi, Suhu)
5. Click "Simpan MCU"
6. ✓ Verify: Modal tetap terbuka (manual close)
7. ✓ Verify: Bisa copy data
8. Click "Batal" untuk close
```

---

### 2. **Follow-Up** (MCU Follow-Up & PDF)
**URL/Menu:** Sidebar → "Follow-Up"
**Path:** `/mcu-management/pages/follow-up.html`

**Page Structure:**
```
┌─ Search & Filter
│  ├─ Search by name/ID
│  └─ View hasil MCU yang perlu follow-up
│
├─ Follow-Up Modal (first modal)
│  ├─ Hasil Akhir: Dropdown
│  ├─ Catatan Akhir: Textarea
│  ├─ Buttons:
│  │  ├─ Batal
│  │  ├─ 📄 Download Surat Rujukan ✨ NEW
│  │  └─ Simpan & Lanjut Update MCU
│  └─ Behavior:
│     ├─ Click "Download Surat Rujukan"
│     ├─ PDF generated & downloaded
│     └─ Filename: Surat_Rujukan_[nama]_[date].pdf
│
└─ MCU Update Modal (second modal, after save)
   ├─ Pemeriksaan fields (with previous values as placeholder)
   ├─ Data Rujukan fields: ✨ NEW
   │  ├─ Keluhan Utama
   │  ├─ Diagnosis Kerja
   │  └─ Alasan Dirujuk
   └─ Button: Simpan Perubahan MCU
```

**Test Scenario 2: Follow-Up dengan Download PDF**
```
1. Go to Follow-Up menu
2. Search for employee dengan MCU status "Follow-Up"
3. Click "Update" button
4. Modal opens showing:
   - Previous values (BP, BMI, HBsAg, Hasil)
   - Form untuk Hasil Akhir & Catatan Akhir
5. ✓ Verify: "📄 Download Surat Rujukan" button visible
6. Fill form:
   - Hasil Akhir: Fit With Note
   - Catatan Akhir: Perlu kontrol 1 bulan
7. Click "📄 Download Surat Rujukan"
8. ✓ Verify: PDF downloaded
9. ✓ Verify: PDF contains:
   - Clinic header (SEKATA Medical Center)
   - Patient data (nama, umur, gender, jabatan, dept)
   - Physical exam values
   - Doctor signature area
10. Click "Simpan & Lanjut Update MCU"
11. Second modal opens dengan update fields
12. (Optional) Update RR, Nadi, Suhu, Keluhan, Diagnosis, Alasan
13. Click "Simpan Perubahan MCU"
14. ✓ Verify: Modal tetap terbuka (user can copy data)
15. Click "Batal" untuk close
```

---

### 3. **Kelola Karyawan** (View/Edit Employees)
**URL/Menu:** Sidebar → "Kelola Karyawan"
**Path:** `/mcu-management/pages/kelola-karyawan.html`

**Feature: Detail Modal**
```
┌─ Employee List dengan buttons:
│  ├─ 👁️ Detail button
│  ├─ ✏️ Edit button
│  ├─ ➕ Tambah MCU button
│  └─ 🗑️ Hapus button
│
├─ Detail Modal
│  ├─ Employee Info (2 columns):
│  │  ├─ Nama: [value]
│  │  ├─ ID: [value]
│  │  ├─ Jabatan: [value] ← Must NOT be "-"
│  │  ├─ Departemen: [value] ← Must NOT be "-"
│  │  ├─ Tanggal Lahir: [value] (dengan umur)
│  │  ├─ Golongan Darah: [value]
│  │  ├─ Status Karyawan: [value]
│  │  └─ Status Aktif: [badge]
│  │
│  └─ MCU History Table
│     └─ List semua MCU dengan detail
│
└─ Edit Modal
   ├─ Form fields:
   │  ├─ Nama: Text (editable)
   │  ├─ Jabatan: Dropdown ← Must show selected value
   │  ├─ Departemen: Dropdown ← Must show selected value
   │  ├─ Tanggal Lahir: Date
   │  ├─ Jenis Kelamin: Dropdown ← NEW
   │  ├─ Golongan Darah: Dropdown
   │  ├─ Status Karyawan: Dropdown
   │  └─ Status Aktif: Dropdown
   │
   └─ Buttons: Batal / Simpan
```

**Test Scenario 3: Detail Modal - Verify Data Display**
```
1. Go to Kelola Karyawan
2. Click 👁️ Detail button
3. Modal opens
4. ✓ Verify fields NOT showing "-":
   - Jabatan harus show nama (e.g., "Manager", bukan "-")
   - Departemen harus show nama (e.g., "IT", bukan "-")
5. ✓ Verify employee info:
   - Tanggal Lahir + calculated age
   - Golongan Darah correct
   - Status visible
6. ✓ Verify MCU history table shows all MCU records
7. Close modal
```

**Test Scenario 4: Edit Modal - Verify Dropdown Selection**
```
1. Go to Kelola Karyawan
2. Click ✏️ Edit button
3. Modal opens
4. ✓ Verify Jabatan dropdown is pre-selected:
   - Current jabatan should be selected (highlight)
   - Not empty or "-"
5. ✓ Verify Departemen dropdown is pre-selected:
   - Current dept should be selected (highlight)
   - Not empty or "-"
6. ✓ Verify Jenis Kelamin dropdown shows correct gender
7. Change Jabatan to different one
8. Change Departemen to different one
9. Click "Simpan"
10. ✓ Verify: Edit success message
11. ✓ Verify: Next time open detail, data is updated correctly
12. ✓ Verify: Jabatan & Departemen NOT "-" in detail modal
```

---

### 4. **Dashboard** (Activity Log & Charts)
**URL/Menu:** Sidebar → "Dashboard"
**Path:** `/mcu-management/pages/dashboard.html`

**Features:**
```
┌─ Activity Log Card (top right)
│  ├─ Shows 5 most recent activities
│  ├─ Each activity shows:
│  │  ├─ User Name (not user ID) ✨ FIXED
│  │  ├─ Action (create, update)
│  │  ├─ Entity (employee name, MCU ID)
│  │  └─ Timestamp
│  │
│  └─ Example: "John Doe create MCU M001 untuk Budi Santoso"
│     (previously would show "User ID: u123" instead of "John Doe")
│
├─ Trend MCU Chart (line chart)
│  ├─ Shows monthly MCU count
│  ├─ ✨ FIXED: Now shows only latest MCU per employee
│  │  (previously counted all MCU including duplicates)
│  └─ Example: Jan=5, Feb=3, Mar=4 (not duplicates)
│
└─ Other Charts:
   ├─ Department Distribution
   ├─ Age Distribution
   └─ BMI Distribution
```

**Test Scenario 5: Activity Log - Verify User Names**
```
1. Create new employee (or MCU)
2. Go to Dashboard
3. Check Activity Log card
4. ✓ Verify activities show:
   - User name (e.g., "Mulyanto") NOT user ID
   - Correct action type
   - Correct entity details
   - Correct timestamp
```

**Test Scenario 6: MCU Trend Chart - Verify Latest Only**
```
1. Check MCU Trend Chart on Dashboard
2. ✓ Verify numbers are reasonable:
   - Should NOT show very high numbers (duplicate counting)
   - Should roughly match number of employees with MCU
3. Example: If 10 employees and avg 1.2 MCU each:
   - Trend should show ~12 total, not 50+ (duplicate)
```

---

## 🔍 Key Fields to Verify

### Employee Form (Tambah Karyawan)
- [ ] Jenis Kelamin field visible, dropdown with options
- [ ] MCU section has RR, Nadi, Suhu fields
- [ ] MCU section has Rujukan subsection
- [ ] Modal doesn't auto-close after save

### Follow-Up Page
- [ ] "📄 Download Surat Rujukan" button visible
- [ ] PDF downloads successfully
- [ ] PDF filename includes employee name & date
- [ ] PDF shows correct data
- [ ] RR, Nadi, Suhu, Keluhan, Diagnosis, Alasan fields in form
- [ ] Modal doesn't auto-close after update

### Kelola Karyawan
- [ ] Detail modal: Jabatan & Departemen NOT "-"
- [ ] Detail modal: Shows employee gender (if filled)
- [ ] Edit modal: Jabatan dropdown pre-selected
- [ ] Edit modal: Departemen dropdown pre-selected
- [ ] Edit modal: Gender dropdown pre-selected
- [ ] After edit, data persists correctly

### Dashboard
- [ ] Activity log shows user NAMES (not IDs)
- [ ] MCU Trend chart shows reasonable numbers

---

## 📊 Database Verification

To verify database changes in Supabase:

```sql
-- Check employees table has gender column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'employees' AND column_name = 'jenis_kelamin';
-- Expected: jenis_kelamin

-- Check mcus table has new columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'mcus'
AND column_name IN ('respiratory_rate', 'pulse', 'temperature',
                    'keluhan_utama', 'diagnosis_kerja', 'alasan_rujuk');
-- Expected: All 6 columns visible

-- Verify sample data
SELECT employee_id, name, jenis_kelamin FROM employees LIMIT 5;
-- Expected: jenis_kelamin should have values (default 'Laki-laki')
```

---

## ✅ Final Checklist

- [ ] All fields visible in forms
- [ ] Data saves correctly to database
- [ ] Edit modals show pre-selected values
- [ ] Activity log shows user names
- [ ] PDF generates successfully
- [ ] Modal manual close works
- [ ] Jabatan/Departemen not showing "-"
- [ ] MCU trend chart shows correct numbers
- [ ] All new fields appear in create/update
- [ ] Database migration columns exist

---

**Status:** Ready for QA Testing
**Documentation:** FINAL_SUMMARY.md for comprehensive details
