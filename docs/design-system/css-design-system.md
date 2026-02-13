# CSS Design System

## Overview

Production-ready CSS design system aligned to the **StorylineOS** visual identity. Every token, color, and typographic rule references the SLOS spec so the app looks native inside the StorylineOS ecosystem.

## Architecture

```
src/styles/
├── index.css          # Entry point — imports everything, base body/heading rules
├── reset.css          # Modern CSS reset (html bg: #000000, box-sizing, etc.)
├── variables.css      # Design tokens — single source of truth
├── themes.css         # Semantic color themes (default dark, dark, ocean, sunset, forest)
├── responsive.css     # Mobile-first responsive utilities & grid
└── brands/
    ├── index.css      # Imports all brand CSS
    ├── _template.css  # Starter template for new brands
    ├── corporate.css  # Corporate Blue brand
    ├── emerald.css    # Emerald Green brand
    ├── royal.css      # Royal Purple brand
    ├── vibrant.css    # Vibrant Coral brand
    └── warm.css       # Warm Amber brand
```

## Design Principles

1. **Dark-first** — Default palette is the SLOS dark aesthetic (`#000000` background, `#D6DCDC` text).
2. **Single source of truth** — All values live in `variables.css`; components only use `var()` references.
3. **No hardcoded hex in components** — Every color in component/page CSS must use a design token.
4. **Three-layer color system** — Palette → Semantic tokens → Components.
5. **Accessibility** — Respects `prefers-reduced-motion`, meets WCAG AA contrast.

## Usage

### Importing Styles

```javascript
// Import once in main.jsx — order handled by index.css
import './styles/index.css'
```

### Using Design Tokens

```css
.my-component {
  /* Spacing */
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);

  /* Typography */
  font-family: var(--font-primary);       /* Sora */
  font-size: var(--font-size-lg);         /* 20px desktop body */
  font-weight: var(--font-weight-semibold);

  /* Colors — always semantic tokens */
  color: var(--color-text-primary);       /* #d6dcdc */
  background-color: var(--color-surface); /* #111111 */

  /* Borders */
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--border-radius-pill); /* 50px SLOS pill */

  /* Shadows & transitions */
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
}
```

---

## Design Tokens Reference

### Spacing Scale (8 px base)

| Token | Value | Pixels |
|-------|-------|--------|
| `--spacing-2xs` | 0.125rem | 2 px |
| `--spacing-xs` | 0.25rem | 4 px |
| `--spacing-sm` | 0.5rem | 8 px |
| `--spacing-md` | 1rem | 16 px |
| `--spacing-lg` | 1.5rem | 24 px |
| `--spacing-xl` | 2rem | 32 px |
| `--spacing-2xl` | 3rem | 48 px |
| `--spacing-3xl` | 4rem | 64 px |

**Layout guidance:**

- Heading → paragraph: `--spacing-lg` (24 px) to `--spacing-xl` (32 px)
- Section → section: `--spacing-2xl` (48 px) minimum
- Card / container padding: `--spacing-md` (16 px) to `--spacing-lg` (24 px)

### Typography

#### Font Families

| Token | Font | Usage |
|-------|------|-------|
| `--font-primary` / `--font-sans` | **Sora** | H1 headings & body text |
| `--font-display` | **League Spartan** | H2 / H3 sub-headings |
| `--font-mono` | Courier New | Code blocks |

Loaded via Google Fonts in `index.html`.

#### Font Sizes — StorylineOS Spec

| Token | rem | px | Desktop role | Mobile role |
|-------|-----|-----|-------------|-------------|
| `--font-size-xs` | 0.75 | 12 | Caption | Caption |
| `--font-size-sm` | 0.875 | 14 | Small | Small |
| `--font-size-base` | 1 | 16 | — | Body |
| `--font-size-lg` | 1.25 | 20 | Body | — |
| `--font-size-xl` | 1.4375 | 23 | — | H1, H2/H3 |
| `--font-size-2xl` | 2.1875 | 35 | H2 / H3 | — |
| `--font-size-3xl` | 2.5 | 40 | H1 | — |

#### Line Heights

| Token | Value | Usage |
|-------|-------|-------|
| `--line-height-tight` | 1.1 | H1 headings |
| `--line-height-normal` | 1.5 | H2 / H3 sub-headings |
| `--line-height-relaxed` | 1.6 | Body text |

#### Font Weights

| Token | Value |
|-------|-------|
| `--font-weight-normal` | 400 |
| `--font-weight-medium` | 500 |
| `--font-weight-semibold` | 600 |
| `--font-weight-bold` | 700 |

### Colors

#### Neutral Scale — True Neutral Grays

