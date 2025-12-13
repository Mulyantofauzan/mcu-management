# Assessment RAHMA Dashboard - Quick Guide

**Status:** ✅ COMPLETE & IMPLEMENTED
**Date:** 2025-12-13

---

## 🎯 What's New

Three major features have been implemented:

### 1️⃣ Assessment RAHMA Dashboard
A complete Framingham CVD Risk Assessment dashboard showing:
- Risk category cards (LOW/MEDIUM/HIGH) with counts and percentages
- Complete employee list with all 11 Framingham parameter scores
- Real-time search by employee ID or name
- Filter by risk category
- Pagination (15 items per page)

**Access:** Sidebar → Assessment RAHMA

### 2️⃣ Risk Level Column in Data Master
Job titles now display with their occupational risk levels:
- **Green** = Low Risk (Rendah)
- **Yellow** = Moderate Risk (Sedang)
- **Red** = High Risk (Tinggi)

**Access:** Sidebar → Data Master → Jabatan tab

### 3️⃣ Risk Level Management
Can now edit and create job titles with risk levels:
- Create new job titles with assigned risk level
- Edit existing job title risk levels
- Changes are saved to database automatically
- Full audit trail maintained

**Access:** Data Master → Jabatan tab → Click edit or add

---

## 📊 Assessment RAHMA Dashboard Features

### Risk Category Cards
```
┌─────────────┬──────────────┬──────────────┐
│ LOW RISK    │ MEDIUM RISK  │ HIGH RISK    │
│ ✅ 15       │ ⚠️ 28        │ 🔴 12        │
│ 30%         │ 56%          │ 24%          │
└─────────────┴──────────────┴──────────────┘
```

Click any card to filter the employee list by that risk category.

### Search Bar
Type employee ID or name to search instantly:
```
Search by:
- Employee ID: EMP001
- Employee Name: Budi
```

### Employee List
Shows 15 employees per page with:
- Employee ID & Name
- Department & Job Title
- MCU Date
- All 11 Parameter Scores
- Total Framingham Score
- Risk Category (color-coded)

### Navigation
- Previous/Next buttons for pagination
- Page indicator (e.g., "Page 1 of 4")

---

## 💼 Data Master - Risk Level Management

### Viewing Risk Levels
```
1. Go to Data Master
2. Click "Jabatan" tab
3. See "Tingkat Risiko Pekerjaan" column with colors
```

### Adding New Job Title with Risk Level
```
1. Data Master → Jabatan tab
2. Click "+ Tambah" button
3. Fill:
   - Nama: Job title name (required)
   - Tingkat Risiko Pekerjaan: Select from dropdown
4. Click "Simpan"
```

### Editing Existing Risk Level
```
1. Data Master → Jabatan tab
2. Find job title in list
3. Click edit button (pencil icon)
4. Change risk level dropdown
5. Click "Simpan"
```

### Risk Level Options
| Level | Display | Used For |
|-------|---------|----------|
| Low | Rendah (Green) | Desk jobs, office work |
| Moderate | Sedang (Yellow) | Mixed activity jobs (default) |
| High | Tinggi (Red) | Physically demanding jobs |

---

## 📊 Framingham CVD Risk Calculation

The system calculates cardiovascular risk based on 11 parameters:

**Parameters Scored:**
1. Gender (Jenis Kelamin)
2. Age (Umur)
3. Job Risk Level (Tingkat Risiko Pekerjaan)
4. Exercise Frequency (Frekuensi Olahraga) - *Protective*
5. Smoking Status (Status Merokok)
6. Blood Pressure (Tekanan Darah)
7. BMI (Body Mass Index)
8. Glucose (Glukosa)
9. Cholesterol (Kolesterol)
10. Triglycerides (Trigliserida)
11. HDL Cholesterol - *Protective*

**Risk Categories:**
- **LOW (0-4)**: ✅ Low cardiovascular risk
- **MEDIUM (5-11)**: ⚠️ Moderate cardiovascular risk
- **HIGH (12+)**: 🔴 High cardiovascular risk

---

## 🔍 How to Use

### View All Assessments
```
1. Dashboard → Click Assessment RAHMA in sidebar
2. See risk category cards at top
3. See full employee list below
```

### Find a Specific Employee
```
1. Go to Assessment RAHMA
2. Type employee ID in search bar (e.g., EMP001)
3. OR type employee name (e.g., Budi)
4. List filters automatically
```

