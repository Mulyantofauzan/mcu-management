# MADIS System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     MADIS Web Application                        │
│                    (Medical Check-Up System)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
         ┌──────▼──────┐ ┌────▼─────┐ ┌────▼─────────┐
         │  Frontend   │ │ Services │ │   Database   │
         │   (Vue/JS)  │ │ (Node.js) │ │  (Supabase)  │
         └─────────────┘ └──────────┘ └──────────────┘
```

## Architecture Layers

### 1. Frontend Layer (Browser)
```
┌──────────────────────────────────────┐
│         Frontend (index.html)         │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │   Pages (SPA Routes)           │  │
│  ├────────────────────────────────┤  │
│  │ • Dashboard                    │  │
│  │ • Kelola Karyawan              │  │
│  │ • Follow-Up                    │  │
│  │ • Assessment RAHMA             │  │
│  │ • Data Master                  │  │
│  │ • Activity Log                 │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │   Services (Business Logic)    │  │
│  ├────────────────────────────────┤  │
│  │ • authService                  │  │
│  │ • employeeService              │  │
│  │ • mcuService                   │  │
│  │ • labService                   │  │
│  │ • metabolicSyndromeService     │  │
│  │ • excelExportService           │  │
│  │ • versionService               │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Utils & Helpers               │  │
│  ├────────────────────────────────┤  │
│  │ • databaseAdapter              │  │
│  │ • dateHelpers                  │  │
│  │ • validation                   │  │
│  │ • diffHelpers (Change tracking)│  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Service Worker (sw.js)        │  │
│  ├────────────────────────────────┤  │
│  │ • Offline support              │  │
│  │ • Cache management             │  │
│  │ • Background sync              │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

### 2. Database Layer (Supabase)

```
┌──────────────────────────────────────────────────────┐
│              Supabase PostgreSQL Database            │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ Core Tables                                    │ │
│  ├────────────────────────────────────────────────┤ │
│  │ • employees (Karyawan)                         │ │
│  │ • departments (Departemen)                     │ │
│  │ • job_titles (Jabatan)                         │ │
│  │ • mcus (Pemeriksaan MCU)                       │ │
│  │ • mcu_changes (Riwayat Perubahan)              │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ Lab & Medical History                          │ │
│  ├────────────────────────────────────────────────┤ │
│  │ • pemeriksaan_lab (Hasil Lab)                  │ │
│  │ • lab_items (Master Lab Items)                 │ │
│  │ • medical_histories (Riwayat Penyakit)         │ │
│  │ • family_histories (Riwayat Keluarga)          │ │
│  │ • diseases (Master Penyakit)                   │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ Audit & Security                               │ │
│  ├────────────────────────────────────────────────┤ │
│  │ • activity_log (Audit Trail)                   │ │
│  │ • audit_logs (Enhanced Logging)                │ │
│  │ • users (Autentikasi)                          │ │
│  │ • user_roles (Otorisasi)                       │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Data Flow: MCU Creation & Update

```
                    ┌─────────────────────────┐
                    │   User Input (Form)     │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Validation            │
                    │   (validation.js)       │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   mcuService.create()   │
                    │   or .update()          │
                    └────────────┬────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
    ┌───────────▼──────┐  ┌──────▼─────┐  ┌──────▼──────────┐
    │  Save to Database│  │ Diff Values │  │ Log Activity    │
    │  (mcus table)    │  │ (Compare old│  │ (activity_log   │
    │                  │  │  vs new)    │  │  table)         │
    └───────────┬──────┘  └──────┬─────┘  └──────┬──────────┘
                │                │                │
                └────────────────┼────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ Save Changes to         │
                    │ mcu_changes table       │
                    │ (Field-level history)   │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ Return Updated MCU      │
                    │ to Frontend             │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ Update UI / Toast       │
                    │ Notification            │
                    └────────────────────────┘
