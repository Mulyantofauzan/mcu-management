# MCU Approval Workflow System - Design Document

**Status:** Planning Phase (Not Yet Implemented)
**Last Updated:** 2026-02-03
**Author:** Claude Code + Mulyanto

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Workflow Architecture](#workflow-architecture)
3. [User Roles & Responsibilities](#user-roles--responsibilities)
4. [Database Design](#database-design)
5. [UI/UX Design](#uiux-design)
6. [API & Services](#api--services)
7. [Notifications](#notifications)
8. [Implementation Plan](#implementation-plan)
9. [Risk Assessment](#risk-assessment)
10. [Notes & Clarifications](#notes--clarifications)

---

## 🎯 OVERVIEW

### **Purpose**
Create a formal approval workflow for MCU (Medical Check-Up) records to ensure:
- Quality control through Dokter review
- Data validation before entering monitoring system
- Audit trail for compliance
- Professional referral letter generation
- Only approved employees' MCU data enters Dashboard/Analysis/Jakarta CV

### **Key Principle**
- **Petugas (Operator):** Input MCU initial data
- **Dokter (Doctor):** Review and fill missing fields, approve/reject
- **Admin:** Final approval, control data entry to monitoring system

---

## 🔄 WORKFLOW ARCHITECTURE

### **Current State (No Approval)**
```
PETUGAS INPUT → MCU Created → Status: Fit/Follow-Up/etc → Data visible everywhere
```

### **New State (With Approval)**
```
PETUGAS INPUT
    ↓
[Hasil Lab, Hasil Awal, Catatan Awal already filled by Petugas]
    ↓
Status: PENDING_DOKTER
    ↓
DOKTER REVIEW
├─ View: All data (read-only)
├─ Fill: Hasil Awal, Catatan Awal, Data Rujukan (optional), TTD
├─ Action:
│  ├─ APPROVE → APPROVED_DOKTER → Notify WA
│  └─ REJECT → REJECTED_DOKTER → Petugas can resubmit
    ↓
ADMIN REVIEW (if approved by dokter)
├─ View: All data + Dokter's review (read-only)
├─ Action:
│  ├─ APPROVE → APPROVED_ADMIN → Data enters monitoring system
│  └─ REJECT → REJECTED_ADMIN → Data NOT in monitoring
```

---

## 👥 USER ROLES & RESPONSIBILITIES

### **1. PETUGAS (Operator/Medical Staff)**

**Current Capabilities:**
- Add/Edit MCU records
- Input lab results
- View dashboard & reports
- Track follow-ups

**New Workflow:**
- Input MCU WITHOUT these fields:
  - ❌ Hasil Awal (dokter fills)
  - ❌ Catatan Awal (dokter fills)
  - ❌ Data Rujukan (dokter fills)
  - ❌ Dokter TTD (dokter fills)

- After submit: Status = `PENDING_DOKTER`
- Can view approval status with history
- Can edit & resubmit if rejected (by dokter or admin)
- Can only edit non-approval fields

**Menu Access:**
- Dashboard
- Kelola Karyawan (+ View Approval Status button)
- Tambah Karyawan
- MCU Expiry Management
- Follow-Up
- Data Master
- Laporan (only approved_admin data)

---

### **2. DOKTER (Doctor/Physician)**

**New Role (Does NOT exist yet)**

**Responsibilities:**
- Review MCU submitted by Petugas
- Fill missing fields:
  - ✅ Hasil Awal (REQUIRED)
  - ✅ Catatan Awal (REQUIRED)
  - ✅ Data Rujukan (OPTIONAL - only if need referral)
  - ✅ Dokter TTD (REQUIRED - upload signature image)
- Approve/Reject MCU
- If Reject: Provide reason for Petugas to correct

**Menu Access (LIMITED):**
- Dashboard Validasi MCU (badge: count pending)
  - Tab 1: Pending Review (MCUs waiting for dokter approval)
  - Tab 2: History (Approved & Rejected by this dokter)
- Jakarta Cardiovascular (read-only, only approved_admin data)

**Important:**
- Dokter CANNOT create MCU
- Dokter CANNOT modify Petugas input data (lab results)
- Dokter ONLY fills the 4 fields above
- Once dokter approves → these fields become immutable

---

### **3. ADMIN (Administrator)**

**Current Capabilities:**
- Manage users
- View all data
- Dashboard access

**New Workflow:**
- Review MCU approved by Dokter
- Final decision: Approve (data enters monitoring) or Reject
- View dokter's review & notes
- Add admin comments/notes
- Control which employees' MCU data enters:
  - Dashboard
  - Analysis
  - Jakarta Cardiovascular

**Menu Access:**
- Dashboard (+ badge: pending dokter, pending admin)
- Kelola Approval (new page)
  - Tab 1: Waiting Admin Review
  - Tab 2: Approval History
  - Tab 3: Reports
- Kelola Karyawan
- Kelola User
- Activity Log
- Laporan

---

## 🗄️ DATABASE DESIGN

### **Tables to Modify**

#### **1. users table**
```sql
ADD COLUMN: role VARCHAR(50)
  Values: 'admin', 'petugas', 'dokter'
  Default: 'petugas'

ADD COLUMN: is_approver BOOLEAN DEFAULT false
  (Only dokter/admin with this=true can approve)
```

#### **2. mcus table**
```sql
ADD COLUMN: approval_status VARCHAR(50) DEFAULT 'draft'
  Values:
  - 'draft' → petugas creating/editing
  - 'pending_dokter' → waiting dokter review
  - 'approved_dokter' → dokter approved, waiting admin
  - 'rejected_dokter' → dokter rejected, petugas can resubmit
  - 'pending_admin' → waiting admin final approval
  - 'approved_admin' → admin approved, data in monitoring
  - 'rejected_admin' → admin rejected, data NOT in monitoring

ADD COLUMN: reviewed_by_dokter VARCHAR(50) REFERENCES users(user_id)
ADD COLUMN: reviewed_at_dokter TIMESTAMP WITH TIME ZONE
ADD COLUMN: dokter_notes TEXT

ADD COLUMN: reviewed_by_admin VARCHAR(50) REFERENCES users(user_id)
ADD COLUMN: reviewed_at_admin TIMESTAMP WITH TIME ZONE
ADD COLUMN: admin_notes TEXT

ADD COLUMN: hasil_awal_dokter TEXT
  (Dokter fills this during approval - immutable after)

ADD COLUMN: catatan_awal_dokter TEXT
  (Dokter fills this during approval - immutable after)

ADD COLUMN: data_rujukan TEXT
  (Dokter fills this during approval if needed - immutable after)

ADD COLUMN: dokter_ttd_path VARCHAR(255)
  (Path to uploaded signature image PNG - immutable after)
```

**Indexes for Performance:**
```sql
CREATE INDEX idx_mcus_approval_status ON mcus(approval_status);
CREATE INDEX idx_mcus_reviewed_by_dokter ON mcus(reviewed_by_dokter);
CREATE INDEX idx_mcus_reviewed_by_admin ON mcus(reviewed_by_admin);
```

---

### **New Table: mcu_approvals**
```sql
CREATE TABLE mcu_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mcu_id VARCHAR(50) NOT NULL REFERENCES mcus(mcu_id) ON DELETE CASCADE,

    action VARCHAR(20) NOT NULL,  -- 'approve', 'reject', 'resubmit'
    reviewer_role VARCHAR(20) NOT NULL,  -- 'dokter', 'admin'
    reviewed_by VARCHAR(50) NOT NULL REFERENCES users(user_id),
    reviewer_name VARCHAR(200),

    notes TEXT,  -- reason for reject, or approval notes

    hasil_awal TEXT,  -- what was filled
    catatan_awal TEXT,
    data_rujukan TEXT,
    dokter_ttd_path VARCHAR(255),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mcu_approvals_mcu_id ON mcu_approvals(mcu_id);
CREATE INDEX idx_mcu_approvals_reviewer ON mcu_approvals(reviewed_by);
CREATE INDEX idx_mcu_approvals_action ON mcu_approvals(action);
```

---

## 🎨 UI/UX DESIGN

### **Form Field Visibility**

#### **Petugas - Creating New MCU**
| Field | Input | Editable | Notes |
|-------|-------|----------|-------|
| Hasil Lab | ✅ | ✅ | Normal input |
| Hasil Awal | ❌ | ❌ | Hidden - dokter will fill |
| Catatan Awal | ❌ | ❌ | Hidden - dokter will fill |
| Data Rujukan | ❌ | ❌ | Hidden - dokter will fill |
| Dokter TTD | ❌ | ❌ | Hidden - dokter will upload |
| Status | - | 🔒 | Shows "Pending Dokter Review" after submit |

#### **Petugas - Viewing Submitted MCU**
| Field | View | Editable | Notes |
|-------|------|----------|-------|
| Hasil Lab | ✅ | ✅ if draft/rejected | Can edit before submit |
| Hasil Awal | 🔒 | ❌ | Read-only - filled by dokter |
| Catatan Awal | 🔒 | ❌ | Read-only - filled by dokter |
| Data Rujukan | 🔒 | ❌ | Read-only - filled by dokter |
| Dokter TTD | 🔒 | ❌ | Read-only - uploaded by dokter |
| Status | ✅ | 🔒 | Shows current approval status |
| View Approval Button | ✅ | - | Shows full approval history |

#### **Dokter - Reviewing MCU**
| Field | View | Editable | Notes |
|-------|------|----------|-------|
| Hasil Lab | 🔒 | ❌ | Read-only from petugas |
| Hasil Awal | ✅ | ✅ | REQUIRED to fill |
| Catatan Awal | ✅ | ✅ | REQUIRED to fill |
| Data Rujukan | ✅ | ✅ | OPTIONAL - only if referral needed |
| Dokter TTD | ✅ | ✅ | REQUIRED - upload signature PNG |
| Action Buttons | - | ✅ | Approve / Reject |

#### **Admin - Reviewing MCU (after dokter approval)**
| Field | View | Editable | Notes |
|-------|------|----------|-------|
| All MCU Data | 🔒 | ❌ | Read-only |
| Dokter Review Info | 🔒 | ❌ | Read-only from dokter |
| Admin Notes | ✅ | ✅ | Optional - for documentation |
| Action Buttons | - | ✅ | Approve / Reject |

---

### **New Pages**

#### **1. Dokter Dashboard - Validasi MCU**
```
PAGE: /pages/validasi-mcu-dokter.html

HEADER:
├─ Title: "Validasi MCU"
├─ Stats Cards:
│  ├─ Pending Review: [count]
│  ├─ Approved This Month: [count]
│  └─ Rejected This Month: [count]
│
├─ TABS:
│  ├─ TAB 1: Pending Review (approval_status = pending_dokter)
│  │  └─ Table:
│  │     ├─ Columns: No, Employee ID, Name, Dept, MCU Type, Submit Date, Status
│  │     ├─ Search/Filter: by name, employee ID, dept
│  │     ├─ Row Actions: View Detail
│  │     └─ Click → Opens Approval Modal
│  │
│  ├─ TAB 2: History (approved_dokter + rejected_dokter)
│  │  └─ Table:
│  │     ├─ Columns: No, Employee, MCU Type, Decision, Review Date, Status
│  │     ├─ Decision Badge: Approved (green) / Rejected (red)
│  │     └─ Row Actions: View Detail
│  │
│  └─ TAB 3: Settings
│     └─ Dokter profile, signature settings, notification preferences
│
├─ APPROVAL MODAL (when click MCU row):
│  ├─ MCU Detail Section (read-only):
│  │  ├─ Employee info
│  │  ├─ Lab results
│  │  └─ Current status
│  │
│  ├─ Dokter Review Section (editable):
│  │  ├─ Hasil Awal: [textarea] REQUIRED
│  │  ├─ Catatan Awal: [textarea] REQUIRED
│  │  ├─ Data Rujukan: [textarea] OPTIONAL
│  │  │
│  │  └─ Upload TTD: [file input] REQUIRED
│  │     └─ Preview: [image preview]
│  │
│  └─ Action Buttons:
│     ├─ [Approve] (green) → saves + notifies WA
│     └─ [Reject] (red) → opens reject reason dialog
```

#### **2. Admin Dashboard - Kelola Approval (NEW)**
```
PAGE: /pages/kelola-approval.html

HEADER:
├─ Title: "Kelola Approval MCU"
├─ Stats Cards:
│  ├─ Pending Admin Review: [count]
│  ├─ Approved This Month: [count]
│  └─ Rejected This Month: [count]
│
├─ TABS:
│  ├─ TAB 1: Waiting Admin Review (approval_status = approved_dokter)
│  │  └─ Table:
│  │     ├─ Columns: No, Employee, MCU Type, Approved By (Dokter), Review Date, Status
│  │     ├─ Search/Filter: by name, dokter name, MCU type
│  │     ├─ Row Actions: View Detail
│  │     └─ Click → Opens Admin Approval Modal
│  │
│  ├─ TAB 2: History (approved_admin + rejected_admin)
│  │  └─ Table:
│  │     ├─ Columns: No, Employee, MCU Type, Dokter Review, Admin Decision, Date
│  │     ├─ Admin Decision Badge: Approved (green) / Rejected (red)
│  │     └─ Row Actions: View Detail
│  │
│  └─ TAB 3: Reports
│     ├─ Approval statistics by dokter
│     ├─ Approval rate metrics
│     └─ Rejection reasons summary
│
├─ ADMIN APPROVAL MODAL (when click MCU row):
│  ├─ MCU Detail Section (read-only):
│  │  ├─ All lab results
│  │  ├─ Petugas input
│  │  └─ Current status
│  │
│  ├─ Dokter Review Section (read-only):
│  │  ├─ Hasil Awal: [text]
│  │  ├─ Catatan Awal: [text]
│  │  ├─ Data Rujukan: [text]
│  │  └─ Dokter TTD: [image preview]
│  │
│  ├─ Admin Notes (editable):
│  │  └─ [textarea] OPTIONAL - for documentation
│  │
│  └─ Action Buttons:
│     ├─ [Approve] (green) → data enters monitoring
│     └─ [Reject] (red) → opens reject reason dialog
```

---

### **Approval Status Modal (For Petugas)**
```
MODAL: View Approval Status

├─ Header: "MCU Approval Timeline"
├─ Current Status Badge: [status badge]
│
├─ TIMELINE:
│  ├─ Step 1: Created
│  │  ├─ By: [Petugas Name]
│  │  └─ Date: [date/time]
│  │
│  ├─ Step 2: Pending Dokter Review
│  │  └─ Since: [date/time]
│  │
│  ├─ Step 3: Dokter Review ✓
│  │  ├─ By: Dr. [Dokter Name]
│  │  ├─ Date: [date/time]
│  │  ├─ Hasil Awal: [text preview]
│  │  ├─ Catatan Awal: [text preview]
│  │  ├─ Data Rujukan: [text preview if exists]
│  │  └─ TTD: [signature preview]
│  │
│  ├─ Step 4: Pending Admin Review (if approved by dokter)
│  │  └─ Since: [date/time]
│  │
│  └─ Step 5: Admin Review ✓ or ✗
│     ├─ By: [Admin Name]
│     ├─ Date: [date/time]
│     └─ Decision: Approved / Rejected
│
├─ REJECTION HISTORY (if rejected):
│  ├─ Rejection 1:
│  │  ├─ By: Dr. [Dokter Name] / [Admin Name]
│  │  ├─ Date: [date/time]
│  │  ├─ Reason: [rejection reason]
│  │  └─ Status: Resubmitted [date]
│  │
│  └─ Rejection 2: ... (if multiple)
│
└─ Close Button: [X]
```

---

## 🔧 API & SERVICES

### **Update authService.js**
```javascript
// NEW METHODS:

/**
 * Check if user is Dokter
 * @returns {boolean}
 */
isDokter() {
    return this.getCurrentUser()?.role === 'dokter';
}

/**
 * Check if user can approve MCU
 * @returns {boolean}
 */
isApprover() {
    const user = this.getCurrentUser();
    return user && (user.role === 'admin' || (user.role === 'dokter' && user.is_approver));
}

/**
 * Check if specific role can approve
 * @param {string} role - 'dokter' or 'admin'
 * @returns {boolean}
 */
canApproveAsRole(role) {
    return role === 'admin' || role === 'dokter';
}

/**
 * Get user's approval authority
 * @returns {object} {role: 'dokter'|'admin', canApprove: boolean}
 */
getApprovalAuthority() {
    const user = this.getCurrentUser();
    if (!user) return { role: null, canApprove: false };
    return {
        role: user.role,
        canApprove: this.isApprover()
    };
}
```

### **Create approvalService.js (NEW)**
```javascript
/**
 * MCU Approval Workflow Service
 * Handles approval transitions and status management
 */

class MCUApprovalService {

    /**
     * Get MCUs pending dokter review
     * @returns {Promise<MCU[]>}
     */
    async getPendingDokterReview(dokterUserId = null) {
        // Query: approval_status = 'pending_dokter'
        // Optional: filter by dokterUserId if looking for their history
    }

    /**
     * Get MCUs pending admin review
     * @returns {Promise<MCU[]>}
     */
    async getPendingAdminReview() {
        // Query: approval_status = 'approved_dokter'
    }

    /**
     * Dokter approves MCU
     * @param {string} mcuId
     * @param {object} approvalData
     *   - hasil_awal (string) REQUIRED
     *   - catatan_awal (string) REQUIRED
     *   - data_rujukan (string) OPTIONAL
     *   - dokter_ttd_path (string) REQUIRED - path to signature image
     * @returns {Promise<boolean>} success
     */
    async approveMCUByDokter(mcuId, approvalData) {
        // 1. Validate all required fields present
        // 2. Get current user (dokter)
        // 3. Update mcu table:
        //    - approval_status = 'approved_dokter'
        //    - reviewed_by_dokter = current user ID
        //    - reviewed_at_dokter = NOW()
        //    - hasil_awal_dokter = approvalData.hasil_awal
        //    - catatan_awal_dokter = approvalData.catatan_awal
        //    - data_rujukan = approvalData.data_rujukan
        //    - dokter_ttd_path = approvalData.dokter_ttd_path
        // 4. Insert mcu_approvals record:
        //    - action = 'approve'
        //    - reviewer_role = 'dokter'
        //    - reviewed_by = current user ID
        //    - reviewer_name = current user display name
        //    - hasil_awal = approvalData.hasil_awal
        //    - catatan_awal = approvalData.catatan_awal
        //    - data_rujukan = approvalData.data_rujukan
        //    - dokter_ttd_path = approvalData.dokter_ttd_path
        // 5. Add activity_log entry: action='mcu_approve_dokter'
        // 6. Trigger WA notification (with PDF)
        // 7. Return true
    }

    /**
     * Dokter rejects MCU (Petugas can resubmit)
     * @param {string} mcuId
     * @param {string} rejectReason
     * @returns {Promise<boolean>} success
     */
    async rejectMCUByDokter(mcuId, rejectReason) {
        // 1. Get current user (dokter)
        // 2. Update mcu table:
        //    - approval_status = 'rejected_dokter'
        //    - reviewed_by_dokter = current user ID
        //    - reviewed_at_dokter = NOW()
        //    - dokter_notes = rejectReason
        // 3. Insert mcu_approvals record:
        //    - action = 'reject'
        //    - reviewer_role = 'dokter'
        //    - notes = rejectReason
        // 4. Add activity_log entry: action='mcu_reject_dokter'
        // 5. Send notification to Petugas: "MCU rejected, reason: ..."
        // 6. Return true
    }

    /**
     * Admin approves MCU (data enters monitoring system)
     * @param {string} mcuId
     * @param {string} adminNotes (optional)
     * @returns {Promise<boolean>} success
     */
    async approveMCUByAdmin(mcuId, adminNotes = null) {
        // 1. Get current user (admin)
        // 2. Update mcu table:
        //    - approval_status = 'approved_admin'
        //    - reviewed_by_admin = current user ID
        //    - reviewed_at_admin = NOW()
        //    - admin_notes = adminNotes (if provided)
        // 3. Insert mcu_approvals record:
        //    - action = 'approve'
        //    - reviewer_role = 'admin'
        //    - notes = adminNotes
        // 4. Add activity_log entry: action='mcu_approve_admin'
        // 5. Data now visible in: Dashboard, Analysis, Jakarta CV
        // 6. Send notification to Petugas: "MCU approved"
        // 7. Return true
    }

    /**
     * Admin rejects MCU (data NOT in monitoring system)
     * @param {string} mcuId
     * @param {string} rejectReason
     * @returns {Promise<boolean>} success
     */
    async rejectMCUByAdmin(mcuId, rejectReason) {
        // 1. Get current user (admin)
        // 2. Update mcu table:
        //    - approval_status = 'rejected_admin'
        //    - reviewed_by_admin = current user ID
        //    - reviewed_at_admin = NOW()
        //    - admin_notes = rejectReason
        // 3. Insert mcu_approvals record:
        //    - action = 'reject'
        //    - reviewer_role = 'admin'
        //    - notes = rejectReason
        // 4. Add activity_log entry: action='mcu_reject_admin'
        // 5. Data NOT visible in monitoring (Dashboard, Analysis, Jakarta CV)
        // 6. Send notification to Petugas: "MCU rejected by admin, reason: ..."
        // 7. Return true
    }

    /**
     * Get full approval history for MCU
     * @param {string} mcuId
     * @returns {Promise<ApprovalRecord[]>}
     */
    async getApprovalHistory(mcuId) {
        // Query mcu_approvals table where mcu_id = mcuId
        // Order by created_at DESC
        // Return with user info (name, role)
    }

    /**
     * Check if Petugas can edit MCU
     * @param {string} mcuId
     * @param {string} currentUserRole
     * @returns {boolean}
     */
    canPetueasEditMCU(mcuId, currentUserRole) {
        // Petugas CAN edit if:
        // - approval_status = 'draft'
        // - approval_status = 'rejected_dokter'
        // - approval_status = 'rejected_admin'
        // Petugas CANNOT edit if:
        // - approval_status = 'pending_dokter'
        // - approval_status = 'approved_dokter'
        // - approval_status = 'pending_admin'
        // - approval_status = 'approved_admin'
        // Admin/Dokter: cannot edit MCU fields (different page)
    }

    /**
     * Get approval status badge info
     * @param {string} status - approval_status value
     * @returns {object} {label, color, icon}
     */
    getApprovalStatusBadge(status) {
        const badges = {
            'draft': {
                label: 'Draft',
                color: 'bg-gray-100 text-gray-800',
                icon: '✏️'
            },
            'pending_dokter': {
                label: 'Waiting Dokter Review',
                color: 'bg-blue-100 text-blue-800',
                icon: '⏳'
            },
            'approved_dokter': {
                label: 'Approved Dokter',
                color: 'bg-green-100 text-green-800',
                icon: '✅'
            },
            'rejected_dokter': {
                label: 'Rejected Dokter',
                color: 'bg-red-100 text-red-800',
                icon: '❌'
            },
            'pending_admin': {
                label: 'Waiting Admin Review',
                color: 'bg-yellow-100 text-yellow-800',
                icon: '⏳'
            },
            'approved_admin': {
                label: 'Approved Admin',
                color: 'bg-green-100 text-green-800',
                icon: '✅'
            },
            'rejected_admin': {
                label: 'Rejected Admin',
                color: 'bg-red-100 text-red-800',
                icon: '❌'
            }
        };
        return badges[status] || badges['draft'];
    }
}

export const approvalService = new MCUApprovalService();
```

### **Update mcuService.js**
```javascript
// Changes needed:

/**
 * When creating MCU:
 * - Set approval_status = 'draft'
 * - Hidden fields: hasil_awal_dokter, catatan_awal_dokter, data_rujukan, dokter_ttd_path
 */

/**
 * When Petugas submits MCU:
 * - Update approval_status = 'pending_dokter'
 * - Create mcu_approvals record: action='submit'
 * - Create activity_log: action='mcu_submit'
 * - Notify admin MCU pending dokter review
 */

/**
 * When updating MCU:
 * - Check approvalService.canPetueasEditMCU()
 * - Only allow edit if status = draft/rejected_dokter/rejected_admin
 * - Don't allow editing approval fields
 */

/**
 * When displaying MCU:
 * - Show approval status badge
 * - Show "View Approval Status" button
 * - Show read-only fields filled by dokter
 */
```

---

## 📢 NOTIFICATIONS

### **WhatsApp Notification (When Dokter Approves)**

**Trigger:** When approveMCUByDokter() completes

**Notification Content:**
```
✅ MCU REVIEW - Dr. [Dokter Name]

Nama: [Employee Name]
Hasil MCU: [hasil_awal]
Catatan: [catatan_awal]

📋 Data Rujukan:
[data_rujukan if exists]

Waktu Approval: [timestamp]

📎 Attachment: Surat Rujukan (PDF)
```

**Implementation Options:**

#### **Option A: Manual (Phase 1 - RECOMMENDED)**
```
1. Generate PDF with QR code
2. Show download link on UI
3. Provide WA share button with pre-filled message
4. User manually sends to WA group

Timeline: 1 day
Cost: None
Effort: Low
Issues: Manual process
```

#### **Option B: WA Business API (Phase 2)**
```
Providers: Twilio, Gupshup, MessageBird
Setup: Register business, get API key, integrate
Timeline: 1-2 weeks
Cost: Per message charge
Benefit: Fully automated
```

#### **Option C: WhatsApp Cloud API (Phase 3)**
```
Provider: Meta/WhatsApp Direct
Setup: Business manager, app registration, approval
Timeline: 2-3 weeks
Cost: Usage-based
Benefit: Official, integrated with Meta
```

**DECISION:** Use **Option A (Manual)** for now. Can upgrade to Option B/C later.

---

### **PDF Generation with Signature**

**File:** `rujukanPDFGenerator.js` (already exists)

**Modifications Needed:**
```
- Add signature image to PDF (from dokter_ttd_path)
- Add approval metadata:
  - Dokter name & date
  - Approval status
  - Timestamp
- Add approval seal/stamp
- Support two formats:
  - For dokter approval: Include approval details
  - For admin approval: Mark as "Approved by Admin"
```

**PDF Structure:**
```
┌──────────────────────────────────┐
│ HEADER: Company Logo             │
├──────────────────────────────────┤
│ SURAT RUJUKAN                    │
├──────────────────────────────────┤
│ EMPLOYEE INFO                    │
│ ├─ Name, ID, Dept, Job Title    │
│ ├─ DOB, Gender, etc             │
│ └─ MCU Type: [Annual/Pre/etc]    │
├──────────────────────────────────┤
│ MCU RESULTS                      │
│ └─ Lab results, findings         │
├──────────────────────────────────┤
│ REFERRAL INFO (if data_rujukan)  │
│ └─ [Data Rujukan text]           │
├──────────────────────────────────┤
│ APPROVAL SIGNATURE               │
│ ├─ Dokter TTD: [signature image] │
│ ├─ Dr. [Dokter Name]             │
│ ├─ Approved: [date/time]         │
│ └─ Status: Approved              │
└──────────────────────────────────┘
```

---

## 🛠️ IMPLEMENTATION PLAN

### **Phase 1: Database & Backend (Week 1)**
- [ ] Create database migration SQL
- [ ] Add columns to mcus table
- [ ] Add columns to users table
- [ ] Create mcu_approvals table
- [ ] Create indexes
- [ ] Update authService.js
- [ ] Create approvalService.js
- [ ] Update mcuService.js

### **Phase 2: Frontend - Form Updates (Week 1-2)**
- [ ] Update kelola-karyawan form field visibility
- [ ] Add View Approval Status modal
- [ ] Update approval status badges
- [ ] Add "Pending Dokter Review" message
- [ ] Add role-based field validation

### **Phase 3: Dokter Pages (Week 2)**
- [ ] Create validasi-mcu-dokter.html
- [ ] Create validasi-mcu-dokter.js
- [ ] Build pending review table
- [ ] Build approval modal form
- [ ] Implement approve/reject logic
- [ ] Add history tab

### **Phase 4: Admin Pages (Week 2-3)**
- [ ] Create kelola-approval.html
- [ ] Create kelola-approval.js
- [ ] Build pending admin review table
- [ ] Build admin approval modal
- [ ] Implement admin approve/reject
- [ ] Add reports/statistics tab

### **Phase 5: Sidebar & Menu (Week 3)**
- [ ] Update sidebar-manager.js
- [ ] Add role-based menu rendering
- [ ] Add approval badges
- [ ] Add menu items for dokter
- [ ] Add menu items for admin

### **Phase 6: Notifications (Week 3)**
- [ ] Update rujukanPDFGenerator.js for signature
- [ ] Create manual WA notification feature
- [ ] Add PDF download link
- [ ] Add WA share button with template

### **Phase 7: Activity Logging (Week 3)**
- [ ] Extend activity log for approval actions
- [ ] Create approval history entries
- [ ] Add audit trail for compliance

### **Phase 8: Testing & Deployment (Week 4)**
- [ ] Unit tests for approval service
- [ ] Integration tests for workflow
- [ ] Manual testing with test accounts
- [ ] Security review
- [ ] Performance testing
- [ ] Staging deployment
- [ ] Production deployment

---

## ⚠️ RISK ASSESSMENT

### **Risks & Mitigation**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|-----------|
| Existing system breaks during DB changes | High | Medium | Test in staging first, backup before migration |
| Data inconsistency if approval fields not filled | High | Medium | Validate all required fields before save |
| Dokter role doesn't exist in current system | High | High | Create role during migration, seed test users |
| WA integration not ready | Medium | High | Use manual option (Option A) first |
| Field visibility bugs in form | Medium | High | Thorough unit + integration testing |
| Performance with new approval queries | Medium | Low | Add proper indexes, test with large dataset |
| Users confused by new workflow | Medium | Medium | Clear documentation + training materials |
| Admin/Dokter can see sensitive data | High | Low | Implement proper authorization checks |
| Approval history data loss | High | Low | Use immutable audit table (mcu_approvals) |

---

## 📝 NOTES & CLARIFICATIONS

### **User Input Clarifications**

**From Discussion:**
1. ✅ Hasil Awal, Catatan Awal, Data Rujukan → Dokter fills these during approval
2. ✅ WA notification needs surat rujukan as PDF attachment
3. ✅ Surat rujukan already has template, needs digital signature (PNG) from dokter
4. ✅ Full approval history visible to all roles
5. ✅ Admin can see MCU pending dokter review
6. ✅ View Approval Status button good for Petugas

**Important Decisions:**
- **WA Integration:** Use manual/temporary solution first (Option A), upgrade later
- **PDF Signature:** Dokter uploads PNG signature image during approval
- **Data Filtering:** Only APPROVED_ADMIN MCUs appear in Dashboard/Analysis/Jakarta CV
- **Field Immutability:** Once dokter/admin fills approval fields, they become read-only

### **Not Included (Out of Scope)**
- Email notifications (WA only)
- SMS notifications
- Role-based granular permissions beyond current admin/petugas/dokter
- Approval workflow configuration UI (hardcoded for now)
- Callback notifications to external systems
- Integration with other MCU systems

### **Future Enhancements (Phase 2+)**
- Upgrade to WhatsApp Business API
- Admin dashboard widgets/analytics for approvals
- Approval SLA tracking (how long pending)
- Bulk approval actions
- Approval templates/macros
- Email notifications as backup
- Mobile app for dokter approval
- Approval delegation (dokter → replacement dokter)

---

## ✅ READY FOR IMPLEMENTATION?

**Before starting implementation, confirm:**

1. ✅ Database schema looks correct?
2. ✅ Workflow logic makes sense?
3. ✅ UI/UX design acceptable?
4. ✅ Service layer approach okay?
5. ✅ Using manual WA option for Phase 1?
6. ✅ Test data ready (dokter user accounts)?
7. ✅ Staging environment available?
8. ✅ Any additional requirements?

---

**Document Version:** 1.0
**Last Updated:** 2026-02-03
**Status:** Ready for Review & Discussion
