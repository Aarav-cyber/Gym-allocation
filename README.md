# 🏋️ Gym Allocation & Attendance Portal

A secure, role-based web portal designed for college campuses to manage gym allocations, track student attendance, prevent proxy check-ins using dynamic QR codes, and automate slot retention based on weekly attendance frequency.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
  - [Student Portal](#1-student-portal)
  - [Admin & Staff Portal](#2-admin--staff-portal)
  - [Anti-Proxy Verification System](#3-anti-proxy-qr-verification)
  - [Slot Retention & Inactivity Policy](#4-slot-retention--inactivity-policy)
- [How It Works (Workflow)](#-how-it-works-workflow)
- [System Architecture](#-system-architecture)
- [Recommended Tech Stack](#-recommended-tech-stack)
- [Database Schema (Core Entities)](#-database-schema-core-entities)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation & Setup](#installation--setup)
- [API Overview](#-api-overview)
- [Roadmap](#-roadmap)
- [Contributing & License](#-contributing--license)

---

## 📖 Overview

Colleges often face high demand for campus gym facilities with limited capacity. Without a strict attendance mechanism, allotted gym slots go underutilized while students on waitlists are turned away. Traditional manual registers or static sign-ins are susceptible to proxy attendance and lack actionable insights.

The **Gym Allocation & Attendance Portal** solves this by:
1. Restricting access strictly to verified institutional email addresses.
2. Generating dynamic, single-use or time-stamped QR codes on student devices.
3. Requiring on-desk admin verification via scanner to eliminate proxy check-ins.
4. Monitoring weekly workout frequency and automatically revoking slots for inactive students (e.g., absent for 4 consecutive weeks), reallocating slots to active candidates.

---

## ✨ Key Features

### 1. Student Portal
- **Campus SSO / Email Authentication**: Login restricted exclusively to official college domain email addresses (e.g., `@college.edu`).
- **Dynamic Attendance QR Code**: Real-time QR generation containing:
  - Student AP / Registration Number
  - Official College Email
  - Date & rotating timestamp / verification token (to prevent screenshots/forwarding).
- **Weekly Frequency Dashboard**: Visual tracker showing weekly attendance count, streaks, and minimum required visits.
- **Slot Status & Notifications**: Displays current membership status (Active, Inactive, At Risk of Revocation).

### 2. Admin & Staff Portal
- **Master Slot Roster**: Live dashboard showing all students with active gym allocations, remaining capacity, and waitlist.
- **Fast QR Scanner**: In-app camera scanner for check-in desk staff to scan student QR codes in seconds.
- **Instant Attendance Logging**: Real-time validation and attendance recording with audit timestamps.
- **Inactivity & Retention Reports**: Automated reports highlighting students failing to meet attendance requirements.

### 3. Anti-Proxy QR Verification
- Attendance cannot be marked remotely or by sharing static screenshots.
- The student's portal generates a payload containing:
  ```json
  {
    "ap_number": "AP21110010123",
    "email": "student@college.edu",
    "date": "2026-10-25",
    "timestamp": 1761388800,
    "signature": "hmac_sha256_hash"
  }
  ```
- Admin scans the QR code at the gym entrance; the server verifies the signature, student slot validity, and updates the daily record.

### 4. Slot Retention & Inactivity Policy
- **Minimum Frequency**: Students must maintain regular weekly workout sessions.
- **Automatic Revocation Rule**: If a student is consecutively absent for **4 weeks in a row**, their gym slot is automatically marked as **Terminated/Revoked**.
- **Slot Recirculation**: Revoked slots are released back to the general pool or allocated to waitlisted students.

---

## 🔄 How It Works (Workflow)

```mermaid
sequenceDiagram
    autonumber
    actor Student
    actor Admin
    participant App as Web Portal
    participant Server as Backend API & DB

    Student->>App: Login via College Email (@college.edu)
    App-->>Student: Display Dashboard & Dynamic QR Code
    Note over Student,App: QR contains AP No, Email, Date & Token

    Student->>Admin: Present QR code at Gym Entrance
    Admin->>App: Scan QR with Admin Scanner
    App->>Server: POST /api/attendance/scan (Payload + Hash)
    Server->>Server: Verify Active Slot & Prevent Duplicate Check-in
    Server-->>App: Attendance Logged Successfully
    App-->>Admin: Show Confirmation (Student Name & Photo)

    Note over Server: Nightly Cron Job Checks Weekly Frequency
    Server->>Server: If absent for 4 consecutive weeks -> Terminate Slot
```

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Layer"]
        S_UI["Student Web App<br/>(Dashboard & Dynamic QR)"]
        A_UI["Admin Web App<br/>(Scanner & Slot Roster)"]
    end

    subgraph Auth ["Authentication"]
        OAuth["College Google Workspace / SSO<br/>(Domain Validation: @college.edu)"]
    end

    subgraph Backend ["Backend API Service"]
        API["REST / GraphQL API"]
        QR_Engine["QR Verification & Hash Engine"]
        Attendance_Svc["Attendance Tracker"]
        Cron["Weekly Policy Evaluator<br/>(Cron Job for 4-Week Inactivity)"]
    end

    subgraph Storage ["Database Layer"]
        DB[("PostgreSQL / MongoDB")]
    end

    S_UI -->|Authenticate| OAuth
    A_UI -->|Authenticate| OAuth
    OAuth -->|Token / Session| API

    S_UI -->|Request QR / View Stats| API
    A_UI -->|Send Scanned QR Payload| API

    API --> QR_Engine
    API --> Attendance_Svc
    Cron --> Attendance_Svc
    Attendance_Svc --> DB
```

---

## 💻 Recommended Tech Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React / Next.js / Vite | Fast, responsive UI with support for camera scanner and SVG QR generation |
| **Styling** | Vanilla CSS / Tailwind CSS | Clean, modern dashboard interface |
| **Backend** | Node.js (Express / NestJS) or Python (FastAPI) | High-performance API endpoints for scanning and cron workers |
| **Database** | PostgreSQL / Prisma ORM | Relational integrity for students, slots, and timestamped attendance logs |
| **Authentication**| NextAuth / Passport.js / Google OAuth 2.0 | Enforces college domain restriction (`hd=college.edu`) |
| **QR Code Engine**| `qrcode.react` & `html5-qrcode` | Client-side QR rendering and browser-based camera scanning |
| **Job Scheduler** | Node-Cron / BullMQ / Celery | Scheduled weekly evaluations for inactivity checks and slot terminations |

---

## 🗄️ Database Schema (Core Entities)

### 1. `users`
- `id`: UUID (Primary Key)
- `email`: String (Unique, restricted to college domain)
- `ap_number`: String (Unique student ID)
- `name`: String
- `role`: Enum (`STUDENT`, `ADMIN`, `GYM_STAFF`)
- `created_at`: Timestamp

### 2. `gym_slots`
- `id`: UUID (Primary Key)
- `user_id`: Foreign Key (`users.id`)
- `slot_timing`: String (e.g., `"06:00 - 07:00 AM"`)
- `status`: Enum (`ACTIVE`, `WARNING`, `TERMINATED`)
- `allocated_at`: Timestamp
- `terminated_at`: Timestamp (Nullable)
- `termination_reason`: String (Nullable)

### 3. `attendance_logs`
- `id`: UUID (Primary Key)
- `student_id`: Foreign Key (`users.id`)
- `check_in_time`: Timestamp
- `verified_by`: Foreign Key (`users.id` - Admin/Staff)
- `date`: Date (Unique per student per day)

### 4. `weekly_summaries`
- `id`: UUID (Primary Key)
- `student_id`: Foreign Key (`users.id`)
- `week_number`: Integer
- `year`: Integer
- `days_attended`: Integer
- `is_absent`: Boolean

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.x or later)
- PostgreSQL or MongoDB instance
- Google Cloud Console Project (for College Domain Google OAuth)

### Environment Variables
Create a `.env` file in the root directory:

```env
# Application
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/gym_allocation"

# Auth / Google OAuth (Restricted Domain)
ALLOWED_EMAIL_DOMAIN="college.edu"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
JWT_SECRET="your-secure-jwt-secret"

# Anti-Proxy QR Secret
QR_SIGNING_SECRET="secure-qr-hmac-secret"
QR_EXPIRY_SECONDS=60
```

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/krishhh1089/Gym-allocation.git
   cd Gym-allocation
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Database & Migrations**
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

---

## 📡 API Overview

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/google` | Public | Authenticates student/admin with college email |
| `GET` | `/api/student/dashboard` | Student | Fetches weekly frequency, slot status, and profile |
| `GET` | `/api/student/qr` | Student | Generates signed, time-validated QR payload |
| `GET` | `/api/admin/slots` | Admin | Fetches list of allocated gym slots & status |
| `POST` | `/api/admin/scan` | Admin | Validates scanned QR and records attendance |
| `POST` | `/api/cron/evaluate-inactivity` | System/Cron | Runs weekly audit; revokes slots inactive for 4 consecutive weeks |

---

## 🗺️ Roadmap

- [ ] Dynamic QR code refresh every 30 seconds to block forwarded screenshots.
- [ ] Email warning alerts sent after 2 and 3 consecutive weeks of absence.
- [ ] Automated waitlist promotion upon slot termination.
- [ ] Peak-hour gym occupancy graphs & analytics for administrators.
- [ ] Offline scanning queue sync for spotty gym basement network coverage.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
