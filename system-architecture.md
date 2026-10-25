
---

# `02-system-architecture.md`

```markdown
# Gym Management System — System Architecture

**Version:** 1.0  
**Architecture:** Microservices + Event-Driven Architecture

---

# 1. Architecture Overview

The Gym Management System shall use a microservices architecture.

Primary technologies:

- Frontend: React / Next.js
- Backend: Python + FastAPI
- Database: PostgreSQL
- Event Streaming: Apache Kafka
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
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│ Identity      │           │ Student       │           │ Slot          │
│ Service       │           │ Service       │           │ Service       │
└───────┬───────┘           └───────┬───────┘           └───────┬───────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │ Apache Kafka  │
                            └───────┬───────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
             ▼                      ▼                      ▼
     ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
     │ Allocation    │      │ Attendance    │      │ Notification  │
     │ Service       │      │ Service       │      │ Service       │
     └───────────────┘      └───────────────┘      └───────────────┘
             │                      │
             └──────────────────────┼──────────────────────┐
                                    │                      │
                                    ▼                      ▼
                           ┌───────────────┐      ┌───────────────┐
                           │ Complaint     │      │ Report        │
                           │ Service       │      │ Service       │
                           └───────────────┘      └───────────────┘