import { useMemo } from 'react'
import { Button } from '../Button'
import { Input } from '../Input'
import { Select } from '../Select'
import { Textarea } from '../Textarea'
import './RuntimePathValueControl.css'

const normalizeToken = (value) => String(value ?? '').trim()

const normalizeUiControl = (value) => String(value ?? '').trim().toUpperCase()
const normalizeDataType = (value) => String(value ?? '').trim().toUpperCase()

const inferUiControl = (runtimePath) => {
  const allowedValues = Array.isArray(runtimePath?.allowedValues) ? runtimePath.allowedValues : []
  if (allowedValues.length > 0) return 'SELECT'

  const uiControl = normalizeUiControl(runtimePath?.uiControl)
  if (uiControl) return uiControl

  const dataType = normalizeDataType(runtimePath?.dataType)

  if (dataType === 'BOOLEAN') return 'CHECKBOX'
  if (dataType === 'NUMBER') return 'NUMBER'
  if (dataType === 'OBJECT' || dataType === 'ARRAY' || dataType === 'MIXED') return 'JSON'
  if (dataType === 'ENUM') return 'SELECT'
  if (dataType === 'STRING' && allowedValues.length > 0) return 'SELECT'

  return 'TEXT'
}

const buildSelectOptions = (runtimePath) => {
  const allowedValues = Array.isArray(runtimePath?.allowedValues) ? runtimePath.allowedValues : []
  const allowedValueLabels = runtimePath?.allowedValueLabels

  return allowedValues
    .map((value) => normalizeToken(value))
    .filter(Boolean)
    .map((value) => ({
      value,
      label: (() => {
        if (!allowedValueLabels) return value
        if (allowedValueLabels instanceof Map) {
          const label = allowedValueLabels.get(value)
          return label ? `${label} (${value})` : value
        }
        if (typeof allowedValueLabels === 'object') {
          const label = allowedValueLabels[value]
          return label ? `${label} (${value})` : value
        }
        return value
      })(),
    }))
}

const getJsonValidationError = (runtimePath, value) => {
  const normalizedValue = String(value ?? '').trim()
  if (!normalizedValue) return ''

  try {
    const parsed = JSON.parse(normalizedValue)
    const dataType = normalizeDataType(runtimePath?.dataType)

    if (dataType === 'OBJECT') {
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return 'Provide a JSON object.'
      }
    }

    if (dataType === 'ARRAY' && !Array.isArray(parsed)) {
      return 'Provide a JSON array.'
    }

    return ''
  } catch {
    return 'Provide valid JSON.'
  }
}

const getNumberConstraint = (value) => {
  const normalizedValue = String(value ?? '').trim()
  if (!normalizedValue) return undefined

  const parsed = Number(normalizedValue)
  return Number.isFinite(parsed) ? parsed : undefined
}

function RuntimePathValueControl({
  id,
  label = 'Value',
  runtimePath = null,
  value = '',
  onChange,
  disabled = false,
  error = '',
  helperText = '',
  placeholder = '',
  forceText = false,
  className = '',
}) {
  const resolvedControl = useMemo(() => {
    if (forceText) return 'TEXT'
    return inferUiControl(runtimePath)
  }, [forceText, runtimePath])

  const resolvedHelperText = runtimePath?.helpText ? String(runtimePath.helpText) : helperText
  const resolvedPlaceholder = runtimePath?.placeholderText
    ? String(runtimePath.placeholderText)
    : placeholder

  const normalizedValue = normalizeToken(value)
  const jsonValidationError = useMemo(
    () => (resolvedControl === 'JSON' ? getJsonValidationError(runtimePath, value) : ''),
    [resolvedControl, runtimePath, value],
  )

  if (resolvedControl === 'SELECT') {
    const options = buildSelectOptions(runtimePath)
    const optionValues = new Set(options.map((option) => option.value))
    const safeValue = optionValues.has(normalizedValue) ? normalizedValue : ''

    if (options.length === 0) {
      return (
        <Select
          id={id}
          label={label}
          value=""
          disabled
          helperText={resolvedHelperText || 'No governed options are configured for this runtime path yet.'}
          placeholder={resolvedPlaceholder || 'No options available'}
          error={error}
          className={className}
        />
      )
    }

    return (
      <Select
        id={id}
        label={label}
        value={safeValue}
        options={options}
        placeholder={resolvedPlaceholder || 'Select value'}
        disabled={disabled}
        error={error}
        helperText={resolvedHelperText}
        onChange={(event) => onChange?.(event.target.value)}
        className={className}
      />
    )
  }

  if (resolvedControl === 'NUMBER') {
    const minValue = getNumberConstraint(runtimePath?.minValue)
    const maxValue = getNumberConstraint(runtimePath?.maxValue)

    return (
      <Input
        id={id}
        type="number"
        label={label}
        value={value}
        min={minValue}
        max={maxValue}
        disabled={disabled}
        helperText={resolvedHelperText}
        placeholder={resolvedPlaceholder}
        error={error}
        onChange={(event) => onChange?.(event.target.value)}
        fullWidth
        className={className}
      />
    )
  }

  if (resolvedControl === 'TEXTAREA') {
    return (
      <Textarea
        id={id}
        label={label}
        value={value}
        disabled={disabled}
        helperText={resolvedHelperText}
        placeholder={resolvedPlaceholder}
        error={error}
        onChange={(event) => onChange?.(event.target.value)}
        rows={4}
        className={className}
      />
    )
  }

  if (resolvedControl === 'JSON') {
    return (
      <Textarea
        id={id}
        label={label}
        value={value}
        disabled={disabled}
        helperText={resolvedHelperText || 'Provide a JSON value.'}
        placeholder={resolvedPlaceholder || '{ "key": "value" }'}
        error={error || jsonValidationError}
        onChange={(event) => onChange?.(event.target.value)}
        rows={5}
        className={className}
      />
    )
  }

  if (resolvedControl === 'CHECKBOX') {
    const checked = normalizedValue.toLowerCase() === 'true'
    const booleanOptions = [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
    ]

    return (
      <div className={`runtime-path-value-control ${className}`.trim()}>
        <p id={`${id}-label`} className="runtime-path-value-control__label">{label}</p>
        <div
          className="runtime-path-value-control__boolean-toggle"
          role="radiogroup"
          aria-labelledby={`${id}-label`}
        >
          {booleanOptions.map((option) => {
            const selected = option.value === (checked ? 'true' : 'false')
            return (
              <Button
                key={option.value}
                id={`${id}-${option.value}`}
                type="button"
                role="radio"
                aria-checked={selected}
                variant={selected ? 'primary' : 'outline'}
                size="md"
                disabled={disabled}
                className="runtime-path-value-control__boolean-option"
                onClick={() => onChange?.(option.value)}
              >
                {option.label}
              </Button>
            )
          })}
        </div>
        {resolvedHelperText ? (
          <p className="runtime-path-value-control__helper">{resolvedHelperText}</p>
        ) : null}
        {error ? (
          <p className="runtime-path-value-control__error" role="alert">{error}</p>
        ) : null}
      </div>
    )
  }

  return (
    <Input
      id={id}
      label={label}
      value={value}
      disabled={disabled}
      helperText={resolvedHelperText}
      placeholder={resolvedPlaceholder}
      error={error}
      onChange={(event) => onChange?.(event.target.value)}
      fullWidth
      className={className}
    />
  )
}

export default RuntimePathValueControl
