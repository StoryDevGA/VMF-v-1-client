/**
 * Select Component
 *
 * A custom-styled, accessible select dropdown component.
 */

import { forwardRef, useId } from 'react'
import './Select.css'

export const Select = forwardRef(function Select(
  {
    id,
    name,
    label,
    value,
    onChange,
    options = [],
    placeholder,
    disabled = false,
    error,
    helperText,
    size = 'md',
    className = '',
    ...props
  },
  ref
) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const isPlaceholderValue =
    value === '' || value === undefined || value === null

  const containerClasses = [
    'select-container',
    `select-container--${size}`,
    disabled && 'select-container--disabled',
    error && 'select-container--error',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const selectClasses = [
    'select',
    `select--${size}`,
    placeholder && isPlaceholderValue && 'select--placeholder',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses}>
      {label && (
        <label htmlFor={selectId} className="select-label">
          {label}
        </label>
      )}
      <div className="select-wrapper">
        <select
          ref={ref}
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={selectClasses}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error
              ? `${selectId}-error`
              : helperText
                ? `${selectId}-helper`
                : undefined
          }
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="select-arrow" aria-hidden="true" />
      </div>
      {error && (
        <span className="select-error" id={`${selectId}-error`} role="alert">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span className="select-helper" id={`${selectId}-helper`}>
          {helperText}
        </span>
      )}
    </div>
  )
})

Select.displayName = 'Select'

export default Select
