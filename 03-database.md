# Gym Management System — Database Architecture

**Version:** 1.0  
**Database:** PostgreSQL  
**Architecture:** Database-per-Service

**Status:** Logical design; implementation and event-transport choices remain pending

---

# 1. Database Overview

The Gym Management System shall use **PostgreSQL** as the primary source of truth for persistent business data. The schema below is a logical design aligned with the product requirements; it is not a single shared schema or an implemented migration.

Each microservice shall own its own database and migrations.

Services shall **not directly access another service's database**.

The architecture specifies REST APIs for synchronous operations and durable asynchronous processing for background work and domain events. The event broker is not yet selected. Redis, if introduced, may support caching or rate limiting but shall not be the authoritative store for business records.

```text
┌──────────────────────────────────────────────────────────────┐
│                    PostgreSQL Infrastructure                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Identity DB        → Identity Service                       │
│  Student DB         → Student / profile service               │
│  Slot DB            → Gym / slot service                      │
│  Allocation DB      → Application / allocation service        │
│  Attendance DB      → Attendance service                      │
│  Notification DB    → Notification service                    │
│  Complaint DB       → Complaint service                       │
│  Report DB          → Reporting / audit service                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Each service is responsible for:

- Its database schema
- Its tables
- Its migrations
- Its repositories
- Its transactions
- Its data lifecycle

---

# 2. Database-per-Service

Each service owns its own persistent data.

```text
Identity Service
      │
      ▼
Identity Database


Student Service
      │
      ▼
Student Database


Slot Service
      │
      ▼
Slot Database


Allocation Service
      │
      ▼
Allocation Database
```

A service must never execute SQL directly against another service's database.

For example:

```text
❌ Student Service
       ↓
   Allocation DB
```

Instead:

```text
✅ Student Service
       ↓
  Authenticated API or durable domain event
       ↓
Allocation Service
       ↓
Allocation DB
```

or, when synchronous communication is required:

```text
Student Service
       │
       │ HTTP/API
       ▼
Allocation Service
       │
       ▼
