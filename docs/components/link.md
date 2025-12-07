# Link Component

A fully accessible link component that handles both internal (React Router) and external navigation with security best practices.

## Features

- ✅ **Smart Routing**: Automatic React Router integration for internal links
- ✅ **Security**: Built-in `rel="noopener noreferrer"` for external links
- ✅ **4 Variants**: Primary, Secondary, Subtle, Danger
- ✅ **3 Underline Styles**: None, Hover, Always
- ✅ **External Indicators**: Optional icon for links opening in new tabs
- ✅ **Fully Accessible**: ARIA attributes, keyboard navigation
- ✅ **Theme Support**: Works with all color schemes
- ✅ **Production-Ready**: Comprehensive tests, DRY code

## Basic Usage

### Internal Links (React Router)

```jsx
import { Link } from '@/components/Link'

function Navigation() {
  return (
    <nav>
      <Link to="/about">About Us</Link>
      <Link to="/contact">Contact</Link>
    </nav>
  )
}
```

### External Links

```jsx
// Automatic external link detection
<Link to="https://example.com">Visit Example</Link>

// Explicit href prop
<Link href="https://example.com">Visit Example</Link>

// Open in new tab with indicator
<Link href="https://example.com" openInNewTab>
  Visit Example ↗
</Link>
```

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Link content |
| `to` | `string` | - | Internal route path or external URL |
| `href` | `string` | - | External URL (alternative to `to`) |
| `variant` | `'primary' \| 'secondary' \| 'subtle' \| 'danger'` | `'primary'` | Visual style variant |
| `underline` | `'none' \| 'hover' \| 'always'` | `'hover'` | Underline behavior |
| `disabled` | `boolean` | `false` | Disables the link |
| `external` | `boolean` | `false` | Force link to be treated as external |
| `openInNewTab` | `boolean` | `false` | Opens link in new tab (adds target="_blank") |
| `className` | `string` | `''` | Additional CSS classes |
| `...props` | `HTMLAnchorElement` | - | All standard anchor attributes |

## Variants

### Primary (Default)
Main navigation and important links.

```jsx
<Link to="/products" variant="primary">
  Our Products
</Link>
```

**Use for:** Primary navigation, main CTAs, important links

**Color:** Uses `--color-action-primary` from theme

### Secondary
Less prominent links.

```jsx
<Link to="/privacy" variant="secondary">
  Privacy Policy
</Link>
```

**Use for:** Footer links, secondary navigation, subtle actions

**Color:** Uses `--color-text-secondary`, transitions to primary on hover

### Subtle
Minimal emphasis, inherits parent color.

```jsx
<h2>
  <Link to="/article" variant="subtle">
    Article Title
  </Link>
</h2>
```

**Use for:** Links in headings, breadcrumbs, inheriting context color

**Color:** Inherits from parent, shows primary on hover

### Danger
Destructive or warning links.

```jsx
<Link to="/delete-account" variant="danger">
  Delete Account
</Link>
```

**Use for:** Destructive actions, warnings, account deletion

**Color:** Uses `--color-error` (red)

## Underline Styles

### None
No underline at all.

```jsx
<Link to="/home" underline="none">
  Home
</Link>
```

**Use for:** Navigation menus, buttons styled as links, cards

### Hover (Default)
Underline appears on hover only.

```jsx
<Link to="/about" underline="hover">
  About
</Link>
```

**Use for:** Most links, clean navigation, modern UIs

### Always
Always underlined, stronger on hover.

```jsx
<Link to="/terms" underline="always">
  Terms of Service
</Link>
```

**Use for:** Links in body text, compliance links, traditional styles

**Note:** Links inside `<p>` tags automatically get subtle underlines for better readability. Override with `underline="none"` if needed.

## External Links & Security

### Automatic External Detection

The component automatically detects external links:

```jsx
// These are all treated as external
<Link to="https://example.com">HTTPS</Link>
<Link to="http://example.com">HTTP</Link>
<Link to="//example.com">Protocol-relative</Link>
```

**Security:** External links automatically get `rel="noopener noreferrer"` to prevent:
- Tabnabbing attacks
- `window.opener` access
- Referrer leakage

### Manual External Flag

Force a link to be external:

