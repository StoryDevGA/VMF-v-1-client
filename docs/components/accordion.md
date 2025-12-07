# Accordion Component

A professional, accessible accordion component with smooth animations and keyboard navigation.

## Features

- ✅ **Multiple Variants**: default, outlined, filled
- ✅ **Corner Styles**: Rounded or square corners
- ✅ **Single/Multiple Mode**: Control whether multiple items can be open
- ✅ **Smooth Animations**: Grid-based height transitions
- ✅ **Keyboard Navigation**: Enter and Space key support
- ✅ **Accessible**: Full ARIA attributes and screen reader support
- ✅ **Icon Animation**: Chevron rotates with smooth transitions
- ✅ **Responsive Design**: Mobile-first with breakpoint adjustments
- ✅ **Theme Support**: Works with all color schemes
- ✅ **Uppercase Headers**: Professional text styling

## Basic Usage

```jsx
import { Accordion } from '@/components/Accordion'

function MyAccordion() {
  return (
    <Accordion>
      <Accordion.Item id="item-1">
        <Accordion.Header itemId="item-1">Section Title</Accordion.Header>
        <Accordion.Content itemId="item-1">
          Section content goes here
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  )
}
```

## API Reference

### Accordion (Container)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'outlined' \| 'filled'` | `'default'` | Accordion style variant |
| `rounded` | `boolean` | `true` | Rounded (`true`) or square (`false`) corners |
| `allowMultiple` | `boolean` | `false` | Allow multiple items to be open simultaneously |
| `defaultOpenItems` | `string[]` | `[]` | Array of item IDs to open by default |
| `className` | `string` | `''` | Additional CSS classes |

### Accordion Sub-components

- `Accordion.Item` - Individual accordion item container
  - Requires `id` prop for identification
- `Accordion.Header` - Clickable header/trigger
  - Requires `itemId` prop matching parent Item's `id`
- `Accordion.Content` - Collapsible content panel
  - Requires `itemId` prop matching parent Item's `id`

## Examples

### Simple Accordion

```jsx
<Accordion>
  <Accordion.Item id="faq-1">
    <Accordion.Header itemId="faq-1">What is this?</Accordion.Header>
    <Accordion.Content itemId="faq-1">
      This is an accordion component for organizing content.
    </Accordion.Content>
  </Accordion.Item>

  <Accordion.Item id="faq-2">
    <Accordion.Header itemId="faq-2">How does it work?</Accordion.Header>
    <Accordion.Content itemId="faq-2">
      Click headers to expand and collapse sections.
    </Accordion.Content>
  </Accordion.Item>
</Accordion>
```

### Variants

```jsx
{/* Default - Subtle borders */}
<Accordion variant="default">
  <Accordion.Item id="item-1">
    <Accordion.Header itemId="item-1">Default Style</Accordion.Header>
    <Accordion.Content itemId="item-1">Content</Accordion.Content>
  </Accordion.Item>
</Accordion>

{/* Outlined - Emphasized borders */}
<Accordion variant="outlined">
  <Accordion.Item id="item-1">
    <Accordion.Header itemId="item-1">Outlined Style</Accordion.Header>
    <Accordion.Content itemId="item-1">Content</Accordion.Content>
  </Accordion.Item>
</Accordion>

{/* Filled - Subtle background */}
<Accordion variant="filled">
  <Accordion.Item id="item-1">
    <Accordion.Header itemId="item-1">Filled Style</Accordion.Header>
    <Accordion.Content itemId="item-1">Content</Accordion.Content>
  </Accordion.Item>
</Accordion>
```

### Corner Styles

```jsx
{/* Rounded corners (default) */}
<Accordion rounded>
  <Accordion.Item id="item-1">
    <Accordion.Header itemId="item-1">Rounded Corners</Accordion.Header>
    <Accordion.Content itemId="item-1">Content</Accordion.Content>
  </Accordion.Item>
</Accordion>

{/* Square corners */}
<Accordion rounded={false}>
  <Accordion.Item id="item-1">
    <Accordion.Header itemId="item-1">Square Corners</Accordion.Header>
    <Accordion.Content itemId="item-1">Content</Accordion.Content>
  </Accordion.Item>
</Accordion>
```

### Allow Multiple Items Open

```jsx
<Accordion allowMultiple>
  <Accordion.Item id="item-1">
    <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
    <Accordion.Content itemId="item-1">
      This section can stay open while others open.
    </Accordion.Content>
  </Accordion.Item>

  <Accordion.Item id="item-2">
    <Accordion.Header itemId="item-2">Section 2</Accordion.Header>
    <Accordion.Content itemId="item-2">
      Multiple sections can be open at once.
    </Accordion.Content>
  </Accordion.Item>
</Accordion>
```

### Default Open Items

```jsx
<Accordion defaultOpenItems={['faq-1', 'faq-3']}>
  <Accordion.Item id="faq-1">
    <Accordion.Header itemId="faq-1">Opens by default</Accordion.Header>
    <Accordion.Content itemId="faq-1">Content 1</Accordion.Content>
  </Accordion.Item>

  <Accordion.Item id="faq-2">
    <Accordion.Header itemId="faq-2">Closed by default</Accordion.Header>
    <Accordion.Content itemId="faq-2">Content 2</Accordion.Content>
  </Accordion.Item>

  <Accordion.Item id="faq-3">
    <Accordion.Header itemId="faq-3">Opens by default</Accordion.Header>
    <Accordion.Content itemId="faq-3">Content 3</Accordion.Content>
  </Accordion.Item>
</Accordion>
```

### Complete FAQ Example

