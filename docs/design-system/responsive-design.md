# Responsive Design Guide

## Philosophy: Mobile-First

All components are built **mobile-first**, meaning we design for mobile devices first, then progressively enhance for larger screens. This ensures:

- ✅ Better performance on mobile devices
- ✅ Simpler, cleaner base styles
- ✅ Progressive enhancement mindset
- ✅ Accessibility by default

## Breakpoints

Our responsive system uses the following breakpoints:

| Name | Min Width | Target Devices |
|------|-----------|----------------|
| **Default** | 0px | Mobile phones (portrait) |
| **sm** | 640px | Large phones, small tablets |
| **md** | 768px | Tablets (portrait) |
| **lg** | 1024px | Tablets (landscape), small laptops |
| **xl** | 1280px | Desktops |
| **2xl** | 1536px | Large desktops |

## Core Principles

### 1. Mobile-First Media Queries

Always write styles for mobile first, then use `min-width` media queries:

```css
/* ✅ GOOD: Mobile-first */
.component {
  padding: var(--spacing-sm);  /* Mobile */
}

@media (min-width: 768px) {
  .component {
    padding: var(--spacing-lg);  /* Tablet and up */
  }
}

/* ❌ BAD: Desktop-first */
.component {
  padding: var(--spacing-lg);  /* Desktop */
}

@media (max-width: 767px) {
  .component {
    padding: var(--spacing-sm);  /* Mobile (harder to maintain) */
  }
}
```

### 2. Touch-Friendly Targets

Ensure interactive elements are at least 44x44px for touch devices:

```css
button {
  min-height: 44px;
  min-width: 44px;
  padding: var(--spacing-sm) var(--spacing-md);
}
```

### 3. Flexible Layouts

Use flexible units (%, rem, em, fr) instead of fixed pixels:

```css
/* ✅ GOOD */
.container {
  width: 100%;
  max-width: 1280px;
  padding: var(--spacing-md);
}

/* ❌ BAD */
.container {
  width: 1280px;  /* Fixed, will overflow on mobile */
  padding: 16px;
}
```

## Utility Classes

### Container

Centers content with responsive max-width:

```jsx
<div className="container">
  {/* Content automatically centered with proper padding */}
</div>
```

### Responsive Grid

Mobile-first grid system:

```jsx
{/* 1 column on mobile, 2 on tablet, 3 on desktop */}
<div className="grid grid-cols-1 grid-md-2 grid-lg-3">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

### Display Utilities

Control visibility at different breakpoints:

```jsx
{/* Hide on mobile, show on tablet+ */}
<div className="hidden-mobile">Desktop Navigation</div>

{/* Show on mobile, hide on tablet+ */}
<div className="visible-mobile">Mobile Menu Icon</div>
```

### Flexbox Utilities

```jsx
{/* Stack on mobile, row on tablet+ */}
<div className="flex flex-col flex-md-row">
  <div>Sidebar</div>
  <div>Main Content</div>
</div>
```

### Responsive Typography

```jsx
{/* Font size scales with viewport */}
<h1 className="text-responsive-xl">
  Responsive Heading
</h1>
```

### Responsive Images

```jsx
{/* Image scales to container, maintains aspect ratio */}
<img src="..." alt="..." className="img-responsive" />

{/* Maintain 16:9 aspect ratio */}
<div className="aspect-video">
  <img src="..." alt="..." className="img-responsive" />
</div>
```

## Component-Level Patterns

### Pattern 1: Stacking Layout

Common pattern: Stack on mobile, side-by-side on tablet+

```css
.card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

@media (min-width: 768px) {
  .card {
    flex-direction: row;
  }
}
```

### Pattern 2: Responsive Spacing

Smaller spacing on mobile, larger on desktop:

```css
.section {
  padding: var(--spacing-md);
}

@media (min-width: 768px) {
  .section {
    padding: var(--spacing-xl);
  }
}

