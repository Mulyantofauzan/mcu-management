# Security Implementation Plan
## MCU Management System - Berdasarkan Analisis ChatGPT & Claude Web

**Date:** 28 Oktober 2025
**Current Security Score:** 52/100 ⚠️
**Target Score:** 85/100+

---

## 📋 EXECUTIVE SUMMARY

Analisis keamanan menunjukkan sistem memiliki fondasi baik (HTTPS, Cloudflare Pages) tetapi CRITICAL gaps untuk mengelola data medis:

| Priority | Issues | Timeline |
|----------|--------|----------|
| **P1 (URGENT)** | Missing security headers, No 2FA, No audit logging | 1-7 hari |
| **P2 (HIGH)** | RBAC verification, Session security, Rate limiting | 7-30 hari |
| **P3 (MEDIUM)** | Compliance docs, User training, Testing | 30+ hari |

---

## 🎯 PRIORITY 1: CRITICAL (1-7 Hari)

### Task 1.1: Setup Security Headers via _headers File

**Effort:** 1-2 jam
**Impact:** HIGH
**Status:** 🔴 NOT STARTED

**Temuan:** Security headers likely missing
**Risk:** XSS, Clickjacking, MIME type sniffing, SSL stripping

**Implementation Steps:**

1. Create `_headers` file di project root:
```
# File: _headers (ROOT PROJECT DIRECTORY)

/*
  # HTTP Strict Transport Security
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

  # Clickjacking Protection
  X-Frame-Options: DENY

  # MIME Type Sniffing Protection
  X-Content-Type-Options: nosniff

  # XSS Protection (Legacy)
  X-XSS-Protection: 1; mode=block

  # Referrer Policy
  Referrer-Policy: strict-origin-when-cross-origin

  # Permissions Policy (disable unnecessary features)
  Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=()

  # Content Security Policy
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'

/pages/login
  # Stricter CSP for login page
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'
```

2. Deploy ulang project ke Cloudflare Pages
3. Verify headers menggunakan: https://securityheaders.com

**Success Criteria:**
- ✅ All security headers present
- ✅ Score A+ di SecurityHeaders.com
- ✅ No CSP violations di console

---

### Task 1.2: Implementasi 2FA/MFA (Multi-Factor Authentication)

**Effort:** 5-7 hari
**Impact:** CRITICAL
**Status:** 🔴 NOT STARTED

**Temuan:** No MFA present - CRITICAL untuk data medis
**Risk:** Account takeover, unauthorized access

**Recommended Solution:** TOTP-based (Google Authenticator/Authy)

**Files to Create/Modify:**

```
js/
├── utils/
│   └── totpManager.js (NEW - 300 lines)
├── services/
│   └── mfaService.js (NEW - 400 lines)
└── pages/
    ├── login.html (MODIFY - add MFA step)
    ├── setup-2fa.html (NEW - QR code setup)
    └── dashboard.js (MODIFY - check MFA on init)
```

**Implementation Outline:**

```javascript
// js/utils/totpManager.js

class TOTPManager {
  // Generate TOTP secret untuk user baru
  generateSecret() {
    // Generate 32-byte random secret
    // Return base32 encoded secret + QR code URL
  }

  // Verify TOTP code from user
  verifyTOTP(secret, code) {
    // Generate TOTP untuk current time window
    // Check jika user code matches
    // Return true/false
  }

  // Generate backup codes (8 codes, 1-time use)
  generateBackupCodes() {
    // Generate 8 random codes
    // Store di database (hashed)
    // Return ke user
  }
}

// js/services/mfaService.js

class MFAService {
  async enableMFA(userId) {
    // Generate secret
    // Return QR code URL
    // User scan with authenticator app
  }

  async verifyMFASetup(userId, totpCode) {
    // Verify code
    // If valid, save secret to DB
    // Generate & save backup codes
  }

  async disableMFA(userId, password) {
    // Verify password
    // Remove secret from DB
  }

  async verifyMFALogin(userId, totpCode) {
    // During login, verify TOTP code
    // If invalid, check backup codes
  }
}
```

**Database Schema Changes:**

