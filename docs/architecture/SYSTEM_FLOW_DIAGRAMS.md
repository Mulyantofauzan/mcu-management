# MADIS System Flow Diagrams

Comprehensive visual documentation of all major system processes and data flows.

---

## 1. MCU Data Entry & Update Flow

### Overview
Complete workflow from employee MCU registration through follow-up completion and change tracking.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MCU DATA ENTRY WORKFLOW                         │
└─────────────────────────────────────────────────────────────────────┘

START
  │
  ├──→ [Dashboard] User opens MCU Management page
  │
  ├──→ [Kelola Karyawan] Search for employee
  │       └─→ Employee found in database
  │
  ├──→ [Create MCU] Initiate new MCU record
  │       └─→ Generate MCU ID (MCU-YYYYMMDD-XXXX)
  │
  ├──→ [Basic Info] Enter basic MCU data
  │    ├─ MCU Type (Pre-employment, Annual, etc)
  │    ├─ MCU Date
  │    ├─ Initial Result (Fit/Follow-Up/Not Fit)
  │    └─ Initial Notes
  │
  ├──→ [Medical Examination] Input vital signs
  │    ├─ Blood Pressure
  │    ├─ BMI / Height / Weight
  │    ├─ Pulse & Temperature
  │    ├─ Respiratory Rate
  │    └─ Chest Circumference
  │
  ├──→ [Vision Test] Enter 8 vision parameters
  │    ├─ Distant Vision (unaided & spectacles) L/R
  │    └─ Near Vision (unaided & spectacles) L/R
  │
  ├──→ [Diagnostic Tests] Record exam results
  │    ├─ Audiometry
  │    ├─ Spirometry
  │    ├─ X-Ray
  │    ├─ EKG / Treadmill
  │    └─ Color Blindness Test
  │
  ├──→ [Submit] Save to database
  │    │
  │    ├──→ [Database] Store in mcus table
  │    │       └─→ CREATE initial record
  │    │
  │    └──→ [Activity Log] Log creation event
  │            └─→ action: "create", target: "MCU"
  │
  ├──→ [Lab Results] Associate lab test results
  │    │
  │    ├──→ [Lab Service] Load pemeriksaan_lab records
  │    │    ├─ Triglycerides (Lab ID: 9)
  │    │    ├─ HDL (Lab ID: 10)
  │    │    └─ Fasting Glucose (Lab ID: 7)
  │    │
  │    └──→ [MCU Updated] Enrich MCU with lab data
  │
  └──→ [Follow-Up Status] If initialResult = "Follow-Up"
       │
       ├──→ [Follow-Up Page] Open follow-up form
       │    │
       │    ├──→ [Fetch Old MCU] GET original MCU state
       │    │       └─→ Store in memory (oldMCU)
       │    │
       │    ├──→ [Update Form] Modify examination data
       │    │    ├─ Change blood pressure
       │    │    ├─ Update vital signs
       │    │    ├─ Modify test results
       │    │    ├─ Set Final Result (Fit/Follow-Up/Not Fit)
       │    │    └─ Add Final Notes
       │    │
       │    ├──→ [Submit Changes]
       │    │    │
       │    │    ├──→ [API Call] POST to mcuService.updateFollowUp()
       │    │    │       └─→ Pass: mcuId, updates, currentUser
       │    │    │
       │    │    ├──→ [Service Layer]
       │    │    │    ├─ Fetch NEW MCU state (newMCU)
       │    │    │    │
       │    │    │    ├─ [Diff Calculation] Compare oldMCU vs newMCU
       │    │    │    │   └─ Field-by-field comparison
       │    │    │    │       • bloodPressure: "120/80" → "130/85"
       │    │    │    │       • finalResult: "Follow-Up" → "Fit"
       │    │    │    │       • (all changed fields recorded)
       │    │    │    │
       │    │    │    ├─ [Change History] Create mcu_changes entries
       │    │    │    │   └─ For each changed field:
       │    │    │    │       {
       │    │    │    │         mcu_id: "MCU-...",
       │    │    │    │         field_name: "bloodPressure",
       │    │    │    │         old_value: "120/80",
       │    │    │    │         new_value: "130/85",
       │    │    │    │         changed_at: timestamp,
       │    │    │    │         changed_by: user_id
       │    │    │    │       }
       │    │    │    │
       │    │    │    ├─ [Activity Log] Log update event
       │    │    │    │   └─ Details: "MCU: MCU-..., Fields: bloodPressure, finalResult"
       │    │    │    │       IP: 192.168.x.x
       │    │    │    │       User Agent: Mozilla/5.0...
       │    │    │    │
       │    │    │    └─ [Database Commit] Save all changes
       │    │    │
       │    │    ├──→ [UI Update] Show success message
       │    │    │
       │    │    └──→ [Change History Visible]
       │    │         Path: Kelola Karyawan → Detail → Riwayat Perubahan
       │    │         Shows: All field changes with before/after values
       │    │
       │    └──→ [Immutable Audit Trail] Created in activity_log
       │          ├─ Cannot be deleted (is_immutable=true)
       │          ├─ Hash verified (tamper detection)
       │          └─ RLS protected (access control)
       │
       └──→ END (Follow-up completed, change tracked)

