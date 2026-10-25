# Gym Management System — Database Architecture

**Version:** 1.0  
**Database:** PostgreSQL  
**Architecture:** Database-per-Service

---

# 1. Database Overview

The Gym Management System shall use **PostgreSQL** as the primary relational database.

Each microservice shall own its own database.

Services shall **not directly access another service's database**.

```text
┌──────────────────────────────────────────────────────────────┐
│                    PostgreSQL Infrastructure                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Identity DB        → Identity Service                       │
│  Student DB         → Student Service                        │
│  Slot DB            → Slot Service                           │
│  Allocation DB      → Allocation Service                     │
│  Attendance DB      → Attendance Service                     │
│  Notification DB    → Notification Service                   │
│  Complaint DB       → Complaint Service                       │
│  Report DB          → Report Service                          │
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
     Kafka
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
| Identity Service | identity_db | Users, authentication, roles |
| Student Service | student_db | Student profiles and student information |
| Slot Service | slot_db | Gym slots, schedules and availability |
| Allocation Service | allocation_db | Trainer/student slot allocations |
| Attendance Service | attendance_db | Attendance records |
| Notification Service | notification_db | Notification records and delivery status |
| Complaint Service | complaint_db | Complaints and complaint lifecycle |
| Report Service | report_db | Report generation and report metadata |

---

# 4. Identity Database

The Identity Service owns authentication and authorization-related data.

### Primary tables

```text
users
roles
user_roles
```

### Users

```text
users
-------------------------
id
email
password_hash
first_name
last_name
status
created_at
updated_at
```

### Roles

```text
roles
-------------------------
id
name
created_at
```

### User Roles

```text
user_roles
-------------------------
user_id
role_id
```

Possible roles:

```text
STUDENT
TRAINER
ADMIN
STAFF
```

The Identity Service owns these records.

Other services should not directly query the Identity database.

---

# 5. Student Database

The Student Service owns student information.

### Primary tables

```text
students
student_profiles
```

### Students

```text
students
-------------------------
id
user_id
membership_number
status
joined_at
created_at
updated_at
```

### Student Profiles

```text
student_profiles
-------------------------
id
student_id
date_of_birth
phone
address
emergency_contact
created_at
updated_at
```

The `user_id` may refer to the identity of the user managed by the Identity Service.

This is an **application-level relationship**, not a cross-database foreign key.

---

# 6. Slot Database

The Slot Service owns gym schedules and slots.

### Primary tables

```text
slots
slot_schedules
```

### Slots

```text
slots
-------------------------
id
name
start_time
end_time
capacity
status
created_at
updated_at
```

### Slot Schedules

```text
slot_schedules
-------------------------
id
slot_id
day_of_week
start_time
end_time
created_at
updated_at
```

Possible slot statuses:

```text
ACTIVE
INACTIVE
FULL
CANCELLED
```

---

# 7. Allocation Database

The Allocation Service owns the relationship between students, trainers and available slots.

### Primary tables

```text
allocations
```

### Allocations

```text
allocations
-------------------------
id
student_id
trainer_id
slot_id
status
allocated_at
created_at
updated_at
```

`student_id`, `trainer_id`, and `slot_id` represent IDs owned by other services.

They should **not** be database foreign keys across service databases.

---

# 8. Attendance Database

The Attendance Service owns attendance records.

### Primary tables

```text
attendance
```

### Attendance

```text
attendance
-------------------------
id
student_id
slot_id
attendance_date
status
check_in_time
check_out_time
created_at
updated_at
```

Possible statuses:

```text
PRESENT
ABSENT
LATE
EXCUSED
```

---

# 9. Notification Database

The Notification Service owns notification records.

### Primary tables

```text
notifications
notification_templates
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
created_at
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

---

# 10. Complaint Database

The Complaint Service owns complaint information.

### Primary tables

```text
complaints
complaint_comments
```

### Complaints

```text
complaints
-------------------------
id
student_id
category
title
description
status
priority
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

---

# 11. Report Database

The Report Service owns report metadata and generated report information.

### Primary tables

```text
reports
report_jobs
```

### Reports

```text
reports
-------------------------
id
name
type
status
file_location
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

---

# 12. Outbox Table

Every service that publishes Kafka events shall have an Outbox table.

Example:

```text
outbox_events
-------------------------
id
event_type
payload
created_at
published_at
```

Example record:

```text
id:           101
event_type:   StudentCreated
payload:      {...}
created_at:   2026-10-26 10:30:00
published_at: NULL
```

`published_at = NULL` means the event has not yet been successfully marked as published.

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

The Outbox Publisher runs separately from the application request.

```text
outbox_events
      │
      │ unpublished events
      ▼
Outbox Publisher
      │
      ▼
Kafka
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
Kafka
        │
        ▼
student-created
```

The publisher can retry events that have not yet been marked as published.

---

# 15. Event Publishing State

The Outbox table uses:

```text
published_at
```

to track publishing state.

### Pending

```text
published_at = NULL
```

The event still needs to be published.

### Published

```text
published_at = timestamp
```

The publisher successfully published the event and marked it as published.

---

# 16. Database Transactions

Each business operation should use a transaction.

```text
BEGIN TRANSACTION

Create Student

Create StudentCreated Outbox Event

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
StudentCreated Outbox Event
```

are committed together.

---

# 19. Database Migrations

Each service shall manage its database schema independently.

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

Examples:

```text
users.email
students.user_id
students.membership_number
allocations.student_id
allocations.trainer_id
allocations.slot_id
attendance.student_id
notifications.user_id
complaints.student_id
outbox_events.published_at
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
payments.order_id
        ↓
      UNIQUE
```

This prevents duplicate records even if the same Kafka event is delivered multiple times.

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

There should not be a cross-database foreign key.

Instead, services communicate through APIs or events.

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
 StudentCreated
      │
      ▼
    Kafka
      │
      ▼
Allocation Service
```

The Allocation Service may receive the event shortly after the Student Service commits.

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

Each service connects only to its own database.

---

# 26. Final Database Architecture

```text
                         PostgreSQL
                              │
       ┌──────────────────────┼────────────────────────┐
       │                      │                        │
       ▼                      ▼                        ▼
 Identity DB             Student DB                Slot DB
       │                      │                        │
 Identity Service        Student Service            Slot Service
       │                      │                        │
       └──────────────┐       │       ┌───────────────┘
                      │       │       │
                      ▼       ▼       ▼
                         Apache Kafka
                              │
              ┌───────────────┼────────────────┐
              │               │                │
              ▼               ▼                ▼
        Allocation DB   Attendance DB   Notification DB
              │               │                │
        Allocation       Attendance       Notification
         Service          Service            Service
              │
              └────────────────┐
                               │
                               ▼
                       Complaint / Report
                            Services
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
8. Outbox Publishers publish events to Kafka.
9. Kafka consumers process events asynchronously.
10. Cross-service consistency is generally eventual.
```