@media (min-width: 1024px) {
  .section {
    padding: var(--spacing-2xl);
  }
}
```

### Pattern 3: Responsive Grid

Auto-fit columns based on minimum size:

```css
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-md);
}
```

### Pattern 4: Hamburger Menu

Show full nav on desktop, hamburger on mobile:

```jsx
function Navigation() {
  return (
    <nav>
      {/* Desktop navigation - hidden on mobile */}
      <ul className="hidden-mobile">
        <li>Home</li>
        <li>About</li>
        <li>Contact</li>
      </ul>

      {/* Mobile hamburger - hidden on desktop */}
      <button className="visible-mobile">
        Menu
      </button>
    </nav>
  )
}
```

## Testing Responsive Designs

### Manual Testing

Test on actual devices when possible. Minimum test suite:

- ✅ iPhone SE (320px width - smallest common device)
- ✅ iPhone 12/13 (390px)
- ✅ iPad (768px)
- ✅ Laptop (1280px)
- ✅ Desktop (1920px+)

### Browser DevTools

Use responsive design mode in Chrome/Firefox DevTools:

1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M)
3. Test various device presets
4. Test custom viewport sizes

### Touch Testing

On desktop, test touch interactions:
- Ensure buttons are large enough
- Test hover states work on touch
- Verify touch gestures (swipe, pinch)

## Performance Considerations

### 1. Images

Use responsive images to avoid loading huge images on mobile:

```jsx
<img
  src="image-mobile.jpg"
  srcSet="
    image-mobile.jpg 640w,
    image-tablet.jpg 768w,
    image-desktop.jpg 1280w
  "
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  alt="Responsive image"
/>
```

### 2. Conditional Loading

Load heavy components only on larger screens:

```jsx
import { useMediaQuery } from '../hooks/useMediaQuery'

function Dashboard() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  return (
    <div>
      <MainContent />
      {isDesktop && <Sidebar />}
    </div>
  )
}
```

### 3. CSS-in-JS Considerations

When using inline styles, prefer CSS classes for responsive design to avoid JavaScript overhead.

## Accessibility

Responsive design must maintain accessibility:

- ✅ Maintain logical tab order on all screen sizes
- ✅ Ensure sufficient color contrast
- ✅ Keep text readable (min 16px on mobile)
- ✅ Provide alternatives to hover (for touch devices)
- ✅ Test with screen readers on mobile

## Common Pitfalls

### ❌ Fixed Widths

```css
/* BAD */
.sidebar {
  width: 300px;  /* Will overflow on small screens */
}

/* GOOD */
.sidebar {
  width: 100%;
  max-width: 300px;
}
```

### ❌ Horizontal Scroll

```css
/* BAD */
.content {
  min-width: 1200px;  /* Forces horizontal scroll on mobile */
}

/* GOOD */
.content {
  width: 100%;
  max-width: 1200px;
}
```

### ❌ Tiny Touch Targets

```css
/* BAD */
button {
  padding: 2px 4px;  /* Too small for touch */
}

/* GOOD */
button {
  min-height: 44px;
  padding: var(--spacing-sm) var(--spacing-md);
}
```

### ❌ Desktop-Only Testing

Always test on actual mobile devices, not just DevTools.

## Best Practices Checklist

- ✅ Write mobile styles first
- ✅ Use `min-width` media queries
- ✅ Test on real devices
- ✅ Ensure touch targets are 44x44px minimum
- ✅ Use flexible units (rem, %, fr)
- ✅ Optimize images for different screen sizes
- ✅ Maintain accessibility across breakpoints
- ✅ Keep the DOM structure the same across breakpoints
- ✅ Use CSS for layout changes, not JavaScript when possible
- ✅ Test in both portrait and landscape orientations

## Resources

- [MDN: Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Web.dev: Responsive Web Design Basics](https://web.dev/responsive-web-design-basics/)
- [WCAG Touch Target Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
