# TabView Component

A fully accessible, responsive tab navigation component for organizing and displaying content in tabbed sections.

## Features

- ✅ **3 Variants**: Default, Pills, Boxed
- ✅ **2 Orientations**: Horizontal and Vertical (responsive)
- ✅ **Full Keyboard Navigation**: Arrow keys, Home, End
- ✅ **ARIA Compliant**: Complete accessibility support
- ✅ **Smooth Transitions**: Animated content switching
- ✅ **Visual Indicators**: Clear active tab highlighting
- ✅ **Responsive Design**: Stacks on mobile, scrollable tabs
- ✅ **Touch-Friendly**: Minimum 44px touch targets (48px on mobile)
- ✅ **Theme Support**: Works with all color schemes
- ✅ **Production-Ready**: Comprehensive tests

## Basic Usage

```jsx
import { TabView } from '@/components/TabView'

function MyTabs() {
  return (
    <TabView>
      <TabView.Tab label="Profile">
        <h2>Profile Information</h2>
        <p>Your profile details go here</p>
      </TabView.Tab>

      <TabView.Tab label="Settings">
        <h2>Settings</h2>
        <p>Adjust your preferences</p>
      </TabView.Tab>

      <TabView.Tab label="Notifications">
        <h2>Notifications</h2>
        <p>Manage your notifications</p>
      </TabView.Tab>
    </TabView>
  )
}
```

## API Reference

### TabView (Container)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | TabView.Tab components |
| `defaultActiveTab` | `number` | `0` | Index of initially active tab (0-based) |
| `variant` | `'default' \| 'pills' \| 'boxed'` | `'default'` | Visual style variant |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout orientation |
| `onTabChange` | `(index: number) => void` | - | Callback when tab changes |
| `className` | `string` | `''` | Additional CSS classes |
| `...props` | `HTMLDivElement` | - | All standard div attributes |

### TabView.Tab (Sub-component)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | **Required**. Tab button label |
| `children` | `ReactNode` | - | Tab panel content |

## Variants

### Default
Underline style with indicator line below active tab.

```jsx
<TabView variant="default">
  <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
  <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
  <TabView.Tab label="Tab 3">Content 3</TabView.Tab>
</TabView>
```

**Use for:** Standard tab navigation, simple content organization

### Pills
Rounded button-style tabs with filled background for active tab.

```jsx
<TabView variant="pills">
  <TabView.Tab label="Overview">Overview content</TabView.Tab>
  <TabView.Tab label="Details">Details content</TabView.Tab>
  <TabView.Tab label="Analytics">Analytics content</TabView.Tab>
</TabView>
```

**Use for:** Modern UI, settings panels, segmented controls

### Boxed
Tab buttons with borders that connect to content container.

```jsx
<TabView variant="boxed">
  <TabView.Tab label="Code">
    <pre>const hello = 'world'</pre>
  </TabView.Tab>
  <TabView.Tab label="Preview">
    <p>Hello world</p>
  </TabView.Tab>
</TabView>
```

**Use for:** Documentation, code examples, card-based layouts

## Orientations

### Horizontal (Default)
Tabs displayed in a row above content.

```jsx
<TabView orientation="horizontal">
  <TabView.Tab label="Dashboard">Dashboard content</TabView.Tab>
  <TabView.Tab label="Reports">Reports content</TabView.Tab>
</TabView>
```

**Responsive:** Tabs scroll horizontally on small screens

### Vertical
Tabs displayed in a column beside content (stacks on mobile).

```jsx
<TabView orientation="vertical">
  <TabView.Tab label="General">General settings</TabView.Tab>
  <TabView.Tab label="Security">Security settings</TabView.Tab>
  <TabView.Tab label="Privacy">Privacy settings</TabView.Tab>
</TabView>
```

**Responsive:** Automatically converts to horizontal on mobile (<768px)

## Examples

### Basic Tabs
```jsx
<TabView defaultActiveTab={0}>
  <TabView.Tab label="Home">
    <h1>Welcome Home</h1>
    <p>This is the home tab content.</p>
  </TabView.Tab>

  <TabView.Tab label="About">
    <h1>About Us</h1>
    <p>Learn more about our company.</p>
  </TabView.Tab>

  <TabView.Tab label="Contact">
    <h1>Contact</h1>
    <p>Get in touch with us.</p>
  </TabView.Tab>
</TabView>
```

### With Tab Change Callback
```jsx
function AnalyticsTabs() {
  const handleTabChange = (index) => {
    console.log(`Switched to tab ${index}`)
    // Track analytics, fetch data, etc.
  }

  return (
    <TabView onTabChange={handleTabChange}>
      <TabView.Tab label="Overview">Overview data</TabView.Tab>
      <TabView.Tab label="Traffic">Traffic metrics</TabView.Tab>
      <TabView.Tab label="Revenue">Revenue stats</TabView.Tab>
    </TabView>
  )
}
```

