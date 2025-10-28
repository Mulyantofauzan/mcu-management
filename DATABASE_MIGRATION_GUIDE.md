# Database Migration Guide
## Apply MFA & Audit Logging Changes

**Date:** October 29, 2025
**Migration File:** `database/migrations/001_add_mfa_and_audit_logging.sql`
**Status:** Ready to apply

---

## 📋 What This Migration Does

This migration adds:
1. **MFA Columns to `users` table:**
   - `mfa_enabled` - Boolean flag
   - `mfa_secret` - TOTP secret (base32)
   - `mfa_backup_codes` - Array of hashed codes
   - `mfa_enabled_at` - Timestamp when enabled
   - `mfa_failed_attempts` - Attempt counter
   - `mfa_lockout_until` - Lockout timestamp

2. **New `audit_logs` Table:**
   - Full activity audit trail (30+ event types)
   - User, event, resource, result, severity
   - IP address, user agent, timestamps
   - Flexible JSON details field
   - Performance indexes

3. **New `mfa_audit_log` Table:**
   - MFA-specific event tracking
   - User ID, event type, details

4. **Row Level Security (RLS):**
   - Users can view own audit logs
   - Admins can view all audit logs
   - Audit logs immutable (no updates/deletes)

5. **Reporting Views:**
   - `recent_login_attempts` - Last 24 hours
   - `patient_data_access_audit` - HIPAA compliance
   - `unauthorized_access_attempts` - Security incidents

---

## 🚀 METHOD 1: Via Supabase Dashboard (RECOMMENDED)

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Login dengan akun kamu
3. Select project: **mcu-management** (atau nama project kamu)

### Step 2: Open SQL Editor
1. Di sidebar kiri, cari **"SQL Editor"**
2. Klik **"SQL Editor"**
3. Klik **"New Query"** atau **"+"** button

### Step 3: Copy the Full Migration SQL

Buka file migration:
```
database/migrations/001_add_mfa_and_audit_logging.sql
```

Copy semua kode dari file tersebut (mulai dari ALTER TABLE sampai akhir file).

### Step 4: Paste into Supabase SQL Editor

1. Di Supabase SQL Editor, paste semua kode migration
2. Jangan jalankan dulu, verifikasi dulu!

### Step 5: Review & Run

1. Review kode sekali lagi
2. Klik **"RUN"** button (atau Ctrl+Enter)
3. Tunggu sampai selesai (biasanya 5-30 detik)

### Step 6: Verify Success

Di Supabase SQL Editor, run verification query:

```sql
-- Verify MFA columns added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name LIKE 'mfa%'
ORDER BY ordinal_position;

-- Result should show 6 MFA columns:
-- mfa_enabled, mfa_secret, mfa_backup_codes, mfa_enabled_at,
-- mfa_failed_attempts, mfa_lockout_until
```

```sql
-- Verify audit_logs table created
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('audit_logs', 'mfa_audit_log')
ORDER BY table_name;

-- Result should show:
-- audit_logs
-- mfa_audit_log
```

---

## 🐧 METHOD 2: Via Command Line (psql)

### Prasyarat:
- PostgreSQL client (`psql`) installed
- Connection string ke Supabase database
- Migration file locally

### Step 1: Get Connection Details

1. Open Supabase Dashboard
2. Go to **Project Settings** → **Database**
3. Copy the connection string (looks like):
   ```
   postgresql://[user]:[password]@[host]:[port]/[database]
   ```

### Step 2: Run Migration

```bash
# Dari project root directory
psql "postgresql://user:password@host:5432/mcu_management" \
  -f database/migrations/001_add_mfa_and_audit_logging.sql
```

Or dengan environment variable:
```bash
export DATABASE_URL="postgresql://user:password@host:5432/mcu_management"
psql $DATABASE_URL -f database/migrations/001_add_mfa_and_audit_logging.sql
```

### Step 3: Verify Success

```bash
# Check if tables exist
psql $DATABASE_URL -c "\dt audit_logs mfa_audit_log"

# Check if MFA columns added
psql $DATABASE_URL -c "\d users" | grep mfa
```

---

## ✅ Verification Checklist

After running migration, verify everything:

