# Tooltip Component

An accessible, theme-aware tooltip with hover and focus triggers, directional placement, and alignment controls.

## Features

- ✅ **Trigger Options**: Opens on hover and keyboard focus
- ✅ **Placement**: Top, bottom, left, or right
- ✅ **Alignment**: Start, center, end alignment per side
- ✅ **Delay Control**: Tunable open/close delays
- ✅ **Controlled/Uncontrolled**: `open` prop or internal state
- ✅ **Design System**: Uses tokens for color, spacing, borders, and shadows
- ✅ **Accessible**: `role="tooltip"`, `aria-describedby`, focus/hover support
- ✅ **Animation Safety**: Respects `prefers-reduced-motion`

## Basic Usage

```jsx
import { Tooltip } from '@/components/Tooltip'
import { Button } from '@/components/Button'

function Example() {
  return (
    <Tooltip content="Save your changes">
      <Button>Save</Button>
    </Tooltip>
  )
}
```

## API Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `ReactNode` | - | Tooltip body text or elements |
| `position` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Tooltip placement relative to trigger |
| `align` | `'start' \| 'center' \| 'end'` | `'center'` | Alignment along the placement axis |
| `open` | `boolean` | - | Controlled visibility (bypasses hover/focus) |
| `defaultOpen` | `boolean` | `false` | Initial open state for uncontrolled mode |
| `openDelay` | `number` | `80` | Delay (ms) before opening in uncontrolled mode |
| `closeDelay` | `number` | `80` | Delay (ms) before closing in uncontrolled mode |
| `className` | `string` | `''` | Additional CSS classes |
| `id` | `string` | - | Custom tooltip id (auto-generated if omitted) |
| `children` | `ReactElement` | - | **Single** trigger element to enhance |

## Examples

### Placement
```jsx
<Tooltip content="Above" position="top">
  <span>Top</span>
</Tooltip>
<Tooltip content="Below" position="bottom">
  <span>Bottom</span>
</Tooltip>
<Tooltip content="Left" position="left">
  <span>Left</span>
</Tooltip>
<Tooltip content="Right" position="right">
  <span>Right</span>
</Tooltip>
```

### Alignment
```jsx
<Tooltip content="Start aligned" position="bottom" align="start">
  <Button size="sm">Start</Button>
</Tooltip>
<Tooltip content="Centered" position="bottom" align="center">
  <Button size="sm">Center</Button>
</Tooltip>
<Tooltip content="End aligned" position="bottom" align="end">
  <Button size="sm">End</Button>
</Tooltip>
```

### Controlled Tooltip
```jsx
function ControlledTooltip() {
  const [open, setOpen] = useState(false)

  return (
    <Tooltip content="Persistent tooltip" open={open}>
      <Button onClick={() => setOpen(!open)}>
        Toggle Tooltip
      </Button>
    </Tooltip>
  )
}
```

### Adjusting Delays
```jsx
<Tooltip
  content="Instant tooltip"
  openDelay={0}
  closeDelay={0}
>
  <span>Hover me</span>
</Tooltip>
```

### Default Open (Showcase/Demos)
```jsx
<Tooltip content="Visible by default" defaultOpen>
  <span>Preview</span>
</Tooltip>
```

## Accessibility

- `role="tooltip"` on the bubble with `aria-hidden` toggled by visibility.
- Trigger receives `aria-describedby` referencing the tooltip id.
- Opens on keyboard focus as well as pointer hover.
- Pointer events are disabled on the tooltip to avoid trapping hover.
- Animations respect `prefers-reduced-motion`.

## Styling

- Background, border, shadow, spacing, and typography use design tokens:
  - Background: `--color-surface`
  - Text: `--color-text-primary`
  - Border: `--color-border`
  - Shadow: `--shadow-md`
  - Spacing: `--spacing-xs`, `--spacing-sm`
  - Radius: `--border-radius-sm`
  - Z-index: `--z-index-tooltip`
- Arrow uses the same colors/border for consistent theming.
- Uppercase text with slight letter spacing for clarity.

## Behavior

- **Uncontrolled**: Hover/focus open with `openDelay`; blur/mouse leave closes with `closeDelay`.
- **Controlled**: `open` prop overrides internal state; hover/focus do not change visibility.
- Requires a single child element; the component enhances it with event handlers and `aria-describedby`.

## Testing

Run tests:
```bash
npm test Tooltip
```

Tests cover hover/focus triggers, controlled/uncontrolled visibility, alignment/placement classes, and event forwarding.

## Best Practices

- Keep tooltip copy concise; prefer short, action-oriented text.
- Use `openDelay={0}` for instant tooltips in dense interfaces.
- Pair with focusable triggers (buttons, links, inputs) for keyboard users.
- Avoid wrapping disabled native controls directly; wrap them in a `<span>` to preserve events if needed.
- Choose placement that avoids covering critical UI nearby.

## Related Components

- **Button**: Common trigger for tooltips on actions.
- **Input**: Pair with tooltips for inline guidance.
- **Dialog**: For richer content that shouldn't be inline with a tooltip.
