# SABDAMU System

Aplikasi Web Manajemen Medical Check Up (MCU) - Sistem manajemen pemeriksaan kesehatan karyawan yang modern, professional, dan responsive.

## 📋 Fitur Utama

- **Dashboard Interaktif**: KPI cards, grafik dengan data labels, date range filtering
- **Manajemen Karyawan**: CRUD lengkap dengan pencarian dan filter
- **MCU Records**: Pencatatan pemeriksaan kesehatan lengkap dengan riwayat
- **Follow-Up System**: Update hasil MCU tanpa membuat record baru (sesuai requirement)
- **Data Master**: Kelola Jabatan, Departemen, Status MCU, dan Vendor
- **Soft Delete & Restore Cascade**: Recovery data dengan restore otomatis untuk relasi
- **Export Data**: CSV dan PDF untuk semua tabel
- **Authentication**: Login system dengan role Admin dan Petugas
- **Responsive Design**: Tampilan optimal di desktop dan mobile

## 🎨 Desain

- **Color Scheme**: Dominant biru (#2563eb) dan putih
- **UI Framework**: Tailwind CSS
- **Icons**: Heroicons (SVG)
- **Charts**: Chart.js dengan ChartDataLabels plugin
- **Database**: IndexedDB (Dexie) untuk local storage

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 atau lebih tinggi)
- NPM atau Yarn
- Browser modern (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone atau extract project**
   ```bash
   cd mcu-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build CSS**
   ```bash
   npm run build
   ```

   Untuk development dengan watch mode:
   ```bash
   npm run dev
   ```

4. **Jalankan aplikasi**

   Buka `index.html` dengan live server atau browser:

   - **Menggunakan VS Code Live Server**:
     - Install extension "Live Server"
     - Right-click pada `index.html` → "Open with Live Server"

   - **Menggunakan Python**:
     ```bash
     python -m http.server 8000
     # Buka http://localhost:8000
     ```

   - **Menggunakan Node.js http-server**:
     ```bash
     npx http-server -p 8000
     ```

5. **Login**

   Aplikasi akan otomatis membuat seed data saat pertama kali dibuka.

   **Demo Credentials:**
   - Admin: `admin` / `admin123`
   - Petugas: `petugas` / `petugas123`

## 📁 Struktur Project

```
mcu-management/
├── index.html              # Dashboard utama
├── css/
│   ├── input.css          # Tailwind input
│   └── output.css         # Generated CSS
├── js/
│   ├── services/
│   │   ├── database.js         # IndexedDB wrapper (Dexie)
│   │   ├── authService.js      # Authentication
│   │   ├── employeeService.js  # Employee CRUD
│   │   ├── mcuService.js       # MCU CRUD + Follow-up
│   │   └── masterDataService.js # Master data CRUD
│   ├── utils/
│   │   ├── idGenerator.js      # ID generation (EMP-YYYYMMDD-XXXX)
│   │   ├── dateHelpers.js      # Date utilities
│   │   ├── diffHelpers.js      # Change tracking
│   │   ├── uiHelpers.js        # Toast, modals, etc
│   │   └── exportHelpers.js    # CSV/PDF export
│   ├── pages/
│   │   └── dashboard.js        # Dashboard logic
│   └── seedData.js             # Demo data generator
├── pages/
│   ├── login.html              # Login page
│   ├── tambah-karyawan.html    # Add employee + MCU
│   ├── kelola-karyawan.html    # Manage employees
│   ├── follow-up.html          # Follow-up page
│   ├── data-master.html        # Master data CRUD
│   ├── data-terhapus.html      # Soft deleted records
│   └── analysis.html           # Looker iframe embed
├── assets/
│   ├── images/
│   └── icons/
├── package.json
├── tailwind.config.js
└── README.md
```

## 🔑 Fitur Kritis & Implementasi

### 1. ID Generation

**Requirement**: ID harus auto-generate dengan format `PREFIX-YYYYMMDD-XXXX` dan tidak boleh NaN.

**Implementasi**:
- File: `js/utils/idGenerator.js`
- Format: `EMP-20241017-0001`, `MCU-20241017-0001`
- Counter tersimpan di localStorage per prefix-date
- Validasi untuk memastikan tidak ada NaN

```javascript
import { generateEmployeeId, generateMCUId } from './utils/idGenerator.js';

const employeeId = generateEmployeeId(); // EMP-20241017-0001
const mcuId = generateMCUId(); // MCU-20241017-0001
```

### 2. Latest MCU Per Employee

**Requirement**: Dashboard hanya menghitung latest MCU per employee berdasarkan mcuDate, jika sama gunakan lastUpdatedTimestamp.

**Implementasi**:
- File: `js/services/mcuService.js`
- Method: `getLatestMCUPerEmployee()`

```javascript
const latestMCUs = await mcuService.getLatestMCUPerEmployee();
// Returns array of latest MCU for each employee
```

### 3. Follow-Up Behavior

**Requirement**: Follow-up TIDAK membuat MCU baru, hanya update existing record. Simpan initial values, final values terpisah.

**Implementasi**:
- File: `js/services/mcuService.js`
- Method: `updateFollowUp(mcuId, followUpData, currentUser)`
- Field initial (initialResult, initialNotes) tidak ditimpa
- Field final (finalResult, finalNotes) diupdate
- Status mengikuti finalResult
- MCUChange entries hanya dibuat untuk field yang berubah

```javascript
// Update follow-up
await mcuService.updateFollowUp(mcuId, {
  bloodPressure: '120/80',  // Updated examination
  finalResult: 'Fit',
  finalNotes: 'Kondisi sudah membaik'
}, currentUser);

// MCU record tetap sama (mcuId tidak berubah)
// History perubahan tersimpan di mcuChanges table
```

### 4. Restore Cascade

**Requirement**: Restore employee harus restore semua MCU terkait yang soft-deleted.

**Implementasi**:
- File: `js/services/employeeService.js`
- Method: `restore(employeeId)`

```javascript
// Restore employee dan semua MCU-nya
await employeeService.restore(employeeId);
```

### 5. Change History

**Requirement**: Simpan riwayat perubahan per-field, tampilkan semua item MCU dengan hasil awal dan akhir.

**Implementasi**:
- File: `js/utils/diffHelpers.js`
- Method: `diffAndSaveHistory(oldMCU, newMCU, user, mcuId)`
- Hanya field yang berubah yang dicatat

```javascript
const changes = diffAndSaveHistory(oldMCU, newMCU, currentUser, mcuId);
// Returns array of MCUChange objects
```

### 6. Charts with Data Labels

**Requirement**: Semua chart harus menampilkan labels, numbers, legends (tidak hanya hover).

**Implementasi**:
- Library: Chart.js + chartjs-plugin-datalabels
- Konfigurasi: datalabels plugin enabled untuk semua charts
- File: `js/pages/dashboard.js`

## 🗃️ Data Models

### Employee
```javascript
{
  employeeId: "EMP-20241017-0001",  // Auto-generated
  name: "Budi Santoso",
  jobTitleId: "JOB-20241017-0001",
  departmentId: "DEPT-20241017-0001",
  birthDate: "1990-05-15",
  employmentStatus: "Company", // or "Vendor"
  vendorName: "PT Vendor A",   // if Vendor
  activeStatus: "Active",      // or "Inactive"
  inactiveReason: null,
  bloodType: "A+",
  createdAt: "2024-10-17T...",
  updatedAt: "2024-10-17T...",
  deletedAt: null              // Soft delete
}
```

### MCU Record
```javascript
{
  mcuId: "MCU-20241017-0001",
  employeeId: "EMP-20241017-0001",
  mcuType: "Annual",
  mcuDate: "2024-10-15",
  ageAtMCU: 34,

  // Examinations
  bmi: 22.5,
  bloodPressure: "120/80",
  vision: "6/6",
  audiometry: "20 dB",
  spirometry: "Normal",
  xray: "Normal",
  ekg: "Normal",
  treadmill: "Normal",
  kidneyLiverFunction: "Normal",
  hbsag: "Negatif",
  sgot: "25 U/L",
  sgpt: "28 U/L",
  cbc: "Normal",
  napza: "Negatif",

  // Results
  initialResult: "Fit",
  initialNotes: "Kondisi kesehatan baik",
  finalResult: null,           // Filled on follow-up
  finalNotes: null,
  status: "Fit",               // Current status

  createdAt: "2024-10-17T...",
  updatedAt: "2024-10-17T...",
  lastUpdatedTimestamp: "2024-10-17T...",
  deletedAt: null
}
```

### MCUChange
```javascript
{
  changeId: "CHG-20241017-0001",
  mcuId: "MCU-20241017-0001",
  changedAt: "2024-10-17T...",
  changedBy: "USR-20241017-0001",
  fieldChanged: "bloodPressure",
  fieldLabel: "Tekanan Darah",
  oldValue: "150/111",
  newValue: "120/80",
  note: null
}
```

## 🧪 Testing dengan Seed Data

Aplikasi otomatis membuat seed data saat pertama kali dibuka:
- 50 karyawan (berbagai departemen, jabatan, golongan darah)
- 120+ MCU records (termasuk multiple MCU per employee)
- Beberapa records dengan status Follow-Up
- Soft-deleted records untuk testing restore

**Manual Re-seed**:
```javascript
// Di browser console
reseedDatabase()
```

## 📊 Export Functionality

**CSV Export**:
```javascript
import { exportMCUData, exportEmployeeData } from './utils/exportHelpers.js';

// Export MCU records
exportMCUData(mcuList, employees, 'mcu_report');

// Export employees
exportEmployeeData(employees, jobTitles, departments, 'employees');
```

**PDF Export**:
Menggunakan html2pdf.js (loaded via CDN). Fallback ke print jika library tidak tersedia.

## 🔐 Authentication

- Session-based authentication (sessionStorage)
- 2 roles: Admin dan Petugas
- Password hashing: Base64 (development only - gunakan bcrypt untuk produksi)

**Check Auth**:
```javascript
if (!authService.isAuthenticated()) {
  window.location.href = 'pages/login.html';
}

if (authService.isAdmin()) {
  // Admin-only features
}
```

## 🎯 Pages Implementation Status

✅ **ALL PAGES COMPLETED**:
- ✅ Login Page - Full authentication with auto-seed
- ✅ Dashboard - KPIs, charts dengan data labels, date filter
- ✅ Tambah Karyawan - Search, add employee modal, auto-open MCU modal
- ✅ Kelola Karyawan - List, detail with MCU history, edit, delete
- ✅ Follow-Up - List, update modal dengan preserve initial values
- ✅ Data Master - CRUD untuk Job Titles, Departments, Vendors (tabbed interface)
- ✅ Data Terhapus - Soft deleted list, restore cascade, permanent delete
- ✅ Analysis - Looker Studio iframe embed (ready for your dashboard URL)
- ✅ Debug Tools - Login troubleshooting page

🎯 **Bonus**:
- ✅ Database service layer (IndexedDB) - 100% complete
- ✅ All utility functions - ID generation, date helpers, diff tracking, export
- ✅ Seed data script - 50 employees, 120+ MCUs
- ✅ Comprehensive documentation - README, QUICKSTART, TROUBLESHOOTING, IMPLEMENTATION_GUIDE

## 🌐 Deployment ke Netlify

1. **Push ke GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Connect di Netlify**
   - Login ke Netlify
   - "New site from Git"
   - Pilih repository
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `.` (root)

3. **Environment Variables** (jika menggunakan Supabase):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

## 🗄️ Migrasi ke Supabase (Optional)

Aplikasi saat ini menggunakan IndexedDB (local). Untuk produksi dengan database server:

1. **Buat Project Supabase**

2. **Buat Tables** (SQL Schema):
   ```sql
   CREATE TABLE employees (
     employee_id VARCHAR PRIMARY KEY,
     name VARCHAR NOT NULL,
     job_title_id VARCHAR,
     department_id VARCHAR,
     birth_date DATE,
     employment_status VARCHAR,
     vendor_name VARCHAR,
     active_status VARCHAR,
     inactive_reason VARCHAR,
     blood_type VARCHAR,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),
     deleted_at TIMESTAMPTZ
   );

   CREATE TABLE mcus (
     mcu_id VARCHAR PRIMARY KEY,
     employee_id VARCHAR REFERENCES employees(employee_id),
     mcu_type VARCHAR,
     mcu_date DATE,
     age_at_mcu INTEGER,
     bmi DECIMAL,
     blood_pressure VARCHAR,
     vision VARCHAR,
     audiometry VARCHAR,
     spirometry VARCHAR,
     xray TEXT,
     ekg TEXT,
     treadmill TEXT,
     kidney_liver_function TEXT,
     hbsag VARCHAR,
     sgot VARCHAR,
     sgpt VARCHAR,
     cbc TEXT,
     napza VARCHAR,
     initial_result VARCHAR,
     initial_notes TEXT,
     final_result VARCHAR,
     final_notes TEXT,
     status VARCHAR,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),
     last_updated_timestamp TIMESTAMPTZ DEFAULT NOW(),
     deleted_at TIMESTAMPTZ
   );

   CREATE TABLE mcu_changes (
     change_id VARCHAR PRIMARY KEY,
     mcu_id VARCHAR REFERENCES mcus(mcu_id),
     changed_at TIMESTAMPTZ DEFAULT NOW(),
     changed_by VARCHAR,
     field_changed VARCHAR,
     field_label VARCHAR,
     old_value TEXT,
     new_value TEXT,
     note TEXT
   );

   -- Similar for job_titles, departments, vendors, status_mcu, users
   ```

3. **Update Service Layer**
   - Buat `supabaseAdapter.js` yang implement sama interface dengan `database.js`
   - Toggle antara local (IndexedDB) dan Supabase via config

## 🐛 Debug Tools

Admin user dapat mengakses debug panel:
- Tombol "Debug" di top bar
- Activity log (100 entries terakhir)
- Database inspection
- Manual re-seed

## 📝 Development Notes

### Kriteria Acceptance (Checklist)

- [x] employeeId / mcuId auto-generated & non-empty
- [x] Dashboard uses latest MCU per employee
- [x] Follow-up updates existing MCU (no duplicate)
- [x] Follow-up saves change history with oldValue & newValue
- [x] Initial values preserved during follow-up
- [x] Restore employee cascades restore MCU
- [x] Charts show data labels & legends
- [x] Master data CRUD dengan ID validation
- [x] Seed data dengan 50+ employees, 120+ MCUs
- [ ] Export CSV/PDF works (struktur siap, perlu testing)
- [ ] All pages UI completed (dashboard complete, others in progress)

### Known Limitations

- Password hashing menggunakan Base64 (development only)
- PDF export fallback ke print jika html2pdf tidak load
- Pagination sudah ada di Kelola Karyawan, belum di halaman lain
- Advanced search/filter (basic search sudah ada)

## 🚀 Deployment ke Production

### Netlify + Supabase (Recommended)

Untuk deploy aplikasi ke production dengan multi-user support:

**Quick Start (10 menit)**:
```bash
# 1. Setup Supabase
#    - Buat project di https://supabase.com/
#    - Run SQL schema dari supabase-schema.sql
#    - Copy Project URL & anon key

