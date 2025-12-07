# Toaster Component

Theme-aware toast notifications with accessible live region support.

## Features

- ✅ **Positions**: top-right (default), top-left, bottom-right, bottom-left
- ✅ **Variants**: info, success, warning, error
- ✅ **Auto Dismiss**: Configurable duration per toast
- ✅ **Max Queue**: Cap concurrent toasts (default 4)
- ✅ **Controlled API**: `addToast` / `removeToast` via hook
- ✅ **Accessible**: `aria-live="polite"`, keyboard-friendly close button
- ✅ **Theme Support**: Uses design tokens for color, spacing, and shadows

## Setup

Wrap your app with the provider (already applied in `src/main.jsx`):

```jsx
import { ToasterProvider } from '@/components/Toaster'

<ToasterProvider>
  <App />
</ToasterProvider>
```

## Usage

```jsx
import { useToaster } from '@/components/Toaster'
import { Button } from '@/components/Button'

function SaveButton() {
  const { addToast } = useToaster()

  const handleSave = async () => {
    await saveData()
    addToast({
      title: 'Saved',
      description: 'Your profile was updated',
      variant: 'success',
      duration: 3500,
    })
  }

  return <Button onClick={handleSave}>Save</Button>
}
```

## API

### `<ToasterProvider />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'` | `'top-right'` | Toast viewport placement |
| `duration` | `number` | `4000` | Default auto-dismiss duration (ms) |
| `max` | `number` | `4` | Maximum number of simultaneous toasts |

### `useToaster()`

Returns `{ addToast, removeToast, position }`.

`addToast(options)`:
- `title` (string) - required
- `description` (string) - optional
- `variant` (`info` \| `success` \| `warning` \| `error`) - default `info`
- `duration` (number) - override default duration for this toast

`removeToast(id)` removes a toast early.

## Best Practices

- Keep titles short; put extra detail in `description`.
- Use `variant="success"` for positive confirmations and `variant="error"` for failures.
- Avoid zero-duration toasts; prefer manual flows for persistent notices.
- Cap queue size to avoid overwhelming users (default 4).

## Related Components

- **Dialog**: Use for blocking flows where user action is required.
- **Button**: Common trigger for toasts after an action completes.