```jsx
<Link to="/path" external>
  Treated as External
</Link>
```

### Opening in New Tabs

```jsx
<Link href="https://docs.example.com" openInNewTab>
  Documentation ↗
</Link>
```

**Features:**
- Adds `target="_blank"`
- Shows "↗" indicator icon
- Includes "(opens in new tab)" for screen readers
- Automatically applies security attributes

## States

### Disabled

```jsx
<Link to="/unavailable" disabled>
  Coming Soon
</Link>
```

**Behavior:**
- Prevents navigation
- Visual opacity reduced to 50%
- Removed from tab order (`tabindex="-1"`)
- Sets `aria-disabled="true"`
- No external icon shown

### Hover

```jsx
<Link to="/products" variant="primary">
  Products
</Link>
```

**Behavior:**
- Color transitions to hover state
- Underline appears (if `underline="hover"`)
- Smooth transition (150ms)

### Focus

```jsx
<Link to="/contact">Contact</Link>
```

**Behavior:**
- 2px outline in focus color
- 2px offset for clarity
- Slight border radius
- Only visible on keyboard focus (`:focus-visible`)

### Visited

```jsx
<Link href="https://example.com">
  External Link
</Link>
```

**Behavior:**
- Slight opacity reduction (80%)
- Only applies to external links
- Internal links don't show visited state (SPA behavior)

## Examples

### Navigation Menu

```jsx
function Navigation() {
  return (
    <nav>
      <Link to="/" underline="none">Home</Link>
      <Link to="/products" underline="none">Products</Link>
      <Link to="/about" underline="none">About</Link>
      <Link to="/contact" variant="primary">Contact</Link>
    </nav>
  )
}
```

### Link in Body Text

```jsx
function Article() {
  return (
    <article>
      <p>
        For more information, visit our{' '}
        <Link to="/documentation">documentation</Link> or{' '}
        <Link href="https://support.example.com" openInNewTab>
          contact support
        </Link>.
      </p>
    </article>
  )
}
```

**Note:** Links in `<p>` tags automatically get subtle underlines.

### Footer Links

```jsx
function Footer() {
  return (
    <footer>
      <Link to="/privacy" variant="secondary" underline="hover">
        Privacy Policy
      </Link>
      <Link to="/terms" variant="secondary" underline="hover">
        Terms of Service
      </Link>
      <Link href="https://twitter.com/example" variant="secondary">
        Twitter
      </Link>
    </footer>
  )
}
```

### Breadcrumbs

```jsx
function Breadcrumbs() {
  return (
    <nav aria-label="Breadcrumb">
      <Link to="/" variant="subtle" underline="hover">
        Home
      </Link>
      {' / '}
      <Link to="/products" variant="subtle" underline="hover">
        Products
      </Link>
      {' / '}
      <span>Current Page</span>
    </nav>
  )
}
```

### Card with Link

```jsx
function ProductCard({ product }) {
  return (
    <article className="card">
      <h3>
        <Link to={`/products/${product.id}`} variant="subtle" underline="none">
          {product.name}
        </Link>
      </h3>
      <p>{product.description}</p>
      <Link to={`/products/${product.id}`} variant="primary">
        View Details
      </Link>
    </article>
  )
}
```

### Conditional Link

```jsx
function ConditionalLink({ to, disabled, children }) {
  return (
    <Link to={to} disabled={disabled || !to}>
      {children}
    </Link>
  )
}

// Usage
<ConditionalLink to={hasAccess ? '/premium' : null} disabled={!hasAccess}>
  Premium Features
</ConditionalLink>
```

### Download Link

```jsx
<Link
  href="/files/document.pdf"
  download
  variant="primary"
  underline="none"
>
  Download PDF
</Link>
```

## Accessibility

### Keyboard Support
- **Tab**: Focuses the link
- **Enter**: Activates the link
- **Shift+Tab**: Moves focus to previous element

### Screen Readers
- Announces link text
- Announces disabled state
- Announces "opens in new tab" for external links
- Supports custom `aria-label` and `aria-describedby`

### ARIA Attributes

```jsx
<Link
  to="/products"
  aria-label="View all products"
  aria-describedby="product-count"
>
  Products
</Link>
<span id="product-count" className="sr-only">
  127 products available
</span>
```

