# Theming System

## Overview

The theming system makes it **extremely easy** to modify or completely swap color schemes without touching any component code. All colors are defined once and propagate automatically.

## How Easy Is It?

### ✅ Change Entire Color Scheme: **30 seconds**
Just update the primary color values in `src/styles/variables.css`

### ✅ Switch to Dark Mode: **1 line of code**
Add `data-theme="dark"` to your `<html>` tag

### ✅ Create Custom Theme: **5 minutes**
Add a new theme variant in `src/styles/themes.css`

### ✅ Runtime Theme Switching: **10 lines of JavaScript**
Use our theme hook (shown below)

## Architecture

```
Color System (3 Layers)
│
├─ Layer 1: Color Palette (variables.css)
│  └─ Raw color values (--color-primary-500, --color-gray-200, etc.)
│
├─ Layer 2: Semantic Tokens (themes.css)
│  └─ Contextual mappings (--color-background, --color-text-primary, etc.)
│
└─ Layer 3: Components
   └─ Use semantic tokens only (color: var(--color-text-primary))
```

**Why 3 layers?**
- Layer 1: Define all available colors once
- Layer 2: Map colors to purpose (background, text, borders, etc.)
- Layer 3: Components always work, regardless of theme

## Quick Start

### Switch to Dark Mode

```html
<!-- In public/index.html or via JavaScript -->
<html data-theme="dark">
```

### Use Pre-built Themes

```html
<!-- Ocean theme (cyan/blue) -->
<html data-theme="ocean">

<!-- Sunset theme (orange/red) -->
<html data-theme="sunset">

<!-- Forest theme (green) -->
<html data-theme="forest">
```

### Respect System Preference

No code needed! The theme system automatically respects `prefers-color-scheme`:

```css
/* Automatic dark mode if user's OS is set to dark */
@media (prefers-color-scheme: dark) {
  /* Applied automatically */
}
```

## Creating a Custom Theme

### Option 1: Modify Existing Primary Colors

**File:** `src/styles/variables.css`

```css
:root {
  /* Change these 9 values to rebrand entire app */
  --color-primary-50: #your-color;
  --color-primary-100: #your-color;
  --color-primary-200: #your-color;
  --color-primary-300: #your-color;
  --color-primary-400: #your-color;
  --color-primary-500: #your-color;  /* Main brand color */
  --color-primary-600: #your-color;
  --color-primary-700: #your-color;
  --color-primary-800: #your-color;
  --color-primary-900: #your-color;
}
```

**Result:** Entire app uses new brand colors instantly.

### Option 2: Create Theme Variant

**File:** `src/styles/themes.css`

```css
[data-theme='my-brand'] {
  /* Override primary palette */
  --color-primary-500: #FF6B6B;
  --color-primary-600: #EE5A52;
  --color-primary-700: #DC4C3F;

  /* Override semantic colors if needed */
  --color-action-primary: var(--color-primary-600);
  --color-action-primary-hover: var(--color-primary-700);
}
```

**Usage:**
```html
<html data-theme="my-brand">
```

## Runtime Theme Switching

### Basic JavaScript

```javascript
// Switch theme
document.documentElement.setAttribute('data-theme', 'dark')

// Remove theme (use default)
document.documentElement.removeAttribute('data-theme')

// Get current theme
const theme = document.documentElement.getAttribute('data-theme')
```

### React Hook (Recommended)

Create `src/hooks/useTheme.js`:

```javascript
import { useEffect, useState } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'light'
  )

  useEffect(() => {
    // Apply theme to document
    if (theme === 'light') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }

    // Persist to localStorage
    localStorage.setItem('theme', theme)
  }, [theme])

  return { theme, setTheme }
}
```

**Usage in Component:**

```jsx
import { useTheme } from '../hooks/useTheme'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
    </button>
  )
}
```

## Semantic Color Tokens

Use these in your components - they automatically adapt to themes:

### Background Colors
```css
background-color: var(--color-background);          /* Main background */
background-color: var(--color-background-secondary); /* Subtle contrast */
background-color: var(--color-surface);              /* Cards, panels */
```

### Text Colors
```css
color: var(--color-text-primary);    /* Main text */
color: var(--color-text-secondary);  /* Less important text */
color: var(--color-text-tertiary);   /* Hints, placeholders */
color: var(--color-text-inverse);    /* Text on dark backgrounds */
```

### Border Colors
```css
border-color: var(--color-border);        /* Default borders */
border-color: var(--color-border-hover);  /* Hover state */
border-color: var(--color-border-focus);  /* Focus state */
```

### Action Colors
```css
/* Primary actions (CTA buttons, links) */
background-color: var(--color-action-primary);
background-color: var(--color-action-primary-hover);

/* Secondary actions (cancel, back buttons) */
background-color: var(--color-action-secondary);
background-color: var(--color-action-secondary-hover);
```

## Best Practices

### ✅ DO

```css
/* Use semantic tokens */
.button {
  background-color: var(--color-action-primary);
  color: var(--color-text-inverse);
}

/* Theme will switch automatically */
```

### ❌ DON'T

```css
/* Don't hardcode colors */
.button {
  background-color: #3b82f6;  /* Won't change with theme */
  color: white;
}
```

### ✅ DO

```css
/* Use palette colors for specific needs */
.error-badge {
  background-color: var(--color-error);
}
```

### ❌ DON'T

```css
/* Don't create arbitrary colors */
.custom {
  background-color: #random123;  /* Not in design system */
}
```

