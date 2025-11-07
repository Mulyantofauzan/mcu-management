# Migration 004: Create MCU Files Table

## Purpose
Store metadata for files uploaded to Google Drive for MCU documents.

## Supabase SQL

```sql
-- Create mcuFiles table
CREATE TABLE mcuFiles (
  fileId TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  employeeId TEXT NOT NULL,
  mcuId TEXT,
  fileName TEXT NOT NULL,
  fileType TEXT NOT NULL, -- 'pdf', 'jpg', 'png'
  fileSize INTEGER NOT NULL, -- bytes
  googleDriveFileId TEXT NOT NULL, -- Google Drive file ID for direct access
  uploadedBy TEXT NOT NULL, -- userId
  uploadedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deletedAt TIMESTAMP WITH TIME ZONE, -- soft delete
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_employee FOREIGN KEY (employeeId) REFERENCES employees(employeeId) ON DELETE CASCADE,
  CONSTRAINT fk_mcu FOREIGN KEY (mcuId) REFERENCES mcus(mcuId) ON DELETE CASCADE
);

-- Indexes for fast queries
CREATE INDEX idx_mcufiles_employeeId ON mcuFiles(employeeId);
CREATE INDEX idx_mcufiles_mcuId ON mcuFiles(mcuId);
CREATE INDEX idx_mcufiles_uploadedAt ON mcuFiles(uploadedAt DESC);
CREATE INDEX idx_mcufiles_deletedAt ON mcuFiles(deletedAt);

-- Enable Row Level Security (optional - add if using RLS)
ALTER TABLE mcuFiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see files for their own employee records (optional)
-- CREATE POLICY "Users can view MCU files for their employees" ON mcuFiles
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM employees
--       WHERE employees.employeeId = mcuFiles.employeeId
--       AND employees.userId = auth.uid()
--     )
--   );
```

## Dexie/IndexedDB Schema (Fallback)

```javascript
// In databaseAdapter.js, add to Dexie schema:
db.version(1).stores({
  // ... existing tables ...
  mcuFiles: '++fileId, employeeId, mcuId, uploadedAt, &googleDriveFileId'
});
```

## File Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| fileId | UUID | Primary key, auto-generated |
| employeeId | TEXT | Reference to employee |
| mcuId | TEXT | Optional reference to specific MCU |
| fileName | TEXT | Original file name (e.g., "test-results.pdf") |
| fileType | TEXT | File extension (pdf, jpg, png) |
| fileSize | INTEGER | File size in bytes |
| googleDriveFileId | TEXT | Google Drive file ID for access/download |
| uploadedBy | TEXT | User ID who uploaded |
| uploadedAt | TIMESTAMP | When file was uploaded |
| deletedAt | TIMESTAMP | Soft delete timestamp (null = active) |

## Google Drive File Access

Files will be accessible via:
- **Download:** `https://drive.google.com/uc?export=download&id={googleDriveFileId}`
- **Preview:** `https://drive.google.com/file/d/{googleDriveFileId}/preview`

## Notes

- Soft delete (deletedAt) allows recovery if needed
- Foreign keys cascade delete to clean up file records if employee/MCU deleted
- Indexes on employeeId and uploadedAt for fast filtering
- RLS (Row Level Security) policy optional - depends on your auth model
