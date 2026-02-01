# Card Component

A professional, flexible, and responsive card component for displaying content.

## Features

- ✅ **Multiple Variants**: default, outlined, elevated, filled
- ✅ **Corner Styles**: Rounded or square corners
- ✅ **Modular Sections**: Header, Body, Footer, Image
- ✅ **Interactive States**: Hoverable and clickable options
- ✅ **Responsive Design**: Mobile-first with breakpoint adjustments
- ✅ **Hover Effects**: Smooth animations and transforms
- ✅ **Accessible**: Proper ARIA attributes and keyboard support
- ✅ **Theme Support**: Works with all color schemes

## Basic Usage

```jsx
import { Card } from '@/components/Card'

function MyCard() {
  return (
    <Card>
      <Card.Header>Card Title</Card.Header>
      <Card.Body>Card content goes here</Card.Body>
    </Card>
  )
}
```

## API Reference

### Card (Container)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'outlined' \| 'elevated' \| 'filled'` | `'default'` | Card style variant |
| `backgroundColor` | `string` | - | Overrides card background color (any valid CSS color). Use `transparent` to remove the background. |
| `bordered` | `boolean` | `true` | Shows the card border when `true`. Set to `false` for a borderless card. |
| `rounded` | `boolean` | `true` | Rounded (`true`) or square (`false`) corners |
| `hoverable` | `boolean` | `false` | Enable hover lift effect |
| `clickable` | `boolean` | `false` | Make card interactive (adds role="button") |
| `onClick` | `function` | - | Click handler |
| `className` | `string` | `''` | Additional CSS classes |

### Card Sub-components

- `Card.Image` - Display image/media
- `Card.Header` - Title and header content
- `Card.Body` - Main content area
- `Card.Footer` - Actions and footer content

## Examples

### Simple Card

```jsx
<Card>
  <Card.Header>Welcome</Card.Header>
  <Card.Body>This is a simple card with basic content.</Card.Body>
</Card>
```

### Card with Image

```jsx
<Card variant="elevated">
  <Card.Image src="/image.jpg" alt="Beautiful scenery" />
  <Card.Header>Featured Post</Card.Header>
  <Card.Body>
    Explore the breathtaking landscapes of the northern mountains.
  </Card.Body>
  <Card.Footer>
    <Button>Read More</Button>
  </Card.Footer>
</Card>
```

### Variants

```jsx
{/* Default - Basic bordered */}
<Card variant="default">
  <Card.Body>Default card</Card.Body>
</Card>

{/* Outlined - Emphasized border */}
<Card variant="outlined">
  <Card.Body>Outlined card</Card.Body>
</Card>

{/* Elevated - With shadow */}
<Card variant="elevated">
  <Card.Body>Elevated card</Card.Body>
</Card>

{/* Filled - Subtle background */}
<Card variant="filled">
  <Card.Body>Filled card</Card.Body>
</Card>
```

### Corner Styles

```jsx
{/* Rounded corners (default) */}
<Card rounded>
  <Card.Body>Rounded corners</Card.Body>
</Card>

{/* Square corners */}
<Card rounded={false}>
  <Card.Body>Square corners</Card.Body>
</Card>
```

### Interactive Cards

```jsx
{/* Hoverable - Lifts on hover */}
<Card hoverable>
  <Card.Header>Hover me!</Card.Header>
  <Card.Body>This card lifts up when you hover over it.</Card.Body>
</Card>

{/* Clickable - Full card is interactive */}
<Card clickable onClick={() => console.log('Card clicked!')}>
  <Card.Header>Click me!</Card.Header>
  <Card.Body>This entire card is clickable.</Card.Body>
</Card>
```

### Complete Example

```jsx
<Card
  variant="elevated"
  hoverable
  rounded
>
  <Card.Image src="/product.jpg" alt="Product" />
  <Card.Header>
    <h3>Premium Product</h3>
    <p>$99.99</p>
  </Card.Header>
  <Card.Body>
    High-quality product with amazing features.
    Perfect for professionals and enthusiasts alike.
  </Card.Body>
  <Card.Footer>
    <Button variant="primary">Add to Cart</Button>
    <Button variant="secondary">Learn More</Button>
  </Card.Footer>
</Card>
```

## Responsive Behavior

### Mobile (<768px)
- Compact padding for smaller screens
- Footer buttons stack/wrap when needed
- Horizontal layout becomes vertical

### Tablet (768px - 1023px)
- Standard padding
- Better spacing between elements

### Desktop (≥1024px)
- Optimal padding and spacing
- Full card features enabled

## Variants Explained

| Variant | Style | Use Case |
|---------|-------|----------|
| `default` | Basic border | General purpose, neutral |
| `outlined` | Emphasized border (2px) | Draw attention, grouping |
| `elevated` | Shadow effect | Featured content, hierarchy |
| `filled` | Subtle background | Alternative to default |

## Interactive States

### Hoverable
- Adds subtle lift effect on hover
- Translates up by 4px
- Increases shadow
- Image scales slightly (1.05x)

### Clickable
- Adds button role and keyboard support
- Hover: Lifts 2px, adds border color
- Active: Returns to normal position
- Focus: Shows focus outline

## Styling

The Card component uses design system tokens:
- Background: `--color-surface`
- Border: Subtle 1px with 30% opacity
- Shadows: Design system shadow tokens
- Transitions: Standard transition speeds

### Custom Styling

```jsx
<Card className="custom-card">
  <Card.Header className="custom-header">Title</Card.Header>
  <Card.Body>Content</Card.Body>
</Card>
```

### Background Color Override

```jsx
<Card backgroundColor="transparent">
  <Card.Body>Transparent background card</Card.Body>
</Card>
```

### Borderless Card

```jsx
<Card bordered={false}>
  <Card.Body>Borderless card</Card.Body>
</Card>
```

## Accessibility

- **Keyboard Navigation**: Clickable cards support Tab key
- **ARIA Roles**: Clickable cards have `role="button"`
- **Focus States**: Clear focus indicators
- **Reduced Motion**: Respects `prefers-reduced-motion`
- **High Contrast**: Enhanced borders in high contrast mode
- **Alt Text**: Images require meaningful alt text

## Testing

Run tests:
```bash
npm test Card
```

28 comprehensive tests covering all functionality.

## Related Components

- **Button**: Use in Card.Footer for actions
- **Avatar**: Display user info in Card.Header
- **Link**: Wrap entire card for navigation