```jsx
<Accordion variant="outlined" rounded>
  <Accordion.Item id="pricing">
    <Accordion.Header itemId="pricing">
      What are your pricing options?
    </Accordion.Header>
    <Accordion.Content itemId="pricing">
      We offer flexible pricing plans starting at $9/month for individuals,
      $29/month for teams, and custom enterprise pricing for organizations.
    </Accordion.Content>
  </Accordion.Item>

  <Accordion.Item id="trial">
    <Accordion.Header itemId="trial">
      Do you offer a free trial?
    </Accordion.Header>
    <Accordion.Content itemId="trial">
      Yes! All plans include a 14-day free trial with full access to all features.
      No credit card required.
    </Accordion.Content>
  </Accordion.Item>

  <Accordion.Item id="support">
    <Accordion.Header itemId="support">
      What support options are available?
    </Accordion.Header>
    <Accordion.Content itemId="support">
      We provide email support for all plans, priority support for team plans,
      and dedicated support with SLA guarantees for enterprise customers.
    </Accordion.Content>
  </Accordion.Item>
</Accordion>
```

## Responsive Behavior

### Mobile (<768px)
- Compact padding for smaller screens
- Touch-friendly header targets
- Smooth animations maintained

### Tablet (768px - 1023px)
- Increased padding for better spacing
- Larger font sizes

### Desktop (≥1024px)
- Optimal padding and spacing
- Maximum readability

## Variants Explained

| Variant | Style | Use Case |
|---------|-------|----------|
| `default` | Subtle 1px borders | General purpose FAQs, content sections |
| `outlined` | Emphasized 2px borders | Draw attention, standalone accordions |
| `filled` | Subtle background color | Alternative styling, visual separation |

## Interactive Behavior

### Single Mode (Default)
- Only one item can be open at a time
- Opening a new item automatically closes the previous one
- Best for mutually exclusive content (FAQs, settings)

### Multiple Mode
- Multiple items can be open simultaneously
- Each item toggles independently
- Best for content that users may want to compare

### Animations
- Content expands/collapses with smooth grid transition
- Icon rotates 180° when opening
- Hover effects on headers
- All animations respect `prefers-reduced-motion`

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus between accordion headers |
| `Enter` | Toggle focused item open/closed |
| `Space` | Toggle focused item open/closed |

## Accessibility

- **ARIA Attributes**:
  - `aria-expanded`: Indicates open/closed state
  - `aria-controls`: Links header to content panel
  - `aria-hidden`: Hides collapsed content from screen readers
  - `role="region"`: Identifies content panels
- **Keyboard Support**: Full keyboard navigation
- **Focus Management**: Clear focus indicators
- **Screen Readers**: Proper announcement of state changes
- **Reduced Motion**: Respects `prefers-reduced-motion` preference
- **High Contrast**: Enhanced borders in high contrast mode

## Styling

The Accordion component uses design system tokens:
- Background: `--color-surface`
- Borders: Subtle with 30% opacity
- Hover: Primary color tint
- Transitions: Standard timing functions

### Custom Styling

```jsx
<Accordion className="custom-accordion">
  <Accordion.Item id="item-1" className="custom-item">
    <Accordion.Header itemId="item-1" className="custom-header">
      Custom Styled Section
    </Accordion.Header>
    <Accordion.Content itemId="item-1" className="custom-content">
      Custom styled content
    </Accordion.Content>
  </Accordion.Item>
</Accordion>
```

## Testing

Run tests:
```bash
npm test Accordion
```

37 comprehensive tests covering all functionality.

## Common Use Cases

### FAQ Section
```jsx
<Accordion variant="default">
  {faqs.map((faq) => (
    <Accordion.Item key={faq.id} id={faq.id}>
      <Accordion.Header itemId={faq.id}>{faq.question}</Accordion.Header>
      <Accordion.Content itemId={faq.id}>{faq.answer}</Accordion.Content>
    </Accordion.Item>
  ))}
</Accordion>
```

### Settings Panel
```jsx
<Accordion variant="outlined" allowMultiple>
  <Accordion.Item id="account">
    <Accordion.Header itemId="account">Account Settings</Accordion.Header>
    <Accordion.Content itemId="account">
      {/* Account form fields */}
    </Accordion.Content>
  </Accordion.Item>

  <Accordion.Item id="privacy">
    <Accordion.Header itemId="privacy">Privacy Settings</Accordion.Header>
    <Accordion.Content itemId="privacy">
      {/* Privacy controls */}
    </Accordion.Content>
  </Accordion.Item>
</Accordion>
```

### Documentation Sections
```jsx
<Accordion variant="filled" defaultOpenItems={['getting-started']}>
  <Accordion.Item id="getting-started">
    <Accordion.Header itemId="getting-started">Getting Started</Accordion.Header>
    <Accordion.Content itemId="getting-started">
      {/* Getting started content */}
    </Accordion.Content>
  </Accordion.Item>

  <Accordion.Item id="advanced">
    <Accordion.Header itemId="advanced">Advanced Usage</Accordion.Header>
    <Accordion.Content itemId="advanced">
      {/* Advanced content */}
    </Accordion.Content>
  </Accordion.Item>
</Accordion>
```

## Best Practices

1. **Use meaningful IDs**: Item IDs should be descriptive and unique
2. **Match itemId to id**: Always ensure Header and Content `itemId` matches Item `id`
3. **Keep headers concise**: Headers should be short and scannable
4. **Limit nesting**: Avoid nesting accordions inside accordions
5. **Consider mobile**: Test on touch devices for usability
6. **Default open state**: Open the most important section by default for better UX

## Related Components

- **Card**: For non-collapsible content containers
- **Button**: Similar interaction patterns