```sql
-- Add columns ke users table
ALTER TABLE users ADD COLUMN (
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret VARCHAR(32),
  mfa_backup_codes TEXT[], -- encrypted JSON array
  mfa_enabled_at TIMESTAMP
);

-- Create audit table untuk MFA events
CREATE TABLE mfa_audit_log (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(50), -- 'ENABLE', 'DISABLE', 'VERIFY_SUCCESS', 'VERIFY_FAILED'
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**User Flow:**

1. User login dengan username/password (existing)
2. If MFA enabled:
   - System request OTP code
   - User buka authenticator app
   - User input 6-digit code
   - System verify code
   - If valid: grant access
3. If invalid 3x: lock account 15 minutes

**First-Time Setup Flow:**

1. User go to Settings → Security → Enable 2FA
2. System generate TOTP secret
3. Display QR code (encoded secret)
4. User scan dengan Google Authenticator/Authy
5. User input 6-digit code dari app untuk verify
6. System generate 8 backup codes
7. User save backup codes (cannot be viewed again)
8. MFA enabled

**Success Criteria:**
- ✅ TOTP implementation working
- ✅ QR code generates correctly
- ✅ Backup codes work
- ✅ MFA enforced untuk login
- ✅ Settings page untuk manage MFA

---

### Task 1.3: Implementasi Audit Logging

**Effort:** 3-4 hari
**Impact:** CRITICAL (untuk compliance)
**Status:** 🔴 NOT STARTED

**Temuan:** No audit trail - CRITICAL untuk medical data
**Risk:** Cannot track data access, breach investigation impossible

**Implementation:**

```javascript
// js/services/auditLogService.js

class AuditLogService {
  async logAction(action) {
    // Parameters:
    // - userId: who did it
    // - action: what they did (VIEW_PATIENT, EDIT_MCU, DELETE_RECORD, etc)
    // - resourceType: PATIENT_DATA, MCU_RECORD, EMPLOYEE, etc
    // - resourceId: which record
    // - ipAddress: from where
    // - result: SUCCESS or FAILED
    // - details: additional metadata (old value, new value)

    const auditRecord = {
      timestamp: new Date().toISOString(),
      userId: getCurrentUserId(),
      userName: getCurrentUserName(),
      action: action.type,
      resourceType: action.resourceType,
      resourceId: action.resourceId,
      ipAddress: getClientIP(),
      userAgent: navigator.userAgent,
      result: action.result || 'SUCCESS',
      details: action.details || {}
    };

    // Save ke database
    await supabaseClient
      .from('audit_logs')
      .insert([auditRecord]);

    // Also log to console in development
    if (isDevelopment()) {
      console.log('[AUDIT]', auditRecord);
    }
  }
}

// Global instance
export const auditLog = new AuditLogService();
```

**Events to Log:**

```
Authentication:
- LOGIN_SUCCESS
- LOGIN_FAILED (with attempt count)
- LOGOUT
- PASSWORD_CHANGE
- MFA_ENABLED
- MFA_DISABLED
- MFA_VERIFY_SUCCESS
- MFA_VERIFY_FAILED

Patient/Medical Data:
- VIEW_PATIENT_RECORD
- VIEW_MCU_RESULT
- VIEW_FOLLOW_UP
- EXPORT_PATIENT_DATA

Data Modification:
- CREATE_PATIENT
- UPDATE_PATIENT_MEDICAL_DATA
- DELETE_PATIENT_RECORD (soft delete)
- CREATE_MCU_RECORD
- UPDATE_MCU_RECORD
- DELETE_MCU_RECORD

Authorization:
- PERMISSION_DENIED
- UNAUTHORIZED_ACCESS_ATTEMPT
- ROLE_CHANGED

System:
- BACKUP_CREATED
- BACKUP_RESTORED
- EXPORT_INITIATED
```

**Database Schema:**

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP DEFAULT NOW(),
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(255),
  action VARCHAR(100),
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  result VARCHAR(20), -- 'SUCCESS', 'FAILED'
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Indexes for performance
  INDEX idx_timestamp (timestamp),
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_resource_type (resource_type)
);
```

**Usage:**

```javascript
// In kelola-user.js when viewing user
auditLog.logAction({
  type: 'VIEW_PATIENT_RECORD',
  resourceType: 'PATIENT_DATA',
  resourceId: patientId,
  details: { department: dept }
});

// In MCU form when saving
auditLog.logAction({
  type: 'CREATE_MCU_RECORD',
  resourceType: 'MCU_RECORD',
  resourceId: mcuId,
  details: { vitals: { bp, hr, weight } }
});

// In login attempt
auditLog.logAction({
  type: 'LOGIN_SUCCESS',
  result: 'SUCCESS'
});
```

**Success Criteria:**
- ✅ All critical events logged
- ✅ Audit logs queryable via admin panel
- ✅ Timestamp correct
- ✅ No sensitive data in logs

---

## 🎯 PRIORITY 2: HIGH (7-30 Hari)

### Task 2.1: Verify & Strengthen RBAC

**Status:** 🟡 NEEDS VERIFICATION
**Current Roles:** Admin, Petugas

**Test Cases:**

