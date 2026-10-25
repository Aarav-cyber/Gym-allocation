# Gym Management System — System Architecture

**Version:** 1.0  
**Architecture:** Microservices + REST APIs + Background Jobs

---

# 1. Architecture Overview

The Gym Management System shall use a microservices architecture.

Primary technologies:

- Frontend: React / Next.js
- Backend: Python + FastAPI
- Database: PostgreSQL
- Service Communication: REST APIs
- Background Processing: Python Background Workers / Job Scheduler
- Cache: Redis
- Containers: Docker
- Object Storage: S3-compatible storage
- Excel Processing: openpyxl + pandas

---

# 2. High-Level Architecture

```text
                         ┌─────────────────────┐
                         │      Frontend       │
                         │                     │
                         │ Student / Trainer / │
                         │ Admin Portal        │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     API Gateway     │
                         └──────────┬──────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Identity        │       │ Student         │       │ Slot            │
│ Service         │       │ Service         │       │ Service         │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │
                                   │ REST APIs
                                   ▼
                         ┌─────────────────────┐
                         │     PostgreSQL      │
                         │                     │
                         │ Source of Truth     │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │  Background Worker  │
                         │    / Scheduler      │
                         └──────────┬──────────┘
                                    │
               ┌────────────────────┼────────────────────┐
               │                    │                    │
               ▼                    ▼                    ▼
       ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
       │ Notification  │    │ Allocation /  │    │ Excel / Report│
       │ Jobs          │    │ Waitlist Jobs │    │ Jobs          │
       └───────────────┘    └───────────────┘    └───────────────┘
                                    │
               ┌────────────────────┼────────────────────┐
               │                    │                    │
               ▼                    ▼                    ▼
       ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
       │ Attendance    │    │ Complaint     │    │ Report        │
       │ Service       │    │ Service       │    │ Service       │
       └───────────────┘    └───────────────┘    └───────────────┘
```

---

# 3. Service Communication

Services shall communicate primarily through authenticated REST APIs.

Examples:

```text
Frontend
   │
   ▼
API Gateway
   │
   ├──► Identity Service
   │
   ├──► Student Service
   │
   ├──► Slot Service
   │
   ├──► Allocation Service
   │
   ├──► Attendance Service
   │
   ├──► Notification Service
   │
   ├──► Complaint Service
   │
   └──► Report Service
```

REST APIs shall be used for operations that require an immediate response.

Examples:

- Student registration
- Student profile retrieval
- Slot creation
- Slot application
- Waiting-list registration
- Allocation lookup
- Attendance recording
- QR verification
- Complaint submission
- Admin operations

---

# 4. Background Processing

Long-running or non-immediate operations shall be handled by background workers.

The background worker shall process jobs such as:

- Sending email notifications
- Sending in-app notifications
- Checking consecutive absences
- Cancelling allocations after four consecutive unexcused absences
- Promoting students from the waiting list
- Processing Excel imports
- Generating weekly reports
- Generating exports
- Performing scheduled maintenance tasks

Background jobs shall be persisted so that failed jobs can be retried safely.

Example:

```text
Database
   │
   ▼
background_jobs
   │
   ▼
Background Worker
   │
   ├──► Process Job
   │
   ├──► Retry on Failure
   │
   └──► Mark Completed
```

---

# 5. Allocation and Waiting List Processing

Allocation operations require strong database consistency.

The Allocation Service shall use PostgreSQL transactions to prevent over-allocation.

Example:

```text
Student applies for slot
          │
          ▼
Allocation Service
          │
          ▼
Begin PostgreSQL Transaction
          │
          ▼
Lock Slot Row
          │
          ▼
Check Available Capacity
       /        \
      /          \
 Available       Full
    │              │
    ▼              ▼
Create           Add to
Allocation       Waiting List
    │              │
    └──────┬───────┘
           ▼
      Commit Transaction
```

The waiting list shall use the server-generated application timestamp to maintain strict FCFS ordering.

---

# 6. Automatic Reallocation

When an active allocation is cancelled because of four consecutive unexcused absences, a background job shall process the reallocation.

```text
Attendance Records
        │
        ▼
Background Scheduler
        │
        ▼
Check Consecutive Absences
        │
        ▼
4 Consecutive Unexcused Absences?
        │
       YES
        │
        ▼
Cancel Allocation
        │
        ▼
Find Oldest Eligible
Waiting Student
        │
        ▼
Create New Allocation
        │
        ▼
Send Notifications
```

The reallocation operation shall use a database transaction to ensure that two workers cannot allocate the same available seat simultaneously.

---

# 7. Database Architecture

PostgreSQL shall be the primary source of truth.

Each service shall logically own the data associated with its responsibilities.

The system shall prioritize transactional consistency for operations involving:

- Slot capacity
- Active allocations
- Waiting-list ordering
- Attendance records
- Allocation cancellation
- Automatic reallocation

Redis may be used for:

- Caching
- Temporary data
- Rate limiting
- Distributed locks where required

Redis shall not replace PostgreSQL as the authoritative source of business data.

---

# 8. API Gateway

The API Gateway shall provide a single entry point for frontend applications.

Responsibilities include:

- Authentication
- Authorization
- Request routing
- Rate limiting
- Request validation
- API versioning
- CORS handling
- Request logging
- Correlation/request IDs

Example:

```text
                    Frontend
                       │
                       ▼
                ┌──────────────┐
                │ API Gateway  │
                └──────┬───────┘
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
   Student           Slot          Allocation
   Service          Service          Service
```

