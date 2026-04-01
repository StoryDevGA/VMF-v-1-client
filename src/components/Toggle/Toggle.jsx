/**
 * Toggle Component
 *
 * A custom-styled, accessible switch component.
 */

import { forwardRef } from 'react'
import './Toggle.css'

export const Toggle = forwardRef(function Toggle(
  {
    id,
    label,
    checked,
    onChange,
    disabled = false,
    size = 'md',
    className = '',
    ...props
  },
  ref,
) {
  const containerClasses = [
    'toggle-container',
    `toggle-container--${size}`,
    disabled && 'toggle-container--disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <label htmlFor={id} className={containerClasses}>
      <input
        ref={ref}
        type="checkbox"
        role="switch"
        id={id}
        className="toggle-input"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        {...props}
      />
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-thumb" />
      </span>
      {label ? <span className="toggle-label">{label}</span> : null}
    </label>
  )
})

Toggle.displayName = 'Toggle'

export default Toggle
