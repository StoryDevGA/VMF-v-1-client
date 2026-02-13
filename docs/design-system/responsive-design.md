# Responsive Design Guide

## Philosophy: Mobile-First

All styles are written for mobile first, then enhanced at larger breakpoints with `min-width` media queries. This ensures:

- Better performance on mobile devices
- Simpler, cleaner base styles
- Progressive enhancement mindset
- Accessibility by default

---

## Breakpoints

| Name | Min Width | Target Devices |
|------|-----------|----------------|
| **Default** | 0 px | Mobile phones (portrait) |
| **sm** | 640 px | Large phones, small tablets |
| **md** | 768 px | Tablets (portrait) |
| **lg** | 1024 px | Tablets (landscape), small laptops |
| **xl** | 1280 px | Desktops |
| **2xl** | 1536 px | Large desktops |

CSS custom-property references (for JavaScript):

```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

---

## Typography — StorylineOS Spec

The typography system is defined in `index.css` using tokens from `variables.css`. Sizes are mobile-first; the `@media (min-width: 1280px)` query scales to desktop.

### Mobile (default — up to 1279 px)

| Element | Font | Size | Line Height |
|---------|------|------|-------------|
| **H1** | Sora (`--font-primary`) | 23 px (`--font-size-xl`) | 1.1 |
| **H2, H3** | League Spartan (`--font-display`) | 23 px (`--font-size-xl`) | 1.5 |
| **Body** | Sora (`--font-primary`) | 16 px (`--font-size-base`) | 1.6 |

### Desktop (1280 px +)

| Element | Font | Size | Line Height |
|---------|------|------|-------------|
| **H1** | Sora | **40 px** (`--font-size-3xl`) | 1.1 |
| **H2, H3** | League Spartan | **35 px** (`--font-size-2xl`) | 1.5 |
| **Body** | Sora | **20 px** (`--font-size-lg`) | 1.6 |

### How It Works in Code

```css
/* index.css — mobile-first */
h1 {
  font-family: var(--font-primary);
  font-size: var(--font-size-xl);         /* 23px */
  line-height: var(--line-height-tight);  /* 1.1 */
}

h2, h3 {
  font-family: var(--font-display);
  font-size: var(--font-size-xl);         /* 23px */
  line-height: var(--line-height-normal); /* 1.5 */
}

body {
  font-family: var(--font-primary);
  font-size: var(--font-size-base);       /* 16px */
  line-height: var(--line-height-relaxed);/* 1.6 */
}

@media (min-width: 1280px) {
  h1   { font-size: var(--font-size-3xl); }  /* 40px */
  h2,
  h3   { font-size: var(--font-size-2xl); }  /* 35px */
  body { font-size: var(--font-size-lg);  }  /* 20px */
}
```

---

## Core Principles

### 1. Mobile-First Media Queries

```css
/* ✅ GOOD — mobile-first */
.component { padding: var(--spacing-sm); }

@media (min-width: 768px) {
  .component { padding: var(--spacing-lg); }
}

/* ❌ BAD — desktop-first */
.component { padding: var(--spacing-lg); }

@media (max-width: 767px) {
  .component { padding: var(--spacing-sm); }
}
```

### 2. Touch-Friendly Targets (44 × 44 px minimum)

```css
button {
  min-height: 44px;
  min-width: 44px;
  padding: var(--spacing-sm) var(--spacing-md);
}
```

### 3. Flexible Layouts

```css
/* ✅ GOOD */
.container {
  width: 100%;
  max-width: 1280px;
  padding: var(--spacing-md);
}

/* ❌ BAD */
.container {
  width: 1280px;   /* overflows on mobile */
  padding: 16px;   /* hardcoded */
}
```

---

## Utility Classes (`responsive.css`)

### Container

Centers content with responsive max-width:

```html
<div class="container"> … </div>
```

Max-width at each breakpoint:

| Breakpoint | Max Width |
|------------|-----------|
| sm (640 px) | 640 px |
| md (768 px) | 768 px |
| lg (1024 px) | 1024 px |
| xl (1280 px) | 1280 px |
| 2xl (1536 px) | 1536 px |

### Display Utilities

| Class | Behaviour |
|-------|-----------|
| `.hidden-mobile` | Hidden below 768 px, visible at 768 px + |
| `.visible-mobile` | Visible below 768 px, hidden at 768 px + |
| `.hidden-tablet` | Hidden below 1024 px, visible at 1024 px + |

### Responsive Grid

```html
<!-- 1 col mobile, 2 cols tablet, 3 cols desktop -->
<div class="grid grid-cols-1 grid-md-2 grid-lg-3">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

### Flexbox Utilities

```html
<!-- Stack on mobile, row on tablet+ -->
<div class="flex flex-col flex-md-row">
  <div>Sidebar</div>
  <div>Main</div>
</div>
```

---

## Common Responsive Patterns

### Stacking Layout

```css
.card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

@media (min-width: 768px) {
  .card { flex-direction: row; }
}
```

### Responsive Spacing

```css
.section { padding: var(--spacing-md); }

@media (min-width: 768px)  { .section { padding: var(--spacing-xl); } }
@media (min-width: 1024px) { .section { padding: var(--spacing-2xl); } }
```

### Auto-fit Grid

```css
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-md);
}
```

### Hamburger Menu

```jsx
<nav>
  <ul className="hidden-mobile">  {/* Desktop nav */}
    <li>Home</li>
    <li>About</li>
  </ul>
  <button className="visible-mobile"> {/* Mobile hamburger */}
    Menu
  </button>
</nav>
```

---

## Testing Responsive Designs

### Minimum Device Matrix

| Device | Width |
|--------|-------|
| iPhone SE | 320 px |
| iPhone 12/13 | 390 px |
| iPad | 768 px |
| Laptop | 1280 px |
| Desktop | 1920 px + |

### Browser DevTools

1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test presets and custom sizes
4. Verify touch interactions

---

## Performance

- Use responsive images with `srcSet` / `sizes`
- Load heavy components conditionally (`useMediaQuery`)
- Prefer CSS for layout changes over JavaScript

---

## Accessibility

- Maintain logical tab order at all breakpoints
- Ensure WCAG AA contrast on dark backgrounds
- Keep text ≥ 16 px on mobile
- Provide alternatives to hover for touch devices
- Test with screen readers on mobile

---

## Best Practices Checklist

- ✅ Write mobile styles first
- ✅ Use `min-width` media queries
- ✅ Test on real devices
- ✅ Touch targets ≥ 44 × 44 px
- ✅ Flexible units (rem, %, fr)
- ✅ Optimise images for breakpoints
- ✅ Maintain accessibility across sizes
- ✅ Use CSS for layout, not JavaScript
- ✅ Test portrait and landscape