---

# 9. Authentication and Authorization

The Identity Service shall manage:

- User accounts
- Password authentication
- Roles
- Access permissions
- Session/token management
- Staff account management

Supported roles:

```text
STUDENT
TRAINER
ADMIN
SUPER_ADMIN
```

Authorization shall be enforced at the API level.

Sensitive administrative operations shall require appropriate role permissions.

---

# 10. Notification Architecture

Notifications shall be processed asynchronously through background jobs.

Example:

```text
Business Operation
       │
       ▼
Create Notification Job
       │
       ▼
Background Worker
       │
       ├──► In-App Notification
       │
       └──► Email Notification
```

Notification processing shall support safe retries.

A notification job shall not result in duplicate notifications when the same job is retried.

---

# 11. Excel Import Architecture

Excel files shall be uploaded through the appropriate API.

```text
Admin
  │
  ▼
Upload Excel File
  │
  ▼
API
  │
  ▼
Store File
  │
  ▼
Create Import Job
  │
  ▼
Background Worker
  │
  ├──► Validate File
  ├──► Validate Rows
  ├──► Process Valid Records
  ├──► Record Errors
  └──► Mark Import Complete
```

The database shall remain the live source of truth after the import.

Excel files shall not be treated as the authoritative source for current slot or allocation state.

---

# 12. Reporting Architecture

Reports shall be generated by the Report Service.

For large reports, generation shall happen through a background job.

```text
Admin Requests Report
        │
        ▼
Report API
        │
        ▼
Create Report Job
        │
        ▼
Background Worker
        │
        ▼
Query PostgreSQL
        │
        ▼
Generate Excel / CSV
        │
        ▼
Store Generated File
        │
        ▼
Notify Admin
```

---

# 13. Complaint Service

The Complaint Service shall manage:

- Complaint creation
- Complaint status
- Assignment
- Admin responses
- Resolution
- Complaint history

Typical flow:

```text
Student
   │
   ▼
Submit Complaint
   │
   ▼
Complaint Service
   │
   ▼
PostgreSQL
   │
   ▼
Background Notification Job
   │
   ▼
Admin Notification
```

---

# 14. Attendance Architecture

Attendance shall support both QR-based and manual recording.

```text
                 ┌───────────────┐
                 │ Trainer Portal│
                 └───────┬───────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
          Scan QR              Manual Entry
              │                     │
              └──────────┬──────────┘
                         ▼
                 Attendance API
                         │
                         ▼
                  Attendance DB
                         │
                         ▼
                 Allocation Status
```

Attendance records shall be validated against:

- Student identity
- Allocation
- Slot
- Scheduled session
- Attendance date/time
- Trainer authorization

---

# 15. QR Verification Architecture

QR codes shall contain opaque, short-lived, revocable tokens.

Verification flow:

```text
Trainer
   │
   ▼
Scan Student QR
   │
   ▼
Attendance API
   │
   ▼
Validate Token
   │
   ▼
Verify Allocation
   │
   ▼
Retrieve Minimum Identity Data
   │
   ▼
Display Approved Student Photo
   │
   ▼
Record Attendance
```

The QR token shall not expose sensitive student information directly.

---

# 16. Service Failure Handling

Services shall handle failures explicitly.

For synchronous REST calls:

- Apply request timeouts
- Return appropriate HTTP errors
- Retry only safe/idempotent operations where appropriate
- Use correlation IDs for tracing
- Log failures

For background jobs:

- Persist job state
- Retry failed jobs
- Limit retry attempts
- Record failure information
- Prevent duplicate processing where possible
- Allow failed jobs to be investigated or reprocessed

---

# 17. Observability

The system shall provide:

- Structured application logs
- Request/correlation IDs
- API latency metrics
- Error metrics
- Background job metrics
- Database performance metrics
- Health checks
- Service readiness checks

Each service shall expose a health endpoint.

Example:

```text
GET /health
```

---

# 18. Container Architecture

All backend services shall run as Docker containers.

Example:

```text
Docker Compose / Container Platform

├── api-gateway
├── identity-service
├── student-service
├── slot-service
├── allocation-service
├── attendance-service
├── notification-service
├── complaint-service
├── report-service
├── background-worker
├── scheduler
├── postgres
├── redis
└── frontend
```

---

# 19. Deployment Architecture

The initial deployment may use Docker Compose for development and small deployments.

For larger deployments, services may be deployed independently using a container orchestration platform.

```text
                    Internet
                       │
                       ▼
                Load Balancer
                       │
                       ▼
                  API Gateway
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
    Services       Services       Services
        │              │              │
        └──────────────┼──────────────┘
                       ▼
                   PostgreSQL
                       │
                       ▼
                     Redis
```

---

# 20. Architectural Principles

The system shall follow these principles:

1. PostgreSQL is the authoritative source of business data.
2. Services communicate through authenticated REST APIs.
3. Background workers handle asynchronous and scheduled operations.
4. Business-critical operations use database transactions.
5. Slot capacity shall always be enforced transactionally.
6. FCFS waiting-list ordering shall use server-generated timestamps.
7. Background jobs shall be retryable and idempotent where possible.
8. Redis is optional and shall not replace PostgreSQL.
9. APIs shall be versioned.
10. All sensitive operations shall be authenticated and authorized.
11. Audit logs shall be maintained for important administrative actions.
12. Services shall expose health and readiness checks.
13. Long-running operations shall not block synchronous API requests.
14. The architecture shall remain simple enough to operate without a dedicated event-streaming platform.