### See Only High-Risk Employees
```
1. Go to Assessment RAHMA
2. Click on "HIGH RISK" card (red)
3. List shows only high-risk employees
4. Click "Lihat Semua" to see all again
```

### See Risk Score Details
```
1. Look at employee row in table
2. Columns show all 11 parameter scores
3. "Total" column shows Framingham score
4. "Risk" column shows category (color-coded)
```

---

## 🎨 Menu Navigation

Assessment RAHMA menu item now appears in all pages:

**Location in Sidebar:**
```
Dashboard
├─ Tambah Karyawan
├─ Kelola Karyawan
├─ Follow-Up
├─ Data Master
├─ Assessment RAHMA        ← NEW!
├─ Kelola User (Admin only)
├─ Activity Log (Admin only)
├─ Analysis
├─ Laporan Periode
├─ Riwayat Kesehatan
└─ Data Terhapus
```

**Consistent Styling:**
- Same style as other menu items
- No special highlighting
- Works on all pages

---

## ✅ What's Been Updated

### Pages Modified
- 11 pages now have Assessment RAHMA menu
- Data Master displays risk level column
- All pages have consistent navigation

### New Page Created
- `assessment-rahma.html` - Dedicated dashboard page

### Features Added
- Risk category filtering
- Real-time employee search
- Risk level display and management
- Pagination support
- Empty state messaging

### Database Changes
- `job_titles.risk_level` column (already exists)
- No new columns needed
- Ready to use

---

## 🧪 Testing Checklist

If you want to verify everything works:

- [ ] Can navigate to Assessment RAHMA page from sidebar
- [ ] Dashboard loads without errors
- [ ] Risk category cards display correctly
- [ ] Employee search works by ID and name
- [ ] Risk filter cards work to filter list
- [ ] Pagination buttons work
- [ ] Data Master shows risk level column
- [ ] Can edit risk level in Data Master
- [ ] Risk level changes save to database
- [ ] Menu appears in all pages
- [ ] Menu styling is consistent

---

## 🐛 Troubleshooting

### Dashboard is Empty / Shows "Belum ada data"

**This is normal if:**
- No employees in the system yet
- Employees have no MCU data
- All employees are inactive (deleted)

**To populate with data:**
1. Go to Tambah Karyawan
2. Add active employees
3. Go to Follow-Up or MCU entry
4. Add MCU records for employees
5. Return to Assessment RAHMA
6. Dashboard should now show data

### Menu item doesn't appear

**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh page (Ctrl+Shift+R)
3. Log out and log back in

### Risk level column not showing

**Solution:**
1. Make sure you're on the "Jabatan" tab
2. Clear browser cache
3. Hard refresh page

### Scores don't look right

**Check:**
1. Employee has MCU data
2. MCU has all required fields filled
3. Open browser console (F12) for error messages
4. Look for "Assessment Data" log showing counts

---

## 📚 Related Guides

For more detailed information, see:

1. **User Guide:** RISK_LEVEL_DATA_MASTER_GUIDE.md
2. **Technical Details:** RISK_LEVEL_IMPLEMENTATION_SUMMARY.md
3. **Scoring Algorithm:** FRAMINGHAM_SCORING_DETAIL.md
4. **Implementation Status:** ASSESSMENT_RAHMA_FINAL_STATUS.md

---

## 💡 Tips & Tricks

### Keyboard Shortcuts
- Search input is always focused - just start typing
- Use Tab to navigate between risk cards
- Enter to apply filter

### Performance
- Dashboard loads faster with fewer employees
- Search is instant - results update as you type
- Pagination prevents slow loading with many records

### Data Quality
- Set job title risk levels appropriately for accuracy
- Ensure employees have recent MCU data
- Smoking status and exercise frequency affect scores
- Blood pressure and BMI are key parameters

---

## 🎯 Next Steps

1. ✅ Assessment RAHMA page is live - navigate to it from sidebar
2. ✅ Risk levels can be managed in Data Master
3. ⚠️ Populate with employee/MCU data to see results
4. ⚠️ Monitor dashboard for high-risk employees
5. ⚠️ Use assessments for health interventions

---

## 📞 Support

**Questions or Issues?**

1. Check this guide first
2. Review detailed documentation files
3. Check browser console (F12) for errors
4. Verify employee and MCU data exists
5. Clear cache and refresh if needed

---

**Version:** 1.0
**Status:** ✅ READY FOR USE
**Last Updated:** 2025-12-13

Enjoy using the Assessment RAHMA Dashboard! 🚀
