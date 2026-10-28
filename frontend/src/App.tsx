import { Routes, Route, Navigate, Link } from 'react-router-dom';

export default function App() {
  return (
    <div className="app-root">
      <Routes>
        <Route path="/" element={<HomePortalNavigator />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/onboarding" element={<StudentOnboardingPage />} />
        
        {/* Student Portal */}
        <Route path="/student/dashboard" element={<PlaceholderSlate title="Student Dashboard" role="STUDENT" />} />
        <Route path="/student/qr-code" element={<PlaceholderSlate title="Student QR Code" role="STUDENT" />} />
        <Route path="/student/slots" element={<PlaceholderSlate title="Browse Eligible Slots" role="STUDENT" />} />
        <Route path="/student/transfer" element={<PlaceholderSlate title="Protected Slot Transfer Engine" role="STUDENT" />} />
        <Route path="/student/attendance" element={<PlaceholderSlate title="Attendance History & Absence Risk" role="STUDENT" />} />
        <Route path="/student/complaints" element={<PlaceholderSlate title="Student Support Tickets" role="STUDENT" />} />

        {/* Staff Scanner Portal */}
        <Route path="/staff/scanner" element={<PlaceholderSlate title="Turnstile Camera Scanner" role="STAFF" />} />
        <Route path="/staff/manual-checkin" element={<PlaceholderSlate title="Manual AP Number Check-In" role="STAFF" />} />
        <Route path="/staff/session-roster" element={<PlaceholderSlate title="Live Session Roster" role="STAFF" />} />

        {/* Sports Admin Portal */}
        <Route path="/admin/dashboard" element={<PlaceholderSlate title="Sports Admin Dashboard" role="ADMIN" />} />
        <Route path="/admin/facilities" element={<PlaceholderSlate title="Gym Facilities & Recurrence Schedules" role="ADMIN" />} />
        <Route path="/admin/windows" element={<PlaceholderSlate title="Registration Windows" role="ADMIN" />} />
        <Route path="/admin/transfers" element={<PlaceholderSlate title="Transfer Requests Review" role="ADMIN" />} />
        <Route path="/admin/attendance" element={<PlaceholderSlate title="Attendance Audit & Correction Center" role="ADMIN" />} />
        <Route path="/admin/absence" element={<PlaceholderSlate title="Absence Monitoring & Allocation Management" role="ADMIN" />} />
        <Route path="/admin/complaints" element={<PlaceholderSlate title="Complaints Management Desk" role="ADMIN" />} />
        <Route path="/admin/imports" element={<PlaceholderSlate title="Bulk Excel / CSV Import Hub" role="ADMIN" />} />
        <Route path="/admin/reports" element={<PlaceholderSlate title="Compliance Analytics & Reports Export" role="ADMIN" />} />

        {/* Super Admin */}
        <Route path="/super-admin/staff" element={<PlaceholderSlate title="Staff Provisioning & Role Delegation" role="SUPER_ADMIN" />} />
        <Route path="/super-admin/settings" element={<PlaceholderSlate title="System Settings & Domain Rules" role="SUPER_ADMIN" />} />
        <Route path="/super-admin/audit" element={<PlaceholderSlate title="Immutable Audit Trail Inspector" role="SUPER_ADMIN" />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function HomePortalNavigator() {
  return (
    <div className="wrap" style={{ paddingBlock: '3rem' }}>
      <header style={{ marginBottom: '2.5rem', borderBottom: '2px solid var(--surface-dark)', paddingBottom: '1.5rem' }}>
        <span className="small" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
          SRM University-AP · Sports Department
        </span>
        <h1 className="head" style={{ marginTop: '0.5rem', color: 'var(--ink)' }}>GymSlot Portal Engine</h1>
        <p className="lead" style={{ marginTop: '0.5rem', color: 'var(--muted)' }}>
          Official gym slot allocation, student QR pass, and attendance management portal.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <PortalCard
          title="Student Portal"
          desc="Access your scheduled slot, view your QR code for turnstile check-in, browse open batches, or apply for transfers."
          links={[
            { label: 'Student Dashboard', to: '/student/dashboard' },
            { label: 'Student QR Code', to: '/student/qr-code' },
            { label: 'Browse Gym Slots', to: '/student/slots' },
            { label: 'Request Slot Transfer', to: '/student/transfer' },
            { label: 'Attendance History', to: '/student/attendance' },
            { label: 'Support & Complaints', to: '/student/complaints' },
          ]}
        />

        <PortalCard
          title="Gym Staff Scanner"
          desc="Camera scanner for turnstile desk verification, attendance marking, duplicate guard, and manual AP lookup."
          links={[
            { label: 'Turnstile QR Scanner', to: '/staff/scanner' },
            { label: 'Manual AP Check-In', to: '/staff/manual-checkin' },
            { label: 'Session Live Roster', to: '/staff/session-roster' },
          ]}
        />

        <PortalCard
          title="Sports Administration"
          desc="Facility configuration, registration windows, transfer triage, attendance audit & correction, and absence monitoring."
          links={[
            { label: 'Admin Dashboard', to: '/admin/dashboard' },
            { label: 'Facilities & Slots', to: '/admin/facilities' },
            { label: 'Registration Windows', to: '/admin/windows' },
            { label: 'Transfer Requests', to: '/admin/transfers' },
            { label: 'Attendance Audit', to: '/admin/attendance' },
            { label: 'Absence Monitoring', to: '/admin/absence' },
            { label: 'Complaints Desk', to: '/admin/complaints' },
            { label: 'Bulk Excel Import', to: '/admin/imports' },
            { label: 'Reports Export', to: '/admin/reports' },
          ]}
        />

        <PortalCard
          title="System Administration"
          desc="Super Admin control center for staff provisioning, college email domain rules, and immutable audit logs."
          links={[
            { label: 'Staff Provisioning', to: '/super-admin/staff' },
            { label: 'System Settings', to: '/super-admin/settings' },
            { label: 'Audit Trail Inspector', to: '/super-admin/audit' },
          ]}
        />
      </div>

      <footer style={{ borderTop: '2px solid var(--surface-dark)', paddingTop: '1.5rem', color: 'var(--muted)', fontSize: 'var(--step-small)' }}>
        <p>
          Landing Page: <a href="/web/index.html" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>View Official Public Landing Page</a> · SRM University-AP Sports Facilities
        </p>
      </footer>
    </div>
  );
}

function PortalCard({ title, desc, links }: { title: string; desc: string; links: { label: string; to: string }[] }) {
  return (
    <div style={{ background: 'var(--surface)', padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ fontSize: '1.35rem', color: 'var(--ink)' }}>{title}</h2>
      <p style={{ fontSize: '0.95rem', color: 'var(--muted)', lineHeight: '1.45' }}>{desc}</p>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              style={{
                display: 'inline-block',
                padding: '0.4rem 0.8rem',
                background: 'var(--bg)',
                color: 'var(--ink)',
                fontSize: '0.9rem',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              → {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlaceholderSlate({ title, role }: { title: string; role: string }) {
  return (
    <div className="wrap" style={{ paddingBlock: '4rem' }}>
      <Link to="/" style={{ color: 'var(--accent)', textDecoration: 'underline', marginBottom: '1.5rem', display: 'inline-block' }}>
        ← Return to Portal Hub
      </Link>
      <div style={{ background: 'var(--surface)', padding: '2.5rem', maxWidth: '800px' }}>
        <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
          {role} ROLE SCREEN
        </span>
        <h1 className="head" style={{ marginBlock: '0.8rem', color: 'var(--ink)' }}>{title}</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
          This screen is scaffolded and ready for feature implementation per the Phase specifications in <code>frontend/docs/frontend-implementation-plan.md</code>.
        </p>
        <div style={{ padding: '1rem', background: 'var(--bg)', borderLeft: '4px solid var(--accent)' }}>
          <span className="nums" style={{ fontSize: '0.9rem' }}>Status: Scaffolded · React Router v6 Active</span>
        </div>
      </div>
    </div>
  );
}

function LoginPage() {
  return <PlaceholderSlate title="Google OAuth 2.0 Sign-In" role="PUBLIC" />;
}

function AuthCallbackPage() {
  return <PlaceholderSlate title="OAuth 2.0 Callback & Token Exchange" role="PUBLIC" />;
}

function StudentOnboardingPage() {
  return <PlaceholderSlate title="Student Profile Onboarding (Verified Details)" role="STUDENT" />;
}