```

### Data Transformations

```
MCU Workflow State Transitions:
═══════════════════════════════════════════════════════════════

[1] CREATION
   Input: Employee + MCU Type + Exam Data
   Process: Create record, assign MCU ID
   Output: mcus table new record
   Audit: activity_log (action: create)

[2] ENHANCEMENT
   Input: Lab results available
   Process: Link lab results to MCU
   Output: MCU enriched with lab data
   Audit: No change log (linking only)

[3] FOLLOW-UP
   Input: Old MCU state
   Process: Update specific fields
   Output: Updated MCU + mcu_changes + activity_log
   Audit: Complete field-level history + user tracking

[4] COMPLETION
   Input: All follow-up data
   Process: Mark as final (finalResult set)
   Output: Closed MCU record
   Audit: Immutable change trail preserved
```

---

## 2. Assessment & Risk Calculation Flow

### Overview
Complete workflow for calculating Jakarta CV, Framingham, and Metabolic Syndrome scores with risk classification.

```
┌─────────────────────────────────────────────────────────────────────┐
│              ASSESSMENT & RISK CALCULATION WORKFLOW                 │
└─────────────────────────────────────────────────────────────────────┘

START
  │
  ├──→ [Assessment RAHMA] User opens dashboard
  │    └─→ Load all employees with latest MCU + lab results
  │
  ├──→ [Data Preparation]
  │    ├─ Fetch MCU records (latest per employee)
  │    ├─ Fetch pemeriksaan_lab (lab results)
  │    ├─ Fetch medical_histories (diabetes, hypertension)
  │    └─ Fetch family_histories
  │
  ├────────────────────────────────────────────────────────────────┤
  │          JAKARTA CARDIOVASCULAR SCORE CALCULATION              │
  ├──────────────────────────────────────────────────────────────────┤
  │
  ├──→ [Input Parameters] Extract 7 factors
  │    ├─ 1. Age (from employee DOB)
  │    ├─ 2. Systolic BP (bloodPressure)
  │    ├─ 3. BMI (weight / height²)
  │    ├─ 4. Smoking Status (from MCU)
  │    ├─ 5. Diabetes Status (from medical_histories)
  │    ├─ 6. Exercise Frequency (from MCU)
  │    └─ 7. Gender (from employee)
  │
  ├──→ [Scoring] Calculate individual scores
  │    ├─ Framingham Score (base calculation)
  │    │   └─→ Call framinghamCalculatorService.calculateScore()
  │    │
  │    ├─ Jakarta Risk Formula (gender-specific)
  │    │   └─→ Apply regression coefficients
  │    │       Male: score = (age×0.06) + (bp×0.01) + (bmi×0.15) ...
  │    │       Female: different coefficients
  │    │
  │    └─ Range: -7 to +13
  │        ├─ Negative (-7 to -1): LOW RISK
  │        ├─ Positive (0 to +13):  MEDIUM/HIGH RISK
  │        └─ Classification: 1, 2, 3 (Low, Med, High)
  │
  │
  ├──────────────────────────────────────────────────────────────────┤
  │     METABOLIC SYNDROME SCORE CALCULATION (Binary Scoring)        │
  ├──────────────────────────────────────────────────────────────────┤
  │
  ├──→ [Input Parameters] Extract 5 metabolic factors
  │    ├─ 1. Waist Circumference (chest_circumference field)
  │    │    └─ Male: <90cm=0, ≥90cm=1
  │    │    └─ Female: <80cm=0, ≥80cm=1
  │    │
  │    ├─ 2. Triglycerides (from lab_item_id: 9)
  │    │    └─ <150 mg/dL=0, ≥150 mg/dL=1
  │    │
  │    ├─ 3. HDL Cholesterol (from lab_item_id: 10)
  │    │    └─ Male: <40=1, ≥40=0
  │    │    └─ Female: <50=1, ≥50=0
  │    │
  │    ├─ 4. Blood Pressure (bloodPressure)
  │    │    └─ <130/85=0, ≥130 OR ≥85=1
  │    │
  │    └─ 5. Fasting Glucose (from lab_item_id: 7 OR diabetes flag)
  │         └─ <100 mg/dL (no diabetes)=0
  │         └─ ≥100 mg/dL (or has diabetes)=1
  │
  ├──→ [Binary Scoring] Each parameter scored 0 or 1
  │    ├─ Example 1: LP=1, TG=0, HDL=1, TD=0, GDP=0 → Total=2
  │    ├─ Example 2: LP=1, TG=1, HDL=1, TD=1, GDP=0 → Total=4
  │    └─ Range: 0-5 (Sum of all 5 parameters)
  │
  ├──→ [Risk Classification] LP-Dependent Logic
  │    │
  │    ├─ IF total ≤ 2 AND LP=0 → RISK 1 (Normal/Low)
  │    │                           └─ No abnormal waist circumference
  │    │
  │    ├─ IF total ≤ 2 AND LP=1 → RISK 2 (Medium)
  │    │                           └─ Has abnormal waist but few other criteria
  │    │
  │    └─ IF total ≥ 3 → RISK 3 (Sindrom Metabolik)
  │                      └─ Diagnosis: metabolic syndrome present
  │
  │
  ├──────────────────────────────────────────────────────────────────┤
  │            RISK MATRIX CALCULATION                               │
  ├──────────────────────────────────────────────────────────────────┤
  │
  ├──→ [Combine Scores]
  │    CV_Risk (1, 2, 3) × Metabolic_Risk (1, 2, 3)
  │
  ├──→ [Risk Matrix]
  │    ┌─────────┬──────┬──────┬──────┐
  │    │ CV/Meta │  1   │  2   │  3   │
  │    ├─────────┼──────┼──────┼──────┤
  │    │   1     │  1   │  2   │  3   │
  │    │   2     │  2   │  4   │  6   │
  │    │   3     │  3   │  6   │  9   │
  │    └─────────┴──────┴──────┴──────┘
  │
  ├──→ [Risk Total] Final classification
  │    ├─ 1 = LOW (Green)
  │    ├─ 2-3 = LOW-MEDIUM (Light Green)
  │    ├─ 4 = MEDIUM (Yellow)
  │    ├─ 6 = HIGH (Orange)
  │    └─ 9 = CRITICAL (Red)
  │
  │
  ├──────────────────────────────────────────────────────────────────┤
  │            DATA STORAGE & DISPLAY                                │
  ├──────────────────────────────────────────────────────────────────┤
  │
  ├──→ [Store in Memory] Dashboard data structure
  │    └─ cardiovascularData[] array with all calculated scores
  │        └─ Each employee object contains:
  │            {
  │              employeeId: "E001",
  │              name: "John Doe",
  │              cvScore: 5,
  │              cvRisk: 2,
  │              metabolicScores: {
  │                lp: 1, tg: 0, hdl: 1, td: 0, gdp: 0
  │              },
  │              metabolicTotal: 2,
  │              metabolicRisk: 1,
  │              riskTotal: 2,
  │              riskColor: "bg-yellow-100"
  │            }
  │
  ├──→ [Render Table] Display dashboard
  │    ├─ Employee Name
  │    ├─ MCU Type
  │    ├─ CV Score (range: -7 to +13)
  │    ├─ CV Risk (1/2/3 with colors)
  │    ├─ Metabolic Parameters (LP, TG, HDL, TD, GDP)
  │    ├─ Metabolic Total (0-5)
  │    ├─ Metabolic Risk (1/2/3)
  │    ├─ Risk Total (1-9)
  │    └─ Risk Level (LOW/MEDIUM/HIGH/CRITICAL)
  │
  ├──→ [Risk Category Cards] Summary cards
  │    ├─ Risk Level 1 (Low) - Count of employees
  │    ├─ Risk Level 2 (Medium) - Count of employees
  │    ├─ Risk Level 3 (High) - Count of employees
  │    └─ Risk Level 4+ (Critical) - Count of employees
  │
  └──→ END (All assessments calculated and displayed)

