# CSS Design System

## Overview

Production-ready CSS design system built with modern best practices. Provides a consistent, maintainable foundation for styling the application.

## Architecture

```
src/styles/
├── index.css       # Main entry point (imports all styles)
├── reset.css       # Modern CSS reset
├── variables.css   # Design tokens (single source of truth)
└── README.md       # This file
```

## Design Principles

1. **DRY (Don't Repeat Yourself)** - Design tokens eliminate duplication
2. **Single Source of Truth** - All values defined once in `variables.css`
3. **Modularity** - Each file has a single responsibility
4. **Clarity** - Descriptive naming, comprehensive documentation
5. **Accessibility** - Respects user preferences (reduced motion, etc.)

## Usage

### Importing Styles

```javascript
// Import once in main.jsx
import './styles/index.css'
```

### Using Design Tokens

```css
.my-component {
  /* Spacing */
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);

  /* Typography */
  font-family: var(--font-primary);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);

  /* Colors */
  color: var(--color-gray-900);
  background-color: var(--color-primary-500);

  /* Borders */
  border: var(--border-width-thin) solid var(--color-gray-300);
  border-radius: var(--border-radius-md);

  /* Shadows */
  box-shadow: var(--shadow-md);

  /* Transitions */
  transition: all var(--transition-base);
}
```

## Design Tokens Reference

### Spacing Scale
Based on 8px grid system for consistent visual rhythm.

- `--spacing-xs`: 4px
- `--spacing-sm`: 8px
- `--spacing-md`: 16px (base)
- `--spacing-lg`: 24px
- `--spacing-xl`: 32px
- `--spacing-2xl`: 48px
- `--spacing-3xl`: 64px

### Typography

#### Font Families
- `--font-primary`: System font stack (optimal performance)
- `--font-mono`: Monospace for code

#### Font Sizes
Modular scale (1.250 ratio - Major Third) for harmonious typography.

- `--font-size-xs`: 12px
- `--font-size-sm`: 14px
- `--font-size-base`: 16px (base)
- `--font-size-lg`: 20px
- `--font-size-xl`: 25px
- `--font-size-2xl`: 31px
- `--font-size-3xl`: 39px

#### Font Weights
- `--font-weight-normal`: 400
- `--font-weight-medium`: 500
- `--font-weight-semibold`: 600
- `--font-weight-bold`: 700

### Colors

#### Neutral Scale
Grayscale palette for UI elements.
- `--color-gray-50` through `--color-gray-900`

#### Primary Brand Colors
Blue scale for primary actions and branding.
- `--color-primary-50` through `--color-primary-900`

#### Semantic Colors
- `--color-success`: Green (#10b981)
- `--color-warning`: Orange (#f59e0b)
- `--color-error`: Red (#ef4444)
- `--color-info`: Blue (#3b82f6)

### Borders
- **Width**: `thin` (1px), `medium` (2px), `thick` (4px)
- **Radius**: `sm` (4px), `md` (8px), `lg` (12px), `xl` (16px), `full` (9999px)

### Shadows
Elevation system for depth and hierarchy.
- `--shadow-sm`: Subtle depth
- `--shadow-md`: Standard cards
- `--shadow-lg`: Modals, dropdowns
- `--shadow-xl`: Highest elevation

### Z-Index Scale
Predictable stacking order.
- `--z-index-dropdown`: 1000
- `--z-index-sticky`: 1020
- `--z-index-fixed`: 1030
- `--z-index-modal-backdrop`: 1040
- `--z-index-modal`: 1050
- `--z-index-popover`: 1060
- `--z-index-tooltip`: 1070

### Transitions
- `--transition-fast`: 150ms
- `--transition-base`: 250ms
- `--transition-slow`: 350ms

## CSS Reset Features

Modern CSS reset based on best practices from Josh Comeau and Andy Bell:

- ✅ Box-sizing set to border-box
- ✅ Default margins/padding removed
- ✅ Improved text rendering
- ✅ Sensible image defaults (block, max-width: 100%)
- ✅ Font inheritance for form elements
- ✅ Heading optimization (shorter line-height)
- ✅ Accessibility (respects reduced motion preference)

## Best Practices

### DO ✅
- Use design tokens instead of hardcoded values
- Follow the naming convention: `--{category}-{property}-{variant}`
- Document component-specific styles
- Use semantic color names for contextual colors

### DON'T ❌
- Hardcode colors, spacing, or font sizes
- Override design tokens in component styles
- Use arbitrary values without justification
- Create new tokens without updating documentation

## Extending the System

When adding new tokens:

1. Add to `variables.css` following naming convention
2. Update this README with the new token
3. Ensure it fits within the existing scale/pattern
4. Document the use case

## Accessibility

The design system includes:
- Respects `prefers-reduced-motion` for animations
- Semantic color system (success, warning, error)
- `.sr-only` utility class for screen readers
- High contrast color ratios (AA/AAA compliant)

## Performance

- Uses system fonts for optimal loading
- CSS custom properties enable runtime theming
- Minimal CSS footprint
- No external dependencies
