# MCU Change History System (Riwayat Perubahan)

## Overview

The MCU Change History system automatically tracks and records **every change** made to MCU records, including:
- ✅ Initial MCU creation
- ✅ MCU data updates (vital signs, examination results, etc.)
- ✅ Follow-up results and notes
- ✅ Lab result additions, updates, and deletions
- ✅ Medical and family history changes

All changes are:
- **Timestamped** - Recorded with exact date/time
- **User-Tracked** - Records who made the change
- **Immutable** - Stored in the `mcu_changes` table as historical record
- **Auditable** - Can be viewed anytime to see complete audit trail

## Database Schema

### Table: `mcu_changes`

```sql
CREATE TABLE mcu_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mcu_id VARCHAR(50) NOT NULL REFERENCES mcus(mcu_id),
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by VARCHAR(50) -- user_id of who made the change
);
```

## System Flow

### 1. MCU Creation (Tambah MCU)
**File**: `js/pages/kelola-karyawan.js`

When a new MCU is created:
1. ✅ `mcuBatchService.saveMCUWithLabResults()` is called
2. ✅ `mcuService.create()` creates the MCU record
3. ✅ `createInitialChangeEntry()` records the creation: `"created" → "Record created"`
4. ✅ Lab results are saved, each recorded as a change:
   - `"Lab: [Item Name]"` → `oldValue: null, newValue: "[value][unit]"`
5. ✅ Activity log is created with employee name and MCU details

**Result**: Change history shows initial creation + all lab results added

---

### 2. MCU Follow-Up Update (Follow-Up)
**File**: `js/pages/follow-up.js`

When follow-up results are saved:
1. ✅ MCU fields are updated (final result, notes, examination data)
2. ✅ `diffAndSaveHistory()` compares old vs new values
3. ✅ Only **changed fields** are recorded:
   - `"Hasil Akhir"` (Final Result)
   - `"Catatan Akhir"` (Final Notes)
   - `"Frekuensi Nafas"` (Respiratory Rate) - if changed
   - etc.
4. ✅ Lab results changes are recorded:
   - New labs: `"Lab: [Name]"` → `oldValue: -, newValue: [value]`
   - Updated labs: `"Lab: [Name]"` → `oldValue: [old], newValue: [new]`
   - Deleted labs: `"Lab: [Name]"` → `oldValue: [value], newValue: -`

**Result**: Change history shows exactly what was modified in each follow-up

---

### 3. MCU Detail View
**File**: `js/pages/kelola-karyawan.js` - `viewMCUDetail()` function

When opening an MCU record for viewing:
1. ✅ `mcuService.getChangeHistory(mcuId)` retrieves all changes
2. ✅ Changes are sorted by date (newest first)
3. ✅ Field labels are translated to Indonesian
4. ✅ Change history section displays in the detail modal:

```
Item MCU          | Hasil Awal | Hasil Akhir | Status
─────────────────────────────────────────────────────
Hasil Awal        |      -     | Fit         | Diubah
Hasil Akhir       |      -     | Fit         | Diubah
Lab: Glukosa      |      -     | 85 mg/dL    | Diubah
Lab: Kolesterol   |      -     | 200 mg/dL   | Diubah
```

---

## Field Labels Mapping

The system automatically translates field names to Indonesian:

### MCU Fields
- `mcuType` → Jenis MCU
- `mcuDate` → Tanggal MCU
- `bmi` → BMI
- `bloodPressure` → Tekanan Darah
- `respiratoryRate` → Frekuensi Nafas
- `pulse` → Nadi
- `temperature` → Suhu
- `chestCircumference` → Lingkar Perut
- `audiometry` → Audiometri
- `spirometry` → Spirometri
- `xray` → X-Ray
- `ekg` → EKG
- `treadmill` → Treadmill
- `hbsag` → HBsAg
- `napza` → NAPZA
- `colorblind` → Buta Warna
- `doctor` → Dokter
- `recipient` → Penerima Rujukan
- `keluhanUtama` → Keluhan Utama
- `diagnosisKerja` → Diagnosis Kerja
- `alasanRujuk` → Alasan Rujuk
- `initialResult` → Hasil Awal
- `initialNotes` → Catatan Awal
- `finalResult` → Hasil Akhir
- `finalNotes` → Catatan Akhir

