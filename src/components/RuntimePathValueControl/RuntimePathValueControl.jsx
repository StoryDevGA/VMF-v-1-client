import { useMemo } from 'react'
import { Input } from '../Input'
import { Select } from '../Select'
import { Textarea } from '../Textarea'
import { Tickbox } from '../Tickbox'
import './RuntimePathValueControl.css'

const normalizeToken = (value) => String(value ?? '').trim()

const normalizeUiControl = (value) => String(value ?? '').trim().toUpperCase()
const normalizeDataType = (value) => String(value ?? '').trim().toUpperCase()

const inferUiControl = (runtimePath) => {
  const uiControl = normalizeUiControl(runtimePath?.uiControl)
  if (uiControl) return uiControl

  const dataType = normalizeDataType(runtimePath?.dataType)
  const allowedValues = Array.isArray(runtimePath?.allowedValues) ? runtimePath.allowedValues : []

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
    return (
      <Input
        id={id}
        type="number"
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

    return (
      <div className={`runtime-path-value-control ${className}`.trim()}>
        <p className="runtime-path-value-control__label">{label}</p>
        <Tickbox
          id={id}
          size="md"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.checked ? 'true' : 'false')}
          label={runtimePath?.label ? String(runtimePath.label) : 'Enabled'}
        />
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
