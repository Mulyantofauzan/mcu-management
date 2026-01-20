# MCU Management System - Deployment Guide

## Overview
This guide provides instructions for deploying the MCU (Medical Check Up) Management System to production. This document covers security configurations, environment setup, and post-deployment verification.

**Last Updated:** October 27, 2025
**Current Version:** 1.0.0
**Status:** Ready for Frontend Deployment (Backend Security Work Pending)

---

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Security Hardening](#security-hardening)
4. [Deployment Steps](#deployment-steps)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Rollback Procedures](#rollback-procedures)
8. [Known Issues & Limitations](#known-issues--limitations)

---

## Pre-Deployment Checklist

### Frontend Security ✅ COMPLETED
- [x] Remove hardcoded credentials from source code
- [x] Implement input sanitization (XSS prevention)
- [x] Fix NaN validation for numeric medical fields
- [x] Remove debug console logging
- [x] Implement login rate limiting (5 attempts, 15-min lockout)
- [x] Implement session timeout (30 minutes inactivity, 5-min warning)
- [x] Add comprehensive null safety checks
- [x] Input validation on all forms

### Backend Security ⏳ PENDING (Requires Backend Developer)
- [ ] Implement bcrypt password hashing (replace Base64)
- [ ] Add CSRF token protection on forms
- [ ] Implement server-side input validation
- [ ] Add session timeout on backend
- [ ] Migrate to HTTP-only secure cookies
- [ ] Implement server-side rate limiting
- [ ] Add access control validation
- [ ] Database query optimization (N+1 prevention)

### Configuration
- [ ] Set environment variables in production
- [ ] Configure Supabase connection strings
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS headers appropriately
- [ ] Set up database backups
- [ ] Configure error logging/monitoring

---

## Environment Configuration

### 1. Create Production Environment File
Create `env-config.js` in the mcu-management root directory:

```javascript
// Production Environment Configuration
window.ENV = {
  // Database Configuration
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'your-anon-key-here',

  // Features
  ENABLE_AUTO_SEED: false, // CRITICAL: Disable auto-seeding in production
  ENABLE_DEBUG: false,      // Disable debug features

  // Security
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes

  // API Configuration (if using backend)
  API_BASE_URL: 'https://api.yourdomain.com',
  API_TIMEOUT: 30000 // 30 seconds
};
```

### 2. Supabase Setup
1. Log in to Supabase Dashboard
2. Create a new project (or use existing)
3. Navigate to Settings → API
4. Copy `URL` and `anon` key
5. Update `env-config.js` with these values
6. Run migrations: `supabase db push`

### 3. Database Verification
```sql
-- Verify required tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Expected tables:
-- - users
-- - employees
-- - mcus
-- - mcu_follow_ups
-- - departments
-- - job_titles
-- - vendors
-- - activity_log
```

---

## Security Hardening

### Frontend Security Measures (IMPLEMENTED ✅)

#### 1. Input Sanitization
All user inputs are sanitized to prevent XSS:
```javascript
// Applied to: tambah-karyawan.js, kelola-user.js
function sanitizeInput(input) {
    return input
        .trim()
        .replace(/[<>]/g, '')  // Remove angle brackets
        .substring(0, 200);     // Limit length
}
```

**Fields Protected:**
- Employee name, vendor name, inactive reason
- Username, display name
- Any medical record comments/notes

#### 2. Rate Limiting
Login protection against brute force attacks:
- **Max Attempts:** 5 failed login attempts
- **Lockout Duration:** 15 minutes
- **Reset Window:** 30 minutes
- **User Feedback:** Real-time countdown display

#### 3. Session Management
Automatic session termination on inactivity:
- **Timeout Duration:** 30 minutes
- **Activity Monitoring:** Mouse, keyboard, scroll, touch
- **Warning:** 5-minute notification before logout
- **Graceful Logout:** Session data cleared, user redirected to login

#### 4. Database Constraints
- Length limits on text fields (VARCHAR constraints)
- Check constraints on enum fields (action, target)
- Null safety for critical fields

### Backend Security (REQUIRED FOR PRODUCTION)

⚠️ **CRITICAL:** The following require backend implementation before production:

#### Password Hashing
Current: Base64 encoding (NOT SECURE)
```javascript
// Current (INSECURE):
const passwordHash = btoa(password);

// Required (use bcrypt):
const passwordHash = await bcrypt.hash(password, 10);
```

#### CSRF Protection
Add CSRF tokens to all state-changing requests:
```javascript
// Add to all POST/PUT/DELETE requests
headers: {
    'X-CSRF-Token': csrfToken
}
```

#### Session Cookies
Move from sessionStorage to HTTP-only cookies:
```javascript
// Server should set:
Set-Cookie: session=token; HttpOnly; Secure; SameSite=Strict
```

#### Server-Side Validation
Validate all inputs on backend:
```javascript
// All form submissions must validate on server
// Don't trust client-side validation alone
```

---

## Deployment Steps

### 1. Pre-Deployment Testing

```bash
# 1. Verify all changes committed
git status

# 2. Review git log for recent commits
git log --oneline -10

# 3. Build (if using a build process)
npm run build

# 4. Run security audit
npm audit

# 5. Test with production environment config
# - Open index.html with production env-config.js
# - Test login functionality
# - Verify rate limiting
# - Check session timeout
```

### 2. Database Backup

```bash
# Create backup before deployment
supabase db dump --file backup-$(date +%Y%m%d_%H%M%S).sql

# Or backup via Supabase Dashboard:
# 1. Go to Backups section
# 2. Create manual backup
# 3. Wait for completion
```

### 3. Code Deployment

#### Option A: Direct Server Upload
```bash
# 1. Upload files via SFTP/SSH
scp -r mcu-management/* user@server:/var/www/mcu-app/

# 2. Verify file permissions
chmod 644 mcu-management/**/*.{js,html,css}
chmod 755 mcu-management/

# 3. Clear browser cache
# Instruct users to clear cache or use version query strings
```

#### Option B: Using Version Control
```bash
# 1. On production server
cd /var/www/mcu-app
git pull origin main
git checkout v1.0.0  # Use specific tag/version

# 2. Update environment config
nano env-config.js
# Update SUPABASE_URL and SUPABASE_ANON_KEY

# 3. Clear CDN cache if applicable
```

#### Option C: Docker Deployment (Recommended)
```bash
# Build Docker image
docker build -t mcu-app:1.0.0 .

# Run container
docker run -d \
  -p 80:80 \
  -e SUPABASE_URL=https://... \
  -e SUPABASE_KEY=... \
  mcu-app:1.0.0

# Verify health
curl http://localhost/index.html
```

### 4. Health Check

```bash
# Test critical endpoints
curl https://yourdomain.com/pages/login.html
curl https://yourdomain.com/index.html

# Test API connectivity
# Verify Supabase connection via browser console:
# console.log(window.ENV)
```

---

## Post-Deployment Verification

### 1. Functionality Testing

```checklist
- [ ] Login with admin account (admin/admin123*)
- [ ] Login rate limiting works (5 failed attempts lock account)
- [ ] Session timeout triggers warning at 25 minutes
- [ ] Dashboard loads and displays data
- [ ] All navigation links work
- [ ] Employee CRUD operations work
- [ ] MCU records can be created and viewed
- [ ] Data export functionality works
- [ ] No console errors (press F12 to check)
```

*Replace with actual credentials used in production

### 2. Security Verification

```bash
# 1. Verify HTTPS/SSL
curl -I https://yourdomain.com/

# 2. Check security headers
curl -I https://yourdomain.com/ | grep -E "Strict-Transport|X-"

# 3. Verify no hardcoded credentials
grep -r "admin123\|petugas123\|password.*=" mcu-management/

# 4. Check debug mode disabled
grep "ENABLE_DEBUG.*true" env-config.js
```

### 3. Performance Testing

```bash
# Load test (using Apache Bench)
ab -n 100 -c 10 https://yourdomain.com/index.html

# Monitor browser performance
# Open DevTools → Performance
# Record page load
# Analyze waterfall chart
```

### 4. Database Verification

```sql
-- Verify database connectivity
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as employee_count FROM employees;
SELECT COUNT(*) as mcu_count FROM mcus;

-- Check for suspicious activity
SELECT * FROM activity_log
ORDER BY timestamp DESC
LIMIT 10;
```

---

## Monitoring & Maintenance

### Daily Checks
```bash
# Monitor error logs
tail -f /var/log/mcu-app/error.log

# Check disk space
df -h | grep www

# Verify application running
ps aux | grep node  # or relevant process
```

### Weekly Tasks
- [ ] Review activity logs for suspicious access
- [ ] Backup database (automated or manual)
- [ ] Check for failed login attempts
- [ ] Review error logs for patterns
- [ ] Verify all features working

### Monthly Tasks
- [ ] Security audit of recent commits
- [ ] Update dependencies (npm update)
- [ ] Review and rotate credentials
- [ ] Database maintenance (optimize tables)
- [ ] Performance analysis

### Logging Setup

Create error logging endpoint:
```javascript
// js/services/errorLogger.js
export async function logError(error, context) {
  const payload = {
    message: error.message,
    stack: error.stack,
    context: context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  // Send to backend for logging
  await fetch('/api/logs/errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
```

---

## Rollback Procedures

### If Deployment Fails

#### 1. Immediate Rollback
```bash
# Option 1: Revert to previous git commit
cd /var/www/mcu-app
git revert HEAD
git push origin main

# Option 2: Switch to backup branch
git checkout production-stable

# Option 3: Restore from file backup
rm -rf mcu-management/*
tar -xzf backup-mcu-app-$(date +%Y%m%d).tar.gz -C ./
```

#### 2. Database Rollback
```bash
# Restore from Supabase backup
supabase db restore --backup-id <backup_id>

# Or restore from SQL dump
supabase db push --file backup.sql
```

#### 3. Verification After Rollback
```bash
# Verify previous version running
curl -I https://yourdomain.com/
# Check git status
git log --oneline -5
# Test critical features
```

---

## Known Issues & Limitations

### Current Implementation (Frontend Ready)
✅ **Completed:**
- Login rate limiting
- Session timeout with warning
- Input sanitization
- Null safety checks
- Database schema constraints
- Activity logging

⏳ **Pending Backend Work:**
- Password encryption (currently Base64 - NOT SECURE)
- CSRF protection
- Server-side validation
- HTTP-only cookies
- Server-side rate limiting

### Security Status

**Frontend Security:** 🟢 **GOOD**
- Rate limiting: Implemented
- Session management: Implemented
- Input validation: Implemented
- XSS prevention: Implemented

**Backend Security:** 🔴 **CRITICAL - NOT READY**
- Password hashing: Base64 (INSECURE)
- CSRF protection: Missing
- Session security: HTTP-only cookies missing
- Rate limiting: Client-side only

**Recommendation:**
Complete backend security work before opening to external users. Internal testing only with current implementation.

---

## Additional Resources

### Documentation Files
- `SECURITY_ISSUES.md` - Detailed vulnerability report
- `README.md` - Project overview and setup
- Source code comments for implementation details

### Backend TODO
See `BACKEND_TODO.md` for required backend implementation work.

### Support & Troubleshooting

#### Common Issues

**Issue:** Login always fails
**Solution:**
1. Verify database connection in browser console
2. Check Supabase credentials in env-config.js
3. Ensure users table has data

**Issue:** Session timeout not working
**Solution:**
1. Verify sessionManager.js is loaded
2. Check browser console for errors
3. Ensure mouse/keyboard events are firing

**Issue:** Database connection timeout
**Solution:**
1. Check internet connectivity
2. Verify Supabase project is active
3. Check rate limits not exceeded

---

## Deployment Sign-Off

**Version:** 1.0.0
**Deployment Date:** _________________
**Deployed By:** _________________
**Approved By:** _________________

**Pre-Deployment Checklist Verified:** ☐ Yes ☐ No
**Security Verification Passed:** ☐ Yes ☐ No
**Post-Deployment Tests Passed:** ☐ Yes ☐ No

**Notes:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## Contact & Support

For issues or questions:
1. Check SECURITY_ISSUES.md for known vulnerabilities
2. Review error logs
3. Consult source code comments
4. Contact development team

---

**Document Version:** 1.0
**Last Updated:** October 27, 2025
**Next Review Date:** [After backend security implementation]