### Special Fields
- `created` → Dibuat (Initial creation entry)
- `Lab: [ItemName]` → Lab result change entry

---

## Code Components

### 1. Diff Helpers (`js/utils/diffHelpers.js`)

**Functions**:
- `diffAndSaveHistory(oldMCU, newMCU, user, mcuId)` - Compares MCU versions and returns change array
- `createInitialChangeEntry(entityType, entityId, user)` - Creates initial creation change entry
- `formatChangeForDisplay(change)` - Formats change for UI display
- `getFieldLabel(fieldName)` - Gets Indonesian label for field name

**Trackable MCU Fields**:
- Basic info: mcuType, mcuDate
- Vital signs: bmi, bloodPressure, respiratoryRate, pulse, temperature, chestCircumference
- Examinations: audiometry, spirometry, xray, ekg, treadmill, hbsag, sgot, sgpt, cbc, napza, colorblind
- Vision: visionDistantUnaideLeft/Right, visionDistantSpectaclesLeft/Right, visionNearUnaideLeft/Right, visionNearSpectaclesLeft/Right
- Rujukan: doctor, recipient, keluhanUtama, diagnosisKerja, alasanRujuk
- Results: initialResult, initialNotes, finalResult, finalNotes, status

---

### 2. MCU Service (`js/services/mcuService.js`)

**Key Methods**:

```javascript
// Create MCU with initial change entry
async create(mcuData, currentUser) {
  const mcu = { /* MCU data */ };
  await database.add('mcus', mcu);

  // Create initial change entry
  const initialChange = createInitialChangeEntry('mcu', mcu.mcuId, currentUser);
  await database.add('mcuChanges', initialChange);

  return mcu;
}

// Update MCU and record changes
async update(mcuId, updates, currentUser) {
  const oldMCU = await this.getById(mcuId);
  await database.update('mcus', mcuId, updateData);
  const newMCU = await this.getById(mcuId);

  // Create change history (only for changed fields)
  const changes = diffAndSaveHistory(oldMCU, newMCU, currentUser, mcuId);
  for (const change of changes) {
    await database.add('mcuChanges', change);
  }

  return newMCU;
}

// Get change history
async getChangeHistory(mcuId) {
  const changes = await MCUChanges.getByMcuId(mcuId);
  return changes.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));
}
```

---

### 3. MCU Batch Service (`js/services/mcuBatchService.js`)

**Enhancement**: Lab result changes are now recorded when MCU is created with lab results.

```javascript
async saveMCUWithLabResults(mcuData, labResults, currentUser) {
  // Step 1: Create MCU (records initial change entry)
  const createdMCU = await mcuService.create(mcuData, currentUser);

  // Step 2-4: Save lab results with individual error handling
  for (const labResult of normalizedLabResults) {
    const savedLab = await labService.createPemeriksaanLab(labPayload, currentUser);

    // ✅ NEW: Record lab result change
    await database.MCUChanges.add({
      mcuId: createdMCU.mcuId,
      fieldName: `Lab: ${labItemName}`,
      oldValue: null,
      newValue: `${labResult.value}${unit}`,
      changedAt: new Date().toISOString(),
      changedBy: currentUser?.userId || 'system'
    });
  }

  return result;
}
```

---

### 4. Follow-Up Page (`js/pages/follow-up.js`)

**Change Recording**:
- Calls `mcuBatchService.updateMCUWithLabResults()` which uses `diffAndSaveHistory()`
- Also records lab result changes to mcu_changes table (lines 1059-1072)

```javascript
// ✅ IMPORTANT: Save all changes to mcuChanges table
for (const labChange of labChanges) {
  await database.add('mcuChanges', {
    mcuId: mcuId,
    fieldName: labChange.itemName,
    oldValue: labChange.oldValue,
    newValue: labChange.newValue,
    changedBy: currentUser?.userId || currentUser?.id,
    changedAt: new Date().toISOString()
  });
}
```

---

