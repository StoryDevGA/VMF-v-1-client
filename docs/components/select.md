# Select Component

A custom-styled, accessible select dropdown component.

## Features

- ✅ **Custom Styling**: Visually consistent with other form components.
- ✅ **Multiple Sizes**: sm, md, lg.
- ✅ **Controlled Component**: Manages value via props.
- ✅ **Label & Helper Text**: Supports standard labels and helper text.
- ✅ **Error State**: Visual feedback for validation errors.
- ✅ **Disabled State**: Prevents interaction.
- ✅ **Accessible**: Built on native `<select>` element.

## Basic Usage

```jsx
import { Select } from '@/components/Select'
import { useState } from 'react'

function MyForm() {
  const [value, setValue] = useState('')
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ]

  return (
    <Select
      id="my-select"
      label="My Select"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      options={options}
      placeholder="Choose an option..."
    />
  )
}
```

## API Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | - | Unique ID for the select input. |
| `name` | `string` | - | Name for the select input. |
| `label` | `string` | - | Text label for the select input. |
| `value` | `string` | - | The currently selected value. |
| `onChange` | `(event) => void` | - | Callback fired when the value changes. |
| `options` | `Array<{value: string, label: string}>` | `[]` | The options to display in the dropdown. |
| `placeholder` | `string` | - | Placeholder text to show when no value is selected. |
| `disabled` | `boolean` | `false` | If `true`, the select will be disabled. |
| `error` | `string` | - | Error message to display. |
| `helperText` | `string` | - | Helper text to display below the select. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size of the select component. |
| `className` | `string` | `''` | Additional CSS classes. |

## Examples

### Sizes

```jsx
<Select id="sm" size="sm" label="Small" options={options} placeholder="Small" />
<Select id="md" size="md" label="Medium" options={options} placeholder="Medium" />
<Select id="lg" size="lg" label="Large" options={options} placeholder="Large" />
```

### States

```jsx
<Select id="error" label="Error State" options={options} error="This field is required." />
<Select id="disabled" label="Disabled State" options={options} disabled />
<Select id="helper" label="With Helper Text" options={options} helperText="Choose wisely." />
```

## Accessibility

- Built on the native `<select>` element, inheriting its accessibility features.
- The `label` is associated with the input via `htmlFor` and `id`.
- `aria-invalid` is set automatically when an `error` is present.
- `aria-describedby` links to error or helper text.

## Styling

- Uses design system tokens for colors, borders, and spacing.
- The dropdown arrow is custom-styled with CSS for a consistent look.

## Testing

Run tests:
```bash
npm test Select
```
