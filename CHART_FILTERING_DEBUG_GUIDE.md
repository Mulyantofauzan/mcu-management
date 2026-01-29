# Chart Filtering Debug Guide

## Issue Summary
When user applies filter to "MCU 2026" (by selecting "Semua Tahun" then picking year 2026), some charts show more data than expected, not matching the filtered MCU count (e.g., 2 MCU shown in summary but charts show more).

## Root Cause Analysis

The data flow for filtering should be:
1. User selects "Semua Tahun" → loads all MCU data (latest per employee only)
2. User selects year "2026" → applies year filter
3. `applyFilters()` populates `this.filteredData` with matching records
4. `renderAllCharts()` is called with filtered data

**Potential issues identified:**
1. `filteredData` might not be correctly populated with filtered results
2. Charts might be receiving empty data or wrong data
3. Lab data mapping might not be correctly constructed when filtering

## Debug Instructions

### Step 1: Open Browser Console
1. Open the application in Chrome/Firefox
2. Press **F12** to open Developer Console
3. Go to **Console** tab

### Step 2: Apply Filter and Check Console Output

1. Navigate to Analysis page
2. Select "Semua Tahun" from "Periode MCU" dropdown
3. Select "2026" from "Tahun MCU" dropdown
4. Click "Apply Filter"

### Step 3: Look for These Debug Messages

After clicking "Apply Filter", you should see console output like:

```
Filters applied: {
  mcuPeriod: "all-years",
  selectedYear: 2026,
  baseDataLength: XX,
  filteredDataLength: XX,
  filteredRecords: [...]
}
renderAllCharts() called with filteredData count: XX
filteredData sample: [...]
renderVisionChart() processing filteredData count: XX
renderLabResultsCharts() processing filteredData count: XX
```

### Step 4: Verify Counts Match

- **Expected:** If summary shows "2" total MCU, then:
  - `filteredDataLength` should be 2
  - `renderAllCharts() called with filteredData count: 2`
  - `renderVisionChart() processing filteredData count: 2`
  - `renderLabResultsCharts() processing filteredData count: 2`

- **If counts don't match:** There's an issue with filter application

### Step 5: Take Screenshot of Console

Please provide screenshot of console output so we can analyze the exact counts being processed.

## What to Look For

### Issue Type A: Filter Not Applied
**Symptom:** `filteredDataLength` is much larger than expected (all data instead of filtered)
- **Likely cause:** Filter dropdown selections not being read correctly
- **Fix needed:** Check filter value reading in applyFilters() function

### Issue Type B: Data Loading Issue
**Symptom:** `baseDataLength` is much smaller than expected
- **Likely cause:** `allMCUData` not loaded when user selects "Semua Tahun"
- **Fix needed:** Check loadAllMCUData() completion

### Issue Type C: Lab Data Not Loaded
**Symptom:** Charts show "Not Recorded" but console shows correct filteredDataLength
- **Likely cause:** Lab results not properly loaded or mapped when filtering
- **Fix needed:** Check if lab data is available in `item.labs` object

### Issue Type D: Chart Data Processing Issue
**Symptom:** Counts match in debug output but charts still show wrong data
- **Likely cause:** Chart rendering function not using filteredData correctly
- **Fix needed:** Individual chart function debugging

## Manual Test Cases

### Test 1: Single Year Filter
1. Select "Semua Tahun"
2. Select "2025"
3. Click Apply
4. Check console: should show only 2025 MCU records

### Test 2: Multiple Years Available
1. Select "Semua Tahun"
2. Check year dropdown - should show: 2025, 2026, 2024, etc.
3. Select different years one by one
4. Verify count changes appropriately

### Test 3: No Data Scenarios
1. Select "Semua Tahun"
2. Select year that has no MCU records
3. Should show 0 MCU, all charts should be empty/hidden

## Next Steps

Once you run this debug process and share the console output, we can:
1. Identify exact point where filtering fails
2. Pinpoint which data structure is incorrect
3. Implement targeted fix for the specific issue

## Related Files
- `mcu-management/js/services/analysisDashboardService.js` - Main service handling filtering
- `mcu-management/pages/analysis.html` - Analysis page UI
