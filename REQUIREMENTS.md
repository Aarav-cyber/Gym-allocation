**# GymSlot — Complete Product Requirements Document (PRD)**



**## 1. Product Overview**



**\*\*GymSlot\*\*** is a gym slot allocation, attendance tracking, and student management portal for SRM University-AP.



The application allows students to view their allocated gym and timing, check attendance, display a QR code for check-in, and apply to change their gym slot. Gym staff can scan student QR codes and record attendance. Sports administrators can manage gyms, slots, allocations, registration windows, attendance policies, and reports.



**### Primary Objectives**



\- Digitize gym slot allocation and management.

\- Allow students to apply for available gym slots, including transfers from an existing slot.

\- Simplify attendance recording through QR scanning.

\- Monitor attendance and enforce the approved absence policy.

\- Give the Sports Department a centralized administrative dashboard.

\- Preserve accurate allocation, attendance, and administrative history.



**### Scope Decisions**



\- Authentication uses Google OAuth.

\- Only approved college email accounts can log in.

\- Authorized staff provision student accounts; students authenticate using Google OAuth after provisioning.

\- QR codes contain a short-lived, revocable secure token and no directly readable student information.

\- Students can request a different gym slot even when they already have an allocation.

\- A digital gym card is included; physical gym cards are not included in this version.



**### Architecture**



\- The system follows a microservices architecture with event-driven communication for asynchronous workflows.

\- Services own their data and expose versioned APIs through an authenticated API gateway. Service-to-service calls and events must be authenticated and authorized.

\- Core service boundaries include identity and student profiles, gym and slot management, applications and allocations, attendance, notifications, imports, and reporting/audit.