### Verify MFA Columns
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name LIKE 'mfa%'
ORDER BY ordinal_position;
```

Expected output:
```
mfa_enabled            | boolean
mfa_secret             | character varying
mfa_backup_codes       | text[]
mfa_enabled_at         | timestamp without time zone
mfa_failed_attempts    | integer
mfa_lockout_until      | timestamp without time zone
```

### Verify Tables Created
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('audit_logs', 'mfa_audit_log');
```

Expected output:
```
audit_logs
mfa_audit_log
```

### Verify Indexes
```sql
SELECT indexname
FROM pg_indexes
WHERE tablename = 'audit_logs'
ORDER BY indexname;
```

Expected output (should show):
```
idx_audit_logs_event_type
idx_audit_logs_resource_type
idx_audit_logs_result
idx_audit_logs_severity
idx_audit_logs_timestamp
idx_audit_logs_user_id
idx_audit_logs_user_time
```

### Verify RLS Policies
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('audit_logs', 'mfa_audit_log');
```

Expected output (should show RLS policies for both tables).

### Verify Views Created
```sql
SELECT viewname
FROM pg_views
WHERE schemaname = 'public'
AND viewname LIKE '%audit%'
ORDER BY viewname;
```

Expected output:
```
patient_data_access_audit
recent_login_attempts
unauthorized_access_attempts
```

---

## 🔧 Troubleshooting

### Error: "Table 'users' does not exist"
**Cause:** Kamu belum punya users table
**Solution:** Create users table first (basic schema setup)

### Error: "Column 'id' already exists on table 'users'"
**Cause:** Migration sudah dijalankan sebelumnya
**Solution:** Migration menggunakan `IF NOT EXISTS`, aman untuk run ulang

### Error: "Function gen_random_uuid() does not exist"
**Cause:** PostgreSQL uuid extension not enabled
**Solution:** Run dulu: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

### Error: "INET type not supported"
**Cause:** PostgreSQL tidak support INET type
**Solution:** Gunakan VARCHAR untuk IP address (atau enable required extensions)

### Migration hangs / takes very long
**Cause:** Mungkin ada row lock atau table size besar
**Solution:**
1. Tunggu sampai selesai (bisa 5-30 menit untuk table besar)
2. Check Supabase logs
3. Jika timeout, restart dan run ulang

---

## ✨ What Happens After Migration

### Available in JavaScript:
```javascript
// Import services
import { mfaService } from 'js/services/mfaService.js';
import { auditLog } from 'js/services/auditLogService.js';

// Use MFA
const setupData = await mfaService.startMFASetup(userId, userEmail);
// Shows QR code, secret, etc.

// Log activity
await auditLog.log({
  type: 'VIEW_PATIENT_RECORD',
  resourceType: 'PATIENT_DATA',
  resourceId: patientId,
  result: 'SUCCESS'
});
```

### New Database Tables Available:
- `audit_logs` - Query all user activities
- `mfa_audit_log` - Query MFA-specific events
- Reporting views for compliance

### New Columns in `users` Table:
All MFA-related user data can now be stored and managed

---

## 📊 Next Steps After Migration

1. ✅ Apply database migration (this guide)
2. ⏳ Create MFA UI pages (setup-2fa.html)
3. ⏳ Integrate audit logging into existing pages
4. ⏳ Test 2FA flows end-to-end
5. ⏳ Verify security headers

---

## 🆘 Need Help?

If migration fails:

1. **Check Supabase Dashboard → Logs** for error details
2. **Run verification queries** to see what was created
3. **Check migration file** for syntax errors
4. **Try again** - migration is idempotent (safe to run multiple times)

---

## 📝 Migration Details

**File:** `database/migrations/001_add_mfa_and_audit_logging.sql`
**Type:** PostgreSQL DDL (CREATE TABLE, ALTER TABLE, CREATE INDEX)
**Downtime:** None (uses IF NOT EXISTS)
**Reversible:** Yes (can drop tables and columns if needed)
**Estimated Time:** 5-30 seconds
**Data Loss Risk:** None (only adds new columns and tables)

---

**Prepared by:** Claude Code Assistant
**Status:** Ready to apply
**Tested:** Code reviewed for syntax and logic
**Backup:** Recommended before applying to production
