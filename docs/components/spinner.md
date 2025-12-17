# Spinner Component

A simple, accessible loading spinner for indicating ongoing processes.

## Features

- ✅ **Multiple Types**: circle (default), pinwheel
- ✅ **Multiple Sizes**: sm, md, lg
- ✅ **Color Variants**: primary, secondary, success, danger, info, inherit (for circle type)
- ✅ **Accessible**: `role="status"` and screen-reader-only text
- ✅ **CSS Animation**: Smooth, performant rotation
- ✅ **Theme Support**: Works with all color schemes
- ✅ **Production-Ready**: Comprehensive tests, clean code

## Basic Usage

```jsx
import { Spinner } from '@/components/Spinner'

function LoadingIndicator() {
  return <Spinner />
}
```

## API Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'circle' \| 'pinwheel'` | `'circle'` | Type of spinner animation |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size of the spinner |
| `color` | `'primary' \| 'secondary' \| 'success' \| 'danger' \| 'info' \| 'inherit'` | `'primary'` | Color of the spinner (only applies to `type="circle"`) |
| `className` | `string` | `''` | Additional CSS classes |

## Examples

### Types

```jsx
import { Spinner } from '@/components/Spinner'

function SpinnerTypes() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
      <Spinner type="circle" />
      <Spinner type="pinwheel" />
    </div>
  )
}
```

The pinwheel spinner provides a unique visual alternative to the standard circle spinner, perfect for adding personality to your loading states.

### Sizes

```jsx
import { Spinner } from '@/components/Spinner'

function SpinnerSizes() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
    </div>
  )
}
```

### Colors

```jsx
import { Spinner } from '@/components/Spinner'

function SpinnerColors() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
      <Spinner color="primary" />
      <Spinner color="secondary" />
      <Spinner color="success" />
      <Spinner color="danger" />
      <Spinner color="info" />
      <div style={{ color: 'purple' }}>
        <Spinner color="inherit" />
      </div>
    </div>
  )
}
```

### Combined

```jsx
import { Spinner } from '@/components/Spinner'

function CombinedSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
      <Spinner size="lg" color="danger" />
      <Spinner size="sm" color="success" />
      <Spinner type="pinwheel" size="lg" />
      <Spinner type="pinwheel" size="sm" />
    </div>
  )
}
```

## Accessibility

- **`role="status"`**: Indicates to assistive technologies that the element is a live region whose content is advisory information for the user and is not important enough to warrant an alert.
- **`sr-only` class**: Provides text for screen readers that visually hidden, announcing the loading state.

## Styling

The Spinner component uses design system tokens:
- `--color-primary`, `--color-secondary`, etc.: For the spinner's color.
- CSS variables for sizes.

### Custom Styling

```jsx
<Spinner
  className="custom-spinner"
  style={{ borderColor: 'teal', borderLeftColor: 'darkcyan' }}
/>
```

```css
/* In your custom CSS file */
.custom-spinner {
  border-width: 6px;
}
```

## Testing

Run tests:
```bash
npm test Spinner
```

Tests cover:
- Basic rendering with accessibility attributes
- Correct application of size and color classes
- Additional class application

## Related Components

- **Button**: Can use Spinner for loading state.

## Changelog

### v1.0.0 (Current)
- Initial release with custom styling, sizes, and colors.
- Full accessibility support.
- Comprehensive tests.
