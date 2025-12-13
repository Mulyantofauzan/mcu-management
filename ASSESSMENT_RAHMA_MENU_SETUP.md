# ASSESSMENT RAHMA - MENU SETUP GUIDE

## Integrasi Menu "Assessment RAHMA" ke Sidebar

Panduan ini menunjukkan bagaimana cara menambahkan menu **Assessment RAHMA** ke sidebar aplikasi MCU Management.

---

## 📍 FILE YANG SUDAH DIBUAT

### JavaScript Files
- **`mcu-management/js/pages/assessment-rahma.js`** (500+ lines)
  - Main page logic dan controller
  - Load MCU data, employees, departments, job titles
  - Assessment calculation logic
  - Save to database

### HTML Files
- **`mcu-management/html/assessment-rahma-page.html`**
  - Main page content
  - Table with MCU list
  - Search and pagination

- **`mcu-management/html/assessment-rahma-modal.html`**
  - Modal dialog untuk assessment input
  - Form fields untuk 11 parameters
  - Results display area

---

## 🔧 INTEGRASI LANGKAH-LANGKAH

### Step 1: Import JavaScript Page di Main HTML

Di file HTML utama Anda (misalnya `index.html` atau `dashboard.html`), tambahkan import:

```html
<!-- Import Assessment RAHMA page -->
<script type="module">
  import { initAssessmentRAHMA } from './js/pages/assessment-rahma.js';
  window.initAssessmentRAHMA = initAssessmentRAHMA;
</script>
```

### Step 2: Tambah HTML Page Content

Copy isi dari `assessment-rahma-page.html` ke section halaman Anda:

```html
<!-- Di body, sebelum closing tag -->
<div id="pages-container">
  <!-- existing pages... -->

  <!-- Assessment RAHMA Page -->
  <div id="assessment-rahma-page" class="hidden p-6">
    <!-- Copy content dari assessment-rahma-page.html di sini -->
  </div>
</div>
```

Atau include langsung:

```html
<div id="assessment-rahma-page" class="hidden">
  <!-- Content -->
</div>
```

### Step 3: Tambah Modal HTML

Copy isi dari `assessment-rahma-modal.html` ke akhir body:

```html
<!-- Before closing </body> tag -->

<!-- Assessment RAHMA Modal -->
<div id="assessment-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
  <!-- Copy content dari assessment-rahma-modal.html di sini -->
</div>
```

### Step 4: Tambah Sidebar Menu Item

Di file sidebar Anda (cari section `<nav>` atau `<aside>`), tambahkan item baru:

```html
<!-- RAHMA Assessment Menu Item -->
<a href="javascript:void(0)"
   onclick="handleMenuClick('assessment-rahma-page', 'Assessment RAHMA')"
   class="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded transition">
  <span class="text-2xl">📊</span>
  <span class="text-sm">Assessment RAHMA</span>
</a>
```

Atau jika menggunakan struktur berbeda:

```html
<li class="menu-item">
  <a href="#assessment-rahma"
     onclick="initAssessmentRAHMA(); return false;">
    <i class="icon">📊</i>
    <span>Assessment RAHMA</span>
  </a>
</li>
```

### Step 5: Update Menu Click Handler

Jika Anda menggunakan `handleMenuClick` function, pastikan menangani halaman baru:

```javascript
function handleMenuClick(pageId, pageTitle) {
  // Hide all pages
  document.querySelectorAll('[id$="-page"]').forEach(page => {
    page.classList.add('hidden');
  });

  // Show selected page
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.remove('hidden');

    // Initialize page if needed
    if (pageId === 'assessment-rahma-page') {
      window.initAssessmentRAHMA?.();
    }
  }

  // Update page title
  if (pageTitle) {
    document.title = `${pageTitle} - MCU Management`;
  }
}
```

---

## 📊 STRUKTUR MENU (CONTOH)

```
📋 Dashboard
├─ 👥 Kelola Karyawan
├─ 🏥 Data Master
├─ 📝 Tambah Karyawan
├─ ✅ Follow-up
├─ 📊 Assessment RAHMA  ← NEW
├─ 🗑️ Data Terhapus
└─ 👤 Kelola User
```

---

## 🎯 SAAT INI SUDAH SIAP

### ✅ Service Layer
- `framinghamCalculatorService.js` - Sudah ada
- Import di page sudah terbaca

### ✅ UI Layer
- `assessment-rahma.js` - Sudah ada
- `assessment-rahma-page.html` - Sudah ada
- `assessment-rahma-modal.html` - Sudah ada

### ✅ Database
- `framingham_assessment` table - Migration script ready

---

## 🔗 DATA FLOW DIAGRAM

