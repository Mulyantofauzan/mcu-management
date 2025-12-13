# ASSESSMENT RAHMA DASHBOARD - INTEGRATION GUIDE

## Dashboard Structure - Sesuai Request

Menu Assessment RAHMA sekarang adalah **Dashboard View**, bukan form input.

---

## 📊 DASHBOARD LAYOUT

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Assessment RAHMA Dashboard                                  │
│  Framingham CVD Risk Assessment - Penilaian Risiko Kardio...    │
│                                                                  │
│  [Search Karyawan...]                                            │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ ✅ LOW RISK  │  │ ⚠️ MEDIUM    │  │ 🔴 HIGH RISK │         │
│  │ 42           │  │ 18           │  │ 5            │         │
│  │ Karyawan     │  │ Karyawan     │  │ Karyawan     │         │
│  │ 70.0%        │  │ 30.0%        │  │ 8.3%         │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  [View All (65)]                                                │
│                                                                  │
│  ┌──────┬────────┬──────────┬──────┬────────┬────────┬─────┐  │
│  │ No. │ ID     │ Nama     │ Dept │ Posisi │ MCU    │ Scr │  │
│  ├──────┼────────┼──────────┼──────┼────────┼────────┼─────┤  │
│  │ 1    │EMP-001 │John Doe  │ IT   │ Staff  │2025-12 │+14  │  │
│  │ 2    │EMP-002 │Jane Smith│ HR   │Manager │2025-11 │-2   │  │
│  │ ...  │ ...    │ ...      │ ...  │ ...    │ ...    │ ..  │  │
│  └──────┴────────┴──────────┴──────┴────────┴────────┴─────┘  │
│                                                                  │
│  [← Sebelumnya] Menampilkan 1-15 dari 65 [Berikutnya →]       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 FITUR UTAMA

### 1️⃣ **Risk Category Cards**
- **LOW RISK** - Klik untuk filter low risk only
  - Count: Jumlah karyawan
  - Percentage: % dari total karyawan
  - Color: Green (✅)

- **MEDIUM RISK** - Klik untuk filter medium risk only
  - Count: Jumlah karyawan
  - Percentage: % dari total karyawan
  - Color: Yellow (⚠️)

- **HIGH RISK** - Klik untuk filter high risk only
  - Count: Jumlah karyawan
  - Percentage: % dari total karyawan
  - Color: Red (🔴)

- **View All Button** - Show semua karyawan (reset filter)

### 2️⃣ **Search/Filter**
- Search by: Nama karyawan atau Employee ID
- Real-time filtering
- Works with risk category filter

### 3️⃣ **Employee List Table**
Columns:
- **No.** - Row number
- **ID Karyawan** - Employee ID (blue, monospace)
- **Nama** - Employee name (bold)
- **Dept** - Department
- **Posisi** - Job title
- **Tanggal MCU** - Latest MCU date
- **11 Parameters Score** - All 11 scores in format: `G|A|JR|Ex|Sm|BP|BMI|Glu|Chol|Trig|HDL`
  - G = Gender score
  - A = Age score
  - JR = Job Risk score
  - Ex = Exercise score
  - Sm = Smoking score
  - BP = Blood Pressure score
  - BMI = BMI score
  - Glu = Glucose score
  - Chol = Cholesterol score
  - Trig = Triglycerides score
  - HDL = HDL score
- **Total** - Total Framingham score
- **Risk** - Risk category badge (✅ LOW, ⚠️ MEDIUM, 🔴 HIGH)

### 4️⃣ **Pagination**
- 15 rows per page
- Previous/Next buttons
- Shows: "Menampilkan X-Y dari Z karyawan"

---

## 📋 DATA SOURCE

### Employees Included:
- **Only ACTIVE employees** (is_active = true, deleted_at = NULL)

### MCU Selection:
- **Latest MCU per employee** (sorted by mcu_date DESC)
- Only if MCU has **final_result** (completed MCU)

### Data from Multiple Tables:
```
employees (active only)
    ↓
mcus (latest per employee, with final_result)
    ↓
pemeriksaan_lab (for glucose, cholesterol, triglycerides, HDL)
    ↓
job_titles (for risk_level)
    ↓
departments (for department name)
    ↓
vendors (if applicable)
```

### Assessment Calculation:
Each row uses framinghamCalculatorService to calculate:
- 11 individual parameter scores
- Total score (-4 to 26)
- Risk category (low, medium, high)

---

## 🚀 INTEGRASI KE APLIKASI

### Step 1: Import Dashboard Page
Di main HTML file:

```javascript
<script type="module">
  import { initAssessmentRahmaDAshboard } from './js/pages/assessment-rahma-dashboard.js';
  window.initAssessmentRahmaDAshboard = initAssessmentRahmaDAshboard;
</script>
```

### Step 2: Include HTML Page
```html
<div id="assessment-rahma-dashboard-page" class="hidden">
  <!-- Content auto-generated by JavaScript -->
</div>
```

### Step 3: Add Menu Item (Sidebar)
```html
<a href="javascript:void(0)"
   onclick="handleMenuClick('assessment-rahma-dashboard-page', 'Assessment RAHMA'); initAssessmentRahmaDAshboard();"
   class="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded transition">
  <span class="text-2xl">📊</span>
  <span class="text-sm">Assessment RAHMA</span>
</a>
```

### Step 4: Ensure Framingham Migration Run
```bash
# Execute in Supabase SQL Editor:
execute framingham-migration-scripts.sql
```

