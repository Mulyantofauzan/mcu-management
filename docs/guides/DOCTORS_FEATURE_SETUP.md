# Doctor Management & Referral Feature Setup

## Overview
Fitur doctor management memungkinkan pengguna untuk mengelola daftar dokter dan mengaitkannya dengan data rujukan di MCU.

## Database Setup

### For IndexedDB (Local Development)
Database sudah otomatis di-setup dengan table `doctors` di schema version 3.

### For Supabase (Production)

Run dua migration files dalam urutan:

1. **Create doctors table:**
   ```sql
   -- File: supabase-migrations/create-doctors-table.sql
   ```

2. **Add doctor field to mcus:**
   ```sql
   -- File: supabase-migrations/add-doctor-to-mcus.sql
   ```

**Steps:**
1. Login ke Supabase Dashboard
2. Go to SQL Editor
3. Copy-paste contents dari `create-doctors-table.sql`
4. Run the query
5. Repeat untuk `add-doctor-to-mcus.sql`

## API Changes

### New Services in masterDataService.js

```javascript
// Get all doctors
const doctors = await masterDataService.getAllDoctors();

// Get specific doctor
const doctor = await masterDataService.getDoctorById(doctorId);

// Create doctor
const newDoctor = await masterDataService.createDoctor({
    name: 'Dr. John Doe'
});

// Update doctor
const updated = await masterDataService.updateDoctor(doctorId, {
    name: 'Dr. Jane Smith'
});

// Delete doctor
await masterDataService.deleteDoctor(doctorId);
```

## UI Changes

### MCU Form (tambah-karyawan.html)
- Added "Diberikan Oleh (Dokter)" dropdown in "Data Rujukan (Opsional)" section
- Dropdown automatically populated from doctor master data
- Doctor ID saved in MCU record

### Data Master Page (data-master.html)
- Doctor management CRUD should be added to data-master.html
- Allow users to create, update, delete doctors

## Frontend Integration

### Load doctors on page initialization:
```javascript
const doctors = await masterDataService.getAllDoctors();
```

### Display in dropdown:
```javascript
doctors.forEach(doctor => {
    const option = document.createElement('option');
    option.value = doctor.doctorId;
    option.textContent = doctor.name;
    doctorSelect.appendChild(option);
});
```

### Save with MCU:
```javascript
const mcuData = {
    // ... other MCU fields
    doctor: document.getElementById('mcu-doctor').value || null,
    // ... other fields
};
```

## Database Schema

### Doctors Table (Supabase)
```sql
CREATE TABLE doctors (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Doctors Table (IndexedDB)
```javascript
doctors: 'doctorId, name'
```

### MCUs Table Updates
- Added `doctor` field (TEXT, references doctors.id)
- Foreign key relationship with `ON DELETE SET NULL`

## Validation Rules

1. **Doctor Name:**
   - Required when creating/updating
   - Max 255 characters
   - No special characters (handled by sanitization)

2. **MCU Doctor Field:**
   - Optional (Opsional)
   - Must be valid doctor ID if provided
   - Automatically set to null if doctor is deleted

## Error Handling

Activity logs are created for all doctor operations:
- Create: `'create'` action
- Update: `'update'` action
- Delete: `'delete'` action with validation preventing deletion if referenced in MCUs

## Testing

### Test doctor creation:
1. Go to Data Master page
2. Create new doctor: "Dr. Test Doctor"
3. Verify appears in dropdown on MCU form

### Test MCU with doctor:
1. Create new employee + MCU
2. Select doctor from dropdown
3. Save MCU
4. Verify doctor is saved in database

### Test doctor deletion:
1. Try to delete doctor without references - should succeed
2. Try to delete doctor with MCU references - should show error message

## Notes

- Doctor data is cached with 5-minute TTL for performance
- Cache automatically invalidated on create/update/delete operations
- All doctor operations logged to activity log for audit trail
- Doctor names support international characters (UTF-8)
