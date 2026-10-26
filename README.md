# 🏋️‍♂️ GymSlot — Gym Slot Allocation & Attendance Portal

[![SRM University-AP](https://img.shields.io/badge/University-SRM%20University--AP-blue.svg)](https://srmap.edu.in)
[![Authentication](https://img.shields.io/badge/Auth-Google%20OAuth%202.0-red.svg)](https://developers.google.com/identity/protocols/oauth2)
[![PRD](https://img.shields.io/badge/PRD-Requirements-purple.svg)](REQUIREMENTS.md)

**GymSlot** is a gym slot allocation, attendance tracking, and student management system for **SRM University-AP**. It is specified as a microservices application with database-per-service ownership and event-driven communication.

Authorized administrators provision student accounts. Students authenticate with verified college Google accounts, manage their registration photo and gym card, apply for slots, and track attendance and waiting-list status. Trainers verify student identity during check-in. Administrators manage facilities, capacity, registration periods, imports, absence policies, and auditable reports.

---

## 📌 Table of Contents

- [Overview & Objectives](#-overview--objectives)
- [User Roles & Permissions](#-user-roles--permissions)
- [Core Features](#-core-features)
  - [1. Student Registration & Authentication](#1-student-registration--authentication)
  - [2. Student Photos & Digital Gym Card](#2-student-photos--digital-gym-card)
  - [3. Multi-Gym, Slots & Excel Import](#3-multi-gym-slots--excel-import)
  - [4. Slot Applications & FCFS Waiting List](#4-slot-applications--fcfs-waiting-list)
  - [5. Change Gym Slot (Student Transfer Requests)](#5-change-gym-slot-student-transfer-requests)
  - [6. Secure QR Attendance & Scanner](#6-secure-qr-attendance--scanner)
  - [7. Absence Monitoring & Lifecycle](#7-absence-monitoring--lifecycle)
  - [8. Notifications, Imports & Audit Trail](#8-notifications-imports--audit-trail)
- [System Architecture](#-system-architecture)
- [Workflows & Sequence Diagrams](#-workflows--sequence-diagrams)
  - [Attendance Verification Flow](#attendance-verification-flow)
  - [Slot Transfer Request Flow](#slot-transfer-request-flow)
- [Database Schema (Core Entities)](#-database-schema-core-entities)
- [Database Architecture](03-database.md)
- [REST API Specification (`/api/v1`)](#-rest-api-specification-apiv1)
- [Tech Stack](#-tech-stack)
- [Implementation Setup (Pending)](#-implementation-setup-pending)
- [Edge Cases & System Handling](#-edge-cases--system-handling)
- [Development Roadmap](#-development-roadmap)

---

## 📖 Overview & Objectives

Campus gym facilities face high demand across multiple campus locations (e.g., **C. V. Raman**, **Ganga**, **Krishna**, and **Narmada**). In the absence of an automated system:
- High demand leads to rapid slot exhaustion and underutilization by inactive students.
- Paper registers or static cards encourage proxy check-ins.
- Students needing slot adjustments risk forfeiting their active slot before securing another.
- Administrators lack real-time visibility into live occupancy, capacity constraints, and chronic absenteeism.

**GymSlot** addresses these challenges through:
1. **Secure QR Attendance:** Short-lived opaque QR tokens are verified server-side against the student's current allocation and scheduled session.
2. **Safe Slot Transfers:** Students can apply to switch gym slots without forfeiting their active allocation unless the transfer is approved and completed.
3. **Strict Capacity Enforcement:** Atomic database transactions guarantee no slot ever exceeds its configured capacity ceiling.
4. **Fair FCFS Waitlists:** Full slots can queue eligible applicants by server-generated application timestamp, with deterministic tie-breaking and audited promotion.
5. **Controlled Identity Photos:** Initial photos are submitted during onboarding; replacements remain pending until an authorized administrator decides the request.
6. **Digital Gym Cards:** Students with active allocations receive a card with approved photo, identity, slot details, status, and a secure QR token.
7. **Excel Slot Import:** Administrators validate, preview, confirm, and review Excel slot imports; the database remains the source of truth.
8. **Configurable Absence Rules:** Customizable absence policies, warning alerts, exemptions, and capacity reclamation.
9. **Centralized Administration:** Student/allocation imports, schedule adjustments, announcements, reports, and compliance auditing.

---

## 👥 User Roles & Permissions

| Role | Access & Scope | Key Responsibilities |
| :--- | :--- | :--- |
| **STUDENT** | Student Portal | Signs in with their provisioned college identity; uploads the initial photo; views profile, allocation, digital card, attendance, and waitlist status; applies for slots or transfers; requests photo changes. Cannot edit official identity, allocation, or attendance. |
| **TRAINER** | Assigned Gym Scanner | Scans QR tokens, verifies the approved student photo, records attendance, and uses authorized AP-number fallback. Cannot manage allocations, roles, or photo approvals unless separately authorized. |
| **ADMIN** | Sports Admin Portal | Manages students, gyms, slots, capacity, registration, applications, waitlists, photo decisions, attendance, imports, absence policies, reports, and announcements. |
| **SUPER_ADMIN** | System Administration | Manages staff roles, authentication and system configuration, health, and technical operations. Permissions follow least privilege. |

---

## ✨ Core Features

### 1. Student Registration & Authentication
- **Administrator-Provisioned Accounts:** Authorized staff or approved imports create student records with unique ID, name, verified college email, phone, department, year/semester, photo, and account status.
- **Onboarding Photo:** A provisioned student uploads their initial photo during onboarding; the photo must be reviewed before becoming the approved card photo.
- **Single Sign-On (SSO):** "Continue with Google" OpenID Connect flow.
- **Institutional Domain Filtering:** Only verified email addresses matching the approved university domain (e.g., `@srmap.edu.in`) or explicit whitelist can access the portal.
- **Identity Matching:** The verified Google identity must match an active, provisioned student record.
- **Backend Enforced RBAC:** Role permissions are strictly verified server-side on every request.

### 2. Student Photos & Digital Gym Card
- **Private Photo Storage:** Photos are stored securely and are shown only to authorized viewers through access-controlled retrieval.
- **Photo Change Approval:** Students can request a photo replacement; it does not become active until an authorized administrator approves it. Decisions and prior approved photo references are auditable.
- **Digital Gym Card:** Each active allocation has a digital card displaying the approved photo, student ID, name, gym, slot start/end times, allocation status, and QR code.
- **Secure QR Token:** The QR contains only a short-lived opaque token, not student details. It is bound to the active allocation/session and can be expired, rotated, or revoked.

### 3. Multi-Gym, Slots & Excel Import
- **Configurable Gym Facilities:** Dynamic configuration for **C. V. Raman**, **Ganga**, **Krishna**, **Narmada**, and future facilities without code changes.
- **Slot Capacity & Timings:** Customizable start/end times, student eligibility criteria, and maximum capacity caps.
- **Live Metrics:** Instant calculation of allocated slots, available capacity, and occupancy percentages.
- **Excel Slot Import:** `.xlsx` imports validate required columns, dates, times, capacity, gym references, and duplicate/conflicting slots. Admins preview row-level errors before confirmation; import history records the operator and outcome.
- **Database Source of Truth:** Workbooks are an import mechanism only; all active slot data is persisted and managed in the database.

### 4. Slot Applications & FCFS Waiting List
- **Controlled Application Periods:** Administrators open and close registration windows by date range and daily operational hours.
- **Student Slot Discovery:** Real-time search filtered by gym, timing, and available seats.
- **Server-Generated Priority:** The backend creates the UTC application timestamp; client-supplied timestamps never determine priority.
- **Strict FCFS Queue:** When waitlisting is enabled for a full slot, eligible applicants are ordered by server-generated timestamp ascending, with a persisted sequence number as a tie-breaker.
- **Safe Promotion:** Released seats promote the earliest currently eligible applicant atomically. Queue changes, skips, overrides, and notifications are auditable.
- **Concurrency Protection:** Transactions prevent capacity overruns and duplicate active applications or waitlist entries.

### 5. Change Gym Slot (Student Transfer Requests)
*(Core Feature)*
- **Protected Transfer Workflow:** Students who already hold an allocation can apply for another eligible slot without prematurely forfeiting their active slot.
- **Workflow Options:**
  - **Option A (Admin Approval - Default):** Request is placed in pending state; current allocation stays active until an administrator approves and verifies destination capacity.
  - **Option B (Immediate Transfer):** Atomic database swap immediately reallocates the student and releases the old seat back to the pool.
- **Audit Preservation:** Previous allocations are preserved in history with status transitions (`TRANSFERRED`).

### 6. Secure QR Attendance & Scanner
- **Opaque Token Payload:**
  ```json
  {
    "token": "<opaque-short-lived-token>"
  }
  ```
- **Server-Side Validation:** Scanner validates token integrity, expiry/revocation, account state, active allocation, assigned gym/slot, and scheduled session against authoritative backend records.
- **Anti-Proxy Identity Screen:** Scanner displays the student's official photo and registration details for physical desk verification.
- **Duplicate Prevention:** Attempts to scan multiple times during the same scheduled session are rejected with `ALREADY_CHECKED_IN`.
- **Manual Fallback:** Authorized staff can perform search check-ins by AP number if camera scanning fails, with full audit trail logging.

### 7. Absence Monitoring & Lifecycle
- **Customizable Policies:** The Sports Department configures absence frequency requirements, warning thresholds, and termination triggers.
- **Scheduled Automated Audits:** Background cron workers evaluate attendance, generate absence warnings, and flag termination candidates.
- **Capacity Reclamation:** Terminated allocations automatically release capacity back to the available pool.
- **Exemptions & Corrections:** Administrative overrides for medical leaves, university sports events, or campus closures.

### 8. Notifications, Imports & Audit Trail
- **Bulk Student/Allocation Import:** CSV/Excel upload with column validation, duplicate detection, error preview, and explicit confirmation.
- **Import History:** Persist operator, timestamp, file name, row-level outcomes, and summary for student, allocation, and slot imports.
- **Notifications:** In-app updates for applications, waitlist position/promotion, photo decisions, allocation changes, registration, and announcements.
- **Immutable Audit Logging:** Every allocation change, manual attendance correction, capacity edit, and policy adjustment is logged with actor ID, timestamp, and before/after state.

---

## 🏗️ System Architecture

The system uses an authenticated API gateway and database-per-service ownership. Services must not read or write another service's database directly. Domain events are versioned and delivered through a durable broker; consumers must be idempotent. The database ownership details are documented in [03-database.md](03-database.md).

```mermaid
flowchart TB
    subgraph Clients ["Client Layer"]
        StudentApp["📱 Student Portal<br/>(Profile, Gym Card, Applications)"]
        StaffApp["📷 Trainer Scanner<br/>(Opaque QR, Photo Verification)"]
        AdminApp["💻 Sports Admin Portal<br/>(Allocations, Approvals, Reports)"]
    end

    subgraph AuthLayer ["Authentication & Gateway"]
        GoogleOAuth["🔐 Google OAuth 2.0 / OIDC<br/>(Provisioned Identity + Domain Policy)"]
        APIGateway["🛡️ Authenticated API Gateway<br/>(Versioned REST + RBAC)"]
    end

    subgraph ServiceLayer ["Core Application Services — Python / FastAPI"]
        IdentitySvc["🔐 Identity Service<br/>(Users, Roles, Sessions)"]
        StudentSvc["🎓 Student Service<br/>(Profile, Private Photos, Photo Review)"]
        SlotSvc["🎯 Slot Service<br/>(Gyms, Slots, Schedules, Excel Import)"]
        AllocationSvc["🪑 Allocation Service<br/>(Capacity, Applications, FCFS Waitlists)"]
        AttendanceSvc["⏱️ Attendance Service<br/>(Opaque QR, Check-In, Absence Rules)"]
        NotificationSvc["🔔 Notification Service<br/>(In-App, Email, Announcements)"]
        ComplaintSvc["📝 Complaint Service<br/>(Tickets, Comments, Resolution)"]
        ReportSvc["📊 Report & Audit Service<br/>(Reports, Exports, Audit Trail)"]
    end

    subgraph EventLayer ["Event-Driven Integration"]
        Outbox["Transactional Outbox<br/>(per service DB)"]
        Broker[("Durable Event Broker<br/>(Versioned Domain Events)<br/>e.g. Kafka / RabbitMQ")]
    end

    subgraph DataLayer ["Service-Owned Data & File Storage — PostgreSQL + Alembic"]
        IdentityDB[("Identity DB")]
        StudentDB[("Student DB")]
        SlotDB[("Slot DB")]
        AllocationDB[("Allocation DB")]
        AttendanceDB[("Attendance DB")]
        NotificationDB[("Notification DB")]
        ComplaintDB[("Complaint DB")]
        ReportDB[("Report DB")]
        ObjectStore[("Private Photo/Object Storage<br/>S3-compatible")]
    end

    StudentApp -->|Google Sign-In| GoogleOAuth
    StaffApp -->|Google Sign-In| GoogleOAuth
    AdminApp -->|Google Sign-In| GoogleOAuth
    GoogleOAuth --> APIGateway

    StudentApp --> APIGateway
    StaffApp --> APIGateway
    AdminApp --> APIGateway

    APIGateway --> IdentitySvc
    APIGateway --> StudentSvc
    APIGateway --> SlotSvc
    APIGateway --> AllocationSvc
    APIGateway --> AttendanceSvc
    APIGateway --> NotificationSvc
    APIGateway --> ComplaintSvc
    APIGateway --> ReportSvc

    IdentitySvc --> IdentityDB
    StudentSvc --> StudentDB
    StudentSvc --> ObjectStore
    SlotSvc --> SlotDB
    AllocationSvc --> AllocationDB
    AttendanceSvc --> AttendanceDB
    NotificationSvc --> NotificationDB
    ComplaintSvc --> ComplaintDB
    ReportSvc --> ReportDB

    IdentitySvc --> Outbox
    StudentSvc --> Outbox
    SlotSvc --> Outbox
    AllocationSvc --> Outbox
    AttendanceSvc --> Outbox
    ComplaintSvc --> Outbox
    Outbox --> Broker
    Broker --> StudentSvc
    Broker --> SlotSvc
    Broker --> AllocationSvc
    Broker --> AttendanceSvc
    Broker --> NotificationSvc
    Broker --> ComplaintSvc
    Broker --> ReportSvc
```

---

## 🔄 Workflows & Sequence Diagrams

### Attendance Verification Flow

```mermaid
sequenceDiagram
    autonumber
    actor Student
    actor Staff as Gym Staff
    participant Client as Staff Scanner App
    participant Server as Backend API (/api/v1)
    participant DB as Database

    Student->>Student: Open digital gym card and request short-lived QR token
    Student->>Staff: Present QR at Gym Desk
    Staff->>Client: Scan QR with In-App Camera
    Client->>Server: POST /api/v1/staff/attendance/scan (opaque token)
    
    Server->>DB: Validate token, student, allocation & scheduled session
    alt Token Invalid, Expired, or Revoked
        Server-->>Client: Reject without exposing student data
    else No Active Allocation / Wrong Session
        Server-->>Client: 403 Forbidden (WRONG_GYM_OR_SLOT)
    else Already Checked In for Session
        Server-->>Client: 409 Conflict (ALREADY_CHECKED_IN)
    else Valid Check-In
        Server->>DB: Insert Attendance Record & Commit
        Server-->>Client: 200 OK + Student Profile Photo & Details
        Client-->>Staff: Display "Verified" + Photo Confirmation
        Staff-->>Student: Grant Gym Access
    end
```

### Slot Transfer Request Flow

```mermaid
sequenceDiagram
    autonumber
    actor Student
    actor Admin as Sports Admin
    participant Server as Backend API (/api/v1)
    participant DB as Database

    Student->>Server: POST /api/v1/student/slot-change-requests (requested_slot_id)
    Server->>DB: Check Eligibility & Existing Allocation
    Note over DB: Student's Current Allocation Remains ACTIVE
    Server->>DB: Insert slot_change_requests (status: PENDING)
    Server-->>Student: Transfer Request Submitted Successfully

    Admin->>Server: GET /api/v1/admin/slot-change-requests
    Server-->>Admin: List Pending Transfer Requests
    Admin->>Server: POST /api/v1/admin/slot-change-requests/:id/approve
    
    critical Atomic Slot Swap
        Server->>DB: Check Requested Slot Capacity
        Server->>DB: Update Old Allocation (status: TRANSFERRED, end_date: NOW)
        Server->>DB: Insert New Allocation (status: ACTIVE)
        Server->>DB: Update Request (status: APPROVED)
    end
    
    Server-->>Admin: Transfer Completed
    Server-->>Student: In-App Notification: Slot Change Approved!
```

---

## 🗄️ Database Schema (Core Entities)

The following is a **logical view** of core entities, not a single shared database schema. PostgreSQL is used per the architecture specification, with each microservice owning its own database. Cross-service references are identifiers/events, not cross-database foreign keys. See [03-database.md](03-database.md) for service ownership.

```mermaid
erDiagram
    users ||--o{ user_roles : "has"
    roles ||--o{ user_roles : "granted_to"
    users ||--o{ students : "profile"
    students ||--o{ allocations : "has"
    gyms ||--o{ gym_slots : "contains"
    gym_slots ||--o{ slot_schedules : "scheduled_by"
    gym_slots ||--o{ allocations : "allocated_to"
    gym_slots ||--o{ attendance_sessions : "sessions"
    attendance_sessions ||--o{ attendance : "records"
    attendance_sessions ||--o{ attendance_exemptions : "exempt"
    students ||--o{ attendance : "logs"
    allocations ||--o{ slot_change_requests : "current"
    allocations ||--o{ attendance : "authorized_by"
    gym_slots ||--o{ slot_change_requests : "requested"
    students ||--o{ applications : "applies"
    applications }o--|| registration_windows : "within"
    students ||--o{ photo_change_requests : "requests"
    users ||--o{ notifications : "receives"
    users ||--o{ audit_logs : "performed_by"
    students ||--o{ complaints : "submits"

    users {
        uuid id PK
        string email UK
        timestamp email_verified_at
        string status
        timestamp created_at
        timestamp updated_at
    }

    roles {
        uuid id PK
        string name "STUDENT, TRAINER, ADMIN, SUPER_ADMIN"
        timestamp created_at
    }

    user_roles {
        uuid user_id FK
        uuid role_id FK
        uuid assigned_by
        timestamp assigned_at
    }

    students {
        uuid id PK
        uuid user_id
        string ap_number UK
        string full_name
        string department
        string phone
        string year_semester
        string approved_photo_ref
        string account_status
        boolean is_eligible
        timestamp created_at
        timestamp updated_at
    }

    photo_change_requests {
        uuid id PK
        uuid student_id
        string requested_photo_ref
        string status "PENDING, APPROVED, REJECTED"
        uuid reviewed_by
        string decision_reason
        timestamp requested_at
        timestamp decided_at
    }

    gyms {
        uuid id PK
        string name "C. V. Raman, Ganga, etc."
        string location
        string eligibility_group
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    gym_slots {
        uuid id PK
        uuid gym_id FK
        int capacity
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    slot_schedules {
        uuid id PK
        uuid slot_id FK
        string day_of_week
        time start_time
        time end_time
        date effective_from
        date effective_until
        timestamp created_at
        timestamp updated_at
    }

    registration_windows {
        uuid id PK
        string name
        timestamp opens_at
        timestamp closes_at
        string timezone
        time daily_open_time
        time daily_close_time
        string status
        uuid created_by
        timestamp created_at
        timestamp updated_at
    }

    applications {
        uuid id PK
        uuid student_id
        uuid slot_id
        uuid registration_window_id FK
        timestamp applied_at_utc
        bigint priority_sequence
        string status "PENDING, APPROVED, REJECTED, WAITLISTED, OFFERED, WITHDRAWN, EXPIRED"
        timestamp created_at
        timestamp updated_at
    }

    gym_card_tokens {
        uuid id PK
        uuid student_id
        uuid allocation_id
        uuid session_id
        string token_hash UK
        timestamp expires_at
        timestamp revoked_at
        timestamp created_at
    }

    allocations {
        uuid id PK
        uuid student_id
        uuid slot_id
        string status "ACTIVE, TRANSFERRED, TERMINATED, EXPIRED"
        date start_date
        date end_date
        timestamp created_at
        timestamp updated_at
    }

    slot_change_requests {
        uuid id PK
        uuid student_id
        uuid current_allocation_id FK
        uuid requested_slot_id
        string status "PENDING, APPROVED, REJECTED, WITHDRAWN"
        string reason
        uuid reviewed_by
        timestamp reviewed_at
        timestamp created_at
        timestamp updated_at
    }

    attendance_sessions {
        uuid id PK
        uuid slot_id
        date session_date
        time starts_at
        time ends_at
        string status "SCHEDULED, COMPLETED, CANCELLED"
        timestamp created_at
        timestamp updated_at
    }

    attendance {
        uuid id PK
        uuid student_id
        uuid allocation_id
        uuid session_id FK
        string status "PRESENT, ABSENT, LATE, EXCUSED, INVALIDATED"
        timestamp check_in_time
        string method "QR_SCAN, MANUAL_FALLBACK"
        uuid staff_id
        timestamp created_at
        timestamp updated_at
    }

    attendance_exemptions {
        uuid id PK
        uuid session_id FK
        uuid student_id
        string reason
        uuid created_by
        timestamp created_at
    }

    attendance_corrections {
        uuid id PK
        uuid attendance_id FK
        uuid corrected_by
        string old_status
        string new_status
        string reason
        timestamp corrected_at
    }

    notifications {
        uuid id PK
        uuid user_id
        string type
        string channel "EMAIL, IN_APP"
        string subject
        string message
        string status "PENDING, SENT, FAILED"
        string deduplication_key UK
        timestamp sent_at
        timestamp created_at
        timestamp updated_at
    }

    announcements {
        uuid id PK
        uuid created_by
        string title
        string body
        string audience
        timestamp published_at
        timestamp created_at
    }

    complaints {
        uuid id PK
        uuid student_id
        uuid submitted_by
        string category
        string title
        string description
        string status "OPEN, IN_PROGRESS, RESOLVED, CLOSED, REJECTED"
        string priority
        uuid assigned_to
        timestamp resolved_at
        timestamp created_at
        timestamp updated_at
    }

    audit_logs {
        uuid id PK
        uuid actor_id
        string action
        string target_type
        uuid target_id
        jsonb before_state
        jsonb after_state
        string correlation_id
        timestamp created_at
    }
```

Application priority is determined by the backend-generated `applied_at_utc` in ascending order, then by `priority_sequence`; a client-supplied timestamp is never accepted for priority. Store only a token hash, not the reusable plaintext QR token.

---

## 📡 REST API Specification (`/api/v1`)

### 1. Authentication & Session (`/auth`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/auth/google` | Initiates Google OAuth 2.0 flow | Public |
| `GET` | `/api/v1/auth/google/callback` | Exchanges code, verifies domain & sets session | Public |
| `GET` | `/api/v1/auth/me` | Returns current authenticated user and role | Authenticated |
| `POST` | `/api/v1/auth/logout` | Revokes session / cookie | Authenticated |

### 2. Student Portal (`/student`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/student/profile` | Student profile and academic year info | Student |
| `GET` | `/api/v1/student/dashboard` | Active allocation, alerts, and registration status | Student |
| `POST` | `/api/v1/student/registration/photo` | Upload initial photo for a provisioned student | Student |
| `GET` | `/api/v1/student/gym-card` | Current card details and short-lived opaque QR token | Student |
| `POST` | `/api/v1/student/photo-change-requests` | Request an approved-photo replacement | Student |
| `GET` | `/api/v1/student/photo-change-requests` | View own photo-change request status/history | Student |
| `GET` | `/api/v1/student/attendance` | Full attendance history logs | Student |
| `GET` | `/api/v1/student/attendance/stats` | Weekly frequency, streaks, and absence warnings | Student |
| `GET` | `/api/v1/student/available-slots` | Eligible available gym slots with remaining seats | Student |
| `POST` | `/api/v1/student/applications` | Submit application; server assigns priority timestamp | Student |
| `GET` | `/api/v1/student/applications/:id/waitlist-position` | View own current waitlist status and position | Student |
| `POST` | `/api/v1/student/slot-change-requests` | Submit request to switch gym slot | Student |
| `GET` | `/api/v1/student/slot-change-requests` | Check status of pending/past transfer requests | Student |
| `GET` | `/api/v1/student/notifications` | View in-app notifications | Student |

### 3. Staff Scanner (`/staff`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/staff/attendance/scan` | Validates opaque QR token and marks attendance | Trainer / Admin |
| `POST` | `/api/v1/staff/attendance/manual-check-in` | Manual check-in by AP number with audit | TRAINER / ADMIN |
| `GET` | `/api/v1/staff/sessions` | Fetch scheduled sessions for assigned gym | TRAINER / ADMIN |
| `GET` | `/api/v1/staff/attendance` | Live attendance list for active slot session | TRAINER / ADMIN |

### 4. Sports Administrator (`/admin`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET/POST`| `/api/v1/admin/gyms` | List & configure gyms | ADMIN |
| `GET/POST`| `/api/v1/admin/slots` | List & configure slot timings and capacities | ADMIN |
| `POST` | `/api/v1/admin/slot-imports` | Validate, preview, confirm, and inspect Excel slot imports | ADMIN |
| `GET/POST`| `/api/v1/admin/students/:id/photo-change-requests` | Review and decide photo replacement requests | ADMIN |
| `GET/POST`| `/api/v1/admin/registration-windows` | Manage registration open/close windows | ADMIN |
| `GET` | `/api/v1/admin/waitlists` | Inspect FCFS queues and promotion outcomes | ADMIN |
| `GET/PUT` | `/api/v1/admin/slot-change-requests` | Review, approve, or reject student transfer requests | ADMIN |
| `GET/POST`| `/api/v1/admin/allocations` | Manual allocation, transfer, or termination | ADMIN |
| `GET/PUT` | `/api/v1/admin/attendance` | Inspect and correct attendance records | ADMIN |
| `GET/POST`| `/api/v1/admin/absence-policies` | Configure absence policy thresholds and evaluation frequency | ADMIN |
| `GET/POST`| `/api/v1/admin/absence-monitor` | Review at-risk students & process terminations | ADMIN |
| `GET/POST`| `/api/v1/admin/announcements` | Publish and manage broadcast announcements | ADMIN |
| `POST` | `/api/v1/admin/imports` | Bulk import students/allocations with validation preview | ADMIN |
| `GET` | `/api/v1/admin/reports` | Export CSV/Excel analytics and compliance reports | ADMIN |
| `GET` | `/api/v1/admin/audit-logs` | Query append-only audit trail | ADMIN |
| `GET/POST`| `/api/v1/admin/settings` | Configure campus email domains, timezone, and system settings | ADMIN / SUPER_ADMIN |

### 5. Complaints (`/complaints`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/complaints` | Submit a new complaint or support ticket | Student |
| `GET` | `/api/v1/complaints` | List own submitted complaints | Student |
| `GET` | `/api/v1/complaints/:id` | View own complaint details and comments | Student |
| `GET` | `/api/v1/admin/complaints` | List all complaints with filtering and assignment | ADMIN |
| `PUT` | `/api/v1/admin/complaints/:id` | Update status, priority, and assignment | ADMIN |
| `POST` | `/api/v1/admin/complaints/:id/comments` | Add a staff comment or resolution note | ADMIN |

---

## 💻 Tech Stack

These are candidate technologies from the architecture proposal, not confirmed dependencies or an implemented stack.

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React / Next.js / Vite (options) | Responsive student, trainer, and admin experiences |
| **Backend API** | **Python 3.11+ with FastAPI** | Async-capable, typed REST APIs with automatic OpenAPI docs and service boundaries |
| **ORM / DB access** | **SQLAlchemy 2.x (async)** | Declarative models, repository pattern, async session management |
| **Migrations** | **Alembic** | Per-service schema versioning and migration history |
| **Data validation** | **Pydantic v2** | Request/response schemas with strict runtime validation |
| **Database** | PostgreSQL 15+, database per service | ACID transactions within each service's ownership |
| **Event transport** | Durable event broker (e.g. Kafka, RabbitMQ — to be confirmed per deployment) | Versioned, at-least-once domain events with transactional outbox |  
| **Authentication** | Google OAuth 2.0 / OpenID Connect | Verified institutional identities with provisioned-account matching |
| **File storage** | Private S3-compatible object storage (AWS S3, MinIO, GCS — provider to be confirmed) | Access-controlled student photos and import files |
| **Excel processing** | **openpyxl + pandas** | Slot and student bulk import parsing and validation |
| **QR / scanner** | **qrcode** (server-side generation), **html5-qrcode** (browser camera) | Opaque token generation and staff-side QR scanning |
| **Background jobs** | **APScheduler** or **Celery + Beat** (to be confirmed per service) | Waitlist promotion, absence evaluation, notifications, session generation |
| **Cache / locks** | **Redis** (optional) | Rate limiting, distributed locks, short-lived caching — never authoritative store |
| **Containers** | Docker + Docker Compose | Local dev and initial deployment |
| **Testing** | **pytest + httpx + pytest-asyncio** | Unit, integration, and API-level tests per service |

---

## 🚀 Implementation Setup

This repository currently contains documentation only. Implementation is pending. The backend stack is confirmed as **Python 3.11+ / FastAPI / SQLAlchemy 2.x / Alembic**. Each microservice will be a separate Python package with its own virtual environment, database, and Alembic migration tree.

### Prerequisites
- **Python** 3.11 or higher
- **PostgreSQL** 15 or higher
- **Docker & Docker Compose** (for local multi-service development)
- **Google Cloud Console Project** with OAuth 2.0 credentials enabled for Web Applications
- **Redis** (optional; for rate limiting and distributed locks)

### Environment Template (per service)

Each service reads its configuration from environment variables. Create a `.env` file at the service root:

```env
# Service
APP_ENV=development
API_PREFIX=/api/v1
DEBUG=true

# Database (each service has its own DB)
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/<service>_db

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:8000/api/v1/auth/google/callback
ALLOWED_EMAIL_DOMAINS=srmap.edu.in

# JWT / Session
JWT_SECRET=<generate a unique random secret locally>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Object Storage
OBJECT_STORAGE_BUCKET=gymslot-private
OBJECT_STORAGE_ENDPOINT=https://s3.amazonaws.com
OBJECT_STORAGE_ACCESS_KEY=<key>
OBJECT_STORAGE_SECRET_KEY=<secret>

# Timezone
TZ=Asia/Kolkata
```

### Installation & Setup (per service)

1. **Clone the Repository**
   ```bash
   git clone https://github.com/krishhh1089/Gym-allocation.git
   cd Gym-allocation
   ```

2. **Create and activate a virtual environment**
   ```bash
   python -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run database migrations (Alembic)**
   ```bash
   alembic upgrade head
   ```

5. **Seed initial data (optional)**
   ```bash
   python scripts/seed.py
   ```

6. **Start the development server**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

---

## 🛡️ Edge Cases & System Handling

| Scenario | System Behavior |
| :--- | :--- |
| **Student applies for transfer while one is pending** | Submission blocked; system informs student of active pending request. |
| **Target slot fills up before transfer approval** | Approval transaction fails safely; administrator is notified of zero seats and student allocation remains intact. |
| **Simultaneous applicants for 1 remaining seat** | Allocation service commits no more than one allocation; remaining eligible applications enter the FCFS queue when enabled. |
| **Client submits an application timestamp** | Backend ignores or rejects the client timestamp and uses server-generated UTC time plus a sequence tie-breaker. |
| **A waitlisted applicant becomes ineligible before promotion** | Promotion revalidates eligibility and account status, records the skip/removal reason, and continues safely. |
| **Excel slot import contains invalid or duplicate rows** | Preview reports row-specific errors; only confirmed valid rows are imported and the outcome is retained in history. |
| **Photo replacement awaits review or is rejected** | Existing approved photo remains on the digital card until an administrator approves a replacement. |
| **QR token is expired, revoked, or bound to an old allocation** | Scanner rejects the token without revealing personal information. |
| **QR token is scanned for an ineligible gym, slot, or session** | Scanner rejects after validating token binding and current server-side allocation/session records. |
| **Duplicate check-in attempts** | Scanner rejects with `ALREADY_CHECKED_IN` displaying exact earlier check-in timestamp. |
| **Camera permission denied on staff device** | Staff seamlessly switches to authorized manual AP Number search with audit logging. |
| **Gym closed or campus holiday declared** | Session marked `CANCELLED`; absence evaluator exempts that date from attendance calculations. |

---

## 🗺️ Development Roadmap

- [x] **Product Requirements Document** (`REQUIREMENTS.md`)
- [x] **System Architecture** (`system-architecture.md`)
- [x] **Database Architecture** (`03-database.md`)
- [ ] **Phase 1: Foundation & Auth** *(Python / FastAPI / SQLAlchemy / Alembic)*
  - [ ] Per-service PostgreSQL databases and Alembic migration trees
  - [ ] FastAPI project scaffold for each microservice (Identity, Student, Slot, Allocation, Attendance, Notification, Complaint, Report)
  - [ ] Google OAuth 2.0 / OIDC with `@srmap.edu.in` domain validation
  - [ ] Provisioned student accounts, photo onboarding, and photo approval
  - [ ] RBAC (`STUDENT`, `TRAINER`, `ADMIN`, `SUPER_ADMIN`) enforced as FastAPI dependencies
  - [ ] API Gateway routing configuration
- [ ] **Phase 2: Facilities, Slot Import & Allocation**
  - [ ] Gym/slot/schedule management and Excel slot import (`openpyxl`) with preview/history
  - [ ] Registration window engine and atomic capacity enforcement
  - [ ] Server-timestamp FCFS waitlists and idempotent promotion workers
- [ ] **Phase 3: Student Portal & Transfer Requests**
  - [ ] Student dashboard & available slot search
  - [ ] Digital gym card with private photo (pre-signed S3 URLs) and opaque QR token (`qrcode`)
  - [ ] Change Gym Slot transfer request engine (Option A admin-approval & Option B atomic swap)
- [ ] **Phase 4: QR Attendance & Desk Scanner**
  - [ ] Short-lived opaque QR token generation, expiry, and revocation
  - [ ] Mobile camera scanner integration (`html5-qrcode`)
  - [ ] Server-side multi-point validation & duplicate prevention
  - [ ] Manual fallback by AP number with full audit trail
- [ ] **Phase 5: Absence Monitoring & Retention**
  - [ ] Configurable absence policy engine
  - [ ] Idempotent APScheduler / Celery Beat cron jobs for warning & termination
  - [ ] Automatic capacity reclamation on termination
  - [ ] Attendance correction workflow with `attendance_corrections` audit table
- [ ] **Phase 6: Complaints, Administration & Pilot**
  - [ ] Complaint / support ticket service
  - [ ] Bulk student/allocation CSV/Excel import with pre-commit preview
  - [ ] Sports admin analytics & CSV/Excel export (openpyxl/pandas)
  - [ ] Transactional outbox publisher and event broker integration
  - [ ] Event-driven notifications (in-app + email via SMTP/SES)
  - [ ] Append-only audit logs queryable by admin
  - [ ] SRM University-AP Sports Department pilot deployment
