# 01. Frontend Architecture & Technical Specifications

**Version:** 1.0  
**Status:** Approved Technical Architecture  
**Target Platform:** Web (Desktop, Tablet, Mobile) + Progressive Web App (PWA)

---

## 1. Executive Architecture Overview

The **GymSlot** frontend serves four distinct user personas (**Students**, **Trainers / Gym Staff**, **Sports Administrators**, and **System Administrators**) across SRM University-AP's campus fitness facilities.

The frontend operates as a decoupled client layer that communicates with backend services exclusively through an authenticated **API Gateway** running at `/api/v1`. The backend is powered by **Python 3.11+ / FastAPI** microservices with PostgreSQL databases per service, transactional outbox event messaging, and S3-compatible private object storage.

```mermaid
graph TB
    subgraph ClientDevices ["Client Devices & Run-modes"]
        MobileStudent["Student Smartphone / PWA<br/>(Digital Gym Card, Dynamic QR)"]
        TabletTrainer["Turnstile Desk Tablet<br/>(Camera Scanner, Photo Verification)"]
        DesktopAdmin["Admin Desktop Workstation<br/>(Management, Audit, CSV/Excel Imports)"]
    end

    subgraph FrontendApp ["Frontend Application Core (Next.js / React + TypeScript)"]
        Router["App Router & Role Guards<br/>(/student, /trainer, /admin)"]
        AuthStore["Auth & Session Store<br/>(Google OAuth 2.0 + JWT)"]
        DataLayer["Server State Cache<br/>(TanStack Query v5)"]
        UIComponents["Anti-Slop Design System<br/>(Zilla Slab + Tactile Tokens)"]
        ScannerModule["Turnstile Scanner Engine<br/>(html5-qrcode + Audio/Haptic)"]
        QRTokenEngine["QR Token Manager<br/>(Rotating Opaque Crypto-Hashes)"]
    end

    subgraph GatewayBoundary ["API Gateway (Port 8000)"]
        APIGateway["🛡️ Authenticated API Gateway<br/>(Reverse Proxy + JWT Verification + Rate Limiting)"]
    end

    subgraph BackendServices ["Backend Microservices (FastAPI)"]
        IdentitySvc["Identity Service"]
        StudentSvc["Student Service"]
        SlotSvc["Slot Service"]
        AllocationSvc["Allocation Service"]
        AttendanceSvc["Attendance Service"]
        NotificationSvc["Notification Service"]
        ComplaintSvc["Complaint Service"]
        ReportSvc["Report Service"]
    end

    MobileStudent --> Router
    TabletTrainer --> Router
    DesktopAdmin --> Router

    Router --> AuthStore
    Router --> UIComponents
    UIComponents --> DataLayer
    UIComponents --> ScannerModule
    UIComponents --> QRTokenEngine

    DataLayer -->|HTTPS /api/v1 + Bearer JWT| APIGateway
    ScannerModule -->|POST /api/v1/attendance/scan| APIGateway
    QRTokenEngine -->|GET /api/v1/students/gym-card/token| APIGateway

    APIGateway --> IdentitySvc
    APIGateway --> StudentSvc
    APIGateway --> SlotSvc
    APIGateway --> AllocationSvc
    APIGateway --> AttendanceSvc
    APIGateway --> NotificationSvc
    APIGateway --> ComplaintSvc
    APIGateway --> ReportSvc
```

---

## 2. Technology Stack & Decision Rationale