Allocation DB
```

---

# 3. Database Ownership

The following table defines the primary ownership boundaries.

| Service | Database | Responsibility |
|---|---|---|
| Identity Service | identity_db | Provisioned identities, verified external login identities, roles and sessions |
| Student Service | student_db | Student identity details, eligibility, private photo references and photo-review history |
| Slot Service | slot_db | Gym facilities, slot definitions, recurrence schedules and slot-import history |
| Allocation Service | allocation_db | Registration windows, applications, FCFS waitlists (via applications.status), capacity projection, allocations and transfer requests |
| Attendance Service | attendance_db | Scheduled sessions, check-ins, attendance corrections, QR-token hashes and absence-policy records |
| Notification Service | notification_db | In-app/email notification delivery, announcements and durable notification jobs |
| Complaint Service | complaint_db | Formal complaints, complaint comments, and in-app student support requests |
| Report / Audit Service | report_db | Report metadata/jobs and centralized audit projections |

Import records belong to the service that owns the imported domain data (for example, slots to Slot Service and student records to Student Service). Services may keep their own operational audit records; the Report / Audit Service may consume those records/events for centralized search and reporting. Private photos and generated exports are stored in private object storage; PostgreSQL stores references and metadata, not file contents.

---

# 4. Identity Database

The Identity Service owns provisioned accounts and authentication/authorization data. A student account is provisioned by authorized staff before Google sign-in; successful sign-in must match the provisioned account and satisfy the institutional email policy. Store the identity provider's stable subject identifier and verification state. Do not store Google passwords or assume local password authentication.

### Primary tables

```text
users
external_identities
roles
user_roles
auth_sessions
```

### Users

```text
users
-------------------------
id
email
email_verified_at
status
created_at
updated_at
```

`email` is normalized before comparison and uniquely constrained (for example, with a unique index on `lower(email)`). `status` supports account activation, suspension and deactivation. `external_identities` stores the provider name and provider subject (`sub`) with a unique constraint on `(provider, provider_subject)` and a reference to the local user. Domain allow-list checks are an authentication policy and must not be inferred solely from an unverified email.

### Roles and assignments

```text
roles
-------------------------
id
name                 -- STUDENT, TRAINER, ADMIN, SUPER_ADMIN
created_at
```

```text
user_roles
-------------------------
user_id
role_id
assigned_by
assigned_at
UNIQUE (user_id, role_id)
```

```text
auth_sessions
-------------------------
id
user_id
session_token_hash
expires_at
revoked_at
created_at
```

Possible roles:

```text
STUDENT
TRAINER
ADMIN
SUPER_ADMIN
```

The Identity Service owns these records. Do not put student profile or allocation data in this database.

Other services should not directly query the Identity database.

---

# 5. Student Database

The Student Service owns student information.

### Primary tables

```text
students
photo_change_requests
student_imports
student_import_rows
```

### Students

```text
students
-------------------------
id
user_id
ap_number
full_name
department
phone
year_semester
approved_photo_ref
account_status
is_eligible
created_at
updated_at
```

`user_id` is the Identity Service's user ID and is an application-level reference, not a cross-database foreign key. `ap_number` is unique. `approved_photo_ref` points to a private object and changes only after an authorized review decision.

```text
photo_change_requests
-------------------------
id
student_id
requested_photo_ref
status                 -- PENDING, APPROVED, REJECTED
reviewed_by
decision_reason
requested_at
decided_at
```

The initial onboarding photo follows the same review controls as a replacement photo. Keep each request and decision for audit; the prior approved photo remains active until a request is approved. `reviewed_by` is an Identity Service user ID and is not a cross-database foreign key.

Student imports are staged as validated preview rows before confirmation. `student_imports` and `student_import_rows` use the import-job and row-result structure defined for slot imports; they are stored in `student_db`, and the database records the operator, row errors and final outcome.

---

# 6. Slot Database

The Slot Service owns gym schedules and slots.

### Primary tables

```text
gyms
gym_slots
slot_schedules
trainer_gym_assignments
slot_imports
slot_import_rows
```

### Gyms

```text
gyms
-------------------------
id
name
location
eligibility_group
is_active
created_at
updated_at
```

### Gym Slots and Schedules

```text
gym_slots
-------------------------
id
gym_id
capacity
is_active
created_at
updated_at
```

```text
slot_schedules
-------------------------
id
slot_id
day_of_week
start_time
end_time
effective_from
effective_until
created_at
updated_at
```

```text
trainer_gym_assignments
-------------------------
id
trainer_id
gym_id
effective_from
effective_until
created_at
```

The schedule's `slot_id` and `gym_id` are local foreign keys. `trainer_id` is an Identity Service ID and is not a cross-database foreign key. Enforce positive capacity, valid time ranges and non-overlapping schedules for the same gym where applicable. The Slot Service owns configured capacity; the Allocation Service owns occupancy and live availability, which it calculates from its local capacity projection and active allocations. Do not persist a `FULL` status as an independent source of truth.

### Slot Imports

```text
slot_imports
-------------------------
id
uploaded_by
file_ref
status                 -- UPLOADED, VALIDATING, READY, COMPLETED, FAILED
row_count
error_count
created_at
completed_at
```

```text
slot_import_rows
-------------------------
id
import_id
row_number
status
validated_data
errors
created_at
```

`import_id` is a local foreign key. Store row-level validation results so administrators can preview errors before confirmation; retain operator, outcome and timestamps for import history. Store the uploaded workbook in private object storage; the database remains authoritative for live slots.

---

# 7. Allocation Database

The Allocation Service owns applications, waitlist order, allocation lifecycle and transfer decisions. The README requires server-generated application priority, atomic capacity enforcement and safe transfers.

### Primary tables

```text
registration_windows
slot_capacity
applications
allocations
slot_change_requests
allocation_imports
allocation_import_rows
```

`slot_capacity` is a local projection keyed by the Slot Service's slot ID. It contains the latest accepted capacity and source version, but is not a cross-service foreign key. The Allocation Service uses this projection and its local allocation records to enforce capacity transactionally. Slot-capacity changes must be versioned and reconciled; a reduction below current occupancy must not silently over-allocate or discard allocations.

**Waitlist management:** The FCFS waitlist is modeled through `applications.status = 'WAITLISTED'` rather than a separate `waitlist_entries` table. The `applications` table records the server-generated `applied_at_utc` and `priority_sequence` for deterministic FCFS ordering. This avoids duplicating lifecycle state between two tables. A separate `waitlist_entries` table is not required; any future need for a richer queue model should be implemented as a view or additional index over `applications`, not as a parallel table.

### Registration Windows and Applications

```text
registration_windows
-------------------------
id
name
opens_at
closes_at
timezone
daily_open_time
daily_close_time
status
created_by
created_at
updated_at
```

```text
applications
-------------------------
id
student_id
slot_id
registration_window_id
applied_at_utc
priority_sequence
status
created_at
updated_at
```

Application statuses include `PENDING`, `APPROVED`, `REJECTED`, `WAITLISTED`, `OFFERED`, `WITHDRAWN` and `EXPIRED`. The server sets `applied_at_utc` and a deterministic `priority_sequence`; clients cannot supply or alter either value. Order eligible waitlist entries by `(applied_at_utc ASC, priority_sequence ASC)`. Add indexes for the active queue by slot/window and for student application history. Use a unique constraint to prevent duplicate submissions for the same student, slot and registration window where the product rules require one.

Bulk allocation imports are staged in `allocation_imports` and `allocation_import_rows`, using the import-job and row-result structure defined for slot imports. Validate and preview rows before confirmation; commit valid records through the Allocation Service's capacity and eligibility rules, and retain row errors and the final outcome.

### Allocations

```text
allocations
-------------------------
id
student_id
slot_id
status
start_date
end_date
created_at
updated_at
```

`student_id` and `slot_id` are IDs owned by other services and must not have cross-database foreign keys. Enforce at most one active allocation per student with a PostgreSQL partial unique index. Allocation statuses include `ACTIVE`, `TRANSFERRED`, `TERMINATED` and `EXPIRED`.

### Slot Change Requests

```text
slot_change_requests
-------------------------
id
student_id
current_allocation_id
requested_slot_id
status                 -- PENDING, APPROVED, REJECTED, WITHDRAWN
reason
reviewed_by
reviewed_at
created_at
updated_at
```

`current_allocation_id` is a local foreign key. `student_id`, `requested_slot_id` and `reviewed_by` are IDs owned by other services. Permit only one pending transfer request per student. Approval must recheck eligibility and capacity and, in one Allocation DB transaction, mark the old allocation `TRANSFERRED`, create the new `ACTIVE` allocation and mark the request `APPROVED`. On failure, the existing active allocation remains unchanged.

### Capacity and Waitlist Transactions

For application, promotion and transfer operations, serialize competing changes using a row lock on the local `slot_capacity` record (or an equivalent transaction-safe mechanism), then verify active allocation count against the latest accepted capacity before inserting an allocation. Keep the capacity check, allocation mutation, application/request status and corresponding outbox event in one transaction. This is the allocation invariant; a separate read followed by an insert is not sufficient.

---

# 8. Attendance Database

The Attendance Service owns attendance records.

### Primary tables

```text
attendance_sessions
attendance
gym_card_tokens
absence_policies
attendance_exemptions
```

### Sessions and Attendance

```text
attendance_sessions
-------------------------
id
slot_id
session_date
starts_at
ends_at
status                 -- SCHEDULED, COMPLETED, CANCELLED
created_at
updated_at
```

`slot_id` is owned by the Slot Service and has no cross-database foreign key. The session stores the schedule snapshot needed to verify attendance even if a slot schedule later changes.

```text
attendance
-------------------------
id
student_id
allocation_id
session_id
status                 -- PRESENT, ABSENT, LATE, EXCUSED, INVALIDATED
check_in_time
method                 -- QR_SCAN, MANUAL_FALLBACK
staff_id
created_at
updated_at
UNIQUE (student_id, session_id)
```

`student_id`, `allocation_id` and `staff_id` refer to records owned by other services and are application-level references. `session_id` is a local foreign key. The uniqueness constraint prevents duplicate check-ins for the same student/session. Manual fallback and later corrections must record the acting staff member and an audit event.

- `PRESENT` / `LATE` — student physically attended; `LATE` means they arrived after the check-in window opened but before it closed.
- `ABSENT` — session occurred, student did not check in, and no exemption applies.
- `EXCUSED` — student was exempted from this session by an authorized administrator (see `attendance_exemptions`).
- `INVALIDATED` — a previously recorded attendance row was administratively voided after the fact; the original row is retained and an `attendance_corrections` row is added.

### Attendance Corrections

When an administrator corrects or voids an attendance record, the original row is retained and a correction record is appended. Do not delete or silently overwrite attendance rows.

```text
attendance_corrections
-------------------------
id
attendance_id
corrected_by
old_status
new_status
reason
corrected_at
```

`attendance_id` is a local foreign key to the `attendance` table. `corrected_by` is an Identity Service user ID (application-level reference). Every correction must produce an audit event.

### QR Tokens and Absence Rules

```text
gym_card_tokens
-------------------------
id
student_id
allocation_id
session_id
token_hash
expires_at
revoked_at
created_at
```

Generate short-lived opaque tokens; persist only a cryptographic hash, never the reusable plaintext token or student details in the QR payload. Bind the token to its student, current allocation and session, and reject expired, revoked or stale bindings.

```text
absence_policies
-------------------------
id
consecutive_absence_threshold
effective_from
effective_until
is_active
updated_by
created_at
updated_at
```

```text
attendance_exemptions
-------------------------
id
session_id
student_id
reason
created_by
created_at
```

Cancelled sessions and approved exemptions must be excluded from absence calculations. The background worker records each evaluated action and uses an idempotency key so retries cannot terminate an allocation or promote a waitlisted student twice. The configured policy controls the threshold; the architecture's current default is four consecutive unexcused absences.

---

# 9. Notification Database

The Notification Service owns notification records.

### Primary tables

```text
notifications
notification_templates
announcements
notification_jobs
```

### Notifications

```text
notifications
-------------------------
id
user_id
type
channel
subject
message
status
sent_at
deduplication_key
created_at
updated_at
```

Possible channels:

```text
EMAIL
SMS
PUSH
IN_APP
```

Possible statuses:

```text
PENDING
SENT
FAILED
```

`user_id` is an Identity Service ID, not a cross-database foreign key. A unique `deduplication_key` (when provided) prevents retries from creating duplicate logical notifications. Notification jobs must retain retry count, next-attempt time and terminal failure details. Announcements are authored by authorized staff and delivered through the notification workflow.

---

# 10. Complaint Database

The Complaint Service owns complaint information.

### Primary tables

```text
complaints
complaint_comments
support_requests
```

### Complaints

```text
complaints
-------------------------
id
student_id
submitted_by
category
title
description
status
priority
assigned_to
created_at
updated_at
resolved_at
```

Possible statuses:

```text
OPEN
IN_PROGRESS
RESOLVED
CLOSED
REJECTED
```

### Complaint Comments

```text
complaint_comments
-------------------------
id
complaint_id
user_id
comment
created_at
```

`complaint_id` is a local foreign key; student and user IDs are application-level references. Complaint status changes and staff actions must be auditable.

### Support Requests

Students may also submit in-app support requests (e.g., incorrect allocation, missing attendance, login help). These are operationally distinct from formal complaints: they are routed to sports department staff for triage rather than going through the full complaint lifecycle. The Complaint Service owns both entities.

```text
support_requests
-------------------------
id
student_id
category               -- ALLOCATION, ATTENDANCE, LOGIN, OTHER
title
description
status                 -- OPEN, IN_PROGRESS, RESOLVED, CLOSED
assigned_to
created_at
updated_at
resolved_at
```

`student_id` and `assigned_to` are application-level references to Identity/Student Service IDs. Students may view only their own support requests. Staff can view and triage all assigned requests. Resolved requests are preserved in history.

---

# 11. Report Database

The Report Service owns report metadata and generated report information.

### Primary tables

```text
reports
report_jobs
audit_logs
```

### Reports

Reports must not read other services' databases directly. The Report / Audit Service should use published events or authorized service APIs to maintain its own reporting data and generate exports.

```text
reports
-------------------------
id
name
type
status
file_ref
created_by
created_at
completed_at
```

### Report Jobs

```text
report_jobs
-------------------------
id
report_id
status
started_at
completed_at
error_message
```

Generated files may be stored in S3-compatible object storage.

The database stores the metadata or object-storage location rather than storing large files directly in PostgreSQL.

### Audit Logs

```text
audit_logs
-------------------------
id
actor_id
action
target_type
target_id
before_state
after_state
correlation_id
created_at
```

Audit rows are append-only and record sensitive administrative actions, including imports, attendance corrections, allocation decisions, eligibility changes and photo decisions. `actor_id` is an Identity Service ID, not a cross-database foreign key. Domain services must durably record critical audit facts with the business transaction; the Report / Audit Service may maintain a queryable projection. Restrict access to audit data and avoid storing secrets or unnecessary personal data in snapshots.

---

# 12. Outbox Table

Every service that publishes domain events shall persist an Outbox row in the same database as the business change. The transport is deliberately unspecified until selected.

Example:

```text
outbox_events
-------------------------
id
aggregate_type
aggregate_id
event_type
event_version
payload
occurred_at
created_at
available_at
attempt_count
last_error
published_at
```

Example record:

```text
id:           101
event_type:   StudentRegistered
payload:      {...}
created_at:   2026-10-26 10:30:00
published_at: NULL
```

`published_at = NULL` means the event has not yet been successfully marked as published.

Each consumer shall persist processed event IDs (an inbox or equivalent idempotency record) in its own database. Enforce uniqueness on the consumer/event ID so redelivery cannot apply the same event twice.

```text
inbox_events
-------------------------
consumer_name
event_id
processed_at
UNIQUE (consumer_name, event_id)
```

---

# 13. Transactional Outbox

Business data and the Outbox event shall be stored in the same database transaction.

```text
                Student Service
                      │
                      ▼
               Application Handler
                      │
              ┌───────┴────────┐
              ▼                ▼
        Student Table     Outbox Table
              │                │
              └───────┬────────┘
                      │
                   COMMIT
