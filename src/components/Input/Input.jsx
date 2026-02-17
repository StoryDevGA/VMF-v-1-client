/**
 * Input Component
 *
 * Professional input component with floating label animation
 * that reduces in size and moves outside when focused or filled.
 */

import { useState, forwardRef } from 'react'
import './Input.css'

/**
 * Main Input Component
 */
export const Input = forwardRef(function Input(
  {
    type = 'text',
    label,
    placeholder,
    leftIcon,
    rightIcon,
    showPasswordToggle,
    value,
    defaultValue,
    error,
    helperText,
    disabled = false,
    required = false,
    variant = 'default',
    size = 'md',
    fullWidth = false,
    className = '',
    onFocus,
    onBlur,
    ...props
  },
  ref
) {
  const [isFocused, setIsFocused] = useState(false)
  const [hasValue, setHasValue] = useState(!!defaultValue || !!value)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const passwordToggleEnabled = showPasswordToggle ?? true
  const canTogglePassword = passwordToggleEnabled && type === 'password'
  const inputType = canTogglePassword && isPasswordVisible ? 'text' : type
  const hasLeftIcon = Boolean(leftIcon)
  const hasRightIcon = Boolean(rightIcon)
  const hasRightAdornment = hasRightIcon || canTogglePassword

  const handleFocus = (e) => {
    setIsFocused(true)
    onFocus?.(e)
  }

  const handleBlur = (e) => {
    setIsFocused(false)
    setHasValue(!!e.target.value)
    onBlur?.(e)
  }

  const handleChange = (e) => {
    setHasValue(!!e.target.value)
    props.onChange?.(e)
  }

  const handleTogglePasswordVisibility = () => {
    setIsPasswordVisible((current) => !current)
  }

  const isLabelFloating = isFocused || hasValue

  const containerClasses = [
    'input-container',
    `input-container--${variant}`,
    `input-container--${size}`,
    fullWidth && 'input-container--full-width',
    disabled && 'input-container--disabled',
    error && 'input-container--error',
    isLabelFloating && 'input-container--floating',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const inputClasses = [
    'input',
    `input--${variant}`,
    `input--${size}`,
    hasLeftIcon && 'input--with-left-icon',
    hasRightAdornment && 'input--with-right-icon',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses}>
      <div className="input-wrapper">
        {hasLeftIcon && (
          <span className="input__icon input__icon--left" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          type={inputType}
          className={inputClasses}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error
              ? `${props.id}-error`
              : helperText
              ? `${props.id}-helper`
              : undefined
          }
          {...props}
        />
        {canTogglePassword ? (
          <button
            type="button"
            className="input__action input__action--password-toggle"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleTogglePasswordVisibility}
            disabled={disabled}
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            aria-pressed={isPasswordVisible}
          >
            {isPasswordVisible ? 'Hide' : 'Show'}
          </button>
        ) : hasRightIcon ? (
          <span className="input__icon input__icon--right" aria-hidden="true">
            {rightIcon}
          </span>
        ) : null}
        {label && (
          <label
            className={`input-label ${isLabelFloating ? 'input-label--floating' : ''}`}
            htmlFor={props.id}
          >
            {label}
            {required && <span className="input-label__required"> *</span>}
          </label>
        )}
      </div>
      {error && (
        <span className="input-error" id={`${props.id}-error`} role="alert">
          {error}
        </span>
      )}
      {helperText && !error && (
        <span className="input-helper" id={`${props.id}-helper`}>
          {helperText}
        </span>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
