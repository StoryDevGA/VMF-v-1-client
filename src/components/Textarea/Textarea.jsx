/**
 * Textarea Component
 *
 * A multi-line text input component with floating label animation and error handling
 *
 * Features:
 * - Floating label animation
 * - Error and helper text support
 * - Multiple variants (default, outlined, filled)
 * - Multiple sizes (sm, md, lg)
 * - Controlled and uncontrolled modes
 * - Full width option
 * - Accessible with ARIA attributes
 * - Resize control options
 *
 * @example
 * <Textarea
 *   label="Description"
 *   placeholder="Enter description"
 *   rows={4}
 *   error="Field is required"
 *   helperText="Maximum 500 characters"
 * />
 */

import { forwardRef, useState, useId } from 'react'
import './Textarea.css'

export const Textarea = forwardRef(function Textarea(
  {
    label,
    placeholder,
    value,
    defaultValue,
    error,
    helperText,
    disabled = false,
    required = false,
    variant = 'default',
    size = 'md',
    fullWidth = false,
    resize = 'vertical',
    rows = 4,
    onFocus,
    onBlur,
    onChange,
    className = '',
    ...props
  },
  ref
) {
  const id = useId()
  const textareaId = props.id || id
  const errorId = `${textareaId}-error`
  const helperId = `${textareaId}-helper`

  const [isFocused, setIsFocused] = useState(false)
  const hasValue = value !== undefined ? value !== '' : defaultValue !== undefined && defaultValue !== ''
  const isLabelFloating = isFocused || hasValue

  const handleFocus = (e) => {
    setIsFocused(true)
    onFocus?.(e)
  }

  const handleBlur = (e) => {
    setIsFocused(false)
    onBlur?.(e)
  }

  const containerClasses = [
    'textarea-container',
    `textarea-container--${variant}`,
    `textarea-container--${size}`,
    fullWidth && 'textarea-container--full-width',
    error && 'textarea-container--error',
    disabled && 'textarea-container--disabled',
    className
  ].filter(Boolean).join(' ')

  const wrapperClasses = [
    'textarea-wrapper',
    isLabelFloating && 'textarea-wrapper--label-floating'
  ].filter(Boolean).join(' ')

  const textareaClasses = [
    'textarea',
    `textarea--resize-${resize}`
  ].filter(Boolean).join(' ')

  const labelClasses = [
    'textarea-label',
    isLabelFloating && 'textarea-label--floating',
    required && 'textarea-label--required'
  ].filter(Boolean).join(' ')

  return (
    <div className={containerClasses}>
      <div className={wrapperClasses}>
        {label && (
          <label htmlFor={textareaId} className={labelClasses}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={onChange}
          className={textareaClasses}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            [error && errorId, helperText && helperId].filter(Boolean).join(' ') || undefined
          }
          {...props}
        />
      </div>
      {error && (
        <div id={errorId} className="textarea-error" role="alert">
          {error}
        </div>
      )}
      {helperText && !error && (
        <div id={helperId} className="textarea-helper">
          {helperText}
        </div>
      )}
    </div>
  )
})

export default Textarea