```

If the transaction fails, neither operation is committed.

If the transaction succeeds, both are committed.

---

# 14. Outbox Publisher

The Outbox Publisher runs separately from the application request and sends events through the selected durable broker or transport.

```text
outbox_events
      │
      │ unpublished events
      ▼
Outbox Publisher
      │
      ▼
Durable Event Broker
```

Example:

```text
Student Service Database
        │
        ▼
outbox_events
        │
        ▼
Student Outbox Publisher
        │
        ▼
Selected Event Transport
        │
        ▼
Versioned domain event
```

The publisher retries unpublished events with bounded backoff and records failure details. Delivery is at least once: consumers must be idempotent. Marking an event published must only happen after the transport confirms acceptance.

---

# 15. Event Publishing State

The Outbox table uses `published_at`, `available_at` and `attempt_count` to track delivery.

```text
published_at = NULL
```

```text
published_at = timestamp
```

`published_at = NULL` means pending or retryable; a non-NULL timestamp means the transport accepted the event. Retain enough error and attempt metadata to diagnose exhausted retries or route an event to the selected dead-letter mechanism.

---

# 15a. Durable Background Jobs

Long-running work such as absence evaluation, waitlist promotion, notifications, Excel imports and report generation must survive process restarts and support safe retries. Persist jobs in the owning service database rather than relying on in-memory task state.

```text
background_jobs
-------------------------
id
job_type
payload
status
attempt_count
available_at
started_at
completed_at
last_error
deduplication_key
created_at
updated_at
```

Use a unique `deduplication_key` where a job represents one logical action. Workers must claim jobs atomically, retry transient failures with backoff, and mark terminal failures explicitly.

---

# 16. Database Transactions

Each business operation should use a transaction.

```text
BEGIN TRANSACTION