### Product Details Tabs
```jsx
<TabView variant="pills">
  <TabView.Tab label="Description">
    <div>
      <h3>Product Description</h3>
      <p>Detailed product information goes here...</p>
    </div>
  </TabView.Tab>

  <TabView.Tab label="Specifications">
    <table>
      <tr><td>Weight</td><td>2.5 kg</td></tr>
      <tr><td>Dimensions</td><td>30x20x10 cm</td></tr>
    </table>
  </TabView.Tab>

  <TabView.Tab label="Reviews">
    <div>
      <h3>Customer Reviews</h3>
      {/* Review list */}
    </div>
  </TabView.Tab>
</TabView>
```

### Settings Panel (Vertical)
```jsx
<TabView variant="boxed" orientation="vertical">
  <TabView.Tab label="Account">
    <h2>Account Settings</h2>
    <form>
      <input type="text" placeholder="Username" />
      <input type="email" placeholder="Email" />
    </form>
  </TabView.Tab>

  <TabView.Tab label="Security">
    <h2>Security Settings</h2>
    <button>Change Password</button>
    <button>Enable 2FA</button>
  </TabView.Tab>

  <TabView.Tab label="Notifications">
    <h2>Notification Preferences</h2>
    <label>
      <input type="checkbox" /> Email notifications
    </label>
  </TabView.Tab>
</TabView>
```

### Default Active Tab
```jsx
{/* Start with the second tab (index 1) active */}
<TabView defaultActiveTab={1}>
  <TabView.Tab label="Introduction">Intro content</TabView.Tab>
  <TabView.Tab label="Getting Started">This tab opens by default</TabView.Tab>
  <TabView.Tab label="Advanced">Advanced content</TabView.Tab>
</TabView>
```

## Keyboard Navigation

### Horizontal Orientation

| Key | Action |
|-----|--------|
| `→` (Arrow Right) | Move to next tab (wraps to first) |
| `←` (Arrow Left) | Move to previous tab (wraps to last) |
| `Home` | Jump to first tab |
| `End` | Jump to last tab |
| `Tab` | Move focus out of tabs |

### Vertical Orientation

| Key | Action |
|-----|--------|
| `↓` (Arrow Down) | Move to next tab (wraps to first) |
| `↑` (Arrow Up) | Move to previous tab (wraps to last) |
| `Home` | Jump to first tab |
| `End` | Jump to last tab |
| `Tab` | Move focus out of tabs |

**Note:** On mobile (<768px), vertical orientation automatically switches to horizontal keyboard navigation.

## Accessibility

### ARIA Attributes

The component implements full ARIA tab pattern:

- **Tabs**: `role="tab"`, `aria-selected`, `aria-controls`, `tabindex`
- **Tab List**: `role="tablist"`, `aria-orientation`
- **Tab Panels**: `role="tabpanel"`, `aria-labelledby`, `hidden`

### Screen Reader Support

```jsx
<TabView>
  <TabView.Tab label="Profile">
    {/* Screen reader announces: "Profile, tab, 1 of 3, selected" */}
  </TabView.Tab>
  <TabView.Tab label="Settings">
    {/* Screen reader announces: "Settings, tab, 2 of 3" */}
  </TabView.Tab>
  <TabView.Tab label="Help">
    {/* Screen reader announces: "Help, tab, 3 of 3" */}
  </TabView.Tab>
</TabView>
```

### Focus Management

- Active tab has `tabIndex={0}` (focusable)
- Inactive tabs have `tabIndex={-1}` (skipped in tab order)
- Clear focus indicators with 2px outline
- Focus moves with arrow key navigation

### Reduced Motion

Respects `prefers-reduced-motion` preference:
- Disables fade-in animation for content
- Removes tab transition effects

### High Contrast Mode

Enhanced visibility in high contrast mode:
- Increased border visibility
- Active tab outlined for clarity

## Responsive Behavior

### Mobile (<768px)
- Horizontal tabs: Scrollable overflow
- Vertical tabs: Convert to horizontal
- Larger touch targets (48px minimum)
- Smaller font sizes for better fit
- Thin scrollbar for tab overflow

### Tablet (768px - 1023px)
- Increased padding for better spacing
- Standard touch targets (44px)

### Desktop (≥1024px)
- Optimal spacing and padding
- Larger padding for better visual balance
- Vertical orientation maintains column layout

## Theming

TabView automatically adapts to theme changes using design tokens:

```jsx
// Light theme
<TabView variant="default">
  <TabView.Tab label="Tab">Content</TabView.Tab>
</TabView>

// Dark theme (same code, different appearance)
<html data-theme="dark">
  <TabView variant="default">
    <TabView.Tab label="Tab">Content</TabView.Tab>
  </TabView>
</html>
```

Uses semantic color tokens:
- `--color-action-primary`
- `--color-text-secondary`
- `--color-border`
- `--color-border-focus`
- `--color-background`

## Best Practices

### ✅ DO

