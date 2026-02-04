# Lab Result Change Tracking - Debug Test Guide

## Overview
This guide helps test and verify that lab result changes are being properly recorded in the change history when editing MCU records.

**Status**: Debug logging added to track lab result changes

---

## Quick Test Steps

### 1. Open Browser Developer Tools
- Press `F12` or right-click → "Inspect"
- Click on the "Console" tab
- Keep this open during the test

### 2. Navigate to Kelola Karyawan
- Click "Kelola Karyawan" menu
- Wait for the employee list to load

### 3. Edit an MCU with Lab Results
- Find an employee with existing MCU data
- Click the edit icon (pencil) or the MCU row
- The edit modal should appear showing:
  - MCU details
  - Lab result values in the form

### 4. Change a Lab Result Value
- Find a lab result field (like "Hemoglobin", "Kolesterol", etc.)
- Change the value to something different
  - Example: Change 14.5 → 15.5
  - Example: Change 200 → 210
- Make sure the new value is numeric and valid

### 5. Submit the Edit
- Click "Simpan" button
- Watch the progress bar fill up
- Wait for success message

### 6. Check Console Output
Look in the Console tab for debug messages:

```
🔍 MCU Batch Update Result: {
  mcuUpdated: true,
  labSavedCount: 0,
  labUpdatedCount: 1,      ← Should be > 0 if you changed a lab value
  labDeletedCount: 0,
  labUpdated: [...]
}
```

Then look for:
```
🔍 Lab Updated Count: 1    ← Number of lab items changed
🔍 Lab Updated Data: [...]  ← The raw data being processed
🔍 Comparing: Hemoglobin - Old: 14.5 (number) vs New: 15.5 (number)
✅ Change recorded for: Hemoglobin
```

---

## What the Debug Output Tells Us

### Expected (Working) Output:
```
🔍 Lab Updated Count: 1
🔍 Lab Updated Data: [{
  labItemId: 1,
  labItemName: "Hemoglobin",
  oldValue: 14.5,
  newValue: 15.5,
  notesChanged: false
}]
🔍 Comparing: Hemoglobin - Old: 14.5 (number) vs New: 15.5 (number)
✅ Change recorded for: Hemoglobin
```

### If Changes Not Detected:
```
🔍 Lab Updated Count: 0    ← Problem: No changes detected
🔍 Lab Updated Data: []
```
**What this means**: The batch service is not detecting that lab values changed.
**Possible causes**:
1. Form not sending new lab values correctly
2. Lab values are same as existing (no actual change)
3. Lab item ID mapping issue

### If Changes Detected But Not Recorded:
```
🔍 Lab Updated Count: 1
🔍 Lab Updated Data: [{...}]
🔍 Comparing: Hemoglobin - Old: 14.5 (number) vs New: 14.5 (number)
❌ No change detected - values are identical
```
**What this means**: The values look identical even though they appear different.
**Possible causes**:
1. Values are being converted/rounded differently
2. Whitespace or formatting issues
3. Data type mismatch

### If Error During Save:
```
⚠️ Beberapa operasi gagal:
Lab item 1: [error message]
```
**What this means**: Lab update failed in database.
**Possible causes**:
1. Database connection issue
2. Value validation failed
3. Lab item doesn't exist

---

## Verify in Change History

After successful save:

1. Close the edit modal
2. Click the MCU row again to view details
3. Scroll down to "Riwayat Perubahan" (Change History) section
4. Look for entries like:
   ```
   Hasil Lab (Update): Hemoglobin
   Old: 14.5 → New: 15.5
   Changed by: [User]
   Changed at: [Timestamp]
   ```

---

## Console Logs Reference

### In `mcuBatchService.js`:
- When updating lab results, you'll see:
  ```
  🔍 MCU Batch Update Result: {...}
  ```

### In `kelola-karyawan.js`:
- Before saving changes:
  ```
  🔍 Lab Updated Count: X
  🔍 Lab Updated Data: [...]
  ```
- For each lab item:
  ```
  🔍 Comparing: [Lab Name] - Old: X vs New: Y
  ✅ Change recorded for: [Lab Name]
  ```
  or
  ```
  ❌ No change detected - values are identical
  ```

---

## Test Scenarios

### Scenario 1: Change One Lab Value
1. Edit MCU
2. Change Hemoglobin: 14.5 → 15.5
3. Keep all other fields the same
4. Save
5. **Expected**: `labUpdatedCount: 1` and change recorded

### Scenario 2: Change Multiple Lab Values
1. Edit MCU
2. Change 3 different lab values
3. Save
4. **Expected**: `labUpdatedCount: 3` and all 3 changes recorded

### Scenario 3: Change Lab Value and MCU Field
1. Edit MCU
2. Change one lab value
3. Also change MCU result (e.g., from "Fit" to "Follow Up")
4. Save
5. **Expected**: MCU field change + lab value change both recorded

### Scenario 4: No Lab Changes
1. Edit MCU
2. Only change MCU result, don't touch lab values
3. Save
4. **Expected**: `labUpdatedCount: 0` and no lab changes recorded

---

## Next Steps

1. **Run one test scenario** and share the console output
2. Based on the output, we'll identify the root cause
3. I'll implement the fix based on what we find
4. We'll test again to verify it works
5. Remove debug logging and commit the permanent fix

---

## Files Being Debugged

- `js/services/mcuBatchService.js` (lines 283-294, 343-360)
  - Detects lab changes by comparing existing vs new values
  - Logs what changes are found

- `js/pages/kelola-karyawan.js` (lines 2368-2391)
  - Receives lab changes from batch service
  - Records them in change history
  - Logs the comparison process

---

**Test with**: Any MCU that has lab results and is editable
**Expected Result**: Lab changes recorded in history with timestamps
**Current Issue**: Lab changes not being recorded (under investigation)