Create Student

Create StudentRegistered Outbox Event

COMMIT
```

If something fails:

```text
BEGIN TRANSACTION

Create Student

Create Outbox Event
        ↓
      ERROR

ROLLBACK
```

This prevents inconsistent state.

---

# 17. Repository Pattern

Services shall use repositories to isolate database access from business logic.

```text
Application Handler
       │
       ▼
StudentRepository
       │
       ▼
PostgreSQL
```

The application layer should not contain raw SQL or SQLAlchemy-specific persistence logic.

Example:

```python
student_repository.save(student)
```

instead of:

```python
session.add(student_model)
session.commit()
```

The second approach belongs inside the infrastructure layer.

---

# 18. Unit of Work

The Unit of Work coordinates multiple database operations inside one transaction.

```text
Student Handler
      │
      ▼
UnitOfWork
   │
   ├── StudentRepository
   │
   └── OutboxRepository
        │
        ▼
      COMMIT
```

The Unit of Work ensures that:

```text
Student
   +
StudentRegistered Outbox Event
```

are committed together.

---

# 19. Database Migrations

Each service shall manage its database schema independently. **Alembic is the confirmed migration tool** for the Python/FastAPI backend. Each service has its own `alembic.ini`, `alembic/env.py`, and `alembic/versions/` directory.

Alembic shall be used for PostgreSQL migrations.

```text
Student Service
      │
      ▼
