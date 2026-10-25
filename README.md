# 🏋️‍♂️ GymSlot — Gym Slot Allocation & Attendance Portal

[![SRM University-AP](https://img.shields.io/badge/University-SRM%20University--AP-blue.svg)](https://srmap.edu.in)
[![Authentication](https://img.shields.io/badge/Auth-Google%20OAuth%202.0-red.svg)](https://developers.google.com/identity/protocols/oauth2)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRD](https://img.shields.io/badge/PRD-Requirements%20v2.0-purple.svg)](REQUIREMENTS.md)

**GymSlot** is a modern, enterprise-grade gym slot allocation, attendance tracking, and student management portal purpose-built for **SRM University-AP**.

It digitizes the end-to-end gym lifecycle: students can authenticate via official college Google accounts, view allocated facilities and timings, request slot transfers while safeguarding active allocations, generate secure QR codes for daily sessions, and track their workout frequency. Gym staff can verify student identities and prevent proxy check-ins via camera scanners, while Sports Administrators manage facilities, strict capacity limits, registration windows, configurable absence policies, and auditable reports.

---

## 📌 Table of Contents

- [Overview & Objectives](#-overview--objectives)
- [User Roles & Permissions](#-user-roles--permissions)
- [Core Features](#-core-features)
  - [1. Google OAuth & Domain Restriction](#1-google-oauth--domain-restriction)
  - [2. Multi-Gym & Dynamic Slot Management](#2-multi-gym--dynamic-slot-management)
  - [3. Slot Registration & Registration Windows](#3-slot-registration--registration-windows)
  - [4. Change Gym Slot (Student Transfer Requests)](#4-change-gym-slot-student-transfer-requests)
  - [5. Dynamic QR Code Check-In & Scanner](#5-dynamic-qr-code-check-in--scanner)
  - [6. Configurable Absence Monitoring & Lifecycle](#6-configurable-absence-monitoring--lifecycle)
  - [7. Bulk Data Import & Audit Trail](#7-bulk-data-import--audit-trail)
- [System Architecture](#-system-architecture)
- [Workflows & Sequence Diagrams](#-workflows--sequence-diagrams)
  - [Attendance Verification Flow](#attendance-verification-flow)
  - [Slot Transfer Request Flow](#slot-transfer-request-flow)
- [Database Schema (Core Entities)](#-database-schema-core-entities)
- [REST API Specification (`/api/v1`)](#-rest-api-specification-apiv1)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Installation & Setup](#installation--setup)
- [Edge Cases & System Handling](#-edge-cases--system-handling)
- [Development Roadmap](#-development-roadmap)
- [License](#-license)

---

## 📖 Overview & Objectives

Campus gym facilities face high demand across multiple campus locations (e.g., **C. V. Raman**, **Ganga**, **Krishna**, and **Narmada**). In the absence of an automated system:
- High demand leads to rapid slot exhaustion and underutilization by inactive students.
- Paper registers or static cards encourage proxy check-ins.
- Students needing slot adjustments risk forfeiting their active slot before securing another.
- Administrators lack real-time visibility into live occupancy, capacity constraints, and chronic absenteeism.

**GymSlot** addresses these challenges through:
1. **Zero-Proxy QR Attendance:** Daily session QR codes verified server-side against live registrations, slot times, and official records.
2. **Safe Slot Transfers:** Students can apply to switch gym slots without forfeiting their active allocation unless the transfer is approved and completed.
3. **Strict Capacity Enforcement:** Atomic database transactions guarantee no slot ever exceeds its configured capacity ceiling.
4. **Configurable Absence Rules:** Customizable absence measurement policies, warning alerts, and automated capacity reclamation.
5. **Centralized Administration:** Unified portal for bulk CSV student roster imports, schedule adjustments, announcements, and compliance auditing.
6. **Physical Card Exclusion:** Digital-first workflow with no physical utility cards required.

---

## 👥 User Roles & Permissions

| Role | Access & Scope | Key Responsibilities |
| :--- | :--- | :--- |
| **Student** | Student Portal | Signs in via college Google account, views profile, inspects current gym slot, displays QR code for check-in, applies for new/transfer slots, views attendance history, and receives alerts. Cannot alter official identity or attendance. |
| **Gym Staff / Intern** | Staff Scanner Portal | Operates mobile camera QR scanner at gym reception, verifies student photo/identity, logs attendance, executes authorized fallback search by AP number, and views session rosters. Cannot alter allocations or absence policies. |
| **Sports Administrator** | Admin Dashboard | Manages gyms, slot timings, and capacities; schedules registration windows; approves/rejects slot transfer requests; monitors absence risks; handles student imports; conducts attendance audits and exports reports. |
| **System Administrator** | System Config | Manages staff roles, Google OAuth parameters, allowed college domains, system health, and database backups. Follows the principle of least privilege. |

---

## ✨ Core Features

### 1. Google OAuth & Domain Restriction
- **Single Sign-On (SSO):** "Continue with Google" OpenID Connect flow.
- **Institutional Domain Filtering:** Only verified email addresses matching the approved university domain (e.g., `@srmap.edu.in`) or explicit whitelist can access the portal.
- **Identity Matching:** Authenticated Google accounts are matched against the official university student database (`students` table).
- **Backend Enforced RBAC:** Role permissions are strictly verified server-side on every request.

### 2. Multi-Gym & Dynamic Slot Management
- **Configurable Gym Facilities:** Dynamic configuration for **C. V. Raman**, **Ganga**, **Krishna**, **Narmada**, and future facilities without code changes.
- **Slot Capacity & Timings:** Customizable start/end times, student eligibility criteria, and maximum capacity caps.
- **Live Metrics:** Instant calculation of allocated slots, available capacity, and occupancy percentages.

### 3. Slot Registration & Registration Windows
- **Controlled Application Periods:** Administrators open and close registration windows by date range and daily operational hours.
- **Student Slot Discovery:** Real-time search filtered by gym, timing, and available seats.
- **Concurrency Protection:** Lock-isolated transactions ensure that when 1 seat remains, simultaneous applicants do not result in overallocation.

### 4. Change Gym Slot (Student Transfer Requests)
*(Core Feature)*
- **Protected Transfer Workflow:** Students who already hold an allocation can apply for another eligible slot without prematurely forfeiting their active slot.
- **Workflow Options:**
  - **Option A (Admin Approval - Default):** Request is placed in pending state; current allocation stays active until an administrator approves and verifies destination capacity.
  - **Option B (Immediate Transfer):** Atomic database swap immediately reallocates the student and releases the old seat back to the pool.
- **Audit Preservation:** Previous allocations are preserved in history with status transitions (`TRANSFERRED`).

### 5. Dynamic QR Code Check-In & Scanner
- **Dynamic Session Payload:**
  ```json
  {
    "apNumber": "AP21110010123",
    "email": "student@srmap.edu.in",
    "sessionDate": "2026-10-25",
    "gym": "C. V. Raman Gym",
    "slotStart": "16:00",
    "slotEnd": "16:45"
  }
  ```
- **Server-Side Validation:** The scanner does not trust QR data alone. It validates the student's active allocation, assigned gym, slot timing, and session date against backend records.
- **Anti-Proxy Identity Screen:** Scanner displays the student's official photo and registration details for physical desk verification.
- **Duplicate Prevention:** Attempts to scan multiple times during the same scheduled session are rejected with `ALREADY_CHECKED_IN`.
- **Manual Fallback:** Authorized staff can perform search check-ins by AP number if camera scanning fails, with full audit trail logging.

### 6. Configurable Absence Monitoring & Lifecycle
- **Customizable Policies:** The Sports Department configures absence frequency requirements, warning thresholds, and termination triggers.
- **Scheduled Automated Audits:** Background cron workers evaluate attendance, generate absence warnings, and flag termination candidates.
- **Capacity Reclamation:** Terminated allocations automatically release capacity back to the available pool.
- **Exemptions & Corrections:** Administrative overrides for medical leaves, university sports events, or campus closures.

### 7. Bulk Data Import & Audit Trail
- **CSV / Excel Roster Import:** Bulk upload for student rosters and master allocations with column validation, error preview, and confirmation gates.
- **Immutable Audit Logging:** Every allocation change, manual attendance correction, capacity edit, and policy adjustment is logged with actor ID, timestamp, and before/after state.

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph Clients ["Client Layer"]
        StudentApp["📱 Student Portal<br/>(Dashboard, Slot Transfer, QR Code)"]
        StaffApp["📷 Staff Scanner<br/>(Camera Scanner, Photo Verification)"]
        AdminApp["💻 Sports Admin Portal<br/>(Allocations, Approvals, Reports)"]
    end

    subgraph AuthLayer ["Authentication & Gateway"]
        GoogleOAuth["🔐 Google OAuth 2.0 / OIDC<br/>(@srmap.edu.in Domain Enforcement)"]
        APIGateway["🛡️ Express / Fastify API Gateway<br/>(JWT / Session Auth + RBAC Middleware)"]
    end

    subgraph ServiceLayer ["Core Application Services"]
        SlotSvc["🎯 Slot & Capacity Service<br/>(Atomic Allocation Engine)"]
        TransferSvc["🔄 Transfer Request Service<br/>(Approval & Swap Logic)"]
        QRSvc["📲 QR & Verification Engine<br/>(Payload Generator & Validator)"]
        AttendanceSvc["⏱️ Attendance Service<br/>(Duplicate Guard & Manual Check-in)"]
        AbsenceSvc["📉 Absence Policy Engine<br/>(Audit Workers & Retention Rules)"]
        ImportSvc["📁 CSV / Excel Import Engine<br/>(Validation & Pre-commit Preview)"]
    end

    subgraph DataLayer ["Data & Storage Layer"]
        Postgres[("🐘 PostgreSQL Relational DB<br/>(ACID Transactions, Foreign Keys)")]
        RedisCache[("⚡ Redis Cache<br/>(Session Store & Lock Coordinator)")]
    end

    StudentApp -->|Google Sign-In| GoogleOAuth
    StaffApp -->|Google Sign-In| GoogleOAuth
    AdminApp -->|Google Sign-In| GoogleOAuth
    GoogleOAuth --> APIGateway

    StudentApp -->|REST API v1| APIGateway
    StaffApp -->|REST API v1| APIGateway
    AdminApp -->|REST API v1| APIGateway

    APIGateway --> SlotSvc
    APIGateway --> TransferSvc
    APIGateway --> QRSvc
    APIGateway --> AttendanceSvc
    APIGateway --> AbsenceSvc
    APIGateway --> ImportSvc

    SlotSvc --> Postgres
    TransferSvc --> Postgres
    AttendanceSvc --> Postgres
    AbsenceSvc --> Postgres
    ImportSvc --> Postgres

    SlotSvc -.-> RedisCache
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

    Student->>Student: Open GymSlot & Generate Dynamic QR
    Student->>Staff: Present QR at Gym Desk
    Staff->>Client: Scan QR with In-App Camera
    Client->>Server: POST /api/v1/staff/attendance/scan (Payload)
    
    Server->>DB: Query Student, Active Allocation & Scheduled Session
    alt Student Not Found / Invalid Domain
        Server-->>Client: 400 Bad Request (STUDENT_NOT_FOUND)
    else Wrong Gym or Slot Timing
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

The database schema is designed for PostgreSQL with ACID guarantees and complete referential integrity.

```mermaid
erDiagram
    users ||--o{ students : "profile"
    students ||--o{ allocations : "has"
    gyms ||--o{ gym_slots : "contains"
    gym_slots ||--o{ allocations : "allocated_to"
    gym_slots ||--o{ attendance_sessions : "schedules"
    attendance_sessions ||--o{ attendance : "records"
    students ||--o{ attendance : "logs"
    allocations ||--o{ slot_change_requests : "current"
    gym_slots ||--o{ slot_change_requests : "requested"
    students ||--o{ applications : "applies"
    users ||--o{ audit_logs : "performed_by"

    users {
        uuid id PK
        string email UK
        enum role "STUDENT, GYM_STAFF, SPORTS_ADMIN, SYSTEM_ADMIN"
        boolean is_active
        timestamp created_at
    }

    students {
        uuid id PK
        uuid user_id FK
        string ap_number UK
        string full_name
        string department
        int academic_year
        string photo_url
        boolean is_eligible
    }

    gyms {
        uuid id PK
        string name "C. V. Raman, Ganga, etc."
        string location
        string eligibility_group
        boolean is_active
    }

    gym_slots {
        uuid id PK
        uuid gym_id FK
        time start_time
        time end_time
        int capacity
        boolean is_active
    }

    allocations {
        uuid id PK
        uuid student_id FK
        uuid slot_id FK
        enum status "ACTIVE, TRANSFERRED, TERMINATED, EXPIRED"
        timestamp start_date
        timestamp end_date
    }

    slot_change_requests {
        uuid id PK
        uuid student_id FK
        uuid current_allocation_id FK
        uuid requested_slot_id FK
        enum status "PENDING, APPROVED, REJECTED, WITHDRAWN"
        string reason
        uuid reviewed_by FK
        timestamp reviewed_at
    }

    attendance_sessions {
        uuid id PK
        uuid slot_id FK
        date session_date
        boolean is_cancelled
    }

    attendance {
        uuid id PK
        uuid student_id FK
        uuid session_id FK
        timestamp check_in_time
        enum method "QR_SCAN, MANUAL_FALLBACK"
        uuid staff_id FK
    }

    audit_logs {
        uuid id PK
        uuid actor_id FK
        string action
        string target_type
        uuid target_id
        jsonb before_state
        jsonb after_state
        timestamp created_at
    }
```

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
| `GET` | `/api/v1/student/qr-code` | Returns current dynamic session QR payload | Student |
| `GET` | `/api/v1/student/attendance` | Full attendance history logs | Student |
| `GET` | `/api/v1/student/attendance/stats` | Weekly frequency, streaks, and absence warnings | Student |
| `GET` | `/api/v1/student/available-slots` | Eligible available gym slots with remaining seats | Student |
| `POST` | `/api/v1/student/applications` | Submit application for a new slot | Student |
| `POST` | `/api/v1/student/slot-change-requests` | Submit request to switch gym slot | Student |
| `GET` | `/api/v1/student/slot-change-requests` | Check status of pending/past transfer requests | Student |
| `GET` | `/api/v1/student/notifications` | View in-app notifications | Student |

### 3. Staff Scanner (`/staff`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/staff/attendance/scan` | Validates QR payload and marks attendance | Staff / Admin |
| `POST` | `/api/v1/staff/attendance/manual-check-in` | Manual check-in by AP number with audit | Staff / Admin |
| `GET` | `/api/v1/staff/sessions` | Fetch scheduled sessions for assigned gym | Staff / Admin |
| `GET` | `/api/v1/staff/attendance` | Live attendance list for active slot session | Staff / Admin |

### 4. Sports Administrator (`/admin`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET/POST`| `/api/v1/admin/gyms` | List & configure gyms | Sports Admin |
| `GET/POST`| `/api/v1/admin/slots` | List & configure slot timings and capacities | Sports Admin |
| `GET/POST`| `/api/v1/admin/registration-windows` | Manage registration open/close windows | Sports Admin |
| `GET/PUT` | `/api/v1/admin/slot-change-requests` | Review, approve, or reject student transfer requests | Sports Admin |
| `GET/POST`| `/api/v1/admin/allocations` | Manual allocation, transfer, or termination | Sports Admin |
| `GET/PUT` | `/api/v1/admin/attendance` | Inspect and correct attendance records | Sports Admin |
| `GET/POST`| `/api/v1/admin/absence-monitor` | Review at-risk students & process terminations | Sports Admin |
| `POST` | `/api/v1/admin/imports` | Bulk upload CSV/Excel student rosters with preview | Sports Admin |
| `GET` | `/api/v1/admin/reports` | Export CSV/Excel analytics and compliance reports | Sports Admin |
| `GET` | `/api/v1/admin/audit-logs` | Query append-only audit trail | Sports Admin |

---

## 💻 Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React / Next.js / Vite | Highly responsive UI with fast client-side routing |
| **Styling** | Vanilla CSS / Tailored CSS Variables | Sleek, modern dark/light themes with zero bloated runtime |
| **Backend API** | Node.js (Express / Fastify) | High-performance asynchronous API endpoints |
| **Database** | PostgreSQL | ACID compliance, strict foreign key constraints, and transactional consistency |
| **ORM / Query** | Prisma / Drizzle | Type-safe migrations and schema management |
| **Authentication** | Google OAuth 2.0 / Passport.js / NextAuth | University Google Workspace domain restriction (`srmap.edu.in`) |
| **QR Engine** | `qrcode.react` & `html5-qrcode` | Vector QR rendering and fast in-browser camera scanning |
| **Task Scheduler**| Node-Cron / BullMQ | Scheduled jobs for absence monitoring and session pre-generation |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.x or v20.x LTS)
- **PostgreSQL** (v14 or higher)
- **Google Cloud Console Project** with OAuth 2.0 credentials enabled for Web Applications.

### Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
API_PREFIX=/api/v1
CLIENT_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/gymslot_db?schema=public"

# Google OAuth 2.0
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:5000/api/v1/auth/google/callback"
ALLOWED_EMAIL_DOMAINS="srmap.edu.in"

# Session & JWT
JWT_SECRET="super-secret-jwt-signing-key"
SESSION_SECRET="super-secret-session-key"

# Timezone
TZ="Asia/Kolkata"
```

### Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/krishhh1089/Gym-allocation.git
   cd Gym-allocation
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run Database Migrations**
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Seed Initial Gyms & Admin (Optional)**
   ```bash
   npm run seed
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

---

## 🛡️ Edge Cases & System Handling

| Scenario | System Behavior |
| :--- | :--- |
| **Student applies for transfer while one is pending** | Submission blocked; system informs student of active pending request. |
| **Target slot fills up before transfer approval** | Approval transaction fails safely; administrator is notified of zero seats and student allocation remains intact. |
| **Simultaneous applicants for 1 remaining seat** | Relational serializable isolation assigns seat to first commit; second receives clean "Slot Full" notification. |
| **QR code scanned for wrong gym or time** | Scanner rejects with `WRONG_GYM_OR_SLOT`, highlighting student's actual assigned gym & slot. |
| **Duplicate check-in attempts** | Scanner rejects with `ALREADY_CHECKED_IN` displaying exact earlier check-in timestamp. |
| **Camera permission denied on staff device** | Staff seamlessly switches to authorized manual AP Number search with audit logging. |
| **Gym closed or campus holiday declared** | Session marked `CANCELLED`; absence evaluator exempts that date from attendance calculations. |

---

## 🗺️ Development Roadmap

- [x] **Product Requirements Document v2.0** (`REQUIREMENTS.md`)
- [ ] **Phase 1: Foundation & Auth**
  - [ ] PostgreSQL Schema & Migrations
  - [ ] Google OAuth 2.0 with `@srmap.edu.in` domain validation
  - [ ] RBAC Middleware (Student, Staff, Sports Admin, System Admin)
- [ ] **Phase 2: Student Portal & Transfer Requests**
  - [ ] Student dashboard & available slot search
  - [ ] Registration window enforcement
  - [ ] Change Gym Slot transfer request engine (Option A & B)
- [ ] **Phase 3: QR Attendance & Desk Scanner**
  - [ ] Dynamic QR payload generation
  - [ ] Mobile camera scanner integration (`html5-qrcode`)
  - [ ] Server-side validation & duplicate prevention
  - [ ] Manual fallback by AP number
- [ ] **Phase 4: Absence Monitoring & Retention**
  - [ ] Configurable absence policy engine
  - [ ] Idempotent cron jobs for warning & termination
  - [ ] Automatic capacity reclamation
- [ ] **Phase 5: Administration & Pilot**
  - [ ] Bulk CSV roster import with pre-commit preview
  - [ ] Sports admin analytics & CSV/Excel export
  - [ ] Audit logs and in-app notifications
  - [ ] SRM University-AP Sports Department pilot deployment

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
