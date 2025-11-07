# Supabase Setup Guide - MCU Files Table

## Quick Setup (5 minutes)

### Step 1: Go to Supabase SQL Editor

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your MCU Management project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Create MCU Files Table

Copy and paste this entire SQL script into the editor:

```sql
-- Create mcuFiles table for storing file metadata
CREATE TABLE mcuFiles (
  fileId TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  employeeId TEXT NOT NULL,
  mcuId TEXT,
  fileName TEXT NOT NULL,
  fileType TEXT NOT NULL,
  fileSize INTEGER NOT NULL,
  googleDriveFileId TEXT NOT NULL UNIQUE,
  uploadedBy TEXT NOT NULL,
  uploadedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deletedAt TIMESTAMP WITH TIME ZONE,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_employee FOREIGN KEY (employeeId) REFERENCES employees(employeeId) ON DELETE CASCADE,
  CONSTRAINT fk_mcu FOREIGN KEY (mcuId) REFERENCES mcus(mcuId) ON DELETE SET NULL
);

-- Create indexes for fast queries
CREATE INDEX idx_mcufiles_employeeId ON mcuFiles(employeeId);
CREATE INDEX idx_mcufiles_mcuId ON mcuFiles(mcuId);
CREATE INDEX idx_mcufiles_uploadedAt ON mcuFiles(uploadedAt DESC);
CREATE INDEX idx_mcufiles_deletedAt ON mcuFiles(deletedAt);

-- Enable Row Level Security
ALTER TABLE mcuFiles ENABLE ROW LEVEL SECURITY;
```

### Step 3: Execute the Query

Click the **Run** button (or press `Cmd+Enter` on Mac, `Ctrl+Enter` on Windows).

You should see:
```
Queries executed successfully
```

### Step 4: Verify Table Creation

1. Go to **Table Editor** in the left sidebar
2. You should see **mcuFiles** in the list of tables
3. Click on it to view columns and confirm all fields exist

## Table Structure Reference

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| fileId | TEXT | ✓ | UUID | Unique file identifier |
| employeeId | TEXT | ✓ | - | References employees table |
| mcuId | TEXT | ✗ | NULL | Optional MCU reference |
| fileName | TEXT | ✓ | - | Original file name |
| fileType | TEXT | ✓ | - | File extension (pdf, jpg, png) |
| fileSize | INTEGER | ✓ | - | File size in bytes |
| googleDriveFileId | TEXT | ✓ | - | Google Drive file ID |
| uploadedBy | TEXT | ✓ | - | User ID who uploaded |
| uploadedAt | TIMESTAMP | ✓ | NOW() | Upload timestamp |
| deletedAt | TIMESTAMP | ✗ | NULL | Soft delete timestamp |
| createdAt | TIMESTAMP | ✓ | NOW() | Record creation time |
| updatedAt | TIMESTAMP | ✓ | NOW() | Last update time |

## Access Cloud Function Credentials

The Cloud Function needs to read/write to this table. It uses the **Service Role Key** for authentication.

### Get Supabase Credentials

1. Go to Supabase Dashboard > **Project Settings**
2. Click **API** tab
3. Copy the following:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Service Role Key** (under "Project API keys" section)

### Set in Cloud Function

When deploying the Cloud Function, set these environment variables:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here
```

(See: `docs/CLOUD_FUNCTION_DEPLOYMENT.md` for deployment instructions)

## Testing the Table

### Insert Test Record

```sql
INSERT INTO mcuFiles (
  employeeId,
  fileName,
  fileType,
  fileSize,
  googleDriveFileId,
  uploadedBy
) VALUES (
  'EMP001',
  'test-document.pdf',
  'pdf',
  1024000,
  'google-drive-file-id-here',
  'user-id-here'
);
```

### Query Files by Employee

```sql
SELECT * FROM mcuFiles
WHERE employeeId = 'EMP001'
AND deletedAt IS NULL
ORDER BY uploadedAt DESC;
```

### Soft Delete a File

```sql
UPDATE mcuFiles
SET deletedAt = NOW()
WHERE fileId = 'file-id-here';
```

### Restore a Deleted File

```sql
UPDATE mcuFiles
SET deletedAt = NULL
WHERE fileId = 'file-id-here';
```

## Security Considerations

### Row Level Security (RLS)

The table has RLS enabled but no policies yet. To add access control:

```sql
-- Allow users to see files only for their own employees
CREATE POLICY "Users can view their employee files" ON mcuFiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.employeeId = mcuFiles.employeeId
    AND employees.userId = auth.uid()
  )
);
```

### Important Notes

- **Service Role Key is sensitive** - Never commit to git or share publicly
- The Cloud Function uses this key for server-side database writes
- Keep `.gitignore` protecting this information
- Use environment variables in production

## Troubleshooting

### Error: "table already exists"

The table was already created. Run this to view it:

```sql
SELECT * FROM mcuFiles LIMIT 1;
```

### Error: "relation 'employees' does not exist"

The `employees` table is not in this database. You may need to:
1. Verify you're in the correct Supabase project
2. Check if the table is named differently (e.g., `employee` instead of `employees`)
3. Update the foreign key constraint to match your actual table name

### Error: "permission denied"

You need to be logged in with a role that has table creation permissions. Ask your Supabase project admin.

## Next Steps

After table creation:

1. ✅ mcuFiles table created
2. ⏳ Deploy Cloud Function (see: `docs/CLOUD_FUNCTION_DEPLOYMENT.md`)
3. ⏳ Integrate FileUploadWidget into forms (see: `docs/INTEGRATION_GUIDE.md`)
4. ⏳ Test file upload end-to-end

## Related Documentation

- [Cloud Function Deployment](./CLOUD_FUNCTION_DEPLOYMENT.md) - Deploy and configure the backend
- [Integration Guide](./INTEGRATION_GUIDE.md) - Add upload widget to forms
- [Migration Details](./migrations/004_create_mcu_files_table.md) - Detailed schema reference