Alembic
      │
      ▼
student_db
```

Migration files shall be stored within the respective service.

Example:

```text
student-service/
├── alembic/
│   ├── versions/
│   └── env.py
├── alembic.ini
└── app/
```

A migration should be applied before deploying a version of the service that depends on the new schema.

---

# 20. Database Indexing

Indexes shall be added to columns frequently used for:

- Lookups
- Filtering
- Sorting
- Joins
- Unique constraints

Examples for the documented access patterns:

```text
lower(users.email) UNIQUE
external_identities(provider, provider_subject) UNIQUE
students.user_id UNIQUE
students.ap_number UNIQUE
applications(slot_id, registration_window_id, status, applied_at_utc, priority_sequence)
allocations(student_id) UNIQUE WHERE status = 'ACTIVE'
allocations(slot_id) WHERE status = 'ACTIVE'
slot_change_requests(student_id) UNIQUE WHERE status = 'PENDING'
attendance(session_id, student_id) UNIQUE
gym_card_tokens(token_hash) UNIQUE
notifications(user_id, status, created_at)
complaints.student_id
outbox_events(available_at, created_at) WHERE published_at IS NULL
background_jobs(status, available_at)
audit_logs(target_type, target_id, created_at)
```

Indexes should be added based on actual query patterns rather than automatically indexing every column.

---

# 21. Constraints

Database constraints shall be used to protect data integrity.

Examples:

```text
PRIMARY KEY
FOREIGN KEY
UNIQUE
NOT NULL
CHECK
```

For event consumers, database-level uniqueness can also provide stronger idempotency.

Example:

```text
inbox_events(consumer_name, event_id)
        ↓
      UNIQUE
