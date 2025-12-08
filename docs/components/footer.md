# Footer Component

A responsive footer component with flexible sections for navigation, information, and copyright.

## Features

- ✅ **Responsive Layout**: Stacks on mobile (1 col), 2 cols on tablet, 4 cols on desktop
- ✅ **Flexible Sections**: Support for navigation links, custom content, or mixed
- ✅ **Auto Year**: Automatically displays current year in copyright
- ✅ **Live Date & Time**: Real-time date and time display in the footer
- ✅ **Link Integration**: Uses custom Link component for all navigation
- ✅ **Theme Support**: Adapts to all color schemes
- ✅ **Accessible**: Proper semantic HTML and ARIA attributes
- ✅ **Sticky Footer Ready**: Works with flex layouts for sticky footer effect

## Basic Usage

### Simple Footer with Copyright

```jsx
import { Footer } from '@/components/Footer'

function App() {
  return (
    <>
      <main>{/* Your content */}</main>
      <Footer copyright="Your Company Name" />
    </>
  )
}
```

### Footer with Sections

```jsx
<Footer
  sections={[
    {
      title: 'Product',
      links: [
        { label: 'Features', to: '/features' },
        { label: 'Pricing', to: '/pricing' },
        { label: 'FAQ', to: '/faq' }
      ]
    },
    {
      title: 'Company',
      links: [
        { label: 'About', to: '/about' },
        { label: 'Blog', href: 'https://blog.example.com', external: true },
        { label: 'Careers', to: '/careers' }
      ]
    }
  ]}
  copyright="My Company"
/>
```

### Date & Time

- The footer now includes a live date/time readout powered by the DateTime component.
- Updates every second and uses design tokens for styling.
- Time is wrapped in a `<time>` element with `aria-live="polite"` so screen readers hear updates without interruption.

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sections` | `Section[]` | `[]` | Array of footer sections with links or content |
| `copyright` | `string` | - | Copyright text (company name) |
| `showYear` | `boolean` | `true` | Show current year before copyright |
| `className` | `string` | `''` | Additional CSS classes |
| `...props` | `HTMLElement` | - | All standard footer attributes |

### Section Object

| Property | Type | Description |
|----------|------|-------------|
| `title` | `string` | Section heading (optional) |
| `links` | `Link[]` | Array of navigation links (optional) |
| `content` | `ReactNode` | Custom content (optional) |

### Link Object

| Property | Type | Description |
|----------|------|-------------|
| `label` | `string` | Link text |
| `to` | `string` | Internal route path |
| `href` | `string` | External URL (alternative to `to`) |
| `external` | `boolean` | Treat as external link |
| `openInNewTab` | `boolean` | Open in new tab |

## Examples

### Complete Footer

```jsx
function App() {
  const footerSections = [
    {
      title: 'Product',
      links: [
        { label: 'Features', to: '/features' },
        { label: 'Pricing', to: '/pricing' },
        { label: 'Changelog', to: '/changelog' },
        { label: 'FAQ', to: '/faq' }
      ]
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', to: '/about' },
        { label: 'Team', to: '/team' },
        { label: 'Careers', to: '/careers' },
        { label: 'Contact', to: '/contact' }
      ]
    },
    {
      title: 'Resources',
      links: [
        { label: 'Documentation', to: '/docs' },
        { label: 'Blog', href: 'https://blog.example.com', external: true },
        { label: 'Community', href: 'https://community.example.com', openInNewTab: true },
        { label: 'Support', to: '/support' }
      ]
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', to: '/privacy' },
        { label: 'Terms of Service', to: '/terms' },
        { label: 'Cookie Policy', to: '/cookies' },
        { label: 'Licenses', to: '/licenses' }
      ]
    }
  ]

  return (
    <div className="app">
      <main>{/* Your content */}</main>
      <Footer sections={footerSections} copyright="Acme Corporation" />
    </div>
  )
}
```

### Footer with Custom Content

```jsx
<Footer
  sections={[
    {
      title: 'About',
      content: (
        <p>
          We build amazing products that help teams collaborate better and ship faster.
        </p>
      )
    },
    {
      title: 'Newsletter',
      content: (
        <form>
          <input type="email" placeholder="Your email" />
          <button type="submit">Subscribe</button>
        </form>
      )
    },
    {
      title: 'Quick Links',
      links: [
        { label: 'Home', to: '/' },
        { label: 'Products', to: '/products' },
        { label: 'Contact', to: '/contact' }
      ]
    }
  ]}
  copyright="Example Inc."