```

### Calculation Examples

```
EXAMPLE 1: Normal Employee
════════════════════════════════════════════

Input Data:
  Age: 35, Male
  SBP: 120, BMI: 24
  Non-smoker, No diabetes, Exercises regularly
  Waist: 85cm, TG: 120, HDL: 45, BP: 120/80, Glucose: 95

Jakarta CV Score: -2 (LOW RISK 1)
  └─ Scoring formula applied

Metabolic Syndrome:
  LP: 0 (85 < 90) ✓
  TG: 0 (120 < 150) ✓
  HDL: 0 (45 ≥ 40) ✓
  TD: 0 (120/80 < 130/85) ✓
  GDP: 0 (95 < 100) ✓
  Total: 0 → RISK 1 (Normal)

Risk Matrix: 1 × 1 = 1 (LOW - Green)

─────────────────────────────────────────────

EXAMPLE 2: At-Risk Employee
════════════════════════════════════════════

Input Data:
  Age: 52, Female
  SBP: 135, BMI: 28
  Smoker, Diabetic, No exercise
  Waist: 82cm, TG: 180, HDL: 45, BP: 135/88, Glucose: 140 (diabetic)

Jakarta CV Score: 7 (MEDIUM RISK 2)
  └─ Older, higher BP, smoker, diabetic

