# Phoenix Secondary School - Frontend Style Guide & Component Reference

This style guide documents the CSS design tokens, color variables, typography, UI layout components, accessibility features, and print utilities defined in **`styles.css`**. Use these exact HTML structures, class names, and color codes across all pages on the Phoenix Secondary School website repository.

---

## 1. Brand Color Palette & CSS Design Tokens

| Token Name | Hex Code | Purpose / Usage |
| :--- | :--- | :--- |
| `--primary-red` | `#8B0000` | Crimson Red — Brand headers, primary CTAs, active links, badges |
| `--secondary-slate` | `#1E293B` | Slate Dark — Body text, dark footers, secondary headings |
| `--accent-gold` | `#D97706` | Gold — Announcement ticker, secondary CTAs, focus indicators |
| `--bg-light` | `#F8FAFC` | Off-White — Global page background |
| `--bg-card` | `#FFFFFF` | Pure White — Card backgrounds, header bars, container text |
| `--text-muted` | `#64748B` | Slate Gray — Subtitles, dates, secondary captions |

---

## 2. Typography & Heading Standards

```html
<h1>Page Title (Hero / Main Header)</h1>
<h2>Primary Section Header</h2>
<h3>Subsection Title</h3>
<h4>Card Title / Secondary Subheading</h4>
<p>Body copy with standard 1.6 line height for legibility.</p>
```

---

## 3. Component Syntax & Class Reference

### A. Buttons & Action CTAs
Combine `.btn` with the color variant:

```html
<!-- Primary Action Button (Crimson Red) -->
<a href="admissions.html" class="btn btn-primary">Apply Now</a>

<!-- Secondary Action Button (Gold) -->
<a href="contact.html" class="btn btn-secondary">Book a Tour</a>

<!-- Outline Action Button -->
<a href="about.html" class="btn btn-outline">Read School History</a>
```

### B. Urgent Announcement Ticker
Place at the top of `index.html` below the site header:

```html
<div class="announcement-ticker">
  <div class="container ticker-content">
    <span><span class="ticker-badge">Notice</span> 2027 Admissions Pop-Up Centre open Saturdays from 09:00 - 13:00.</span>
  </div>
</div>
```

### C. Cards & Grid System (`.grid-2`, `.grid-3`, `.grid-4`)
Use grid wrappers for multi-item displays:

```html
<div class="grid-3">
  <article class="card">
    <div class="card-body">
      <span class="badge badge-red">Academic</span>
      <h4 class="card-title">German Exchange</h4>
      <p class="card-text">German language and exchange program for Grade 11 learners.</p>
    </div>
  </article>
  <article class="card">
    <div class="card-body">
      <span class="badge badge-gold">Sports</span>
      <h4 class="card-title">Competitive Soccer</h4>
      <p class="card-text">U15, U17, and U19 soccer teams competing in regional leagues.</p>
    </div>
  </article>
  <article class="card">
    <div class="card-body">
      <span class="badge badge-red">Admissions</span>
      <h4 class="card-title">Online Portal</h4>
      <p class="card-text">Direct signposting and document checklist for school registration.</p>
    </div>
  </article>
</div>
```

---

## 4. Accessibility & Inclusive Design Classes

### A. Keyboard Skip Link
Place as the first child directly under `<body>` to allow keyboard and screen-reader users to bypass header navigation:

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
```

### B. Screen Reader Only Class (`.sr-only`)
Use `.sr-only` to provide context for screen readers without altering the visual design:

```html
<button class="mobile-toggle" aria-label="Toggle Navigation Menu">
  <span class="sr-only">Open main menu</span>
  ☰
</button>
```

### C. High-Contrast Focus Rings
All interactive elements (`<a>`, `<button>`, `<input>`, `<select>`) automatically display a high-contrast 3px `--accent-gold` focus outline when navigated via keyboard (`:focus-visible`).

---

## 5. Print Stylesheet Utilities (`@media print`)

When users print pages or save checklists as PDF:
- Non-essential UI components (`.site-header`, `.announcement-ticker`, `.header-ctas`, `.site-footer`) are automatically hidden.
- Page backgrounds reset to pure white with high-contrast dark text for ink saving.
- Cards, checklist items (`.checklist-card`), and tables prevent awkward mid-element page splits (`break-inside: avoid`).
- External URLs automatically display inline after link text.

---

## 6. Responsive Layout Rules

- **Container:** Wrap inner page content in `<div class="container">` to maintain max-width (`1200px`) and responsive side padding (`width: 90%`).
- **Breakpoints:** Media queries trigger automatically at `992px` (tablet) and `768px` (mobile), collapsing grid columns vertically and enabling the mobile navigation menu.