---

## 📊 SCORING REFERENCE

### Parameter Score Legend (shown in table):
```
G  = Gender (0-1)
A  = Age (-4 to 3)
JR = Job Risk (0-2)
Ex = Exercise (-3 to 2) 🟢 Protective
Sm = Smoking (0-4)
BP = Blood Pressure (0-4)
BMI = Body Mass Index (0-2)
Glu = Glucose (0-2)
Chol = Cholesterol (0-3)
Trig = Triglycerides (0-2)
HDL = HDL Cholesterol (0-2) 🟢 Protective

Example row: 1|-2|1|2|4|2|1|0|2|1|1
            = Male, Age 40-44, Moderate risk, Exercises, Smokes, etc.
```

### Total Score Ranges:
```
-4 to 0  = Extra Low (Protective)
0-4      = ✅ LOW RISK
5-11     = ⚠️ MEDIUM RISK
12-26+   = 🔴 HIGH RISK
```

---

## 🎨 COLOR CODING

```
Risk Category Background Colors:
├─ LOW:    Green (#d1fae5, border #10b981)
├─ MEDIUM: Yellow (#fef3c7, border #f59e0b)
└─ HIGH:   Red (#fee2e2, border #ef4444)

Card States:
├─ Selected: Darker background + colored border
└─ Unselected: Light background + light border

Hover: Scale up slightly (transform: scale(1.05))
```

---

## 📋 EMPLOYEE DATA FIELDS

For each row, following data is displayed:

```
From employees table:
├─ employee_id (displayed as ID)
├─ name
├─ jenis_kelamin (mapped to gender score)
├─ date_of_birth (used to calculate age)

From departments table:
├─ name (displayed as Dept)

From job_titles table:
├─ name (displayed as Posisi)
├─ risk_level (used for job risk score)

From mcus table (LATEST per employee):
├─ mcu_id
├─ mcu_date
├─ blood_pressure
├─ bmi
├─ smoking_status
├─ exercise_frequency
├─ final_result (used as filter - must exist)

From pemeriksaan_lab table:
├─ glucose (lab_item_id = 7)
├─ cholesterol (lab_item_id = 8)
├─ triglycerides (lab_item_id = 9)
├─ hdl (lab_item_id = 10)
```

---

## ✅ IMPLEMENTATION CHECKLIST

- [ ] Copy `assessment-rahma-dashboard.js` to `mcu-management/js/pages/`
- [ ] Copy `assessment-rahma-dashboard-page.html` to `mcu-management/html/`
- [ ] Import in main HTML file
- [ ] Include page HTML
- [ ] Add menu item to sidebar
- [ ] Run database migration script
- [ ] Test menu click → dashboard loads
- [ ] Test search functionality
- [ ] Test card filters (LOW, MEDIUM, HIGH)
- [ ] Test View All button
- [ ] Test pagination
- [ ] Verify data shows correctly (latest MCU per employee)
- [ ] Verify only active employees shown
- [ ] Verify scoring calculations correct

---

## 🔍 DATA VALIDATION NOTES

### Important Rules:
1. **Active Employees Only**: `is_active = true AND deleted_at IS NULL`
2. **Latest MCU Only**: Sorted by mcu_date DESC, take first
3. **Completed MCU Only**: Must have `final_result` value
4. **Employee Gender Mapping**:
   - `jenis_kelamin = 'L'` or `'Laki-laki'` → pria (1)
   - `jenis_kelamin = 'P'` or `'Perempuan'` → wanita (0)
5. **Age Calculation**: From `date_of_birth` to `mcu_date`
6. **Lab Results**: Using `lab_item_id` mapping (7, 8, 9, 10)

---

## 🐛 TROUBLESHOOTING

### Dashboard doesn't load?
- Check import statement
- Check if `initAssessmentRahmaDAshboard()` called
- Check Supabase connection
- Check console for errors

### No data showing?
- Verify active employees exist
- Verify MCUs with final_result exist
- Check if migration script executed
- Verify lab results in pemeriksaan_lab table

### Cards showing 0?
- Check if there are any completed MCUs
- Check employee is_active status
- Verify Framingham migration created columns

### Pagination not working?
- Check if filtered data exists
- Verify itemsPerPage = 15
- Check table render function

### Scores not calculating?
- Check framinghamCalculatorService imported
- Check lab data structure
- Check blood pressure format (should be "SBP/DBP")
- Check if age calculated correctly

---

## 📱 RESPONSIVE DESIGN

- **Desktop**: Full-width table, 3-column card layout
- **Tablet**: 2-column card layout, adjusted table
- **Mobile**: 1-column card layout, horizontal scroll table

---

## ⚡ PERFORMANCE NOTES

- Loads all active employees once on page init
- Calculates all assessments in memory
- Pagination: 15 rows per page
- Search/filter: Client-side (no DB query)
- Card click: Instant filter update

---

## 🎯 FUTURE ENHANCEMENTS

Potential features to add later:
- [ ] Export to CSV/Excel
- [ ] Bulk email recommendations to high-risk employees
- [ ] Trend analysis (compare assessments over time)
- [ ] Detailed employee modal with full assessment history
- [ ] Department-level risk analytics
- [ ] Recommendations popup
- [ ] Custom date range selection
- [ ] Risk level change alerts

---

**Version:** 1.0
**Created:** 2025-12-13
**Status:** Ready for Integration

The Assessment RAHMA Dashboard is now ready to be integrated into your sidebar menu!
