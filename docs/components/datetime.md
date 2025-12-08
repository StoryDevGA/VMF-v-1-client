# DateTime Component

Live date and time display that updates in real time.

## Features

- ✅ **Real-Time Updates**: Refreshes on an interval (default 1s)
- ✅ **Configurable Formats**: Custom date/time format strings (date-fns)
- ✅ **Accessible**: `aria-live="polite"` and semantic `<time>` element
- ✅ **Theme-Aware**: Uses design tokens for typography and color
- ✅ **Lightweight**: Minimal footprint, no extra dependencies beyond `date-fns`

## Basic Usage

```jsx
import { DateTime } from '@/components/DateTime'

function FooterExtras() {
  return <DateTime />
}
```

## API Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dateFormat` | `string` | `'EEEE, MMMM d, yyyy'` | date-fns format string for the date portion |
| `timeFormat` | `string` | `'hh:mm:ss a'` | date-fns format string for the time portion |
| `updateInterval` | `number` | `1000` | Refresh interval in milliseconds |
| `className` | `string` | `''` | Additional CSS classes |

## Examples

### Custom Formats

```jsx
<DateTime
  dateFormat="MMM d, yyyy"
  timeFormat="HH:mm:ss"
/>
```

### Faster Updates

```jsx
<DateTime updateInterval={500} />
```

### With Extra Styling

```jsx
<DateTime className="footer__datetime" />
```

## Accessibility

- `aria-live="polite"` to announce time changes without interrupting users
- `<time>` element includes ISO `dateTime` attribute
- Tabular numbers for stable alignment

## Styling

- Uses design tokens for spacing, colors, typography
- See `DateTime.css` for BEM classes:
  - `.datetime`
  - `.datetime__date`
  - `.datetime__separator`
  - `.datetime__time`

## Related

- **Footer**: DateTime is rendered in the footer by default.