Metabolic Syndrome:
  LP: 1 (82 ≥ 80) ✗
  TG: 1 (180 ≥ 150) ✗
  HDL: 1 (45 < 50 female threshold) ✗
  TD: 1 (135 ≥ 130) ✗
  GDP: 1 (140 ≥ 100, diabetic) ✗
  Total: 5 → RISK 3 (Sindrom Metabolik)

Risk Matrix: 2 × 3 = 6 (HIGH - Orange)

─────────────────────────────────────────────

EXAMPLE 3: Edge Case - LP Dependency
════════════════════════════════════════════

Input Data:
  CV Score: 2 (RISK 1)
  Waist: 92cm (Male)
  TG: 140, HDL: 50, BP: 125/80, Glucose: 95

Metabolic Parameters:
  LP: 1 (92 ≥ 90) ✗
  TG: 0 (140 < 150) ✓
  HDL: 0 (50 ≥ 40) ✓
  TD: 0 (125/80 < 130/85) ✓
  GDP: 0 (95 < 100) ✓
  Total: 1

Risk Classification:
  - Total ≤ 2 AND LP=1
  - Therefore: RISK 2 (Medium)
  - This person has abnormal waist but not metabolic syndrome
  - Important distinction: needs monitoring but not diagnosis

Risk Matrix: 1 × 2 = 2 (LOW-MEDIUM - Light Green)
```

---

## 3. Data Export & Reporting Flow

### Overview
Complete workflow for exporting data to Excel with formatting and metadata.

```
┌─────────────────────────────────────────────────────────────────────┐
│              DATA EXPORT & REPORTING WORKFLOW                       │
└─────────────────────────────────────────────────────────────────────┘

START
  │
  ├──→ [Dashboard] User applies filters (optional)
  │    ├─ Department filter
  │    ├─ Risk level filter
  │    ├─ Date range filter
  │    └─ Search by employee name
  │
  ├──→ [Filtered Data] System narrows dataset
  │    └─ Only employees matching criteria shown in table
  │
  ├──→ [Export Button] "Export ke Excel" clicked
  │    └─ Button location: Below filter controls
  │
  ├──────────────────────────────────────────────────────────────────┤
  │                    EXPORT PROCESSING                             │
  ├──────────────────────────────────────────────────────────────────┤
  │
  ├──→ [UI Feedback] Show loading spinner
  │    └─ Disable button during export
  │
  ├──→ [Data Collection]
  │    ├─ Gather filtered dataset from table
  │    ├─ Current structure: cardiovascularData[] array
  │    └─ Each object contains all scores and calculations
  │
  ├──→ [Excel Service] Call excelExportService.exportToExcel()
  │    │
  │    ├──→ [Create Workbook] Initialize ExcelJS workbook
  │    │    └─ workbook = new ExcelJS.Workbook()
  │    │
  │    ├──→ [Create Worksheet] Add sheet with name
  │    │    └─ ws = workbook.addWorksheet("Jakarta Cardiovascular")
  │    │
  │    ├──→ [Define Columns] Set up 20 columns
  │    │    ├─ Column 1: Employee Name (width: 20)
  │    │    ├─ Column 2: Department (width: 15)
  │    │    ├─ Column 3: MCU Type (width: 15)
  │    │    ├─ Column 4-5: Jakarta CV Score & Risk
  │    │    ├─ Column 6-10: Metabolic Parameters (LP, TG, HDL, TD, GDP)
  │    │    ├─ Column 11: Metabolic Total
  │    │    ├─ Column 12: Metabolic Risk
  │    │    ├─ Column 13-15: Risk components
  │    │    └─ Column 16-20: Additional data
  │    │
  │    ├──→ [Merge Headers] Create category headers
  │    │    ├─ Row 1: Main title row
  │    │    │   └─ Merged cells: "Jakarta Cardiovascular Assessment"
  │    │    │
  │    │    ├─ Row 2: Category headers
  │    │    │   ├─ "Employee Info"
  │    │    │   ├─ "Jakarta CV Score"
  │    │    │   ├─ "Sindrom Metabolik"
  │    │    │   ├─ "Risk Assessment"
  │    │    │   └─ "Final Risk"
  │    │    │
  │    │    └─ Row 3: Column headers
  │    │        └─ Specific field names
  │    │
  │    ├──→ [Apply Styling]
  │    │    ├─ Header cells:
  │    │    │   ├─ Background: #3b82f6 (blue)
  │    │    │   ├─ Text: white, bold
  │    │    │   ├─ Font: Arial 11px
  │    │    │   └─ Borders: thin, all sides
  │    │    │
  │    │    ├─ Category headers:
  │    │    │   ├─ Background: #dbeafe (light blue)
  │    │    │   ├─ Text: dark, bold
  │    │    │   ├─ Font: Arial 10px
  │    │    │   └─ Center alignment
  │    │    │
  │    │    └─ Data cells:
  │    │        ├─ Font: Arial 10px
  │    │        ├─ Borders: thin
  │    │        └─ Alignment: center for numbers
  │    │
  │    ├──→ [Add Data Rows] Insert employee data
  │    │    └─ For each employee in filtered data:
  │    │        ├─ Name (left-aligned)
  │    │        ├─ Department (left-aligned)
  │    │        ├─ MCU Type (left-aligned)
  │    │        ├─ CV Score (centered)
  │    │        ├─ CV Risk (centered)
  │    │        ├─ Metabolic scores (centered)
  │    │        ├─ Risk levels (centered)
  │    │        └─ Other calculated fields
  │    │
  │    ├──→ [Risk Coloring] Conditional formatting
  │    │    ├─ Risk 1 (Low): Light green background
  │    │    ├─ Risk 2 (Medium): Light yellow background
  │    │    ├─ Risk 3 (High): Light orange background
  │    │    └─ Risk 4+ (Critical): Light red background
  │    │    └─ Applied to Risk Total column
  │    │
  │    ├──→ [Set Column Widths] Auto-fit columns
  │    │    └─ Each column width matches content + padding
  │    │
  │    ├──→ [Add Footer] Metadata
  │    │    ├─ Row after data: Export timestamp
  │    │    ├─ Last row: "Generated by MADIS - [Date] [Time]"
  │    │    └─ Footer styling: gray text, italic
  │    │
  │    └──→ [Generate File] Serialize to bytes
  │         └─ workbook.xlsx (binary format)
  │
  ├──→ [Download] Trigger browser download
  │    ├─ Filename: "Jakarta Cardiovascular - 20-01-2026.xlsx"
  │    │   └─ Format: "Jakarta Cardiovascular - DD-MM-YYYY.xlsx"
  │    │
  │    └─ Browser downloads file to Downloads folder
  │
  ├──→ [Activity Log] Record export action
  │    └─ Log entry in activity_log:
  │        ├─ action: "export"
  │        ├─ target: "MCU"
  │        ├─ details: "Exported Jakarta CV assessment data (N records)"
  │        ├─ user_id: current user
  │        ├─ ip_address: client IP
  │        └─ timestamp: export time
  │
  ├──→ [UI Feedback] Show success message
  │    ├─ Toast notification: "Excel exported successfully"
  │    └─ Re-enable export button
  │
  └──→ END (File ready for analysis/presentation)