```

This prevents a duplicate event from applying the same consumer-side change more than once.

Business constraints include:

- Primary keys and `NOT NULL` constraints for required identifiers and state.
- Unique, normalized identity email and provider subject.
- Positive gym-slot capacity; valid schedule and registration-window ranges.
- Valid status values and check-in methods.
- One active allocation per student and one check-in per student/session.
- One pending transfer request per student and one consumption record per consumer/event.
- No cross-database foreign keys. Validate external references through authenticated service APIs or versioned events.

Capacity itself cannot be protected by a simple row `CHECK` constraint because it depends on allocation rows. Enforce it through the serialized transaction described in the Allocation Database section.

---

# 22. Cross-Service Relationships

Cross-service relationships shall use IDs rather than database-level foreign keys.

Example:

```text
Student Service

students
---------
id = 100


Allocation Service

allocations
-----------
student_id = 100
```

There shall not be a cross-database foreign key.

Instead, services communicate through authenticated APIs or versioned domain events. Consumers maintain only the local projections needed for their own transactional invariants and reconcile them when source events are delayed or reordered.

---

# 23. Data Consistency

Within a service, strong transactional consistency shall be maintained.

Across services, the system shall generally use **eventual consistency**.

```text
Student Service
      │
      │ COMMIT
      ▼
 Student DB
      │
      ▼
 Versioned domain event
      │
      ▼
 Durable Event Broker
      │
      ▼