```jsx
// Use clear, concise tab labels
<TabView>
  <TabView.Tab label="Overview">...</TabView.Tab>
  <TabView.Tab label="Details">...</TabView.Tab>
</TabView>

// Group related content
<TabView>
  <TabView.Tab label="Personal Info">Profile form</TabView.Tab>
  <TabView.Tab label="Contact">Contact form</TabView.Tab>
</TabView>

// Use appropriate variant for context
<TabView variant="boxed">  {/* For documentation */}
  <TabView.Tab label="Code">...</TabView.Tab>
</TabView>

// Handle tab changes when needed
<TabView onTabChange={(index) => trackAnalytics(index)}>
  ...
</TabView>
```

### ❌ DON'T

```jsx
// Don't use overly long tab labels
<TabView.Tab label="This is a very long tab label that wraps">
  ...
</TabView.Tab>

// Don't nest TabViews inside TabViews
<TabView>
  <TabView.Tab label="Outer">
    <TabView>  {/* Avoid this */}
      <TabView.Tab label="Inner">...</TabView.Tab>
    </TabView>
  </TabView.Tab>
</TabView>

// Don't use too many tabs (>7)
<TabView>
  {/* 10+ tabs = consider different UI pattern */}
</TabView>

// Don't hide critical navigation in tabs
<TabView>
  <TabView.Tab label="Delete Account">  {/* Use Dialog instead */}
    ...
  </TabView.Tab>
</TabView>
```

## Common Use Cases

### Dashboard Sections
```jsx
<TabView variant="default">
  <TabView.Tab label="Overview">
    {/* Key metrics, charts */}
  </TabView.Tab>
  <TabView.Tab label="Analytics">
    {/* Detailed analytics */}
  </TabView.Tab>
  <TabView.Tab label="Reports">
    {/* Reports list */}
  </TabView.Tab>
</TabView>
```

### User Profile
```jsx
<TabView variant="pills">
  <TabView.Tab label="Posts">
    {/* User's posts */}
  </TabView.Tab>
  <TabView.Tab label="About">
    {/* Bio, info */}
  </TabView.Tab>
  <TabView.Tab label="Photos">
    {/* Photo gallery */}
  </TabView.Tab>
</TabView>
```

### Documentation Pages
```jsx
<TabView variant="boxed">
  <TabView.Tab label="README">
    {/* Markdown content */}
  </TabView.Tab>
  <TabView.Tab label="API Reference">
    {/* API docs */}
  </TabView.Tab>
  <TabView.Tab label="Examples">
    {/* Code examples */}
  </TabView.Tab>
</TabView>
```

### Settings Panel
```jsx
<TabView orientation="vertical" variant="default">
  <TabView.Tab label="General">
    {/* General settings */}
  </TabView.Tab>
  <TabView.Tab label="Privacy">
    {/* Privacy controls */}
  </TabView.Tab>
  <TabView.Tab label="Billing">
    {/* Billing info */}
  </TabView.Tab>
</TabView>
```

## Testing

TabView is fully tested with 50+ test cases covering:
- Tab selection and switching
- All variants and orientations
- Keyboard navigation (horizontal and vertical)
- Accessibility attributes
- User interactions
- Edge cases

Run tests:
```bash
npm test TabView
```

## File Structure

```
src/components/TabView/
├── TabView.jsx          # Component logic
├── TabView.css          # Styles (BEM naming)
├── TabView.test.jsx     # Comprehensive tests
└── index.js             # Barrel export
```

## Design System Integration

TabView uses design system tokens for:
- ✅ Spacing (`--spacing-*`)
- ✅ Typography (`--font-*`)
- ✅ Colors (`--color-*`)
- ✅ Borders (`--border-*`)
- ✅ Transitions (`--transition-*`)

Changes to design tokens automatically update all tabs.

## Browser Support

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ✅ Graceful degradation for older browsers

## Performance

- **Lightweight**: < 3KB minified + gzipped
- **CSS-in-CSS**: No runtime CSS-in-JS overhead
- **Efficient Rendering**: Only active panel is visible
- **No Dependencies**: Pure React component

## Tips & Tricks

### Limit Number of Tabs
- **Ideal:** 3-5 tabs
- **Maximum:** 7 tabs
- **Beyond 7:** Consider dropdown menu or different navigation pattern

### Tab Label Guidelines
- Keep labels short (1-2 words)
- Use clear, descriptive labels
- Maintain consistent capitalization
- Avoid icons-only (use text labels)

### Content Organization
- Place most important content in first tab
- Group related content together
- Ensure each tab has sufficient content
- Avoid empty or sparse tabs

## Related Components

- **Accordion**: For collapsible sections (alternative to tabs)
- **Stepper**: For multi-step workflows
- **Button**: Similar interaction patterns

## Changelog

### v1.0.0 (Current)
- Initial release
- 3 variants (default, pills, boxed)
- 2 orientations (horizontal, vertical)
- Full keyboard navigation
- Complete ARIA support
- Responsive design
- Theme support