```
[ ] Test 1: User Petugas tidak bisa akses Kelola User
    - Login sebagai Petugas
    - Try access /pages/kelola-user.html
    - ✅ Harus di-block

[ ] Test 2: User Petugas tidak bisa delete employee
    - Login sebagai Petugas
    - Try delete button di list
    - ✅ Harus di-disable atau error

[ ] Test 3: User Admin bisa akses semua menu
    - Login sebagai Admin
    - ✅ Verify semua menu visible

[ ] Test 4: Role hierarchy
    - Admin > Petugas
    - ✅ Verify permission inheritance
```

**Implementation (if needed):**

```javascript
// js/utils/rbac.js

class RBAC {
  static ROLES = {
    ADMIN: 'Admin',
    PETUGAS: 'Petugas'
  };

  static PERMISSIONS = {
    // User Management
    VIEW_USERS: ['Admin'],
    EDIT_USERS: ['Admin'],
    DELETE_USERS: ['Admin'],

    // Patient Data
    VIEW_PATIENT: ['Admin', 'Petugas'],
    EDIT_PATIENT: ['Admin', 'Petugas'],
    DELETE_PATIENT: ['Admin'],

    // MCU Management
    VIEW_MCU: ['Admin', 'Petugas'],
    CREATE_MCU: ['Admin', 'Petugas'],
    EDIT_MCU: ['Admin', 'Petugas'],
    DELETE_MCU: ['Admin'],

    // Follow-up
    VIEW_FOLLOWUP: ['Admin', 'Petugas'],
    CREATE_FOLLOWUP: ['Admin', 'Petugas'],
    EDIT_FOLLOWUP: ['Admin', 'Petugas'],
    DELETE_FOLLOWUP: ['Admin'],

    // Reports
    VIEW_REPORTS: ['Admin'],
    EXPORT_DATA: ['Admin'],

    // Activity Log
    VIEW_ACTIVITY_LOG: ['Admin']
  };

  static hasPermission(userRole, permission) {
    const allowedRoles = this.PERMISSIONS[permission];
    return allowedRoles && allowedRoles.includes(userRole);
  }

  static canDelete(resourceType, userRole) {
    // Only Admin can delete
    return userRole === this.ROLES.ADMIN;
  }
}

// Usage:
if (!RBAC.hasPermission(currentUser.role, 'DELETE_USERS')) {
  showError('Anda tidak memiliki izin untuk delete user');
  return;
}
```

---

### Task 2.2: Verify Session Security

**Status:** 🟡 NEEDS VERIFICATION
**Current Implementation:** sessionManager.js

**Test Cases:**

```
[ ] Test 1: Session timeout di 30 menit inactivity
[ ] Test 2: Warning muncul 5 menit sebelum timeout
[ ] Test 3: Session di-invalidate saat logout
[ ] Test 4: Session tidak transfer antar browser
[ ] Test 5: HttpOnly flag on cookies
[ ] Test 6: Secure flag on cookies (HTTPS only)
[ ] Test 7: SameSite=Strict on cookies
```

**Verification Code:**

```javascript
// Check cookie flags di console
document.cookie // Check current cookies
// Should see: HttpOnly (cannot read via JS), Secure (HTTPS only), SameSite=Strict

// Check session timeout
// 1. Login
// 2. Wait 25 minutes (idle)
// 3. Should still work
// 4. Wait 5 more minutes (30 total)
// 5. Should show warning "5 minutes remaining"
// 6. Do nothing for 5 minutes
// 7. Should logout & redirect to login
```

---

### Task 2.3: Setup Rate Limiting di Cloudflare

**Effort:** 2-3 jam
**Impact:** MEDIUM-HIGH
**Status:** 🔴 NOT STARTED

**Steps:**

1. Go to Cloudflare Dashboard
2. Select domain
3. Security → WAF → Rate limiting rules
4. Create 3 rules:

```
Rule 1: Login Rate Limit
- URL: pages/login (POST)
- Threshold: 5 requests per 5 minutes
- Action: Block for 15 minutes

Rule 2: API Rate Limit (if applicable)
- URL: /api/* (all API endpoints)
- Threshold: 100 requests per minute
- Action: Challenge

Rule 3: Export Rate Limit
- URL: /export/*
- Threshold: 10 requests per hour
- Action: Block
```

**Success Criteria:**
- ✅ Login page rate limited
- ✅ Multiple failed attempts blocked
- ✅ Legitimate users can login

---

## 🎯 PRIORITY 3: MEDIUM (30+ Hari)

### Task 3.1: Security Testing Checklist

**Testing Framework:**
- Manual testing dengan OWASP methodology
- Use Burp Suite Community untuk scanning
- Check dengan OWASP ZAP