/>
```

### Social Media Links

```jsx
<Footer
  sections={[
    {
      title: 'Follow Us',
      links: [
        {
          label: 'Twitter',
          href: 'https://twitter.com/company',
          openInNewTab: true,
          external: true
        },
        {
          label: 'GitHub',
          href: 'https://github.com/company',
          openInNewTab: true,
          external: true
        },
        {
          label: 'LinkedIn',
          href: 'https://linkedin.com/company/company',
          openInNewTab: true,
          external: true
        }
      ]
    }
  ]}
  copyright="Your Company"
/>
```

### Without Year

```jsx
<Footer copyright="All rights reserved" showYear={false} />
// Outputs: "All rights reserved" (no year)
```

### Minimal Footer

```jsx
// Just copyright
<Footer copyright="© 2025 Simple Co." showYear={false} />

// Just sections (no copyright)
<Footer
  sections={[
    {
      links: [
        { label: 'Privacy', to: '/privacy' },
        { label: 'Terms', to: '/terms' }
      ]
    }
  ]}
/>
```

## Sticky Footer Layout

To create a sticky footer (footer sticks to bottom of viewport when content is short):

```css
/* In your App.css or layout styles */
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main {
  flex: 1; /* Main content takes available space */
}
```

```jsx
function App() {
  return (
    <div className="app">
      <Navigation />
      <main>
        {/* Your page content */}
      </main>
      <Footer copyright="Your Company" />
    </div>
  )
}
```

The footer's CSS already includes `margin-top: auto` which works with the flex layout.

## Responsive Behavior

### Mobile (< 640px)
- Single column layout
- Sections stack vertically
- Centered copyright text

### Tablet (640px - 1023px)
- 2 column grid
- Sections arranged in 2 columns
- Left-aligned copyright

### Desktop (≥ 1024px)
- 4 column grid
- Maximum content width
- Optimized spacing

## Styling

### Custom Styles

```jsx
<Footer
  className="custom-footer"
  sections={sections}
  copyright="Company"
/>
```

```css
.custom-footer {
  background-color: var(--color-primary-900);
  color: white;
}
```

### Override Link Styles

```css
.footer__link {
  font-weight: 600;
  text-transform: uppercase;
}

.footer__link:hover {
  text-decoration: underline;
}
```

## Accessibility

### Semantic HTML
- Uses `<footer>` element (implicit `contentinfo` role)
- Proper heading hierarchy with section titles
- List structure for navigation links

### Keyboard Navigation
- All links are keyboard accessible
- Proper tab order
- Focus indicators from Link component

### Screen Readers
- Section titles announce context
- Links announce properly with Link component
- Copyright in accessible text format

## Best Practices

### ✅ DO

```jsx
// Clear, descriptive section titles
<Footer
  sections={[
    {
      title: 'Product',
      links: [...]
    }
  ]}
/>

// Group related links logically
sections={[
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms', to: '/terms' }
    ]
  }
]}

// Use external prop for external links
{
  label: 'Blog',
  href: 'https://blog.example.com',
  external: true,
  openInNewTab: true
}
```

### ❌ DON'T

```jsx
// Too many sections (hard to scan)
<Footer sections={[...15 sections...]} />

// Missing labels
links={[
  { to: '/about' } // ❌ No label
]}

// Inconsistent link targets
{
  label: 'Blog',
  to: 'https://blog.com' // ❌ Should use href for external
}
```

## Testing

Footer is fully tested with 25+ test cases covering:
- Basic rendering
- Copyright display with/without year
- Section rendering
- Link rendering (internal & external)
- Custom content
- Complex scenarios
- Accessibility

Run tests:
```bash
npm test Footer
```

## File Structure

```
src/components/Footer/
├── Footer.jsx          # Component logic
├── Footer.css          # Styles (BEM naming)
├── Footer.test.jsx     # Comprehensive tests
└── index.js            # Barrel export
```

## Design System Integration

Footer uses design system tokens for:
- ✅ Spacing (`--spacing-*`)
- ✅ Typography (`--font-*`)
- ✅ Colors (`--color-*`)
- ✅ Borders (`--border-*`)
- ✅ Transitions (`--transition-*`)

Changes to design tokens automatically update footer styling.

## Browser Support

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ✅ Graceful degradation for older browsers

## Performance

- **Lightweight**: ~1.5KB minified + gzipped
- **CSS-in-CSS**: No runtime CSS-in-JS overhead
- **Tree-shakeable**: Only import what you use
- **No dependencies**: Uses existing Link component

## Related Components

- **Navigation**: Header navigation component
- **Link**: Used for all footer links
- **Button**: Can be used in custom content sections

## Changelog

### v1.0.0 (Current)
- Initial release
- Flexible section system
- Internal and external link support
- Responsive grid layout
- Auto copyright year
- Full accessibility support
- Comprehensive tests
