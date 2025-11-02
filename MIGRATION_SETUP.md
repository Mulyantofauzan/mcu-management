# Supabase Migration Setup Guide

This guide explains how to apply database migrations to enable full functionality in the MCU Management system.

## Current Status

✅ **Application is functional** with basic schema
⚠️ **Enhanced features require migrations** to be applied

## Required Migrations

### 1. Create Activity Log Table (RECOMMENDED)
**File**: `supabase-migrations/create-activity-log-table.sql`

**Purpose**: Enables comprehensive audit logging with:
- Basic activity tracking (user, action, timestamp)
- Audit compliance fields (ip_address, user_agent, old_value, new_value)
- Immutability fields (is_immutable, hash_value, archived)

**Status**: Currently OPTIONAL - the application works without it but with reduced functionality

**How to Apply**:

#### Option 1: Using Supabase Dashboard (Recommended for beginners)
1. Go to https://app.supabase.com → Your Project
2. Click "SQL Editor" in left sidebar
3. Click "New Query"
4. Copy entire contents of `supabase-migrations/create-activity-log-table.sql`
5. Paste into the query editor
6. Click "Run" button
7. Confirm success in output

#### Option 2: Using Supabase CLI
```bash
# Install Supabase CLI if not already installed
npm install -g @supabase/cli

# Navigate to project directory
cd /Users/mulyanto/Desktop/MCU-APP

# Link to your Supabase project
supabase link --project-ref xqyuktsfjvdqfhulobai

# Push migrations
supabase push
```

### 2. Create Doctors Table
**File**: `supabase-migrations/create-doctors-table.sql`

**Purpose**: Doctor master data for referral management

**Status**: REQUIRED for doctor functionality

**How to Apply**: Follow the same steps as above

### 3. Add Doctor to MCUs
**File**: `supabase-migrations/add-doctor-to-mcus.sql`

**Purpose**: Links doctors to MCU records for referral tracking

**Status**: REQUIRED for referral features

**How to Apply**: Follow the same steps as above

### 4. Add Rujukan Fields
**File**: `supabase-migrations/add-rujukan-fields.sql`

**Purpose**: Adds referral-related fields to MCU records

**Status**: REQUIRED for surat rujukan generation

**How to Apply**: Follow the same steps as above

## Recommended Migration Order

1. `create-doctors-table.sql` - Creates doctor master data
2. `add-doctor-to-mcus.sql` - Links doctors to MCUs
3. `add-rujukan-fields.sql` - Adds referral fields
4. `update-employee-type-constraint.sql` - Updates constraints
5. `create-activity-log-table.sql` - Enables audit logging

## Verify Migrations

After applying migrations, verify they worked:

1. Go to https://app.supabase.com → Your Project
2. Click "Table Editor" in left sidebar
3. Check that tables exist:
   - ✅ `doctors`
   - ✅ `mcus` (with doctor column)
   - ✅ `activity_log` (if applied)

## Troubleshooting

### "Column already exists" error
- Table or column already exists - this is OK, migrations use `IF NOT EXISTS`
- Click "Dismiss" to continue

### "Could not find column in schema cache"
- Migration didn't apply successfully
- Check Supabase dashboard for errors
- Retry the migration

### Activity Log not showing data
- Ensure `create-activity-log-table.sql` has been applied
- Check browser console for error messages
- Verify RLS policies are enabled

## What Happens Without Migrations?

| Feature | With Migration | Without Migration |
|---------|---|---|
| Create/Update Employees | ✅ Works | ✅ Works |
| Create/Update MCU | ✅ Full Features | ⚠️ Limited |
| Doctor Management | ✅ Full Features | ✅ Works |
| Surat Rujukan | ✅ Full Features | ⚠️ Hardcoded Doctor |
| Activity Log | ✅ Full Audit Trail | ⚠️ Basic Only |
| Referral Tracking | ✅ Full Features | ❌ Not Available |

## Support

If migrations fail:
1. Check browser console for error messages
2. Check Supabase dashboard → SQL Editor → History
3. Verify credentials in `env-config.js`
4. Contact support with error message and migration file name