**Test Cases:**

```
[ ] IDOR Testing
    - Change URL parameters (patient ID, employee ID)
    - Verify cannot access other users' data

[ ] XSS Testing
    - Input: <script>alert('XSS')</script>
    - In: Name fields, comments, search
    - Verify script doesn't execute

[ ] SQL Injection
    - Input: ' OR '1'='1
    - In: Login, search fields
    - Verify query doesn't bypass

[ ] CSRF Testing
    - Create external form targeting MCU endpoints
    - Verify POST requests rejected without CSRF token

[ ] Brute Force Testing
    - Attempt 10+ wrong passwords
    - Verify account locked or captcha required

[ ] Session Hijacking
    - Copy session token from browser A
    - Try use in browser B (incognito)
    - Verify cannot hijack session

[ ] Clickjacking
    - Try embed site dalam iframe
    - Verify X-Frame-Options blocks

[ ] Password Strength
    - Try weak passwords (123456, password)
    - Verify rejected
```

---

### Task 3.2: Privacy Policy & Compliance Documentation

**Documents to Create:**

1. **Privacy Policy** (3-5 pages)
   - Data collection
   - Data usage
   - Data retention
   - User rights

2. **Data Protection Policy** (2-3 pages)
   - Encryption standards
   - Access control
   - Audit trails
   - Breach procedure

3. **Terms of Service** (2-3 pages)
   - User responsibilities
   - Acceptable use
   - Limitation of liability

4. **Data Retention Policy** (1-2 pages)
   - How long data retained
   - Deletion procedure
   - Archival process

**Compliance:**
- ✅ UU Perlindungan Data Pribadi (PDP)
- ✅ Kemenkes requirements
- ✅ GDPR-aligned (if international)

---

## 📊 Implementation Timeline

```
Week 1 (Priority 1 - Critical)
├─ Day 1-2: _headers file setup & deployment
├─ Day 3-5: Start 2FA implementation
├─ Day 5-7: Audit logging setup
└─ Deliverable: Basic security headers + Audit logging

Week 2-3 (Priority 1+2)
├─ Complete 2FA implementation & testing
├─ Setup rate limiting di Cloudflare
├─ Verify RBAC implementation
└─ Deliverable: MFA + Rate limiting + RBAC verification

Week 3-4 (Priority 2 - High)
├─ Session security verification & fixes
├─ Security testing (IDOR, XSS, SQL injection)
├─ Fix identified vulnerabilities
└─ Deliverable: Secure sessions + vulnerability fixes

Week 5+ (Priority 3 - Medium)
├─ Comprehensive security testing
├─ Privacy policy & compliance docs
├─ User training
└─ Deliverable: Full compliance + documentation
```

---

## ✅ Success Criteria

### Security Score Targets

| Phase | Timeline | Target Score |
|-------|----------|--------------|
| Phase 1 (Headers + Audit) | 1 week | 65/100 |
| Phase 2 (MFA + Rate Limit) | 2 weeks | 75/100 |
| Phase 3 (Testing + Docs) | 4 weeks | 85/100+ |

### Before Going Live

- [ ] All P1 tasks completed
- [ ] Security headers verified (A+ score)
- [ ] 2FA implemented & tested
- [ ] Audit logging working
- [ ] RBAC verified
- [ ] Rate limiting active
- [ ] Security testing done
- [ ] Privacy policy live
- [ ] No CRITICAL vulnerabilities

---

## 📞 Quick Reference

**Security Headers File Location:** `_headers` (project root)
**MFA Services:** `js/services/mfaService.js`
**Audit Logging:** `js/services/auditLogService.js`
**RBAC Utility:** `js/utils/rbac.js` (if needed)

**Testing Tools:**
- SecurityHeaders.com (verify headers)
- OWASP ZAP (automated scanning)
- Burp Suite Community (manual testing)

**Compliance Documents:**
- Privacy Policy (required before launch)
- Data Protection Policy (required)
- Terms of Service (recommended)

---

## 📋 Next Steps

1. ✅ Review findings dari ChatGPT & Claude Web
2. ⏳ Create _headers file (THIS WEEK)
3. ⏳ Start 2FA implementation (THIS WEEK)
4. ⏳ Setup audit logging (THIS WEEK)
5. ⏳ Verify & test RBAC
6. ⏳ Setup Cloudflare rate limiting
7. ⏳ Comprehensive security testing
8. ⏳ Create privacy & compliance docs

**Current Status:** Awaiting implementation

---

**Report Generated:** 28 Oktober 2025
**Based On:** ChatGPT & Claude Web Security Analysis
**Prepared For:** MCU Management System
