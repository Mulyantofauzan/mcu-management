# Feature Plan: Enhanced Reporting & Employee Health Graphs

**Date:** October 28-29, 2025
**Features:**
1. Period-based employee and MCU reporting
2. Per-employee health history graphs

**Status:** Planning Phase
**Approach:** Incremental, tested implementation

---

## 📋 FEATURE 1: Period-Based Reporting

### Purpose
Generate reports of employees and their MCU results within a specific date range.

### Requirements
- Filter by date range (start date - end date)
- Filter by department (optional)
- Filter by MCU status (Fit/Unfit/Follow-up, etc)
- Export to CSV (optional for now)
- Show statistics: total employees, MCU count, status breakdown

### Data Structure Needed
```
Report Data:
├── Employee Info
│   ├── ID, Name, Department, Job Title
├── MCU Details (within period)
│   ├── MCU Date, Status, Notes
└── Statistics
    ├── Total MCU in period
    ├── Fit count & %, Unfit count & %
```

### Database Queries
```javascript
// Get MCU records in date range with employee info
SELECT
  e.id, e.name, e.department, e.jobTitle,
  m.date, m.status, m.notes
FROM employees e
LEFT JOIN mcus m ON e.id = m.employeeId
WHERE m.date BETWEEN :startDate AND :endDate
ORDER BY e.name, m.date DESC;
```

### UI Components
- Date range picker
- Department & status filters
- Results table with sorting
- Statistics cards
- Export button (CSV)

### Implementation Files
- `pages/report-period.html` - New page
- `js/pages/report-period.js` - Logic

### Effort: 4-6 hours

---

## 📊 FEATURE 2: Employee Health History Graphs

### Purpose
Show MCU status history for a specific employee over time (year-by-year).

### Requirements
- Select employee from dropdown
- Show timeline of MCU results
- Visual graph of health status over time
- Trend indicators
- Filter by year or all-time view

### Database Queries
```javascript
// Get all MCU records for specific employee
SELECT
  m.id, m.employeeId, m.date, m.status, m.notes,
  e.name, e.department
FROM mcus m
JOIN employees e ON m.employeeId = e.id
WHERE m.employeeId = :employeeId
ORDER BY m.date ASC;
```

### UI Components
- Employee selector (searchable dropdown)
- Year filter toggle
- Main graph area (using Chart.js - already available)
- Data table with MCU records
- Trend indicator

### Implementation Files
- `pages/employee-health-history.html` - New page
- `js/pages/employee-health-history.js` - Logic

### Effort: 5-7 hours

---

## 🔧 IMPLEMENTATION STRATEGY

### Phase 1: Prepare (30 min)
- ✓ Create feature plan
- Verify database structure
- Check existing queries

### Phase 2: Feature 1 - Period Reporting (4-6 hours)
1. Create report page
2. Implement filters
3. Create results table
4. Add statistics
5. Test thoroughly
6. Deploy

### Phase 3: Feature 2 - Health Graphs (5-7 hours)
1. Create health history page
2. Implement employee selector
3. Create graph visualization
4. Add trend analysis
5. Test thoroughly
6. Deploy

**Total Effort:** 10-15 hours over 1-2 weeks

---

## ⚠️ SAFETY MEASURES

### To Avoid Issues:
1. ✅ Use EXISTING database adapter (not Supabase `.from()`)
2. ✅ Test queries locally first
3. ✅ NO new database tables/migrations
4. ✅ NO breaking changes to existing code
5. ✅ NO new npm packages (use existing Chart.js)
6. ✅ Comprehensive error handling
7. ✅ Non-blocking operations

### Testing Checklist:
- [ ] Test with sample data
- [ ] Test all filters
- [ ] Test empty results
- [ ] Test with large datasets
- [ ] Browser console: NO errors
- [ ] Mobile responsive
- [ ] Performance acceptable

---

## 🎯 PRIORITY ORDER

**RECOMMEND:**
1. **Feature 1 First** - Period reporting (simpler)
2. **Feature 2 Second** - Employee health graphs (more complex)

Both are additive and safe to implement.

---

## 📊 RISK ASSESSMENT

| Feature | Complexity | Risk | Time |
|---------|-----------|------|------|
| Period Reporting | Low-Medium | 🟢 Low | 4-6h |
| Health Graphs | Medium | 🟢 Low | 5-7h |

**Why Low Risk:**
- No database changes
- No new dependencies
- Uses existing libraries (Chart.js)
- Additive only (no breaking changes)

---

## ✅ NEXT STEP

Choose one:

1. **Implement Both** (Full solution)
   - 10-15 hours total
   - Complete within 1-2 weeks

2. **Feature 1 Only First** (Recommended)
   - 4-6 hours
   - Deploy within 1 day
   - Add Feature 2 later

3. **Quick Enhancement** (Minimum)
   - Enhance existing dashboard
   - 2-3 hours
   - Deploy immediately

---

**Which option would you like?** 🚀