# 2. Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/mcu-management.git
git push -u origin main

# 3. Deploy ke Netlify
#    - Connect GitHub repo
#    - Add environment variables:
#      SUPABASE_URL=https://your-project.supabase.co
#      SUPABASE_ANON_KEY=your-anon-key
#    - Deploy!
```

**Dokumentasi Lengkap**:
- 📖 [DEPLOYMENT.md](DEPLOYMENT.md) - Panduan lengkap step-by-step
- ⚡ [NETLIFY_QUICKSTART.md](NETLIFY_QUICKSTART.md) - Quick start 5 langkah

**Fitur Production**:
- ✅ Database cloud (Supabase PostgreSQL)
- ✅ Multi-user support
- ✅ Auto-deploy on git push
- ✅ Free SSL certificate
- ✅ CDN global
- ✅ Fallback ke IndexedDB jika Supabase offline

### Local Development

Aplikasi tetap bisa berjalan full-featured dengan IndexedDB (browser storage):

```bash
npm install
npm run build
npx http-server -p 8000
# Buka http://localhost:8000/pages/login.html
```

Data disimpan di browser, cocok untuk:
- Testing & development
- Demo & prototype
- Single-user usage

## 🤝 Contributing

Untuk menambahkan halaman baru:
1. Buat HTML file di `pages/`
2. Buat JS file di `js/pages/`
3. Import services dan utils yang diperlukan
4. Follow struktur yang ada (sidebar, breadcrumbs, cards)

## 📞 Support

Jika ada pertanyaan atau issue:
- Check browser console untuk error logs
- Pastikan npm dependencies terinstall
- Pastikan CSS sudah di-build (`npm run build`)
- Untuk reset data, panggil `reseedDatabase()` di console

## 📄 License

MIT License - Free to use for learning and development.

---

**Dibuat dengan**: HTML, JavaScript (ES6 Modules), Tailwind CSS, Chart.js, Dexie (IndexedDB)

**Browser Support**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