```
Sidebar Menu Click
  ↓
initAssessmentRAHMA()
  ↓
Load Data:
  ├─ employees
  ├─ departments
  ├─ job_titles
  └─ MCU list (completed MCUs only)
  ↓
Display Table
  ├─ Show 10 MCUs per page
  ├─ Search/filter capability
  └─ Pagination controls
  ↓
User Clicks "Assess" Button
  ↓
openAssessmentModal(mcuId)
  ├─ Load MCU data
  ├─ Load lab results
  └─ Populate form
  ↓
User Fills 11 Parameters
  ├─ Demographics (auto-filled)
  ├─ Lifestyle (user input)
  ├─ Vital signs (auto-filled from MCU)
  └─ Lab results (auto-filled from lab table)
  ↓
User Clicks "Hitung Assessment"
  ↓
calculateAssessment()
  ├─ Gather all data
  ├─ Call framinghamCalculatorService
  ├─ Get 11 individual scores
  ├─ Get total score & risk category
  └─ Display results with breakdown
  ↓
User Clicks "Simpan Hasil"
  ↓
saveAssessment()
  ├─ Recalculate (ensure latest)
  ├─ Save to framingham_assessment table
  ├─ Show success message
  └─ Reload list
```

---

## 🧪 TESTING CHECKLIST

- [ ] Menu item appears in sidebar
- [ ] Click menu → page loads without errors
- [ ] Table displays MCU list
- [ ] Search works
- [ ] Pagination works
- [ ] Click "Assess" → modal opens
- [ ] Form fields populate correctly
- [ ] Click "Hitung Assessment" → results show
- [ ] Total score displays correctly
- [ ] Risk category shows (LOW/MEDIUM/HIGH)
- [ ] Click "Simpan Hasil" → saves to database
- [ ] Close modal → list refreshes
- [ ] Filter & search still work after save

---

## 📱 RESPONSIVE DESIGN

Halaman sudah responsif untuk:
- ✅ Desktop (full width)
- ✅ Tablet (adjusted grid)
- ✅ Mobile (stacked layout)

---

## 🎨 COLOR SCHEME

```
Risk Category Colors:
├─ LOW:    Green (#27ae60, #d1fae5)
├─ MEDIUM: Orange/Yellow (#f39c12, #fef3c7)
└─ HIGH:   Red (#e74c3c, #fee2e2)

Input Sections:
├─ Demographics: Gray (gray-50)
├─ Lifestyle:    Blue (blue-50)
├─ Vital Signs:  Amber (amber-50)
└─ Lab Results:  Purple (purple-50)
```

---

## 🔐 PERMISSIONS

Halaman ini menggunakan:
- `authService.getCurrentUser()` - Check authentication
- User harus login untuk akses halaman
- User ID disimpan di assessment record untuk audit trail

---

## 📝 DATABASE INTEGRATION

### Tables Used

**1. mcus** (Read)
- Get MCU data (vital signs, BMI, smoking status, exercise frequency)

**2. employees** (Read)
- Get name, gender, birth date, department, job

**3. pemeriksaan_lab** (Read)
- Get lab results by lab_item_id

**4. job_titles** (Read)
- Get job risk level

**5. framingham_assessment** (Write/Read)
- Save assessment results
- NEW table created by migration script

### Required Tables
Before using, ensure these migrations are executed:
```bash
# Run in Supabase SQL Editor:
execute framingham-migration-scripts.sql
```

---

## ⚙️ CONFIGURATION

### Settings dapat di-customize di `assessment-rahma.js`:

```javascript
const itemsPerPage = 10;  // Rows per page in table
```

### Lab Item IDs (mapping):
```javascript
// 7 = Gula Darah Puasa (Fasting Glucose)
// 8 = Kolesterol Total (Total Cholesterol)
// 9 = Trigliserida (Triglycerides)
// 10 = HDL Kolestrol (HDL Cholesterol)
```

Jika lab_item_id berbeda di sistem Anda, update mapping di:
- `assessment-rahma.js` → `populateAssessmentForm()` function

---

## 🚀 NEXT STEPS AFTER MENU INTEGRATION

1. ✅ Add menu item to sidebar
2. ✅ Include HTML pages (page + modal)
3. ✅ Test menu click and page load
4. ✅ Test assessment form
5. ✅ Verify database save
6. ✅ Test search/filter/pagination
7. [ ] (Optional) Add dashboard widget for high-risk employees
8. [ ] (Optional) Create alert system for high-risk flagging

---

## 🔍 DEBUGGING TIPS

### Menu doesn't appear?
- Check sidebar HTML structure
- Verify import path for `assessment-rahma.js`
- Check browser console for errors

### Page doesn't load?
- Check if `framinghamCalculatorService.js` is imported
- Verify Supabase connection
- Check if required tables exist

### Modal doesn't open?
- Check modal HTML is on page
- Verify `openModal` function exists
- Check browser console for errors

### Data not populating?
- Check database connection
- Verify table names match (mcus, employees, pemeriksaan_lab, job_titles)
- Check lab_item_id mapping

### Save doesn't work?
- Check if `framingham_assessment` table exists (run migration)
- Verify user is authenticated
- Check browser console for SQL errors

---

## 📧 SUPPORT

Jika ada masalah:
1. Check console untuk error messages
2. Verify all imports adalah correctly
3. Ensure database tables exist
4. Test with sample data dari `framinghamCalculatorService.examples.js`

---

**Setup Guide Version:** 1.0
**Created:** 2025-12-13
**Status:** Ready for Integration

Silakan ikuti langkah-langkah di atas untuk menambahkan menu Assessment RAHMA ke aplikasi Anda!