Allocation Service
```

The Allocation Service may receive the event after the Student Service commits. Eventual consistency applies to cross-service projections; it must not be used in place of a local transaction for capacity, allocation, waitlist promotion or attendance idempotency.

---

# 24. Backup and Recovery

Production PostgreSQL databases shall have appropriate backup and recovery procedures.

The production environment should support:

- Automated backups
- Point-in-time recovery where required
- Database monitoring
- Storage monitoring
- Backup verification
- Disaster recovery procedures

Backup policies shall be defined separately for development, staging, and production environments.

---

# 25. Development Database Structure

During local development, the services may run against separate PostgreSQL databases.

```text
PostgreSQL
│
├── identity_db
├── student_db
├── slot_db
├── allocation_db
├── attendance_db
├── notification_db
├── complaint_db
└── report_db
```

Each service connects only to its own database. The production database may be a separately provisioned PostgreSQL database per service; local development may host these databases on one PostgreSQL instance without merging ownership or granting services cross-database access.

---

# 26. Final Database Architecture

```text
                         PostgreSQL
                              │
       ┌──────────────────────┼────────────────────────────┐
       │                      │                            │
       ▼                      ▼                            ▼
 Identity DB             Student DB                     Slot DB
       │                      │                            │
 Identity Service        Student Service                 Slot Service
       │                      │                            │
       └──────────────────────┴─────────────┐              │
                                            ▼              │
                                      Allocation DB ◄──────┘
                                            │
                        ┌───────────────────┼──────────────────┐
                        │                   │                  │
                        ▼                   ▼                  ▼
                  Attendance DB       Notification DB      Complaint DB
                        │                   │                  │
                        └───────────────────┼──────────────────┘
                                            ▼
                                      Report / Audit DB

Services publish committed, versioned domain events through a durable
transport selected for the deployment. REST APIs remain the path for
synchronous operations. Each database remains owned by its service.
```

The key principles are:

```text
1. One service owns its data.
2. Services do not directly access another service's database.
3. PostgreSQL is the primary relational database.
4. Each service manages its own migrations.
5. Repositories isolate persistence from business logic.
6. Unit of Work manages transactions.
7. Outbox events are stored in the same transaction as business data.
8. Outbox Publishers publish events through the selected durable transport.
9. Consumers process events idempotently and persist retry/dead-letter state.
10. Cross-service consistency is generally eventual.
```
