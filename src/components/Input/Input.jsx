/**
 * Input Component
 *
 * Professional input component with floating label animation
 * that reduces in size and moves outside when focused or filled.
 */

import { useCallback, useEffect, useRef, useState, forwardRef } from 'react'
import { MdAccessTime, MdCalendarToday } from 'react-icons/md'
import './Input.css'

const hasRenderableValue = (candidate) => String(candidate ?? '').trim().length > 0
const NATIVE_VALUE_DISPLAY_TYPES = new Set([
  'color',
  'date',
  'datetime-local',
  'file',
  'month',
  'time',
  'week',
])
const NATIVE_PICKER_TYPES = new Set([
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
])

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
  const isControlled = value !== undefined
  const inputRef = useRef(null)

  const [isFocused, setIsFocused] = useState(false)
  const [hasValue, setHasValue] = useState(
    isControlled ? hasRenderableValue(value) : hasRenderableValue(defaultValue),
  )
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const passwordToggleEnabled = showPasswordToggle ?? true
  const canTogglePassword = passwordToggleEnabled && type === 'password'
  const inputType = canTogglePassword && isPasswordVisible ? 'text' : type
  const hasLeftIcon = Boolean(leftIcon)
  const hasRightIcon = Boolean(rightIcon)
  const hasNativePickerAction = NATIVE_PICKER_TYPES.has(inputType) && !hasRightIcon && !canTogglePassword
  const hasRightAdornment = hasRightIcon || canTogglePassword || hasNativePickerAction
  const isFileInput = inputType === 'file'
  const resolvedPlaceholder = label ? undefined : placeholder
  const nativePickerLabel = inputType === 'time' ? 'Open time picker' : 'Open date picker'
  const nativePickerIcon = inputType === 'time' ? <MdAccessTime /> : <MdCalendarToday />
  const errorId = props.id ? `${props.id}-error` : undefined
  const helperId = props.id ? `${props.id}-helper` : undefined
  const describedById = error ? errorId : helperText ? helperId : undefined

  const setInputRef = useCallback((node) => {
    inputRef.current = node

    if (typeof ref === 'function') {
      ref(node)
    } else if (ref) {
      ref.current = node
    }
  }, [ref])

  useEffect(() => {
    if (value === undefined) return
    setHasValue(hasRenderableValue(value))
  }, [value])

  const handleFocus = (e) => {
    setIsFocused(true)
    onFocus?.(e)
  }

  const handleBlur = (e) => {
    setIsFocused(false)
    setHasValue(hasRenderableValue(e.target.value))
    onBlur?.(e)
  }

  const handleChange = (e) => {
    setHasValue(hasRenderableValue(e.target.value))
    props.onChange?.(e)
  }

  const handleTogglePasswordVisibility = () => {
    setIsPasswordVisible((current) => !current)
  }

  const handleOpenNativePicker = () => {
    const input = inputRef.current
    if (!input || disabled) return

    input.focus()

    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker()
        return
      } catch {
        // Browser refused programmatic picker; focus remains as the fallback.
      }
    }

    input.click()
  }

  const isLabelFloating = isFocused || hasValue || NATIVE_VALUE_DISPLAY_TYPES.has(inputType)

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
    isFileInput && 'input--file',
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
          ref={setInputRef}
          type={inputType}
          className={inputClasses}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          required={required}
          placeholder={resolvedPlaceholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedById}
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
        ) : hasNativePickerAction ? (
          <button
            type="button"
            className="input__action input__action--native-picker"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleOpenNativePicker}
            disabled={disabled}
            aria-label={nativePickerLabel}
          >
            <span className="input__action-icon" aria-hidden="true">
              {nativePickerIcon}
            </span>
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
        <span className="input-error" id={errorId} role="alert">
          {error}
        </span>
      )}
      {helperText && !error && (
        <span className="input-helper" id={helperId}>
          {helperText}
        </span>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
