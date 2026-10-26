# 03. Screens & User Workflows Specification

**Version:** 1.0  
**Status:** Complete Functional Specification  
**Coverage:** Public Onboarding, Student Portal, Trainer Scanner, Sports Admin Dashboard, Super Admin

---

## 1. Overview of Portals & Screen Map

```mermaid
graph LR
    subgraph PublicAuth ["Public & Onboarding"]
        P1["/ Landing Page"]
        P2["/auth/callback OAuth"]
        P3["/onboarding Photo Upload"]
    end

    subgraph StudentPortal ["Student Portal (/student/*)"]
        S1["/student/dashboard"]
        S2["/student/card Digital Pass"]
        S3["/student/slots Browse & Queue"]
        S4["/student/transfer Request Swap"]
        S5["/student/attendance History"]
        S6["/student/complaints Tickets"]
    end

    subgraph TrainerPortal ["Trainer Portal (/trainer/*)"]
        T1["/trainer/scanner Camera Scan"]
        T2["/trainer/manual AP Fallback"]
        T3["/trainer/roster Live Sessions"]
    end

    subgraph AdminPortal ["Sports Administrator (/admin/*)"]
        A1["/admin/dashboard KPIs"]
        A2["/admin/facilities Facilities & Slots"]
        A3["/admin/windows Reg Windows"]
        A4["/admin/transfers Swap Approval"]
        A5["/admin/attendance Audit & Fix"]
        A6["/admin/absence Retention Engine"]
        A7["/admin/photos Review Center"]
        A8["/admin/complaints Help Desk"]
        A9["/admin/imports Excel Hub"]
        A10["/admin/reports Export"]
    end

    PublicAuth --> StudentPortal
    PublicAuth --> TrainerPortal
    PublicAuth --> AdminPortal
```

---

## 2. Public & Pre-Authentication Screens

### 2.1 Landing Page (`/`)
- **Visual Identity:** Tactile stationery with collegiate athletic green folder hero, tabbed gym facilities (C. V. Raman, Ganga, Krishna, Narmada), and live rotating QR digital gym pass simulator.
- **Primary CTA:** Single high-contrast button: `Continue with SRM-AP Google Account`.
- **Secondary Actions:** `View Official Timetable`, `Campus Access Itinerary`, `FAQ Accordion`.
- **Footer:** Formal institutional mark: *Department of Physical Education & Sports Facilities, SRM University-AP*, with open-license picture attributions.

### 2.2 Student Onboarding & Initial Photo Upload (`/onboarding`)
- **Trigger:** First-time login by a provisioned student whose account has no approved photograph.
- **Form Elements:**
  - Read-only official identity fields (Full Name, AP Number, College Email, Department).
  - Photograph Upload Box: Drag-and-drop or device camera upload (`JPEG`, `PNG`, max 5MB).
  - Guidance Checklist: Plain neutral background, direct camera angle, student face clearly visible, no sunglasses/caps.
- **State Behavior:**
  - Upload triggers client-side image dimension verification and sends file to `POST /api/v1/students/photo/upload`.
  - Account status remains `PENDING_PHOTO_APPROVAL`.
  - Student sees a confirmation slate: *"Your photograph has been submitted to the Sports Department for verification. You will be notified once reviewed."*

---

## 3. Student Portal Screens (`/student/*`)

### 3.1 Student Dashboard (`/student/dashboard`)
- **Hero Summary Card:**
  - Displays current active slot: e.g., **C. V. Raman Central Complex · 17:45 – 18:45**.
  - One-tap button: `View Turnstile Pass` (opens Digital Gym Card).
  - Quick status badge: `ACTIVE`, `TRANSFER_REQUESTED`, or `WAITLISTED (#3 in queue)`.
- **Attendance & Absence Barometer:**
  - Weekly streak counter (e.g., `4 of 5 sessions attended this week`).
  - **Absence Risk Gauge:**
    - `0–1 Absences`: Neutral green meter (*"Attendance in good standing"*).
    - `2 Absences`: Amber indicator (*"Warning: 2 unexcused absences"*).
    - `3 Absences`: Red striped indicator (*"Critical Warning: 1 absence away from automated slot reclamation"*).
    - `4 Absences`: Danger slate (*"Allocation terminated due to policy threshold"*).
- **Recent Announcements Carousel:**
  - Important notices published by Sports Administration (e.g., *"C. V. Raman closed on Saturday for Inter-University Badminton"*).

### 3.2 Digital Gym Card & Dynamic QR (`/student/card`)
- **Layout:** Centered tactile paper card object matching physical dimensions.
- **Interactive QR Code:**
  - Encodes high-entropy opaque hash token (`#tok-srm-c4d871c2-1745`).
  - Circular or progress-bar countdown timer showing remaining seconds (30s refresh).
  - Seamless background rotation without card re-rendering.
- **Offline / PWA Banner:**
  - If network drops, service worker serves cached credentials with an amber advisory: *"Offline token active. Valid for current scheduled session."*
- **Action Toolbar:**
  - `Download Offline Pass` (generates signed local pass).
  - `Report Scanner Issue` (routes directly to complaints with session pre-filled).