```

## Module Dependencies

```
Dashboard (Entry Point)
    │
    ├─→ authService
    │   └─→ supabase auth
    │
    ├─→ employeeService
    │   └─→ databaseAdapter
    │       ├─→ supabase
    │       └─→ indexedDB (fallback)
    │
    ├─→ mcuService
    │   ├─→ databaseAdapter
    │   ├─→ labService
    │   ├─→ diffHelpers (change tracking)
    │   └─→ metabolicSyndromeService
    │
    ├─→ assessment-rahma-dashboard
    │   ├─→ mcuService
    │   ├─→ labService
    │   ├─→ metabolicSyndromeService
    │   └─→ excelExportService
    │       └─→ ExcelJS (CDN)
    │
    ├─→ follow-up.js
    │   ├─→ mcuService
    │   ├─→ labService
    │   └─→ validation
    │
    └─→ versionService
        └─→ Service Worker cache management
```

## Feature Systems

### 1. Authentication & Authorization
```
┌─────────────────────────┐
│   User Login (Email)    │
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│   Supabase Auth         │
│   (Magic Link / OAuth)  │
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│   JWT Token             │
│   (Stored locally)      │
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│   RLS Policies          │
│   (Row Level Security)  │
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│   User Dashboard        │
│   (Based on role)       │
└────────────────────────┘
```

### 2. MCU Assessment System
```
┌──────────────────────────────────────┐
│        MCU Assessment Flow            │
├──────────────────────────────────────┤
│                                      │
│  1. Create/Edit MCU                  │
│     ├─ Vital Signs                   │
│     ├─ Examination Results            │
│     └─ Lab Results                    │
│                                      │
│  2. Initial Assessment                │
│     └─ Jakarta Cardiovascular Score   │
│                                      │
│  3. Follow-Up (if needed)             │
│     ├─ Update Results                 │
│     └─ Recalculate Scores             │
│                                      │
│  4. Additional Analysis               │
│     ├─ Metabolic Syndrome             │
│     ├─ Risk Matrix                    │
│     └─ Recommendations                │
│                                      │
└──────────────────────────────────────┘
```

### 3. Risk Assessment System
```
┌──────────────────────────────────┐
│   Jakarta Cardiovascular Score    │
│   (7 Parameters)                  │
├──────────────────────────────────┤
│ JK (Gender): -1 or 0              │
│ Umur (Age): 0-8                   │
│ TD (BP): -2 to 2                  │
│ IMT (BMI): -2 to 3                │
│ Merokok (Smoking): 0-4            │
│ Diabetes: 0-5                     │
│ Aktivitas Fisik (Exercise): -2-2  │
└────────────┬─────────────────────┘
             │
      ┌──────▼──────┐
      │ Total Score │ (-7 to +13)
      └──────┬──────┘
             │
      ┌──────▼──────┐
      │ Risk Level  │
      │ 1-4 grades  │
      └─────────────┘
```

```
┌──────────────────────────────────┐
│   Metabolic Syndrome Score       │
│   (5 Parameters, Binary 0/1)      │
├──────────────────────────────────┤
│ LP (Waist): Gender-specific      │
│ TG (Triglycerides): ≥150         │
│ HDL: Gender-specific (inverse)   │
│ TD (BP): ≥130/85                 │
│ GDP (Glucose): ≥100 or diabetes  │
└────────────┬─────────────────────┘
             │
      ┌──────▼──────────────┐
      │ Total + LP-dependent│
      │ Risk Classification │
      │ Risk 1, 2, or 3     │
      └─────────────────────┘