### Focus Visible
- Clear focus indicator for keyboard users
- No focus ring for mouse clicks
- Respects `:focus-visible` browser behavior
- Customizable via `--color-border-focus` token

## Integration with React Router

### Internal Navigation

All links without `http://`, `https://`, or `//` are handled by React Router:

```jsx
<Link to="/about">About</Link>
<Link to="/products/123">Product Detail</Link>
<Link to="/search?q=test">Search</Link>
```

### Programmatic Navigation

For programmatic navigation, use React Router's `useNavigate`:

```jsx
import { useNavigate } from 'react-router-dom'

function MyComponent() {
  const navigate = useNavigate()

  const handleSubmit = () => {
    // Do something
    navigate('/success')
  }

  return <button onClick={handleSubmit}>Submit</button>
}
```

### Active Link Highlighting

For navigation menus with active states, use React Router's `NavLink`:

```jsx
import { NavLink } from 'react-router-dom'

<NavLink
  to="/products"
  className={({ isActive }) =>
    isActive ? 'link link--primary active' : 'link link--primary'
  }
>
  Products
</NavLink>
```

## Theming

Link automatically adapts to theme changes:

```jsx
// Light theme
<Link to="/about" variant="primary">About</Link>

// Dark theme (same code, different appearance)
<html data-theme="dark">
  <Link to="/about" variant="primary">About</Link>
</html>
```

Uses semantic color tokens:
- `--color-action-primary`
- `--color-action-primary-hover`
- `--color-action-primary-active`
- `--color-text-secondary`
- `--color-text-primary`
- `--color-error`
- `--color-border-focus`

## Best Practices

### ✅ DO

```jsx
// Clear, descriptive link text
<Link to="/products">View Our Products</Link>

// Security for external links (automatic)
<Link href="https://example.com">External</Link>

// Indicate new tabs
<Link href="https://docs.example.com" openInNewTab>
  Documentation
</Link>

// Use appropriate variants
<Link to="/delete" variant="danger">Delete Account</Link>

// Accessible icon links
<Link to="/settings" aria-label="Settings">
  <SettingsIcon />
</Link>
```

### ❌ DON'T

```jsx
// Vague link text
<Link to="/products">Click Here</Link>
<Link to="/about">Read More</Link>

// Missing new tab indicator
<Link href="https://example.com" target="_blank">
  External
</Link>

// Icon-only without label
<Link to="/settings">
  <SettingsIcon />
</Link>

// Wrong variant for action
<Link to="/delete" variant="primary">Delete</Link>

// Forgetting external security (component handles this!)
<a href="https://example.com">Unsafe External Link</a>
```

## Testing

Link component is fully tested with 30+ test cases covering:
- Internal and external routing
- All variants and underline styles
- Disabled state
- Security attributes
- Accessibility
- User interactions

Run tests:
```bash
npm test Link
```

## File Structure

```
src/components/Link/
├── Link.jsx          # Component logic
├── Link.css          # Styles (BEM naming)
├── Link.test.jsx     # Comprehensive tests
└── index.js          # Barrel export
```

## Design System Integration

Link uses design system tokens for:
- ✅ Colors (`--color-*`)
- ✅ Transitions (`--transition-*`)
- ✅ Typography (`--font-*`)

Changes to design tokens automatically update all links.

## Browser Support

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ✅ Graceful degradation for older browsers

## Performance

- **Lightweight**: < 1KB minified + gzipped
- **CSS-in-CSS**: No runtime CSS-in-JS overhead
- **Tree-shakeable**: Only import what you use
- **No extra dependencies**: Uses React Router (already in project)

## Migration from HTML Links

```jsx
// Before
<a href="/about">About</a>

// After
<Link to="/about">About</Link>

// Before (external)
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  External
</a>

// After (automatic security)
<Link href="https://example.com" openInNewTab>
  External
</Link>
```

## Related Components

- **Button**: For actions that aren't navigation
- **NavLink**: React Router component with active states
- **ButtonLink**: Button styled as link (coming soon)

## Changelog

### v1.0.0 (Current)
- Initial release
- 4 variants, 3 underline styles
- Automatic external link detection
- Security attributes for external links
- Full accessibility support
- Theme support
- Comprehensive tests
