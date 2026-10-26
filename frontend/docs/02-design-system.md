# 02. Anti-Slop Design System & Visual Tokens

**Version:** 1.0  
**Art Direction:** `page-is-the-object` (Stationery, Tabbed Physical Folders & Tactile Passes)  
**Curated Palette:** `three-stones` with Collegiate Athletic Green  
**Primary Typography:** `Zilla Slab` (Display & Headings) + System / Tabular Sans (Dense UI & Tables)

---

## 1. Design Philosophy: Anti-Slop & Tactile Reality

The visual identity of **GymSlot** rejects generic modern software clichés (floating purple cards, low-contrast grey-on-grey gradients, rounded pill overload, and decorative emoji icons).

Instead, it draws inspiration from collegiate sports facilities, official university documents, physical turnstile passes, and ledger timetables:
1. **The Page is the Object:** Surfaces feel like physical stationery, tabbed folders, perforated ticket slips, and printed athletic passes.
2. **Contrast & Authority:** High contrast inks against warm stone papers (WCAG AAA compliant at 9:1+ contrast).
3. **Restraint Over Decoration:** Tone steps define depth, not floating drop-shadows or 1px hairline dividers.
4. **Data-UI Boundary:** Software fragments (such as the interactive digital gym pass or the camera scanner) are strictly scoped with `data-ui`, allowing internal controls while keeping the outer canvas grounded.

---

## 2. Design Tokens & CSS Variables

All components consume standardized CSS custom properties defined in `:root`:

```css
:root {
  /* ---------- Background & Paper Surfaces ---------- */
  --bg: #eeecea;              /* Warm stone campus ground */
  --surface: #e4e1dd;         /* Crisp ledger paper */
  --surface-tint: #dbd6cd;    /* Slight warm card tint */
  --surface-dark: #cdc3b6;    /* Unselected tab / folder back */
  --card-paper: #e8e5e0;      /* Physical gym pass ground */

  /* ---------- Inks & Typography ---------- */
  --ink: #1c1b1a;             /* Deep academic charcoal ink (9.2:1 contrast) */
  --muted: #3a3836;           /* Subordinate metadata ink (6.8:1 contrast) */
  --faint: #696561;           /* Timetable captions & micro labels */

  /* ---------- Collegiate Athletic Accents ---------- */
  --accent: #2e4a3e;          /* SRM-AP Athletic Forest Green */
  --accent-hover: #1f352b;    /* Active press state */
  --accent-ink: #ffffff;      /* Contrast text on green */
  --accent-light: #d8e5df;    /* Subtle highlight badge */

  /* ---------- Status & Operational Accents ---------- */
  --status-present: #2e4a3e;  /* Present / Approved / Verified */
  --status-absent: #7a2b28;   /* Absent / Terminated / High-Risk */
  --status-late: #96611e;     /* Late Check-in */
  --status-waitlist: #3d5a80; /* Queued in FCFS waitlist */
  --status-pending: #856404;  /* Pending Admin Review */

  /* ---------- Folder Tab Tints ---------- */
  --folder-raman: #2a3a32;    /* C. V. Raman Complex */
  --folder-ganga: #384d43;    /* Ganga Hostel Center */
  --folder-krishna: #4b6256;  /* Krishna Strength Lab */
  --folder-narmada: #5d7568;  /* Narmada Dedicated Gym */

  /* ---------- Typography Hierarchy ---------- */
  --font-display: "Zilla Slab", Georgia, serif;
  --font-text: "Zilla Slab", Georgia, serif;
  --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "SF Mono", Consolas, Menlo, monospace;

  /* ---------- Fluid Fluid Step Scales (clamp) ---------- */
  --step-small: clamp(0.8125rem, 0.79rem + 0.1vw, 0.875rem);   /* 13-14px */
  --step-body: clamp(1.0625rem, 1rem + 0.25vw, 1.25rem);       /* 17-20px */
  --step-lead: clamp(1.25rem, 1.1rem + 0.7vw, 1.625rem);       /* 20-26px */
  --step-head: clamp(2rem, 1.3rem + 3.2vw, 3.8rem);             /* 32-61px */
  --step-display: clamp(4.2rem, 2rem + 8.5vw, 9.2rem);         /* 67-147px */

  /* ---------- Margins & Rhythm ---------- */
  --margin: clamp(1.2rem, 3vw, 3rem);
  --gutter: clamp(1rem, 2vw, 2.5rem);
  --section-gap: clamp(4.5rem, 8vw, 9rem);
  --radius: 0px; /* Tactile square paper edges */

  /* ---------- Motion ---------- */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --t-press: 140ms;
  --t-hover: 180ms;
}
```

---

## 3. Strict Anti-Slop House Rules

Every frontend page and component in GymSlot must strictly adhere to the following 8 house rules:

| # | Banned Slop Pattern | Required Engineering Alternative |
| :--- | :--- | :--- |
| **1** | **No 1px Hairline Outlines** | Surfaces must be defined by tone steps (e.g. `--surface` against `--bg`), not thin grey wireframes. |
| **2** | **No Floating Drop-Shadows** | In page layouts, avoid `box-shadow: 0 10px 30px rgba(0,0,0,0.1)`. Elements rest on the paper ground. Only software dialogs marked `[data-ui]` may cast authentic modal scrims. |
| **3** | **No Emoji in Controls** | Never use `✓`, `❌`, `🔥`, `⚡` in buttons, tabs, or badges. Use clean semantic SVG icons or explicit typography. |
| **4** | **No Cream/Purple Gradients** | No `background: linear-gradient(...)` across hero sections. Surfaces are solid, tactile, and pigment-rich. |
| **5** | **Headline Wrapping Rule** | Section headlines must never wrap past 2 lines on any screen (390px, 768px, or 1440px). Keep headlines concise (2 to 4 words). |
| **6** | **Tabular Figures for Data** | All capacity counters, timings, AP numbers, and queue positions must use `font-variant-numeric: tabular-nums` to prevent layout jitter. |
| **7** | **Zero Dead Blank Screens** | Dense administrative pages must never leave 60% of the viewport empty. Space must be populated with summary ledgers, sidebars, or photo panels. |
| **8** | **Accessible Reduced Motion** | All animations must use `@media (prefers-reduced-motion: reduce)` fallbacks with instant 0s opacity transitions. |

---

## 4. Core Component Blueprints

### 4.1 Physical Tabbed Folder Component
Used in the facility browser and registration window manager:
- Tabs extend from the top edge like physical filing folders.
- The active tab matches the background tone of the open sheet below it.
- Inactive tabs sit in a darker tone (`--surface-dark`), rising 2px on hover.

```html
<div class="folder-container">
  <div class="folder-tabs-bar" role="tablist">
    <button class="folder-tab-btn active" role="tab" aria-selected="true">C. V. Raman</button>
    <button class="folder-tab-btn" role="tab" aria-selected="false">Ganga</button>
    <button class="folder-tab-btn" role="tab" aria-selected="false">Krishna</button>
    <button class="folder-tab-btn" role="tab" aria-selected="false">Narmada</button>
  </div>
  <div class="folder-body" role="tabpanel">
    <!-- Active Sheet Content -->
  </div>
</div>
```

### 4.2 The Digital Gym Card Object (`data-ui`)
The central artefact of the platform. Rendered on both student smartphone screens and turnstile scanner overlays:
- **Aspect Ratio:** Fixed tactile card proportions (approx. 4:5).
- **Surface:** Warm paper `#e8e5e0` with clean micro-perforated top header.
- **Student Photograph:** High-contrast 105×125px portrait with authentic bevel.
- **Dynamic QR Code:** 120×120px opaque crypto-hash vector with 30s countdown bar.
- **Safety Indicator:** High-visibility green badge `TURNSTILE VALID`.

```html
<div class="digital-gym-card" data-ui>
  <div class="card-top-rule">
    <span class="card-uni">SRM University-AP</span>
    <span class="card-badge-status status-valid">Turnstile Valid</span>
  </div>
  <div class="card-body">
    <div class="card-photo-box">
      <img src="/api/v1/students/photo/presigned" alt="Aarav Raj" class="card-student-photo" />
      <span class="card-photo-caption">Official Photo</span>
    </div>
    <div class="card-details">
      <h3 class="card-student-name">Aarav Raj</h3>
      <p class="card-ap-number">AP21110010123</p>
      <dl class="card-meta-list">
        <dt>Assigned Gym</dt>
        <dd>C. V. Raman Complex</dd>
        <dt>Slot Timing</dt>
        <dd>17:45 – 18:45</dd>
      </dl>
    </div>
  </div>
  <div class="card-qr-box">
    <canvas id="qr-canvas" class="qr-code-graphic"></canvas>
    <div class="token-timer-bar">
      <span class="token-hash-label">#tok-srm-c4d871c2-1745</span>
      <span class="token-countdown nums">24s</span>
    </div>
  </div>
</div>
```

### 4.3 Perforated Access Itinerary Slip
Used for session timetables, registration receipts, and complaint ticket summaries:
- Features a decorative CSS `radial-gradient` zigzag tear along its top edge, giving the impression of an audit slip torn from a physical registrar book.
- Tabular key-value lists with clean dotted leaders connecting labels to facts.

```css
.itinerary-slip {
  background: var(--surface);
  padding: 2rem 2.5rem;
  position: relative;
  /* Perforated top edge */
  mask-image: radial-gradient(circle at 10px 0, transparent 0 6px, black 6.5px);
  mask-size: 20px 20px;
  mask-repeat: repeat-x;
}
```

### 4.4 Dense Administrative Data Tables
For attendance ledgers, transfer request queues, and student rosters:
- **Zero Heavy Borders:** Subtle alternating row zebra tints (`--surface` and `--bg`).
- **Tabular Figures:** Timestamps, AP numbers, and capacities set in `tabular-nums`.
- **Status Pills:** Compact, square-cornered filled tags without rounded bubbles:
  - `PRESENT` (`#2e4a3e` background, white text)
  - `ABSENT` (`#7a2b28` background, white text)
  - `LATE` (`#96611e` background, white text)
  - `EXCUSED` (`#3a3836` background, white text)

---

## 5. Responsive Grid & Breakpoint Standards

The layout relies on fluid containers rather than rigid media query jumps:
- **Mobile (`320px – 599px`):** Single column, touch targets minimum 48px, horizontal tab bars switch to sticky segmented controls or stacked tabs.
- **Tablet (`600px – 1099px`):** 2-column asymmetric split (e.g. Digital Gym Card left, session timetable right).
- **Desktop (`1100px – 1440px+`):** Full 12-column ledger layout with sidebars, telemetry metrics, and high-density queues.
