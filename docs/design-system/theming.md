# Theming System

## Overview

The theming system provides easy color-scheme switching without touching component code. All colors flow from **three layers**: palette tokens → semantic tokens → components.

The **default theme is dark** — the StorylineOS dark aesthetic (`#000000` background, `#D6DCDC` text, silver primary palette). Brand themes and alternative palettes are layered on top via `data-theme` attributes.

---

## Architecture

```
Color System (3 Layers)
│
├─ Layer 1: Color Palette (variables.css)
│  └─ Raw values: --color-primary-300, --color-gray-800, etc.
│
├─ Layer 2: Semantic Tokens (themes.css)
│  └─ Contextual mappings: --color-background, --color-text-primary, etc.
│
└─ Layer 3: Components
   └─ Only reference semantic tokens: color: var(--color-text-primary)
```

**Why three layers?**

- Layer 1 defines all available colors once.
- Layer 2 maps colors to purpose (background, text, borders, actions).
- Layer 3 always works regardless of which theme is active.

---

## Default Theme (StorylineOS Dark)

The `:root` ruleset in `themes.css` defines the default palette:

| Token | Value | Description |
|-------|-------|-------------|
| `--color-background` | `#000000` | Solid black background |
| `--color-background-secondary` | `#0a0a0a` | Subtle depth |
| `--color-background-tertiary` | `#141414` | Third-level depth |
| `--color-surface` | `#111111` | Cards, panels |
| `--color-surface-elevated` | `#1a1a1a` | Modals, dropdowns |
| `--color-text-primary` | `#d6dcdc` | Main text |
| `--color-text-secondary` | `#a8b0b0` | Supporting text |
| `--color-text-tertiary` | `#7a8484` | Hints, placeholders |
| `--color-text-inverse` | `#000000` | Text on light backgrounds |
| `--color-border` | `#2a2a2a` | Default borders |
| `--color-border-hover` | `#3a3a3a` | Hover borders |
| `--color-border-focus` | `#d6dcdc` | Focus ring (primary-300) |
| `--color-action-primary` | `#d6dcdc` | CTA button background |
| `--color-action-primary-hover` | `transparent` | CTA hover (outline style) |
| `--color-action-primary-active` | `#bfc5c5` | CTA pressed |
| `--color-action-secondary` | `#1f1f1f` | Secondary button |
| `--color-action-secondary-hover` | `#2a2a2a` | Secondary hover |
| `--color-action-secondary-active` | `#333333` | Secondary pressed |

### Shorthand Aliases

| Alias | Resolves To |
|-------|-------------|
| `--color-primary` | `#d6dcdc` |
| `--color-danger` | `var(--color-error)` |
| `--color-text` | `var(--color-text-primary)` |
| `--color-link` | `var(--color-primary-300)` |
| `--color-border-default` | `var(--color-border)` |
| `--color-disabled-text` | `var(--color-text-tertiary)` |

---

## Explicit Dark Theme

`[data-theme='dark']` mirrors `:root` — it exists for JavaScript-driven theme toggling so you can explicitly set dark mode:

```javascript
document.documentElement.setAttribute('data-theme', 'dark')
```

Both `:root` and `[data-theme='dark']` produce the same visual result.

---

## System Preference

The default `:root` palette is already dark, so **no `prefers-color-scheme` media query is needed**. The app looks correct in both light and dark OS modes.

> Previous versions used `@media (prefers-color-scheme: dark)` to override values with Tailwind's blue-tinted gray scale. That has been removed — the neutral SLOS tokens apply unconditionally.

---

## Alternative Themes

Three example themes are included in `themes.css`:

| Theme | Attribute | Palette |
|-------|-----------|---------|
| Ocean | `data-theme="ocean"` | Cyan / teal |
| Sunset | `data-theme="sunset"` | Orange / red |
| Forest | `data-theme="forest"` | Green |

These override the `--color-primary-*` scale and action colors while inheriting all other semantic tokens from `:root`.

```html
<html data-theme="ocean">
```

---

## Brand Themes (Multi-Tenant)

Brand themes live in `src/styles/brands/` and use the selector `[data-theme='brand-xxx']`.