### 5. Database Adapter (`js/services/databaseAdapter.js`)

**MCUChanges Operations**:

```javascript
export const MCUChanges = {
  // Get all changes
  async getAll() { /* ... */ }

  // Get changes for specific MCU
  async getByMcuId(mcuId) { /* ... */ }

  // Add change entry
  async add(change) {
    // Maps camelCase to snake_case for Supabase
    const { data, error } = await supabase.from('mcu_changes').insert({
      mcu_id: change.mcuId,
      field_name: change.fieldName,
      old_value: change.oldValue,
      new_value: change.newValue,
      changed_at: change.changedAt,
      changed_by: change.changedBy
    });
  }
}
```

---

## How to View Change History

### Method 1: MCU Detail View (Kelola Karyawan)

1. Go to **Kelola Karyawan**
2. Click on MCU list
3. Click **Detail** button on any MCU row
4. Scroll down to **Riwayat Perubahan** section
5. See all changes with:
   - Item name (field that changed)
   - Old value (before)
   - New value (after)
   - Change status

### Method 2: Follow-Up Page

1. Go to **Follow-Up**
2. Click on MCU to update
3. Make changes and save
4. System displays **Riwayat Perubahan** modal showing:
   - What changed in this follow-up
   - Old vs new values
   - Lab result changes

---

## Change Recording Events

### Event 1: Initial MCU Creation
```
Trigger: User clicks "Simpan" in Tambah MCU modal
Changes Recorded:
  ✅ created: Record created (indicates MCU was created)
  ✅ All MCU fields: null → [value]
  ✅ All lab results: null → [value + unit]
Display: Shown in MCU detail view under "Riwayat Perubahan"
```

### Event 2: MCU Field Update
```
Trigger: User updates any MCU field (vital signs, examination results, etc.)
Changes Recorded:
  ✅ Only changed fields are recorded
  ✅ Old value → New value
Display: Shown in follow-up modal and MCU detail view
```

### Event 3: Follow-Up Results
```
Trigger: User saves follow-up visit
Changes Recorded:
  ✅ finalResult: [old] → [new]
  ✅ finalNotes: [old] → [new]
  ✅ Any examination fields changed
  ✅ Lab results: new, updated, or deleted
Display: Shown in "Riwayat Perubahan" in follow-up modal
```

### Event 4: Lab Result Changes
```
Trigger: Lab result is added, updated, or deleted
Changes Recorded:
  ✅ Lab: [ItemName]: oldValue → newValue
Display: Shown in MCU detail and follow-up history
```

---

## Query Change History

### Get all changes for an MCU
```javascript
const changes = await mcuService.getChangeHistory(mcuId);
// Returns array sorted by date (newest first)
```

### Get changes from database directly
```sql
SELECT * FROM mcu_changes
WHERE mcu_id = 'MCU-2024-001'
ORDER BY changed_at DESC;
```

---

## Benefits

✅ **Complete Audit Trail** - Know who changed what, when
✅ **Data Integrity** - Detect unauthorized or accidental changes
✅ **Compliance** - Meet regulatory requirements for medical records
✅ **Accountability** - Track responsibility for changes
✅ **Recovery** - See historical values if needed
✅ **Analysis** - Understand MCU assessment patterns over time

---

## Implementation Status

✅ **Complete** - All MCU data changes are automatically recorded
✅ **Tested** - Change history displays correctly in UI
✅ **Documented** - This document explains the system
✅ **Enhanced** - Lab result changes now tracked during MCU creation (v1.0.25)

---

## Recent Enhancements (Commit a03206b)

Added lab result change tracking to MCU batch service:
- Lab results created during initial MCU save are now recorded as changes
- Each lab result appears in change history with: Lab: [ItemName] → null → [value+unit]
- Provides complete audit trail including initial lab values
- Consistent with follow-up lab result change tracking

---

## Notes

- Change history is **read-only** - entries cannot be modified or deleted
- Changes are **timestamped** with user who made them
- All timestamps are in **ISO format with timezone**
- Field labels are automatically translated to **Indonesian**
- System handles both **Supabase and IndexedDB** backends