```

### Excel Output Structure

```
JAKARTA CARDIOVASCULAR ASSESSMENT EXPORT
═════════════════════════════════════════════════════════════════════

Row 1: [HEADER - MERGED CELLS A1:T1]
       "JAKARTA CARDIOVASCULAR ASSESSMENT - EXPORTED 20-01-2026"
       Font: Bold, 14pt, Blue background, White text

Row 2: [CATEGORY HEADERS - MERGED CELLS]
       ┌─────────────────┬──────────────┬─────────────────┬──────────┐
       │ Employee Info   │ Jakarta CV   │ Sindrom Metabolik│ Final Risk
       │ (3 cols)        │ (2 cols)     │ (5 cols)        │ (2 cols)
       └─────────────────┴──────────────┴─────────────────┴──────────┘
       Background: Light blue (#dbeafe)
       Font: Bold, 11pt

Row 3: [COLUMN HEADERS]
   A: Employee Name    B: Department  C: MCU Type
   D: CV Score         E: CV Risk     F: LP Score
   G: TG Score         H: HDL Score   I: TD Score
   J: GDP Score        K: Metabolic   L: Metabolic
   M-O: Risk components
   P-S: Additional data

Rows 4+: [DATA ROWS]
   Each row represents one employee with all calculated scores
   Alternating white/light-gray row colors (optional)
   Risk Total column colored based on value:
     1-2:   Light green
     3:     Light green
     4:     Light yellow
     6:     Light orange
     9:     Light red

Last Row: [FOOTER]
   "Generated by MADIS on 20-01-2026 14:30:25 (UTC+7)"
   Font: Gray, italic, 9pt

File Metadata:
  - Filename: "Jakarta Cardiovascular - DD-MM-YYYY.xlsx"
  - Created: Current date/time
  - Application: MADIS MCU Management System
  - Encoding: XLSX (Excel 2007+)
```

---

## 4. User Authentication & Authorization Flow

### Overview
Complete authentication and role-based access control workflow.

```
┌─────────────────────────────────────────────────────────────────────┐
│          USER AUTHENTICATION & AUTHORIZATION WORKFLOW               │
└─────────────────────────────────────────────────────────────────────┘

[LOGIN PROCESS]
═════════════════════════════════════════════════════════════════════

START
  │
  ├──→ [Login Page] User opens app
  │    └─ User navigates to https://app.madis.com/login
  │
  ├──→ [Auth Selection] Choose authentication method
  │    ├─ Email + Password
  │    ├─ Google OAuth
  │    ├─ Magic Link
  │    └─ Other SSO (optional)
  │
  ├──────────────────────────────────────────────────────────────────┤
  │              EMAIL + PASSWORD FLOW                               │
  ├──────────────────────────────────────────────────────────────────┤
  │
  ├──→ [Supabase Auth] Send credentials
  │    └─ POST to supabase.auth.signInWithPassword()
  │        ├─ Email: user@company.com
  │        └─ Password: ••••••••
  │
  ├──→ [Validation]
  │    ├─ Email format valid? (RFC 5322)
  │    ├─ Password length > 8 chars?
  │    └─ Credentials correct in database?
  │
  ├──→ [On Success]
  │    ├─ Generate JWT session token
  │    ├─ Store in browser localStorage
  │    ├─ Set refresh token (secure cookie)
  │    └─ Return user object:
  │        {
  │          id: "user_uuid",
  │          email: "user@company.com",
  │          user_metadata: {
  │            role: "doctor",
  │            department: "HR"
  │          }
  │        }
  │
  ├──→ [Session Storage]
  │    ├─ localStorage: JWT token
  │    ├─ sessionStorage: User preferences
  │    └─ Cookies: Refresh token (httpOnly, Secure)
  │
  ├──────────────────────────────────────────────────────────────────┤
  │              ROLE-BASED ACCESS CONTROL (RBAC)                    │
  ├──────────────────────────────────────────────────────────────────┤
  │
  ├──→ [Fetch User Roles]
  │    └─ Query: SELECT * FROM user_roles WHERE user_id = ?
  │
  ├──→ [Role Definitions]
  │    ├─ ADMIN: Full access to all modules
  │    ├─ DOCTOR: Can create/edit MCU, view assessments
  │    ├─ NURSE: Can view MCU, limited editing
  │    ├─ HR: Can view employee data, export reports
  │    └─ ANALYST: Read-only access to dashboards
  │
  ├──→ [Permission Mapping]
  │    ├─ Role: ADMIN
  │    │  └─ Permissions: create, read, update, delete (all)
  │    │
  │    ├─ Role: DOCTOR
  │    │  ├─ Can: Create MCU, Edit MCU, View assessments
  │    │  ├─ Cannot: Delete MCU, Manage users
  │    │  └─ Scope: Own department only (RLS)
  │    │
  │    ├─ Role: NURSE
  │    │  ├─ Can: View MCU, Add vital signs
  │    │  ├─ Cannot: Change diagnoses
  │    │  └─ Scope: Own department only
  │    │
  │    ├─ Role: HR
  │    │  ├─ Can: View all employees, Export data
  │    │  ├─ Cannot: Edit medical data
  │    │  └─ Scope: All (no department restriction)
  │    │
  │    └─ Role: ANALYST
  │       ├─ Can: View dashboards, Download reports
  │       ├─ Cannot: Edit any data
  │       └─ Scope: All (read-only)
  │
  ├──→ [Row Level Security (RLS)] Database enforcement
  │    │
  │    ├─ Policy: mcus (RLS policy)
  │    │  └─ SELECT: user.department = mcu.department OR user.role = 'ADMIN'
  │    │  └─ UPDATE: same as SELECT + user_id must be in allowed list
  │    │  └─ DELETE: Only ADMIN
  │    │
  │    ├─ Policy: activity_log (RLS policy)
  │    │  └─ SELECT: user.role = 'ADMIN' OR user_id = current_user
  │    │  └─ UPDATE: Denied (immutable)
  │    │  └─ DELETE: Denied (immutable)
  │    │
  │    └─ Policy: mcu_changes (RLS policy)
  │       └─ SELECT: Same as mcus
  │       └─ UPDATE/DELETE: Denied (immutable)
  │
  ├──→ [Initialize App]
  │    ├─ Load authenticated user
  │    ├─ Load user permissions
  │    ├─ Configure menu visibility based on role
  │    ├─ Set up data access filters
  │    └─ Initialize service worker cache
  │
  ├──→ [Activity Log] Record login
  │    └─ Log entry:
  │        ├─ action: "login"
  │        ├─ target: "System"
  │        ├─ user_id: authenticated user
  │        ├─ ip_address: client IP
  │        ├─ user_agent: browser info
  │        └─ timestamp: login time
  │
  │
  ├──────────────────────────────────────────────────────────────────┤
  │              SESSION MANAGEMENT                                  │
  ├──────────────────────────────────────────────────────────────────┤
  │
  ├──→ [Session Validation] On each request
  │    ├─ Check JWT token validity
  │    ├─ Check token expiration (default: 1 hour)
  │    ├─ Validate against user in database
  │    └─ Enforce RLS policies
  │
  ├──→ [Token Refresh] When near expiration
  │    ├─ Use refresh token to get new JWT
  │    ├─ Update localStorage
  │    └─ Continue session
  │
  ├──→ [Session Timeout]
  │    ├─ After 30 min inactivity → warn user
  │    ├─ After 60 min inactivity → force logout
  │    └─ Clear tokens and redirect to login
  │
  │
  ├──────────────────────────────────────────────────────────────────┤
  │              LOGOUT PROCESS                                      │
  ├──────────────────────────────────────────────────────────────────┤
  │
  ├──→ [Logout Click] User clicks logout
  │    └─ Trigger supabase.auth.signOut()
  │
  ├──→ [Clear Session]
  │    ├─ Delete localStorage JWT
  │    ├─ Clear sessionStorage
  │    ├─ Invalidate refresh token
  │    ├─ Close all active connections
  │    └─ Clear cache (optional)
  │
  ├──→ [Activity Log] Record logout
  │    └─ Log entry:
  │        ├─ action: "logout"
  │        ├─ target: "System"
  │        ├─ user_id: logged out user
  │        └─ timestamp: logout time
  │
  ├──→ [Redirect] Back to login page
  │    └─ window.location = "/login"
  │
  └──→ END (Session terminated)

```

### Permission Matrix

```
PERMISSION MATRIX BY ROLE
════════════════════════════════════════════════════════════════════

Action              │ ADMIN │ DOCTOR │ NURSE │ HR │ ANALYST
───────────────────┼───────┼────────┼───────┼────┼─────────
View Dashboard      │  ✓    │   ✓    │   ✓   │ ✓  │   ✓
Create MCU          │  ✓    │   ✓    │       │    │
Edit MCU            │  ✓    │   ✓    │  ~    │    │
Delete MCU          │  ✓    │        │       │    │
View Assessments    │  ✓    │   ✓    │   ✓   │ ✓  │   ✓
Export Data         │  ✓    │   ✓    │       │ ✓  │   ✓
Manage Users        │  ✓    │        │       │    │
View Activity Logs  │  ✓    │  ~     │       │    │
Bulk Actions        │  ✓    │   ✓    │       │    │
Data Master Mgmt    │  ✓    │   ✓    │       │    │

Legend:
✓  = Full access
~  = Limited access (own records only)
   = No access

Scope Restrictions (RLS):
- ADMIN: All data, all departments
- DOCTOR: Own department only (except assessments)
- NURSE: Own department only
- HR: All data (read-mostly)
- ANALYST: All data (read-only)
```

---

## 5. Complete System Integration Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│           COMPLETE SYSTEM DATA FLOW INTEGRATION                     │
└─────────────────────────────────────────────────────────────────────┘

                          USER INTERFACE (Frontend)
                    ┌─────────────────────────────────┐
                    │ Dashboard / Kelola Karyawan /   │
                    │ Follow-Up / Assessment RAHMA    │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
            ┌───────▼──────────┐         ┌──────▼────────┐
            │ Auth Service     │         │ MCU Service   │
            │ - Login/Logout   │         │ - CRUD        │
            │ - Permissions    │         │ - Diff/Track  │
            └───────┬──────────┘         │ - History     │
                    │                    └──────┬────────┘
                    │                           │
            ┌───────▼────────────────────────────────────┐
            │ Supabase Backend (PostgreSQL + API)        │
            │                                            │
            │ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
            │ │ users    │ │ mcus     │ │ employees│  │
            │ ├──────────┤ ├──────────┤ ├──────────┤  │
            │ │ id       │ │ mcu_id   │ │ emp_id   │  │
            │ │ email    │ │ emp_id   │ │ name     │  │
            │ │ role     │ │ data...  │ │ dob      │  │
            │ └──────────┘ └──────────┘ └──────────┘  │
            │                                          │
            │ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
            │ │ mcu_     │ │ activity │ │ pemeriksaan│
            │ │ changes  │ │ _log     │ │ _lab     │  │
            │ ├──────────┤ ├──────────┤ ├──────────┤  │
            │ │ changes  │ │ user_id  │ │ mcu_id   │  │
            │ │ tracked  │ │ action   │ │ lab_item │  │
            │ │ field by │ │ immutable│ │ value    │  │
            │ │ field    │ │ RLS      │ │ date     │  │
            │ └──────────┘ └──────────┘ └──────────┘  │
            │                                          │
            │ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
            │ │ medical  │ │ family   │ │ job_     │  │
            │ │ histories│ │ histories│ │ titles   │  │
            │ ├──────────┤ ├──────────┤ ├──────────┤  │
            │ │ diabetes │ │ family   │ │ risk_    │  │
            │ │ history  │ │ condition│ │ level    │  │
            │ │ medicine │ │ relation │ │ salary   │  │
            │ └──────────┘ └──────────┘ └──────────┘  │
            │                                          │
            │ RLS Policies:                            │
            │ - Department-based access                │
            │ - Role-based permissions                 │
            │ - Immutable audit logs                   │
            │ - User isolation                         │
            └───────┬─────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
  ┌─────▼────┐          ┌──────▼──────┐
  │ Services │          │ Offline     │
  │           │          │ Support     │
  │ - Cache  │          │             │
  │ - Queue  │          │ - SW        │
  │ - Sync   │          │ - IndexedDB │
  │ - Retry  │          │ - Dexie     │
  └─────┬────┘          └──────┬──────┘
        │                      │
        └──────────┬───────────┘
                   │
        ┌──────────▼──────────┐
        │ ExcelJS Export      │
        │ - Format data       │
        │ - Style cells       │
        │ - Generate XLSX     │
        │ - Browser download  │
        └────────────────────┘

Data Flow Examples:
═════════════════════════════════════════════════════════════════════

1. CREATE MCU:
   UI → mcuService.create() → Supabase INSERT mcus table
        → activity_log INSERT → RLS enforced → Audit trail

2. UPDATE MCU (Follow-Up):
   UI → mcuService.updateFollowUp()
      → Fetch old data → Update record → Calculate diff
      → INSERT mcu_changes (for each field)
      → INSERT activity_log
      → RLS enforced → Change history visible in UI

3. CALCULATE RISK:
   UI → Load MCU + lab data → Call calculators
      → jakarta CV Score → Metabolic Syndrome Score
      → Risk Matrix → Display in dashboard
      → Data stored in memory (not persisted)

4. EXPORT REPORT:
   UI → Apply filters → Collect data
      → ExcelJS → Format + Style → Generate XLSX
      → Browser download → Log export action
      → activity_log INSERT (action: "export")

5. LOGOUT:
   UI → supabase.auth.signOut()
      → Clear tokens → Close connections
      → activity_log INSERT (action: "logout")
      → Redirect to login
```

---

## 6. Error Handling & Recovery Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│            ERROR HANDLING & RECOVERY WORKFLOW                       │
└─────────────────────────────────────────────────────────────────────┘

[ERROR SCENARIOS]

1. Network Error
   ├─ Service Worker detects offline
   ├─ Try queue request
   ├─ Show: "Connection lost. Retrying..."
   ├─ Wait for network recovery
   ├─ Retry with exponential backoff
   ├─ On success: Sync queued data
   └─ Fallback: Use cached data

2. Authentication Error
   ├─ JWT expired
   ├─ Try refresh token
   ├─ If refresh fails: Redirect to login
   ├─ Clear all session data
   ├─ Show: "Session expired. Please login again"
   └─ Log session error in activity_log

3. Permission Denied (RLS)
   ├─ User tries to access another department data
   ├─ RLS policy blocks at database level
   ├─ Return 403 Forbidden
   ├─ Show: "Access Denied - Insufficient permissions"
   ├─ Log attempt in activity_log
   └─ Alert admin if repeated attempts

4. Data Validation Error
   ├─ User submits invalid data (e.g., blood pressure = 999/999)
   ├─ Client-side validation catches error
   ├─ Show: "Invalid value for Blood Pressure"
   ├─ Highlight invalid field in red
   ├─ User corrects and resubmits
   └─ No database transaction occurred

5. Database Constraint Error
   ├─ Unique constraint violation (e.g., duplicate MCU ID)
   ├─ Server returns constraint error
   ├─ Show: "MCU already exists for this employee on this date"
   ├─ User updates form and resubmits
   └─ Log error with context

6. Export Error
   ├─ ExcelJS fails to generate file
   ├─ Show: "Export failed. Please try again"
   ├─ Check browser console for details
   ├─ Retry export
   └─ If persistent: Report to support
```

---

## Summary

This document provides complete visual flow documentation of all major MADIS system processes:

1. **MCU Data Entry** - From employee registration through follow-up with automatic change tracking
2. **Risk Calculation** - Jakarta CV, Metabolic Syndrome, and Risk Matrix computation
3. **Data Export** - Excel generation with professional formatting
4. **Authentication** - Login, role-based access control, and session management
5. **System Integration** - Complete data flow across all components
6. **Error Handling** - Common error scenarios and recovery mechanisms

All flows are designed for:
- **Transparency** - Complete audit trail of all actions
- **Compliance** - HIPAA and UU-PDP standards
- **User Experience** - Clear feedback and error messages
- **Data Integrity** - Immutable records and RLS enforcement
- **Performance** - Offline support and caching strategies