| Token | Hex |
|-------|-----|
| `--color-white` | `#ffffff` |
| `--color-gray-50` | `#fafafa` |
| `--color-gray-100` | `#f5f5f5` |
| `--color-gray-200` | `#e5e5e5` |
| `--color-gray-300` | `#d4d4d4` |
| `--color-gray-400` | `#a3a3a3` |
| `--color-gray-500` | `#737373` |
| `--color-gray-600` | `#525252` |
| `--color-gray-700` | `#404040` |
| `--color-gray-800` | `#262626` |
| `--color-gray-900` | `#171717` |
| `--color-black` | `#000000` |

> **Important:** These are intentionally true-neutral. Tailwind's default scale carries a blue tint (`#111827`, `#1f2937`) which clashes with the SLOS dark aesthetic. Never reintroduce those values.

#### Primary Brand Scale — StorylineOS Silver (`#D6DCDC`)

| Token | Hex | Note |
|-------|-----|------|
| `--color-primary-50` | `#f8f9f9` | Lightest |
| `--color-primary-100` | `#eff1f1` | |
| `--color-primary-200` | `#e3e7e7` | |
| `--color-primary-300` | `#d6dcdc` | **SLOS brand accent** |
| `--color-primary-400` | `#bfc6c6` | |
| `--color-primary-500` | `#a8b0b0` | |
| `--color-primary-600` | `#8a9494` | |
| `--color-primary-700` | `#677070` | |
| `--color-primary-800` | `#474e4e` | |
| `--color-primary-900` | `#2a2e2e` | Darkest |

#### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-success` | `#10b981` | Positive status |
| `--color-warning` | `#f59e0b` | Caution |
| `--color-error` | `#ef4444` | Destructive / error |
| `--color-error-hover` | `#dc2626` | Error hover state |
| `--color-error-active` | `#b91c1c` | Error active / pressed |
| `--color-info` | `#a8b0b0` | Informational (silver) |

#### StorylineOS Brand Tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--slos-bg` | `#000000` | App background |
| `--slos-bg-fallback` | `#000000` | Fallback when not embedded |
| `--slos-text` | `#d6dcdc` | Default text color |
| `--slos-btn-bg` | `#d6dcdc` | Button background |
| `--slos-btn-text` | `#000000` | Button text |
| `--slos-btn-hover-bg` | `transparent` | Button hover background |
| `--slos-btn-hover-border` | `#d6dcdc` | Button hover border |
| `--slos-btn-hover-text` | `#d6dcdc` | Button hover text |

### Borders

| Token | Value |
|-------|-------|
| `--border-width-thin` | 1 px |
| `--border-width-medium` | 2 px |
| `--border-width-thick` | 4 px |
| `--border-radius-sm` | 4 px |
| `--border-radius-md` | 8 px |
| `--border-radius-lg` | 12 px |
| `--border-radius-xl` | 16 px |
| `--border-radius-pill` | **50 px** — StorylineOS button radius |
| `--border-radius-full` | 9999 px (circles) |

### Shadows

| Token | Usage |
|-------|-------|
| `--shadow-sm` | Subtle depth |
| `--shadow-md` | Standard cards |
| `--shadow-lg` | Modals, dropdowns |
| `--shadow-xl` | Highest elevation |

### Z-Index Scale

| Token | Value |
|-------|-------|
| `--z-index-dropdown` | 1000 |
| `--z-index-sticky` | 1020 |
| `--z-index-fixed` | 1030 |
| `--z-index-modal-backdrop` | 1040 |
| `--z-index-modal` | 1050 |
| `--z-index-popover` | 1060 |
| `--z-index-tooltip` | 1070 |

### Transitions

| Token | Duration |
|-------|----------|
| `--transition-fast` | 150 ms |
| `--transition-base` | 250 ms |
| `--transition-slow` | 350 ms |

---

## CSS Reset (`reset.css`)

Modern CSS reset based on Josh Comeau & Andy Bell:

- `html { background-color: #000000 }` — prevents white flash on load
- `box-sizing: border-box` on all elements
- Default margin / padding removed
- Improved text rendering (`-webkit-font-smoothing: antialiased`)
- Block-level images with `max-width: 100%`
- Font inheritance on form elements
- Shorter `line-height` on headings (1.2)
- `#root { isolation: isolate }` for stacking context
- `prefers-reduced-motion` removes all animations

---

## Best Practices

### DO ✅

- Use `var()` tokens for every color, spacing, and font value
- Follow BEM naming: `.card__header`, `.card--outlined`
- Use semantic color tokens (`--color-text-primary`) in components
- Add new tokens to `variables.css` and update this document

### DON'T ❌

- Hardcode hex colors in component or page CSS
- Override design tokens in component files
- Use Tailwind blue-tinted grays (`#111827`, `#1f2937`, etc.)
- Create arbitrary colors not in the palette
- Set `background: white` or `background: transparent` on body/html

---

## Extending the System

1. Add new token to `variables.css` following naming convention
2. Update this document with the new token
3. Ensure it fits within the existing scale
4. Run `npm run test:run` to verify nothing breaks