### 3.3 Available Slot Browser & FCFS Application (`/student/slots`)
- **Facility Tab Navigation:**
  - Tabs: `C. V. Raman`, `Ganga (Girls)`, `Krishna (Boys)`, `Narmada (Dedicated)`.
- **Slot Time Cards:**
  - Listed in chronological batches (06:00–07:00, 07:15–08:15, 16:30–17:30, 17:45–18:45, 19:00–20:00).
  - **Live Capacity Gauge:** e.g., `106 / 120 Allocated` with visual capacity fill.
  - **Action Button States:**
    - `Apply for Slot` (when capacity > 0 and student has no active allocation).
    - `Join FCFS Waitlist` (when capacity == 120; displays current queue depth, e.g. *8 students waiting*).
    - `Request Slot Transfer` (when student already has an active allocation elsewhere).
    - `Currently Allocated` (disabled state for student's own slot).

### 3.4 Slot Transfer Request Engine (`/student/transfer`)
- **Side-by-Side Comparison Ledger:**
  - Left Column: **Current Allocation** (Gym, Timing, Attendance Record).
  - Right Column: **Requested Allocation** (Target Gym, Timing, Availability).
- **The Protected Transfer Guarantee:**
  - Explicit guarantee banner: *"Your current gym slot remains 100% active and protected. You will not lose your existing workout timing unless your transfer is confirmed."*
- **Reason Selector & Submission:**
  - Dropdown options: `Academic Class Timetable Clash`, `Lab Timings Changed`, `Hostel Relocation`, `Medical / Fitness Reason`.
  - Optional remarks textarea (max 250 characters).
  - Primary button: `Submit Transfer Application`.

### 3.5 Attendance History (`/student/attendance`)
- **Calendar & Ledger Dual View:**
  - Calendar shows monthly days marked in green (Present), red (Absent), or amber (Late/Excused).
  - Filterable Table:
    - Columns: Date, Session Time, Gym Complex, Status Badge, Check-In Timestamp, Check-In Method (`QR_SCAN` / `MANUAL_FALLBACK`).
- **Exemption Detail Modal:**
  - Clicking an `EXCUSED` status displays the official reason (e.g., *"Campus holiday - Republic Day"* or *"Medical exemption granted by Sports Dept"*).

### 3.6 Complaints & Support Tickets (`/student/complaints`)
- **Submit Ticket Modal:**
  - Category: `Turnstile / Scanner Failure`, `Incorrect Absence Marked`, `Slot Allocation Inquiry`, `Equipment Maintenance`.
  - Subject line + detailed description.
- **Active Tickets List:**
  - Status Pills: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`.
  - Chronological message thread showing student remarks and official responses from Sports Staff.

---

## 4. Trainer / Gym Staff Portal Screens (`/trainer/*`)

### 4.1 Turnstile Camera Scanner (`/trainer/scan`)
- **Optimized for Tablets & Phones:**
  - Fullscreen camera viewfinder powered by `html5-qrcode`.
  - Lens toggle button (Front / Back camera) + Torch/Flashlight toggle where supported.
- **Multi-Point Verification Overlay (<100ms response):**
  - When a valid QR is scanned, camera pauses and displays the Student Card Overlay:
    - Official Student Photograph (large, clear).
    - Student Full Name & AP Number.
    - Assigned Facility & Scheduled Session Batch.
    - Verification Status: **`ELIGIBLE & SCHEDULED NOW`**.
  - **Single-Tap Actions:**
    - `[CONFIRM ENTRY]` (Records attendance as `PRESENT`, emits success chime, resumes camera).
    - `[REJECT / FLAG]` (Prompts for issue note, logs incident).
- **Error & Exception Displays:**
  - *Duplicate Scan:* Red vibration + bold alert: *"Already Checked In at 17:48 by Trainer John."*
  - *Wrong Slot Batch:* Amber alert: *"Scheduled for 19:00 Batch (Current Session: 17:45)."*
  - *Expired / Invalid Token:* Red alert: *"Token expired or invalid. Ask student to refresh card."*

### 4.2 Manual Fallback Check-In (`/trainer/manual`)
- **Use Case:** Student phone battery dead, damaged screen, or camera read error.
- **Workflow:**
  1. Trainer inputs student AP Number (e.g. `AP21110010123`).
  2. System fetches official record, current allocation, and displays verified student photograph.
  3. Trainer verifies physical presence against screen photo.
  4. Mandatory reason dropdown: `Phone Battery Dead`, `Screen Reflection / QR Damaged`, `Network Failure`.
  5. One-tap button: `Log Manual Attendance` (records check-in with `MANUAL_FALLBACK` flag and trainer's staff ID).

### 4.3 Session Live Roster (`/trainer/roster`)
- **Live Attendance Dashboard for Current Batch:**
  - Header counters: `Total Capacity: 120` · `Checked In: 94` · `Pending / Absent: 26`.
  - Search filter by student name or AP number.
  - Instant toggle to mark an un-scanned student as `EXCUSED` with reason.

---

## 5. Sports Administrator Portal Screens (`/admin/*`)

### 5.1 Command Center & Dashboard (`/admin/dashboard`)
- **Executive Metric Cards:**
  - `Live Campus Occupancy`: Real-time percentage across all 4 gyms.
  - `Daily Check-In Rate`: Today's completed sessions vs expected allocations.
  - `At-Risk Students`: Count of students with 3 consecutive unexcused absences.
  - `Pending Approvals`: Transfer requests (e.g. 14) + Photo change requests (e.g. 6).
- **Facility Status Grid:**
  - Visual load bars for C. V. Raman, Ganga, Krishna, and Narmada.

### 5.2 Facilities & Slots Configuration (`/admin/facilities`)
- **Gym Facility Management:**
  - Add/Edit facility name, location, eligibility group (`CO-ED`, `GIRLS_ONLY`, `BOYS_ONLY`), active status toggle.
- **Slot & Schedule Builder:**
  - Slot time batches (start time, end time, capacity).
  - Recurrence rules via `slot_schedules` (applicable days of week, semester start/end dates).
  - Excel Bulk Import Action: Upload workbook to create entire semester schedules in seconds.

### 5.3 Registration Windows Engine (`/admin/windows`)
- **Window Lifecycle Controls:**
  - Configure Window Name: e.g., *"Spring 2026 Semester Gym Enrollment"*.
  - Opening & Closing Timestamps with Indian Standard Time (`Asia/Kolkata`) lock.
  - Daily active hours (e.g., enrollment open daily from 09:00 to 18:00 only).
  - Status switch: `DRAFT` → `SCHEDULED` → `OPEN` → `CLOSED`.
- **Live Window Telemetry:** Real-time counter of applications processed per minute.

### 5.4 Transfer Requests Review (`/admin/transfers`)
- **Triage Queue:**
  - Lists pending requests sorted by submission timestamp.
  - Shows student AP number, current gym slot, requested gym slot, reason, and target slot capacity.
- **Action Buttons:**
  - `[Approve Transfer]` (Executes atomic swap; notifies student).
  - `[Reject Transfer]` (Requires rejection reason sent to student in-app).

### 5.5 Attendance Audit & Correction Center (`/admin/attendance`)
- **Audit Ledger:**
  - Searchable by date, facility, batch, student AP number, or status.
- **Attendance Correction Modal:**
  - Authorized admin can change a record from `ABSENT` to `EXCUSED` or `PRESENT`.
  - **Mandatory Audit Compliance:** Admin must provide a written reason and select category (`Medical Certificate Submitted`, `Sports Representative Duty`, `Scanner Hardware Failure`).
  - System logs edit into immutable `attendance_corrections` table with timestamp and admin ID.

### 5.6 Absence Policy & Retention Monitor (`/admin/absence`)
- **Policy Configuration:**
  - Set consecutive absence limit (Default: 4 sessions).
  - Set warning notification threshold (Default: 2 sessions).
- **At-Risk Student Queue:**
  - Shows students currently at 2 or 3 consecutive absences.
  - One-click action: `Send Warning Reminder (Email + In-App)`.
- **Reclamation Log:**
  - Shows automatically terminated allocations.
  - Shows instant FCFS waitlist promotion triggered by the reclaimed seat.

### 5.7 Bulk Data & Excel Imports Hub (`/admin/imports`)
- **Import Wizard:**
  1. Select Import Type: `Gym Slots Schedule` or `Student Master Enrollment`.
  2. Drag-and-drop `.xlsx` / `.csv` file.
  3. Pre-Commit Validation Preview:
     - Displays parsed rows in a preview table.
     - Flags invalid emails, duplicate AP numbers, or capacity formatting errors in red.
  4. One-Click `Commit Import` button (executes atomic batch insert with audit log).

### 5.8 Compliance Analytics & Reports Export (`/admin/reports`)
- **Configurable Filters:**
  - Date Range (e.g., Last 30 Days, Full Semester).
  - Facilities (Select all or individual gyms).
  - Report Type: `Attendance Summary`, `Facility Utilization Index`, `Absence & Termination Audit`.
- **Export Formats:** One-click instant download in **CSV** or styled **Excel (.xlsx)**.

---

## 6. System Administrator Screens (`/super-admin/*`)

### 6.1 Staff Accounts & Role Grants (`/super-admin/staff`)
- Table of provisioned university staff members.
- Role selector dropdown: `TRAINER`, `ADMIN`, `SUPER_ADMIN`.
- Account deactivation toggle.

### 6.2 Institutional Settings (`/super-admin/settings`)
- Configurable College Email Domains (Default: `srmap.edu.in`).
- Session Duration & JWT Expiry values.
- Timezone selector (`Asia/Kolkata`).
- Object Storage configuration parameters (Bucket, pre-signed expiry duration).

### 6.3 Immutable Audit Trail Inspector (`/super-admin/audit`)
- Search by `actor_id`, `action`, or `target_type`.
- Expandable JSON Diff Viewer showing `before_state` vs `after_state` with color-coded additions and deletions.
- Global `correlation_id` search to trace asynchronous event workflows across services.