## Complete Theme Example

### Custom Brand Theme

**Step 1:** Generate your color palette
Use a tool like [UI Colors](https://uicolors.app/) to generate a scale from your brand color.

**Step 2:** Add to `themes.css`

```css
[data-theme='acme-corp'] {
  /* Your brand color palette */
  --color-primary-50: #fef2f2;
  --color-primary-100: #fee2e2;
  --color-primary-200: #fecaca;
  --color-primary-300: #fca5a5;
  --color-primary-400: #f87171;
  --color-primary-500: #ef4444;  /* Your main brand color */
  --color-primary-600: #dc2626;
  --color-primary-700: #b91c1c;
  --color-primary-800: #991b1b;
  --color-primary-900: #7f1d1d;

  /* Semantic color assignments */
  --color-action-primary: var(--color-primary-600);
  --color-action-primary-hover: var(--color-primary-700);
  --color-action-primary-active: var(--color-primary-800);

  /* Optionally override other colors */
  --color-background: #fafafa;
}
```

**Step 3:** Apply theme

```html
<html data-theme="acme-corp">
```

**Done!** Entire app now uses your brand colors.

## Theme Transitions

Smooth transitions between themes are built-in:

```css
body {
  transition: background-color var(--transition-base),
              color var(--transition-base);
}
```

Components can opt into theme transitions:

```css
.card {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  transition: background-color 250ms, color 250ms;
}
```

## Advanced: Multiple Brand Themes

Support multiple brands in one app:

```javascript
// Tenant-based theming
const tenantThemes = {
  'acme': 'acme-corp',
  'globex': 'globex-theme',
  'initech': 'initech-theme'
}

const tenant = getCurrentTenant()
document.documentElement.setAttribute('data-theme', tenantThemes[tenant])
```

## Testing Themes

```javascript
// Test all themes
const themes = ['light', 'dark', 'ocean', 'sunset', 'forest']

themes.forEach(theme => {
  document.documentElement.setAttribute('data-theme', theme)
  // Visual regression test screenshot
  takeScreenshot(`theme-${theme}`)
})
```

## Migration Path

Already have hardcoded colors? Easy migration:

1. **Find:** Search for `color:`, `background-color:`, `border-color:`
2. **Replace:** Swap hardcoded values with semantic tokens
3. **Test:** Verify with `data-theme="dark"`

```bash
# Find hardcoded colors
grep -r "color: #" src/components
```

## Summary

**Changing color scheme is incredibly easy:**

| Task | Difficulty | Time |
|------|------------|------|
| Change brand color | Modify 9 variables | 30 seconds |
| Enable dark mode | Add attribute | 1 line |
| Create custom theme | Add CSS block | 5 minutes |
| Runtime switching | Use hook | 10 lines |
| Full rebrand | Update palette + test | 1 hour |

The 3-layer architecture (palette → semantic → components) ensures you can swap themes without touching component code. **Change once, apply everywhere.**

---

## Brand-Specific Themes

### Overview

In addition to light/dark modes and alternative themes, the design system supports brand-specific color schemes for multi-tenant or white-label applications.

### Available Brand Themes

| Brand | Theme ID | Primary Color | Personality |
|-------|----------|---------------|-------------|
| Corporate Blue | `brand-corporate` | #2563eb | Professional, enterprise, trust |
| Vibrant Coral | `brand-vibrant` | #e11d48 | Creative, modern, energetic |
| Emerald Green | `brand-emerald` | #059669 | Growth, wellness, sustainable |
| Royal Purple | `brand-royal` | #9333ea | Luxury, premium, sophisticated |
| Warm Amber | `brand-warm` | #d97706 | Warmth, optimism, friendly |

### Using Brand Themes

#### HTML Attribute

```html
<html data-theme="brand-corporate">
```

#### JavaScript

```javascript
// Set brand theme
document.documentElement.setAttribute('data-theme', 'brand-vibrant')

// Remove brand theme (use default)
document.documentElement.removeAttribute('data-theme')
```

#### React Component

```jsx
import { BrandSwitcher } from './components/BrandSwitcher'

function Settings() {
  return (
    <div>
      <h2>Theme Settings</h2>
      <BrandSwitcher />
    </div>
  )
}
```

### Creating New Brand Themes

1. **Copy template:**
   ```bash
   cp client/src/styles/brands/_template.css client/src/styles/brands/newbrand.css
   ```

2. **Generate color palette:**
   - Visit [UI Colors](https://uicolors.app/)
   - Input your brand's primary color
   - Generate 9-shade scale (50-900)

3. **Update CSS file:**
   - Replace `BRANDNAME` with your brand identifier
   - Replace `#COLOR` values with generated palette
   - Verify WCAG AA contrast (4.5:1 minimum for text)

4. **Add import:**
   ```css
   /* In client/src/styles/brands/index.css */
   @import './newbrand.css';
   ```

5. **Test:**
   ```html
   <html data-theme="brand-newbrand">
   ```

### Accessibility

All brand themes meet WCAG AA contrast standards:
- Primary-600: Minimum 4.5:1 contrast on white (for normal text)
- Primary-700/800: 7:1+ contrast (AAA standard)

### File Structure

```
client/src/styles/brands/
├── index.css          # Imports all brands
├── corporate.css      # Corporate Blue
├── vibrant.css        # Vibrant Coral
├── emerald.css        # Emerald Green
├── royal.css          # Royal Purple
├── warm.css           # Warm Amber
└── _template.css      # Template for new brands
```