\- Domain events include \`StudentRegistered\`, \`PhotoChangeRequested\`, \`PhotoChangeDecided\`, \`SlotApplicationSubmitted\`, \`SlotAllocated\`, \`StudentWaitlisted\`, \`WaitlistPromoted\`, \`AllocationTransferred\`, \`AttendanceRecorded\`, and \`ImportCompleted\`.

\- Events must be versioned, idempotently processed, and retried or routed to a dead-letter mechanism on repeated failure. Publish events only after the owning service has durably committed its change (for example, through a transactional outbox).

\- Cross-service workflows must define ownership, failure handling, and compensating actions. Capacity and allocation invariants must be enforced transactionally by their authoritative service, not by eventual event delivery.



**---**



**## 2. User Roles**



**### 2.1 Student**



Students can:

\- Sign in using their college Google account.

\- Complete registration onboarding and upload the initial photograph to their provisioned account.

\- View their profile and current gym allocation.

\- View and download their digital gym card.

\- Submit a photograph change request and track its review status.

\- Display their QR code for attendance.

\- View attendance history and absence status.

\- Browse available eligible slots.

\- Apply for a new slot or request a change from their current slot.

\- Track application status.

\- Receive notifications and announcements.



*\*Note:\** Students cannot directly edit their official identity, attendance records, allocation status, or eligibility.



**### 2.2 Trainer / Gym Staff / Intern**



Gym staff can:

\- Access the attendance scanner.

\- Scan student QR codes.

\- View the relevant official student identity and allocation details.

\- Confirm identity and record attendance.

\- Search by AP number as an authorized fallback.

\- View attendance records for assigned sessions or gyms, subject to permissions.



*\*Note:\** Trainers cannot independently change allocations, terminate students, approve photo changes, manage roles, or edit the absence policy unless explicitly authorized.



**### 2.3 Sports Administrator / ADMIN**



Sports administrators can:

\- Manage student records and eligibility.

\- Configure gyms, slots, schedules, and capacities.

\- Create registration windows.

\- Review applications and slot-change requests.

\- Assign, transfer, terminate, and reinstate allocations.

\- Review attendance and correct errors.

\- Configure absence policies.

\- Publish announcements.

\- Import official student and allocation lists.

\- Import gym slots from validated Excel workbooks.

\- Review and approve or reject student photograph change requests.

\- Generate reports and exports.

\- Review audit logs.



**### 2.4 System Administrator / SUPER_ADMIN**



System administrators manage:

\- Staff accounts and roles.

\- Application configuration.

\- Authentication and security settings.

\- System health, backups, and technical operations.



The application role names are \`STUDENT\`, \`TRAINER\`, \`ADMIN\`, and \`SUPER_ADMIN\`. \`TRAINER\` maps to assigned gym staff operations, \`ADMIN\` to Sports Department administration, and \`SUPER_ADMIN\` to system-level administration. Permissions are least-privilege and enforced by the backend.



**---**



**## 3. Account Registration and Google OAuth Authentication**



**### 3.1 Student Registration and Provisioning**



\- Only authorized administrators or approved import processes can create student accounts.

\- Required student information includes unique student/AP ID, full name, college email, phone number, department, year/semester, photograph, and account status.

\- During registration/onboarding, the student uploads the initial photograph against their provisioned account; an authorized administrator may also supply it through an approved import or administrative workflow.

\- The initial photograph remains pending until registration/photo review is complete and is not used on an active digital card until approved.

\- The backend validates required fields, uniqueness, and approved institutional email rules before creating an account.

\- Registration creates a provisioned account; it does not create an active gym allocation.

\- Students authenticate using the provisioned college identity through Google OAuth. A successful OAuth login must match the verified email to an active provisioned student record.

\- Account statuses include \`PENDING\`, \`ACTIVE\`, \`SUSPENDED\`, and \`INACTIVE\`. Only \`ACTIVE\` accounts may use student services.

\- Registration, account activation/deactivation, and changes to official student information are audited. Students cannot change their official identity fields directly.



**### 3.2 Student Login**



**\*\*Requirements:\*\***

\- Provide a “Continue with Google” login button.

\- Use Google's OAuth 2.0 / OpenID Connect flow.

\- Allow only approved college email accounts.

\- Validate the authenticated Google identity on the backend.

\- Verify that the email is verified.

\- Reject accounts outside the approved college email policy.

\- Match the authenticated account to the official student record.

\- Maintain a secure session after successful authentication.

\- Provide logout and session expiration.

\- Display clear messages for unauthorized or inactive accounts.



**\*\*Purpose:\*\*** Give students convenient sign-in while restricting access to eligible college users.



**### 3.3 College Email Restrictions**



\- The allowed college email domain or approved email list must be configurable.

\- If the university provides a verified Google Workspace domain, the application can use that domain as one eligibility check. The backend should also verify the Google identity and the student's official record.

\- An administrator must not be able to bypass account restrictions merely by entering a different email address in the frontend.



**### 3.4 Staff and Administrator Access**



\- Staff and administrator accounts should be provisioned or approved by an authorized administrator.

\- A valid Google account alone must not automatically grant administrative permissions.

\- Backend APIs must enforce role-based authorization (RBAC).



**\*\*Purpose:\*\*** Prevent students from accessing staff and administrative functions.



**---**



**## 4. Student Profile**



**### Information Displayed**

\- Full name.

\- AP number.

\- College email.

\- Department and academic year, if available.

\- Official profile photo, if available and authorized.

\- Current gym allocation.

\- Allocation status.

\- Phone number and year/semester, subject to privacy permissions.



**### Requirements**

\- Official identity information should come from the approved student record.

\- Students should not directly change their AP number or college email.

\- Provide a correction request process for inaccurate information.

\- Preserve a record of important eligibility changes.

\- Store photographs in private, access-controlled storage; use scoped, expiring access links and enforce authorization on every retrieval.

\- Validate photograph file type and size, inspect file content rather than trusting its extension, and reject unsupported or malformed files.

\- Keep the approved photograph distinct from any pending replacement. A pending or rejected photo must not replace the approved photo.

\- Students may request a photograph change with a replacement image and optional reason. An authorized administrator must approve or reject it with a recorded decision, reviewer, and timestamp.

\- On approval, the replacement becomes the official photo and the previous photo remains available only as required by retention and audit policy. Notify the student of the decision.



**\*\*Purpose:\*\*** Maintain a consistent student identity for applications and attendance.



**### Digital Gym Card**



\- Every student with an active allocation has a digital gym card; students without an active allocation do not receive an active card.

\- The card displays the approved student photograph, student/AP ID, name, QR code, assigned gym and slot, start and end times, and allocation status.

\- The QR code encodes only a high-entropy, opaque, short-lived token. It must not expose the student ID, name, email, photo URL, or other personal data.

\- The backend binds the token to the student, current allocation, and applicable session; validates it against current server-side state; and supports expiry, revocation, and rotation.

\- Cards and tokens are invalidated when an allocation is ended, suspended, transferred, or otherwise becomes ineligible. A transfer must not leave a token that authorizes the former allocation.

\- Student card access is restricted to the authenticated card owner; staff may view the approved photograph and minimum identity/allocation details needed for verification.

\- Card rendering and token issuance must not make private photo storage publicly accessible.



**---**



**## 5. Student Dashboard**



**### Components**

\- Welcome message and profile summary.

\- Current gym and allocated slot timing.

\- Allocation status.

\- Today's scheduled session.

\- Digital gym card shortcut and card status.

\- QR code shortcut.

\- Attendance summary.

\- Absence warning, if applicable.

\- Slot-change application status.

\- Registration window status.

\- Notifications and announcements.



**### Conditional Behaviour**



**#### Student has an active allocation**

\- Display current gym and timing.

\- Provide “View QR Code” and “Change Gym Slot” actions.

\- Display attendance and application history.



**#### Student has no active allocation**

\- Display “Find a Gym Slot”.

\- Show whether registration is open.

\- Display eligible available slots when applications are permitted.



**#### Student has a pending slot-change request**

\- Display the requested gym and timing.

\- Show the request status.

\- Explain that the current allocation remains active until the transfer is approved and completed.



**\*\*Purpose:\*\*** Give students a single place to manage their gym access.



**---**



**## 6. Gym Management**



**### Gym Configuration**



Each gym must have:

\- Unique gym ID (\`gym_id\`).

\- Gym name.

\- Category or eligibility group.

\- Location or description, if required.

\- Active/inactive status.

\- Associated slots.



*\*Multi-Gym Support:\** The system must support multiple gyms, including **\*\*C. V. Raman\*\***, **\*\*Ganga\*\***, **\*\*Krishna\*\***, and **\*\*Narmada\*\***, without hardcoding the list in the application.



**### Requirements**

\- Administrators can create, update, activate, and deactivate gyms.

\- Deactivation must not erase historical allocations or attendance.

\- Eligibility rules must be configurable.

\- The system must support separate eligibility policies for different gyms.



**\*\*Purpose:\*\*** Allow the Sports Department to manage facilities without changing application code.



**---**



**## 7. Gym Slot Management**



Each slot must contain:

\- Unique slot ID (\`slot_id\`).

\- Gym ID (\`gym_id\`).

\- Applicable date or recurrence schedule.

\- Start time.

\- End time.

\- Capacity.

\- Active/inactive status.

\- Eligibility restrictions.

\- Optional check-in opening and closing times.



**### Capacity Management**



The system should show:

\- Total capacity.

\- Active allocations.

\- Remaining seats.

\- Occupancy percentage.

\- Full/available/closed status.



**### Rules**

\- A slot must never exceed its capacity under concurrent transactions.

\- Inactive slots cannot receive new allocations.

\- Reducing capacity below current occupancy requires an explicit administrative resolution.

\- Capacity changes must be logged.

\- Slot timing changes that affect students must identify affected allocations and require confirmation.



**\*\*Purpose:\*\*** Keep schedules and availability accurate.



**### Slot Import from Excel**



Administrators can bulk-import slots from \`.xlsx\` workbooks for initial setup and later bulk maintenance. The database remains the source of truth; an uploaded workbook never becomes the live schedule itself.



1\. Accept only supported Excel formats and enforce configured file-size and worksheet limits.

2\. Require documented columns for gym ID/name, slot date or recurrence, start time, end time, capacity, and active status; reject missing or ambiguous headers.

3\. Validate date and time formats, start-before-end, positive integer capacity, known gyms, eligibility values, and active status.

4\. Detect duplicate rows within the workbook and duplicates or conflicting slots already in the database.

5\. Return a row-numbered preview that identifies valid rows and specific errors before any write.

6\. On administrator confirmation, import valid rows and report rejected rows. Invalid rows must not be silently skipped or changed.

7\. Record the operator, upload time, file name, row counts, per-row results, and import outcome in import history and the audit log.

8\. Re-imports must not create duplicates; updating existing slots requires an explicit, previewed update mode and audit trail.



**---**



**## 8. Slot Registration**



**### 8.1 Registration Window Configuration**



Administrators can configure:

\- Registration title.

\- Start and end dates.

\- Daily opening and closing times.

\- Eligible student groups.

\- Available gyms and slots.

\- Immediate allocation vs. administrator approval workflow.

\- Whether waitlists are enabled.

\- Whether applications can be withdrawn.

\- Waitlist promotion policy and any response/claim deadline, if a seat offer workflow is enabled.

\- Announcement settings.



*\*Enforcement:\** The backend must strictly enforce registration dates and daily opening hours.



**### 8.2 Student Slot Search**



Students should see:

\- Gym name.

\- Slot start and end times.

\- Available seats.

\- Eligibility status.

\- Registration status.

\- Apply or request-change action.



Filters should include gym, time, and availability.



**### 8.3 New Slot Application**



When a student applies, the backend must:

1\. Identify the student from the authenticated session.

2\. Verify eligibility.

3\. Check the registration window.

4\. Verify that the slot is active.

5\. Check current capacity.

6\. Check whether the student already has an active allocation.

7\. Prevent duplicate applications where applicable.

8\. Generate and persist the application timestamp on the server in UTC; ignore or reject any client-supplied priority timestamp.

9\. Create the application or allocation according to the configured workflow.

10\. If no seat is available and waitlisting is enabled, enqueue the eligible student; otherwise return a clear full/closed result.

11\. Notify the student of the result and assigned queue position when applicable.



*\*Atomic Capacity Re-check:\** The backend must recheck capacity during the final database transaction with locking or serializable isolation. The capacity check, application outcome, allocation, and waitlist enqueue/promotion must not permit overallocation.



**### 8.4 FCFS Waiting List**



\- A full slot may accept eligible applicants into a waiting list when the registration policy enables it.

\- Strict first-come-first-served (FCFS) ordering is based only on the backend-generated application timestamp, ascending. The backend must not trust client clocks or submitted timestamps.

\- Persist a monotonic sequence number as a deterministic tie-breaker for applications with equal timestamps.

\- Show each student their own position and status; administrators can view the complete ordered queue and its history.

\- When capacity is released, promote the earliest eligible waiting student(s) atomically, rechecking account status, eligibility, registration policy, and slot capacity at promotion time.

\- A student may have only one active application or waitlist entry for the same slot. Withdrawal, rejection, ineligibility, or an expired offer removes the entry from active priority while preserving history.

\- If a seat offer/claim deadline is configured, its expiry and the next promotion must be handled idempotently and logged. Without an offer workflow, promotion allocates the seat directly.

\- Administrative priority overrides require a reason, authorized permission, and immutable audit record; they must not silently reorder the queue.

\- Notify students when they join the queue, when their position materially changes, and when they are promoted, skipped, or removed, with an appropriate reason.



**### 8.5 Application Statuses**

\- \`PENDING\`

\- \`APPROVED\`

\- \`REJECTED\`

\- \`WAITLISTED\`

\- \`OFFERED\` (only if a seat-claim workflow is configured)

\- \`WITHDRAWN\` (when permitted)

\- \`EXPIRED\` (if configured)



Students should be able to see the status, requested slot, submission date, decision, and reason where appropriate.



**---**



**## 9. Change Gym Slot — Student Transfer Requests**



*\*(Core Feature)\**



Students who do not like their current gym or timing can apply for a different available slot, subject to eligibility and the applicable registration rules.



**### 9.1 Student Workflow**

1\. Student opens “My Gym Slot”.

2\. Student selects “Change Gym Slot”.

3\. The application displays eligible gyms and slots.

4\. The student selects the desired slot.

5\. The system checks availability and eligibility.

6\. The student submits the change request.

7\. The system displays the request status.

8\. The student receives a notification when the request is approved or rejected.



**### 9.2 Transfer Application Information**

Stored attributes:

\- Student ID.

\- Current allocation ID.

\- Requested slot ID.

\- Application date.

\- Status (\`PENDING\`, \`APPROVED\`, \`REJECTED\`, \`WITHDRAWN\`).

\- Decision and reason.

\- Reviewing administrator (if approval is required).

\- Completion date.



**### 9.3 Transfer Rules**

\- A student must not receive a second active allocation accidentally.

\- The existing allocation remains active while an approval-based transfer is pending.

\- The old allocation must not be terminated merely because a student submitted a request.

\- On approval, the new allocation and release of the old allocation must be processed consistently in a single atomic transaction.

\- The destination slot must have available capacity at the point of allocation.

\- If the destination slot becomes full before approval, the system must not overallocate it.

\- The system must preserve the previous allocation in the student's history.

\- Rejected requests must not affect the current allocation.

\- Students must not be able to bypass eligibility restrictions by requesting a transfer.



**### 9.4 Transfer Workflow Options**



The Sports Department chooses one of these policies:



\- **\*\*Option A — Administrator Approval (Recommended Default):\*\***

  - The student submits a request.

  - The current allocation remains active.

  - An administrator approves or rejects the request.

  - On approval, the system validates capacity and completes the transfer.

\- **\*\*Option B — Immediate Transfer:\*\***

  - The student selects an available slot.

  - The system atomically checks capacity and eligibility.

  - The new allocation is created and the old allocation is released in the same database transaction.



**\*\*Purpose:\*\*** Give students flexibility without creating allocation conflicts or unfairly losing their current slot.



**---**



**## 10. QR Code Generation**



**### 10.1 QR Contents and Token Lifecycle**



The QR code contains only an opaque, high-entropy, short-lived signed or server-verifiable token. It must not encode a student's AP number, name, email, photograph, gym, slot, or other personal information.



Example payload:

\`\`\`json

{

  "token": "\<opaque-short-lived-token>"

}

\`\`\`



The backend associates the token with the student, active allocation, and scheduled session, and validates those records at scan time. Tokens expire, can be revoked or rotated, and cannot authorize check-in after allocation or session eligibility changes.



**### 10.2 QR Page Display**

The page displays:

\- Student name.

\- AP number.

\- Approved photograph.

\- Current gym and slot timing.

\- Session date.

\- Allocation status.

\- Dynamic QR code.



The student sees only their own card. The QR token is generated from the student's current allocation and applicable session. Card details are retrieved from the backend and are not encoded in the QR token.



**### 10.3 QR Validation Security Model**



The scanner must not trust QR contents by themselves:

\- When a code is scanned, the backend validates token integrity, expiry, revocation state, student account, active allocation, assigned gym/slot, and scheduled session.

\- The scanner rejects:

  - Unknown, malformed, expired, or revoked tokens.

  - Students without a valid allocation.

  - Tokens for a different gym, slot, or session.

  - Invalid or manipulated payloads.

  - Duplicate attendance attempts for the same session.



*\*Security Note:\** Staff visually verify the student's approved photo before recording attendance. Tokens are treated as bearer credentials and must not be logged in plaintext.



**---**



**## 11. Attendance Scanner**



**### Scanner Workflow**

1\. Authorized staff opens the scanner interface.

2\. Staff scans the QR code using the camera scanner.

3\. The system reads the opaque QR token.

4\. The backend validates the token against current student, allocation, and session records.

5\. The scanner displays the student's approved photo and minimum necessary identity/allocation details.

6\. Staff confirms that the person matches the record.

7\. The backend records attendance.

8\. The scanner displays success or a specific rejection reason.



**### Scanner Outcomes**

\- \`VALID_AND_ELIGIBLE\` (Success)

\- \`STUDENT_NOT_FOUND\`

\- \`EMAIL_AP_MISMATCH\`

\- \`NO_ACTIVE_ALLOCATION\`

\- \`WRONG_GYM_OR_SLOT\`

\- \`WRONG_SESSION_DATE\`

\- \`SESSION_NOT_OPEN\`

\- \`ALREADY_CHECKED_IN\`

\- \`INVALID_QR_DATA\`

\- \`SERVER_ERROR\`



**### Manual Fallback**

Authorized staff may search by AP number when camera scanning is unavailable or camera permissions fail. Manual check-in must use the exact same eligibility and duplicate checks and must be logged in the audit trail.



**---**



**## 12. Attendance Management**



**### Attendance Record Fields**

\- \`id\`: Unique record ID.

\- \`student_id\`: Student reference.

\- \`session_id\`: Scheduled session reference.

\- \`gym_id\` & \`slot_id\`: Gym and slot details.

\- \`session_date\`: Date of the session.

\- \`check_in_timestamp\`: Precise timestamp of check-in.

\- \`check_in_method\`: \`QR_SCAN\` or \`MANUAL_FALLBACK\`.

\- \`staff_id\`: Staff member who confirmed attendance.

\- \`status\`: \`ATTENDED\`, \`EXCUSED\`, \`INVALIDATED\`.



**### Requirements**

\- Prevent duplicate attendance for the same scheduled session.

\- Students can view their complete attendance history.

\- Staff can view authorized session records.

\- Administrators can filter by student, gym, slot, and date.

\- Allow authorized corrections with a recorded reason.

\- Preserve previous values when records are corrected (versioning / audit).

\- Recalculate absence status automatically after relevant corrections.



**### Session Scheduling**

The system defines scheduled sessions for each slot and date. Holidays, campus closures, and cancelled sessions are explicitly modeled so students are never marked absent for unheld sessions.



**---**



**## 13. Absence Monitoring**



**### Absence Dashboard**

Administrators can inspect:

\- Students approaching the warning threshold.

\- Students meeting the configured termination threshold.

\- Consecutive absence periods.

\- Last qualifying attendance date.

\- Current allocation.

\- Approved exemptions.

\- Termination candidates.



**### Configurable Absence Policy**

The Sports Department defines:

\- Absence measurement method (consecutive absent weeks / visit frequency).

\- Minimum attendance required to count a week as attended.

\- Warning threshold.

\- Termination threshold.

\- Evaluation frequency (e.g., weekly scheduled cron job).

\- Holiday and closure treatment.

\- Partial-week allocation rules.

\- Approved exemptions (medical, academic leave, sports events).

\- Whether termination is automatic or requires explicit administrator approval.



*\*The policy is fully configurable and not hardcoded.\**



**### Termination Workflow**

When policy violations are detected:

1\. Evaluate attendance records via background worker.

2\. Flag student and create warning or termination candidate.

3\. Obtain administrator approval if required by policy.

4\. Record reason and effective date.

5\. End active allocation without deleting historical records (\`status = TERMINATED\`).

6\. Release slot capacity consistently.

7\. Notify the student via in-app notification / email.

8\. Make the vacancy available according to approved reallocation rules.



Background jobs are idempotent and safe to rerun without duplicating warnings or terminations.



**---**



**## 14. Student and Allocation Management**



Administrators can:

\- Search students by AP number, name, and email.

\- Filter by department, academic year, eligibility, and allocation status.

\- View each student's complete allocation and attendance history.

\- Add or update approved student records.

\- Assign or transfer slots manually.

\- Terminate or reinstate allocations with recorded justifications.



**### Data Import (CSV / Excel)**

Support bulk import for official student and allocation lists:

1\. Accept approved file formats (\`.csv\`, \`.xlsx\`).

2\. Validate required columns and headers.

3\. Detect duplicate AP numbers and emails.

4\. Detect unknown slots and invalid allocations.

5\. Display a pre-commit validation preview and error report.

6\. Require administrator confirmation before applying changes.

7\. Record the import summary, file name, timestamp, and operator in the audit log.



**---**



**## 15. Notifications and Announcements**



**### Student Notifications**

Triggered on:

\- Application submitted.

\- Application approved or rejected.

\- Student added/activated by an administrator (where notification is appropriate).

\- Photograph change request submitted, approved, or rejected.

\- Student added to a waiting list, promoted, skipped, or removed from the queue.

\- Slot import completed, including validation summary for the operator.

\- Slot transfer completed.

\- Allocation terminated or reinstated.

\- Registration window opening or closing.

\- Absence warning alert.

\- Slot schedule change.

\- Important department announcement.



**### Requirements**

\- In-app notification bell / center with read/unread flags.

\- Timestamps and direct action links.

\- Admin-created announcements targeted by audience (all students, specific gym, unallocated students).

\- Optional email dispatch via SMTP / SES / college mail relay with failure logging.



**---**



**## 16. Administrator Dashboard**



Comprehensive administrative view displaying:

\- Total eligible students.

\- Active allocations count.

\- Real-time available seats.

\- Occupancy breakdown by gym (C. V. Raman, Ganga, Krishna, Narmada).

\- Today's live check-in count and attendance trends.

\- Absence alerts and at-risk students.

\- Pending applications and slot-change transfer requests.

\- Active registration window countdowns.

\- Recent administrative activity feed.



*\*Every metric links directly to the corresponding filtered list.\**



**---**



**## 17. Reports and Exports**



Authorized administrators can view and export reports in CSV/Excel format:

\- Current allocations roster.

\- Slot capacity vs. occupancy breakdown.

\- Daily session attendance logs.

\- Individual student attendance histories.

\- Weekly attendance frequency summaries.

\- Absence warnings and termination candidate rosters.

\- Terminated allocations history.

\- Slot registration and transfer request histories.

\- Current and historical waitlists, including promotion and override history.

\- Photograph change request decisions.

\- Data import history.

\- System audit activity logs.



*\*Exports enforce RBAC and redact unnecessary sensitive personal information.\**



**---**



**## 18. Audit Logs**



Audit trail records all sensitive operations:

\- Allocation creation, transfer, termination, and reinstatement.

\- Attendance check-in creation and manual corrections.

\- Slot capacity and timing changes.

\- Application and slot-change request decisions.

\- Absence policy configurations and exemptions.

\- Eligibility status updates.

\- Bulk student data imports.

\- Administrative role grants and revocations.

\- Sensitive report exports.



Each record stores:

\- \`actor_id\` (User who performed action).

\- \`action\` (e.g., \`TRANSFER_APPROVED\`, \`CAPACITY_UPDATED\`).

\- \`target_type\` & \`target_id\`.

\- \`timestamp\`.

\- \`reason\` / comment.

\- Before/after JSON snapshots of changed data.



*\*Audit records are strictly append-only and cannot be edited or deleted.\**



**---**



**## 19. Help and Support**



\- FAQ section on gym rules, schedules, and policies.

\- Gym schedules and campus facility locations.

\- Slot registration and transfer guidelines.

\- Attendance and absence policy explanations.

\- QR scanner troubleshooting (lighting, camera permissions).

\- Approved Sports Department contact information.

\- In-app support request tickets for incorrect allocations, missing attendance, or login difficulties.

\- Students view only their own support tickets.



**---**



**## 20. Settings and Configuration**



Administrators configure:

\- Gym facilities, descriptions, and eligibility groups.

\- Slot timings, days of operation, and capacities.

\- Supported slot-import workbook columns, limits, duplicate rules, and update mode.

\- Registration windows and opening/closing schedules.

\- FCFS waiting-list enablement, promotion behavior, and optional seat-claim deadline.

\- Transfer workflow preference (Admin approval vs. immediate transfer).

\- QR token lifetime, rotation, and revocation policy.

\- Photograph upload limits, retention policy, and photo-change review permissions.

\- Check-in rules and buffer times.

\- Absence policy thresholds, measurement units, and grace periods.

\- University holidays and gym closure calendar.

\- Notification channels and templates.

\- Approved college email domains (e.g., \`@srmap.edu.in\`).

\- Role permissions (\`STUDENT\`, \`TRAINER\`, \`ADMIN\`, \`SUPER_ADMIN\`).

\- System timezone (IST / \`Asia/Kolkata\`) and date formats.



**---**



**## 21. Database Requirements**



**### Required Tables**

\- \`users\`: Core authentication identity, roles, status.

\- \`students\`: Official college student profile (AP number, department, year/semester, phone, approved photo reference, account status).

\- \`photo_change_requests\`: Requested photo reference, requester, status, reviewer, decision reason, and timestamps.

\- \`gyms\`: Gym facilities (name, location, eligibility group, active status).

\- \`gym_slots\`: Slot definitions (gym reference, timing, capacity, active status).

\- \`gym_card_tokens\`: Hashed token reference, student/allocation/session binding, expiry, revocation, and rotation metadata; never store reusable plaintext tokens.

\- \`allocations\`: Active and historical student gym allocations.

\- \`registration_windows\`: Registration periods, eligible groups, daily timing rules.

\- \`applications\`: New slot applications, server-generated UTC submission timestamp, deterministic sequence, and approval/waitlist statuses.

\- \`waitlist_entries\`: FCFS queue membership and lifecycle where maintained separately from application records.

\- \`slot_change_requests\`: Transfer applications linking current and requested slots.

\- \`attendance_sessions\`: Pre-generated daily sessions per slot (excluding holidays).

\- \`attendance\`: Validated check-in records.

\- \`attendance_corrections\`: Audit log of manual attendance edits.

\- \`absence_policies\`: Configured absence rules and thresholds.

\- \`policy_exemptions\`: Approved medical, sports, or academic exemptions.

\- \`notifications\`: User-specific in-app notifications.

\- \`announcements\`: Broadcast announcements.

\- \`imports\` and \`import_rows\`: Bulk student/allocation/slot file history, operator, row-level validation outcomes, and error records.

\- \`outbox_events\` (or an equivalent durable event publication mechanism): Pending domain events committed with authoritative service changes.

\- \`audit_logs\`: Append-only security and operational audit trail.

\- \`support_requests\`: Student help tickets.



**### Integrity Rules**

1\. **\*\*Uniqueness:\*\*** AP numbers and college email addresses must be unique.

2\. **\*\*Single Active Allocation:\*\*** A student can have at most one active allocation at any time.

3\. **\*\*Capacity Ceiling:\*\*** Slot active allocations must never exceed slot capacity.

4\. **\*\*Duplicate Prevention:\*\*** Only one attendance record per student per scheduled session.

5\. **\*\*No Invalid Attendance:\*\*** Terminated or inactive allocations cannot authorize attendance.

6\. **\*\*Historical Preservation:\*\*** Historical allocations, transfers, and attendance records are never deleted.

7\. **\*\*Atomic Operations:\*\*** Transfers and capacity updates run within isolated database transactions.

8\. **\*\*Untrusted QR:\*\*** Opaque QR tokens are verified against live database state and stored/handled as credentials.

9\. **\*\*FCFS Ordering:\*\*** Waiting-list priority uses server-generated UTC timestamps ascending and a persisted sequence tie-breaker; clients cannot choose priority.

10\. **\*\*Card Revocation:\*\*** Card tokens cannot authorize a check-in after expiry, revocation, or a change that invalidates their bound allocation/session.

11\. **\*\*Event Consistency:\*\*** Domain events are published only for committed changes and consumers must be idempotent.



**---**



**## 22. Backend API Requirements**



Versioned REST API base: \`/api/v1\`



**### Authentication (\`/api/v1/auth\`)**

\- \`GET /auth/google\` — Initiates Google OAuth 2.0 flow.

\- \`GET /auth/google/callback\` — Handles callback, validates domain, issues session.

\- \`GET /auth/me\` — Returns authenticated user profile and permissions.

\- \`POST /auth/logout\` — Revokes session.



**### Student Endpoints (\`/api/v1/student\`)**

\- \`GET /student/profile\` — Student profile and academic info.

\- \`GET /student/dashboard\` — Overview of allocation, attendance, and alerts.

\- \`GET /student/allocation\` — Current active allocation details.

\- \`GET /student/qr-code\` — Current dynamic QR code payload.

\- \`GET /student/gym-card\` — Digital card details and current QR token for the authenticated student.

\- \`POST /student/photo-change-requests\` — Submit a replacement photograph for administrative review.

\- \`GET /student/photo-change-requests\` — View own photo-change request history and decisions.

\- \`POST /student/registration/photo\` — Upload the initial photograph for the authenticated provisioned student account.

\- \`GET /student/attendance\` — Complete attendance history and stats.

\- \`GET /student/attendance/stats\` — Weekly frequency, streaks, and absence status.

\- \`GET /student/available-slots\` — Search active slots with remaining capacity.

\- \`GET /student/registration-status\` — Current registration window status.

\- \`GET /student/applications\` — History of slot applications.

\- \`POST /student/applications\` — Submit new slot application.

\- \`GET /student/applications/:id/waitlist-position\` — View the student's own current queue status/position.

\- \`POST /student/slot-change-requests\` — Request transfer to another slot.

\- \`GET /student/slot-change-requests\` — View transfer request status.

\- \`GET /student/notifications\` — In-app notifications list.

\- \`PATCH /student/notifications/:id/read\` — Mark notification as read.



**### Staff Endpoints (\`/api/v1/staff\`)**

\- \`POST /staff/attendance/scan\` — Validate QR payload and record attendance.

\- \`POST /staff/attendance/manual-check-in\` — Authorized manual check-in by AP number.

\- \`GET /staff/sessions\` — Scheduled sessions for assigned gym.

\- \`GET /staff/attendance\` — Live attendance records for current session.



**### Administrator Endpoints (\`/api/v1/admin\`)**

\- \`/admin/students\` — CRUD student records and view individual histories.

\- \`/admin/students/:id/photo-change-requests\` — Review and approve/reject photo-change requests with a reason.

\- \`/admin/gyms\` — CRUD gym facilities.

\- \`/admin/slots\` — CRUD slots and capacity adjustments.

\- \`/admin/slot-imports\` — Upload, validate, preview, confirm, and review Excel slot imports and row-level results.

\- \`/admin/registration-windows\` — Configure registration windows.

\- \`/admin/applications\` — Review and approve/reject new slot applications.

\- \`/admin/waitlists\` — Inspect ordered queues, promotion outcomes, and authorized priority overrides.

\- \`/admin/slot-change-requests\` — Review and approve/reject transfer requests.

\- \`/admin/allocations\` — Direct allocation, transfer, termination, and reinstatement.

\- \`/admin/attendance\` — Filter, inspect, and correct attendance records.

\- \`/admin/absence-policies\` — Configure absence criteria and thresholds.

\- \`/admin/absence-monitor\` — View at-risk students and process terminations.

\- \`/admin/announcements\` — Publish and manage targeted announcements.

\- \`/admin/reports\` — Generate and export reports (CSV/Excel).

\- \`/admin/imports\` — Upload and preview student, allocation, and gym-slot imports; confirm valid rows and inspect import history.

\- \`/admin/audit-logs\` — Query append-only audit trail.

\- \`/admin/settings\` — Configure campus settings and email domain rules.



**---**



**## 23. Security and Privacy Requirements**



\- **\*\*OAuth & Domain Restrictions:\*\*** Strict verification of Google tokens and institutional email domain (\`@srmap.edu.in\`).

\- **\*\*Role-Based Access Control:\*\*** Strict RBAC at every API gateway endpoint.

\- **\*\*Data Protection:\*\*** HTTPS encryption in transit; encrypted sensitive fields at rest.

\- **\*\*Photo Protection:\*\*** Private object storage, authorization-checked access, short-lived links, and audited administrative access; never expose public permanent photo URLs.

\- **\*\*Injection & Tampering Protection:\*\*** Parameterized queries, ORM validations, rate-limiting on auth and check-in endpoints.

\- **\*\*Student Privacy:\*\*** Profile photos and personal data restricted to authorized staff screens.

\- **\*\*QR Token Protection:\*\*** Tokens are opaque, short-lived, revocable, excluded from plaintext logs, and validated against current server records before any action.

\- **\*\*Event Security:\*\*** Events contain only the minimum necessary data, are authenticated between services, and are protected against replay and unauthorized subscription.

\- **\*\*Import Protection:\*\*** Excel uploads are size/type constrained, parsed without executing formulas/macros, validated before persistence, and protected from unsafe spreadsheet formula export.

\- **\*\*Append-only Audit Log:\*\*** System records all administrative actions for transparency.



**---**



**## 24. Non-Functional Requirements**



\- **\*\*Performance:\*\*** QR scan verification responds in under 500ms under peak entry load.

\- **\*\*Concurrency:\*\*** Database locking prevents race conditions and overallocation when slots have 1 remaining seat.

\- **\*\*Responsiveness:\*\*** Modern, fluid UI optimized for mobile devices (students, staff scanner) and desktop (admin dashboard).

\- **\*\*Reliability:\*\*** Background jobs for absence monitoring and session generation are idempotent.

\- **\*\*Event Delivery:\*\*** Asynchronous events are durably delivered with retry, deduplication, observable failure handling, and dead-letter recovery.

\- **\*\*File Handling:\*\*** Photo and spreadsheet uploads have configurable size limits, clear validation errors, and controlled retention.

\- **\*\*Auditability:\*\*** Complete history retention with zero silent data loss.



**---**



**## 25. Edge Cases & Resilience**



\| Edge Case | Expected System Handling |

\| :--- | :--- |

\| Student has no allocation | Dashboard displays "Find a Gym Slot"; QR screen indicates unallocated status. |

\| Student requests a slot change while one is already pending | Prevents duplicate pending transfer requests; shows status of active request. |

\| Requested slot becomes full before approval | System detects zero capacity upon admin approval, prevents overallocation, and notifies admin. |

\| Student submits identical request twice | Idempotency key / active application check blocks duplicate submission. |

\| Registration closes while application page is open | Server validates window status upon submit and rejects with clear expiry message. |

\| Concurrent requests for last available seat | Database transaction allocates no more than one seat; losing eligible applicants are queued in server-timestamp FCFS order when waitlisting is enabled. |

\| Client submits a forged application timestamp | Backend ignores/rejects the supplied value and uses its own UTC timestamp and sequence tie-breaker. |

\| A seat opens while a waitlist exists | Earliest eligible entry is promoted atomically; subsequent promotions are retried safely if an event or worker is duplicated. |

\| A waitlisted student becomes ineligible before promotion | The entry is skipped or removed according to policy with a reason, audit record, and notification; no seat is overallocated. |

\| Invalid or duplicate rows appear in an Excel slot upload | Preview reports row-specific errors; only confirmed valid rows are imported, and no row is silently altered. |

\| An import is retried after a timeout | Idempotency and duplicate detection prevent duplicate slots; the operator can inspect the persisted import result. |

\| Photograph change request is pending or rejected | The currently approved photo remains displayed until an authorized administrator approves the replacement. |

\| Private photo URL or image is requested by an unauthorized user | The request is denied; private storage remains inaccessible and the event is logged where appropriate. |

\| QR token is expired, revoked, replayed, or bound to a former allocation | Scanner rejects it and returns a specific safe outcome without exposing personal information. |

\| Student scans multiple times in one session | Second scan rejected with \`ALREADY_CHECKED_IN\` displaying original check-in timestamp. |

\| Camera permission denied on staff device | Staff can toggle to authorized manual AP number search with audit logging. |

\| Gym closed or holiday declared | Session is flagged as \`CANCELLED\`; students are not penalized for absence. |



**---**



**## 26. Recommended Development Phases**



**### Phase 1 — Foundation**

\- PostgreSQL schema setup with Prisma/TypeORM.

\- Google OAuth 2.0 with college email domain validation.

\- Provisioned student accounts, private photograph storage, and photo-change approval workflow.

\- RBAC middleware (\`STUDENT\`, \`TRAINER\`, \`ADMIN\`, \`SUPER_ADMIN\`).

\- Gym facilities and slot management.

\- Excel slot-import validation, preview, confirmation, and import history.

\- Bulk student/allocation data import with CSV/Excel validation.



**### Phase 2 — Student Portal & Slot Transfer Requests**

\- Responsive student dashboard.

\- Active allocation display and slot search.

\- Registration window engine.

\- New slot application workflow.

\- Transactional capacity enforcement and strict server-timestamp FCFS waiting lists.

\- **\*\*Change Gym Slot\*\*** transfer request engine (Option A admin approval and Option B atomic swap).



**### Phase 3 — QR Attendance System**

\- Digital gym card and short-lived opaque QR token generation/revocation.

\- In-browser mobile camera scanner for staff (\`html5-qrcode\`).

\- Server-side multi-point validation and duplicate prevention.

\- Identity photo verification and manual AP search fallback.

\- Attendance history and correction logs.



**### Phase 4 — Absence Monitoring & Automation**

\- Configurable absence policy engine.

\- Scheduled evaluation jobs (daily/weekly cron).

\- Warning notifications and termination candidates.

\- Transactional capacity release upon termination.

\- Approved exemptions handling.



**### Phase 5 — Administration, Analytics & Launch**

\- Sports admin dashboard with live metrics.

\- CSV/Excel report exports.

\- Audit logging across all sensitive actions.

\- In-app notification center and announcements.

\- Pilot deployment with SRM University-AP Sports Department.



**---**



**## 27. Acceptance Criteria**



GymSlot is ready for pilot deployment when:

1\. Authorized users can provision student accounts with all required identity, contact, academic, photograph, and status fields; students can authenticate only after their provisioned identity is matched through verified college Google OAuth.

2\. Students can view current allocations, search eligible slots, and access a digital card containing the approved photo, ID, name, QR, slot schedule, and allocation status.

3\. Student photograph replacements remain pending until an authorized administrator approves them; approval/rejection and access are auditable.

4\. Students can submit slot-change transfer requests without losing their active allocation until approved.

5\. Slot capacity is strictly enforced with zero overallocation under concurrent requests.

6\. Eligible full-slot applications enter a strict FCFS waiting list ordered by backend UTC timestamp and deterministic sequence; clients cannot submit or alter priority timestamps.

7\. Dynamic QR codes contain only an opaque, short-lived token; allocation changes revoke ineligible tokens, and scanners validate against current server state.

8\. Attendance scanner validates QR tokens against backend allocations and prevents duplicate check-ins; authorized manual AP number check-in works with audit logging.

9\. Administrators can import Excel gym slots after column, date, time, capacity, duplicate, and row validation; they can preview results, confirm valid rows, see rejected rows, and retrieve import history.

10\. Absence policies, registration windows, and waitlist behavior can be configured by administrators without code changes.

11\. Microservices publish durable, versioned domain events only after authoritative changes commit; consumers safely handle retries and duplicates.

12\. All administrative account, photo, import, queue, allocation, termination, and attendance decisions are recorded in append-only audit logs.