| Category | Recommended Stack | Production Alternatives | Rationale & Tradeoffs |
| :--- | :--- | :--- | :--- |
| **Framework** | **Next.js 14+ (App Router)** | **Vite + React 18 (SPA)** | Next.js App Router provides Server-Side Rendering (SSR) for the public landing page (crucial for SEO and initial load speeds) alongside client-side route layouts for authenticated portals. If deploying as a pure static bundle behind Nginx, Vite + React is fully compatible. |
| **Language** | **TypeScript 5.x** | — | Strict typing across all API payloads, domain events, form schemas, and user roles prevents runtime errors. |
| **Styling & CSS** | **Vanilla CSS Tokens + CSS Modules** | **Tailwind CSS (configured with design tokens)** | High aesthetic fidelity without framework bloat. Adheres strictly to the `page-is-the-object` tactile design system, fluid `clamp()` type scaling, and zero-slop layout rules. |
| **Server State** | **TanStack Query v5** | — | Built-in caching, background revalidation, optimistic updates for slot booking and transfer requests, and automatic deduplication. |
| **Client State** | **Zustand** | — | Lightweight store for active session tokens, sidebar collapse states, turnstile camera device IDs, and ephemeral modal states. |
| **Form Management** | **React Hook Form + Zod** | — | Type-safe schema validation matching backend Pydantic v2 schemas; minimal re-renders on dense administrative forms. |
| **QR Generation** | **qrcode.react** / **canvas** | — | Client-side vector and canvas rendering of high-entropy opaque hash tokens with zero latency. |
| **QR Scanning** | **html5-qrcode** | Native BarcodeDetector API | High compatibility across iOS Safari, Android Chrome, and desk tablets; handles camera switching and continuous scanning. |
| **Data Tables** | **TanStack Table v8** | — | Headless, highly performant virtualization for large attendance logs, waitlists, and student rosters without sluggish generic styling. |
| **Icons & Media** | **Custom SVG Glyphs** | Lucide Icons (curated) | Clean, geometric, non-emoji vector graphics matching academic and athletic aesthetic. |

---

## 3. Directory & Module Organization

The project follows a feature-driven, role-segregated architecture designed for maintainability and clear team boundaries:

```text
frontend/
├── public/
│   ├── assets/                 # Curated CC-licensed photography
│   │   ├── credits.json        # Open-access attribution catalog
│   │   └── *.jpg               # High-resolution athletic imagery
│   ├── favicon.ico
│   ├── manifest.json           # Progressive Web App manifest
│   └── sw.js                   # Service worker for offline gym card caching
├── src/
│   ├── app/                    # Next.js App Router / Page Roots
│   │   ├── (public)/           # Public routes (Landing, Auth)
│   │   │   ├── page.tsx        # Anti-slop landing page
│   │   │   ├── login/page.tsx  # Google OAuth initiation
│   │   │   └── auth/callback/  # OAuth redirect handler
│   │   ├── (portals)/          # Authenticated routes (Guarded)
│   │   │   ├── student/        # Student Portal screens
│   │   │   │   ├── dashboard/
│   │   │   │   ├── card/       # Digital gym card & QR
│   │   │   │   ├── slots/      # Available slots & waitlists
│   │   │   │   ├── transfer/   # Slot transfer engine
│   │   │   │   ├── attendance/ # History & absence barometer
│   │   │   │   └── complaints/ # Support tickets
│   │   │   ├── trainer/        # Gym Staff / Trainer screens
│   │   │   │   ├── scanner/    # Turnstile camera scanner
│   │   │   │   ├── manual/     # Fallback AP number search
│   │   │   │   └── roster/     # Real-time session roster
│   │   │   ├── admin/          # Sports Administrator screens
│   │   │   │   ├── dashboard/
│   │   │   │   ├── facilities/ # Gyms, slots, schedules
│   │   │   │   ├── windows/    # Registration windows
│   │   │   │   ├── transfers/  # Transfer reviews
│   │   │   │   ├── attendance/ # Audit & correction modal
│   │   │   │   ├── absence/    # Retention & reclamation
│   │   │   │   ├── complaints/ # Staff assignment & triage
│   │   │   │   ├── imports/    # Excel slot & student import
│   │   │   │   └── reports/    # CSV/Excel analytics export
│   │   │   └── super-admin/    # System Admin screens
│   │   │       ├── staff/      # Staff role provisioning
│   │   │       ├── settings/   # College domain & config
│   │   │       └── audit/      # Append-only audit logs
│   │   ├── layout.tsx          # Root layout with font injection
│   │   └── error.tsx           # Institutional error boundary
│   ├── components/             # Reusable UI component library
│   │   ├── ui/                 # Atomic design tokens (button, input, badge)
│   │   ├── feedback/           # Alert boxes, toasts, modals
│   │   ├── gym-card/           # Digital gym card & QR rotating token
│   │   ├── scanner/            # Camera scanner viewport & verification card
│   │   ├── tables/             # Headless virtualized table components
│   │   └── layout/             # Masthead, role navigations, footers
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts          # Session, user profile, role checks
│   │   ├── useQRToken.ts       # Rotating 30s token generator & poller
│   │   ├── useScanner.ts       # Camera lifecycle & audio feedback
│   │   └── useDebounce.ts      # Input debounce for search & filters
│   ├── lib/                    # Core utilities & API clients
│   │   ├── api-client.ts       # Typed Axios / Fetch wrapper with interceptors
│   │   ├── endpoints.ts        # Centralized REST endpoint catalog
│   │   ├── tokens.ts           # Token storage & expiry helpers
│   │   └── formatters.ts       # Date, time, AP number, capacity formatters
│   ├── styles/                 # Design system stylesheets
│   │   ├── tokens.css          # Color, typography, fluid clamps
│   │   ├── reset.css           # Modern box-sizing reset
│   │   └── globals.css         # Utility classes, animation layers
│   └── types/                  # TypeScript interface declarations
│       ├── api.ts              # Request/response envelope types
│       ├── student.ts          # Student profile, digital card, tokens
│       ├── slot.ts             # Gyms, slots, schedules, capacity
│       ├── attendance.ts       # Sessions, logs, corrections
│       └── complaints.ts       # Tickets, status, comments
├── Dockerfile                  # Multi-stage production container
├── nginx.conf                  # Production reverse proxy config
├── tsconfig.json
└── package.json
```