| Brand | Theme ID | Primary Color | Personality |
|-------|----------|---------------|-------------|
| Corporate Blue | `brand-corporate` | `#2563eb` | Professional, enterprise |
| Vibrant Coral | `brand-vibrant` | `#e11d48` | Creative, energetic |
| Emerald Green | `brand-emerald` | `#059669` | Growth, wellness |
| Royal Purple | `brand-royal` | `#9333ea` | Luxury, premium |
| Warm Amber | `brand-warm` | `#d97706` | Warmth, optimism |

Brand themes override `--color-primary-*` and `--color-action-*` tokens. They also set action shades to `500/400/600` for sufficient contrast on the dark background.

### Applying a Brand Theme

```html
<html data-theme="brand-royal">
```

```javascript
// Tenant-based theming
const tenantThemes = {
  acme: 'brand-corporate',
  globex: 'brand-emerald',
  initech: 'brand-warm',
}
const tenant = getCurrentTenant()
document.documentElement.setAttribute('data-theme', tenantThemes[tenant])
```

### Creating a New Brand Theme

1. Copy `src/styles/brands/_template.css`
2. Replace `BRANDNAME` with your brand identifier
3. Generate a 9-shade scale from your brand color ([uicolors.app](https://uicolors.app/))
4. Verify WCAG AA contrast (4.5:1 minimum for text on `#000000` background)
5. Import in `src/styles/brands/index.css`

---

## Runtime Theme Switching

### Basic JavaScript

```javascript
// Switch theme
document.documentElement.setAttribute('data-theme', 'brand-royal')

// Remove theme (use SLOS default)
document.documentElement.removeAttribute('data-theme')

// Read current theme
const theme = document.documentElement.getAttribute('data-theme')
```

### React Hook

```javascript
import { useEffect, useState } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || ''
  )

  useEffect(() => {
    if (!theme) {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  return { theme, setTheme }
}
```

---

## Using Semantic Tokens in Components

### Background Colors

```css
background-color: var(--color-background);           /* Main — #000000 */
background-color: var(--color-background-secondary);  /* Subtle contrast */
background-color: var(--color-surface);               /* Cards, panels */
background-color: var(--color-surface-elevated);      /* Modals */
```

### Text Colors

```css
color: var(--color-text-primary);    /* Main text — #d6dcdc */
color: var(--color-text-secondary);  /* Supporting text */
color: var(--color-text-tertiary);   /* Hints, placeholders */
color: var(--color-text-inverse);    /* Text on light backgrounds */
```

### Border Colors

```css
border-color: var(--color-border);        /* Default */
border-color: var(--color-border-hover);  /* Hover */
border-color: var(--color-border-focus);  /* Focus ring */
```

### Action Colors

```css
/* Primary CTA */
background-color: var(--color-action-primary);
background-color: var(--color-action-primary-hover);

/* Secondary actions */
background-color: var(--color-action-secondary);
background-color: var(--color-action-secondary-hover);
```

---

## Best Practices

### DO ✅

```css
/* Use semantic tokens — theme-aware */
.button {
  background-color: var(--color-action-primary);
  color: var(--color-text-inverse);
}
```

### DON'T ❌

```css
/* Hardcoded colors — will not adapt to themes */
.button {
  background-color: #3b82f6;
  color: white;
}
```

---

## Theme Transitions

Smooth transitions between themes are built in:

```css
body {
  transition: background-color var(--transition-base),
              color var(--transition-base);
}
```

Components can opt into transitions:

```css
.card {
  background-color: var(--color-surface);
  transition: background-color 250ms, color 250ms;
}
```

---

## File Structure

```
src/styles/
├── themes.css              # Default SLOS dark + dark + ocean/sunset/forest
└── brands/
    ├── index.css           # Imports all brands
    ├── _template.css       # Starter for new brands
    ├── corporate.css       # [data-theme='brand-corporate']
    ├── vibrant.css         # [data-theme='brand-vibrant']
    ├── emerald.css         # [data-theme='brand-emerald']
    ├── royal.css           # [data-theme='brand-royal']
    └── warm.css            # [data-theme='brand-warm']
```

---

## Summary

| Task | Effort |
|------|--------|
| Change brand color | Update 9 variables | 30 seconds |
| Enable explicit dark mode | `data-theme="dark"` | 1 line |
| Create custom theme | Add CSS block | 5 minutes |
| Runtime switching | Use hook / `setAttribute` | 10 lines |
| Full rebrand | Update palette + test | 1 hour |

The three-layer architecture ensures you can swap themes without touching component code. **Change once, apply everywhere.**