```

```
┌──────────────────────────────────┐
│   Risk Total Matrix              │
│   (CV Risk × Metabolic Risk)     │
├──────────────────────────────────┤
│ 1×1=1 (Low)      ▄▄▄▄            │
│ 1×2=2 (Low)      ▄▄▄▄            │
│ 2×2=4 (Medium)   ▀▀▀▀            │
│ 2×3=6 (High)     ███▓            │
│ 3×3=9 (Critical) █████           │
└──────────────────────────────────┘
```

### 4. Change Tracking System
```
┌─────────────────────────────────────┐
│   MCU Data Update                   │
├─────────────────────────────────────┤
│                                     │
│  1. Get Old MCU                     │
│     └─ Store original values        │
│                                     │
│  2. Apply Updates                   │
│     └─ Update database              │
│                                     │
│  3. Get New MCU                     │
│     └─ Fetch updated values         │
│                                     │
│  4. Compare (diffHelpers.js)        │
│     └─ Find differences             │
│                                     │
│  5. Create Change Records           │
│     └─ mcu_changes table            │
│        (field, old_value,           │
│         new_value, timestamp)       │
│                                     │
│  6. Log Activity                    │
│     └─ activity_log table           │
│        (who, what, when, IP)        │
│                                     │
└─────────────────────────────────────┘
```

## Export & Reporting System

```
┌─────────────────────────────┐
│  Assessment RAHMA Page      │
│  (Jakarta CV Dashboard)     │
├─────────────────────────────┤
│                             │
│  1. Load All Data           │
│     ├─ Employees            │
│     ├─ Latest MCUs          │
│     ├─ Lab Results          │
│     └─ Medical Histories    │
│                             │
│  2. Calculate Assessments   │
│     ├─ CV Scores            │
│     ├─ Metabolic Scores     │
│     └─ Risk Levels          │
│                             │
│  3. Filter & Sort           │
│     ├─ By Department        │
│     ├─ By Job Title         │
│     ├─ By Risk Level        │
│     └─ By Search Query      │
│                             │
│  4. Export to Excel         │
│     ├─ Create Workbook      │
│     ├─ Add Headers          │
│     ├─ Add Data Rows        │
│     ├─ Apply Styling        │
│     └─ Download File        │
│                             │
└─────────────────────────────┘
```

## Version & Cache Management

```
┌────────────────────────────────┐
│   App Initialization            │
├────────────────────────────────┤
│                                │
│  1. Load version.json           │
│     └─ Get current version      │
│                                │
│  2. Check Stored Version        │
│     └─ From localStorage        │
│                                │
│  3. Compare Versions            │
│     ├─ If same: Continue        │
│     └─ If different:            │
│        ├─ Clear all caches      │
│        ├─ Show notification     │
│        └─ Ask user to refresh   │
│                                │
│  4. Register Service Worker     │
│     └─ Cache static assets      │
│                                │
│  5. Setup App                   │
│     └─ Load dashboard           │
│                                │
└────────────────────────────────┘
```

## Technology Stack

```
┌────────────────────────────────────┐
│         MADIS Technology Stack      │
├────────────────────────────────────┤
│                                    │
│  Frontend:                         │
│  • HTML5 / CSS3 (Tailwind CSS)    │
│  • Vanilla JavaScript (ES6+)       │
│  • IndexedDB (Offline storage)     │
│  • Service Worker (PWA)            │
│  • ExcelJS (Excel generation)      │
│                                    │
│  Backend:                          │
│  • Supabase (BaaS)                │
│  • PostgreSQL (Database)           │
│  • PostgREST (API)                │
│  • Row Level Security (RLS)        │
│                                    │
│  Security:                         │
│  • JWT Authentication              │
│  • OAuth / Magic Links             │
│  • RLS Policies                    │
│  • Activity Logging (HIPAA ready)  │
│                                    │
│  Performance:                      │
│  • Service Worker Caching          │
│  • Lazy Loading                    │
│  • Database Indexing               │
│  • API Pagination                  │
│                                    │
└────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────┐
│   GitHub Repository             │
│   (Source Code)                 │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│   Git Workflow                  │
│   • Main branch (production)    │
│   • Version tagging             │
│   • Release notes               │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│   Version Management            │
│   • version.json updates        │
│   • Cache version increment     │
│   • Feature documentation       │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│   Static Hosting                │
│   (Vercel / Netlify / etc)      │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│   Browser Cache Management      │
│   • Service Worker updates      │
│   • versionService checks       │
│   • Auto cache invalidation     │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│   User Devices                  │
│   • Latest app version          │
│   • No manual cache clearing    │
│   • Automatic notifications     │
└─────────────────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────┐
│         MADIS Security Layers        │
├─────────────────────────────────────┤
│                                     │
│  1. Transport Security              │
│     └─ HTTPS / TLS Encryption       │
│                                     │
│  2. Authentication                  │
│     ├─ Supabase Auth (JWT)          │
│     ├─ Magic Links / OAuth          │
│     └─ Session Management           │
│                                     │
│  3. Authorization                   │
│     ├─ User Roles                   │
│     ├─ RLS Policies                 │
│     └─ Permission Checks            │
│                                     │
│  4. Data Protection                 │
│     ├─ Field-level encryption       │
│     ├─ Audit logging                │
│     └─ Data anonymization           │
│                                     │
│  5. Compliance                      │
│     ├─ HIPAA compliance             │
│     ├─ UU-PDP (Indonesia)           │
│     ├─ Activity logs                │
│     └─ Tamper detection (hash)      │
│                                     │
│  6. Frontend Security               │
│     ├─ XSS Prevention               │
│     ├─ CSRF Protection              │
│     ├─ Input validation             │
│     └─ Safe API calls               │
│                                     │
└─────────────────────────────────────┘
```

## Performance Optimization

```
┌──────────────────────────────┐
│   Performance Features        │
├──────────────────────────────┤
│                              │
│  1. Caching Strategy         │
│     ├─ Cache-first (Static)  │
│     ├─ Network-first (API)   │
│     └─ Stale-while-revalidate│
│                              │
│  2. Database Optimization    │
│     ├─ Indexes on key fields │
│     ├─ Pagination            │
│     └─ Query optimization    │
│                              │
│  3. Frontend Optimization    │
│     ├─ Lazy loading modules  │
│     ├─ Code splitting        │
│     ├─ Minification          │
│     └─ Image optimization    │
│                              │
│  4. Parallel Loading         │
│     ├─ Promise.all()         │
│     ├─ Async operations      │
│     └─ Non-blocking UI       │
│                              │
│  5. Progressive Enhancement  │
│     ├─ Works offline         │
│     ├─ Fallback caching      │
│     └─ Graceful degradation  │
│                              │
└──────────────────────────────┘
```

---

## Key Files & Directories

```
MCU-APP/
├── mcu-management/
│   ├── index.html                    # Main entry point
│   ├── sw.js                         # Service worker
│   ├── version.json                  # Version info
│   ├── package.json                  # Dependencies
│   │
│   ├── js/
│   │   ├── pages/                    # Page/route logic
│   │   │   ├── dashboard.js
│   │   │   ├── kelola-karyawan.js
│   │   │   ├── assessment-rahma-dashboard.js
│   │   │   └── follow-up.js
│   │   │
│   │   ├── services/                 # Business logic
│   │   │   ├── authService.js
│   │   │   ├── employeeService.js
│   │   │   ├── mcuService.js
│   │   │   ├── labService.js
│   │   │   ├── metabolicSyndromeService.js
│   │   │   ├── excelExportService.js
│   │   │   └── versionService.js
│   │   │
│   │   ├── utils/                    # Helper utilities
│   │   │   ├── databaseAdapter.js
│   │   │   ├── diffHelpers.js
│   │   │   ├── validation.js
│   │   │   └── dateHelpers.js
│   │   │
│   │   └── config/                   # Configuration
│   │       └── supabase.js
│   │
│   ├── pages/                        # HTML pages
│   │   ├── kelola-karyawan.html
│   │   ├── assessment-rahma.html
│   │   └── follow-up.html
│   │
│   ├── css/                          # Styling
│   │   └── output.css
│   │
│   └── assets/                       # Images & icons
│
├── MCU_CHANGE_TRACKING_GUIDE.md      # Change tracking docs
└── SYSTEM_ARCHITECTURE.md            # This file
```

---

**Version:** 1.0.12
**Last Updated:** 2026-01-20
**Architecture Status:** ✅ Production Ready