---

## 4. Authentication, Authorization & Session Lifecycle

Authentication strictly follows Google OAuth 2.0 / OpenID Connect restricted to approved institutional domains (`@srmap.edu.in`).

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student Browser
    participant FE as GymSlot Frontend
    participant Google as Google Identity Services
    participant GW as API Gateway (:8000)
    participant Auth as Identity Service

    Student->>FE: Click "Continue with SRM-AP Google Account"
    FE->>Google: Redirect to OAuth 2.0 Consent Screen
    Google-->>Student: Prompt for @srmap.edu.in account
    Student->>Google: Authenticate & Consent
    Google-->>FE: Redirect to /auth/callback?code=AUTH_CODE
    FE->>GW: POST /api/v1/auth/google/callback { code }
    GW->>Auth: Exchange code with Google & verify email domain
    Note over Auth: Verify provisioned account status & user roles
    Auth-->>GW: Issue Access Token (JWT, 60m) + HttpOnly Refresh Cookie
    GW-->>FE: Return { access_token, user: { id, name, role, ap_number } }
    FE->>FE: Store access_token in Memory / AuthState; redirect by role
    FE->>Student: Render role portal (/student/dashboard or /admin)
```

### Role-Based Route Guards (RBAC)
Routes are protected by a client-side middleware / layout guard with strict fallback handling:
- **`STUDENT`**: Restricted to `/student/*`. Attempts to access `/trainer/*` or `/admin/*` trigger a `403 Forbidden` slate.
- **`TRAINER`**: Restricted to turnstile scanner (`/trainer/*`) and personal profile.
- **`ADMIN`**: Access to sports administration (`/admin/*`), slots, attendance audits, and reporting.
- **`SUPER_ADMIN`**: Full platform authority including staff grants (`/super-admin/staff`) and institutional configuration.

### Session Expiry & Token Refresh
1. Access tokens are short-lived (60 minutes).
2. The Axios/Fetch client intercepts outgoing requests:
   ```typescript
   // lib/api-client.ts
   apiClient.interceptors.response.use(
     (response) => response,
     async (error) => {
       const originalRequest = error.config;
       if (error.response?.status === 401 && !originalRequest._retry) {
         originalRequest._retry = true;
         try {
           const { data } = await axios.post('/api/v1/auth/refresh');
           setAccessToken(data.access_token);
           originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
           return apiClient(originalRequest);
         } catch (refreshErr) {
           clearSession();
           window.location.href = '/login?expired=1';
           return Promise.reject(refreshErr);
         }
       }
       return Promise.reject(error);
     }
   );
   ```

---

## 5. State Management & Server Synchronization

### 5.1 TanStack Query Server State Cache
All server data uses structured cache keys to support deterministic invalidation:

| Query Key Pattern | Cache Duration (`staleTime`) | Revalidation Trigger |
| :--- | :--- | :--- |
| `['student', 'profile']` | 15 minutes | Photo change approval, account update |
| `['student', 'card']` | 30 seconds | Allocation transfer, session check-in |
| `['slots', 'facilities']` | 5 minutes | Slot update, window status change |
| `['slots', 'available', gymId]` | 15 seconds | Slot application, waitlist promotion |
| `['attendance', 'history']` | 2 minutes | Check-in event, admin correction |
| `['admin', 'transfers']` | 30 seconds | Admin review action |
| `['admin', 'complaints']` | 1 minute | Ticket creation, comment post |

### 5.2 Optimistic Updates for High-Contention Actions
When students apply for high-demand slots or request transfers, the UI immediately reflects the local status update with a rollback fallback if the backend serializable capacity constraint fails:
```typescript
const queryClient = useQueryClient();

const applySlotMutation = useMutation({
  mutationFn: (slotId: string) => api.post(`/api/v1/applications`, { slot_id: slotId }),
  onMutate: async (newSlotId) => {
    await queryClient.cancelQueries({ queryKey: ['student', 'application'] });
    const previousState = queryClient.getQueryData(['student', 'application']);
    queryClient.setQueryData(['student', 'application'], {
      slot_id: newSlotId,
      status: 'PENDING_CONFIRMATION',
    });
    return { previousState };
  },
  onError: (err, newSlotId, context) => {
    queryClient.setQueryData(['student', 'application'], context?.previousState);
    toast.error('Slot capacity filled. Placed in FCFS waitlist queue.');
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['slots', 'available'] });
  },
});
```

---

## 6. Secure Opaque QR Token & Digital Gym Card Architecture

### 6.1 Token Generation & Anti-Proxy Guarantee
Per Section 4 of the PRD:
- The QR code contains **no readable PII** (no AP number, student name, email, or photo reference).
- It encodes a high-entropy cryptographically secure random opaque token (e.g., `#tok-srm-c4d871c2-1745`).
- The token is bound on the backend to:
  1. The authenticated `student_id`
  2. The `allocation_id`
  3. The current `attendance_session_id`
- Tokens have a **strict 30-second validity window**. The client auto-rotates the token seamlessly:
  ```typescript
  // hooks/useQRToken.ts
  export function useQRToken() {
    const [token, setToken] = useState<string>('');
    const [expiresIn, setExpiresIn] = useState<number>(30);

    const fetchToken = async () => {
      const res = await api.get('/api/v1/students/gym-card/token');
      setToken(res.data.token_hash);
      setExpiresIn(30);
    };

    useEffect(() => {
      fetchToken();
      const interval = setInterval(() => {
        setExpiresIn((prev) => {
          if (prev <= 1) {
            fetchToken();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }, []);

    return { token, expiresIn };
  }
  ```

### 6.2 Pre-Signed S3 Photo Loading
Student photos are stored in private object storage. The frontend never accesses public S3 URLs:
- The backend generates short-lived (5-minute) pre-signed URLs for authenticated users.
- On card presentation, the pre-signed image is cached in memory for the duration of the turnstile interaction.

---

## 7. Turnstile Scanner Engine (`html5-qrcode`)

The trainer desk scanner runs directly within mobile Chrome/Safari and desktop browser tablets without requiring native store apps:
- Leverages `html5-qrcode` library configured for 15 frames per second.
- Automatic camera device selection prioritizing the environment-facing (rear) lens.
- Sound & visual feedback:
  - Green pulse + chime on valid verification.
  - Red vibration + buzz on duplicate check-in or expired token.
- Multi-point verification modal renders in `<100ms`:
  1. Official Student Photograph (large, high-contrast)
  2. Full Name & AP Number
  3. Assigned Gym Complex & Time Batch
  4. Instant One-Tap "Confirm Entry" / "Reject Entry" button.

---

## 8. Security & Compliance Checklist

- **No Local Storage of Secrets:** Access tokens reside in application memory; refresh tokens reside in `HttpOnly, Secure, SameSite=Strict` cookies.
- **Content Security Policy (CSP):** Script sources restricted to `'self'`; connect sources locked to `/api/v1` and Google OAuth endpoint.
- **Camera Permissions:** Explicitly declared in HTML header via `Permissions-Policy: camera=(self)`.
- **Zero In-Line Styles in Production:** All styles emitted via class names and CSS variables.
