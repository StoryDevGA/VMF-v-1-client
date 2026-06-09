/**
 * ProgressBar Component
 *
 * Shared determinate or indeterminate progress indicator.
 *
 * @example
 * <ProgressBar label="Accepted truth" value={40} valueLabel="40%" />
 */

import './ProgressBar.css'
import { getProgressBarValueTint } from './progressBarValueTone.js'

const VARIANTS = new Set(['primary', 'metric', 'success', 'warning', 'danger', 'info'])
const SIZES = new Set(['sm', 'md', 'lg'])

function normalizeMax(max) {
  const numericMax = Number(max)
  return Number.isFinite(numericMax) && numericMax > 0 ? numericMax : 100
}

function normalizeValue(value, max) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return undefined
  }

  return Math.min(Math.max(numericValue, 0), max)
}

function resolveText(value) {
  return typeof value === 'string' && value.trim() ? value : ''
}

export function ProgressBar({
  ariaLabel,
  ariaValueText = '',
  className = '',
  indeterminate = false,
  label = '',
  max = 100,
  size = 'md',
  style,
  value = 0,
  valueLabel = '',
  valueTone = false,
  variant = 'primary',
  ...props
}) {
  const resolvedMax = normalizeMax(max)
  const resolvedValue = indeterminate ? undefined : normalizeValue(value, resolvedMax)
  const resolvedLabel = resolveText(label)
  const resolvedValueLabel = resolveText(valueLabel)
  const resolvedAriaValueText = resolveText(ariaValueText) || resolvedValueLabel
  const resolvedVariant = VARIANTS.has(variant) ? variant : 'primary'
  const resolvedSize = SIZES.has(size) ? size : 'md'
  const progressLabel = resolveText(ariaLabel) || resolvedLabel || 'Progress'
  const progressAttributes = {
    'aria-label': progressLabel,
    className: 'progress-bar__track',
    max: resolvedMax,
  }

  if (resolvedValue !== undefined) {
    progressAttributes.value = resolvedValue
  }

  if (resolvedAriaValueText) {
    progressAttributes['aria-valuetext'] = resolvedAriaValueText
  }

  const shouldUseValueTone = valueTone && resolvedValue !== undefined
  const valueToneStyle = shouldUseValueTone
    ? { '--progress-bar-value-tint': getProgressBarValueTint(resolvedValue, resolvedMax) }
    : {}

  const classNames = [
    'progress-bar',
    `progress-bar--${resolvedVariant}`,
    `progress-bar--${resolvedSize}`,
    shouldUseValueTone ? 'progress-bar--value-tone' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classNames} style={{ ...valueToneStyle, ...style }} {...props}>
      {(resolvedLabel || resolvedValueLabel) && (
        <div className="progress-bar__header">
          {resolvedLabel && <span className="progress-bar__label">{resolvedLabel}</span>}
          {resolvedValueLabel && <strong className="progress-bar__value">{resolvedValueLabel}</strong>}
        </div>
      )}
      <progress {...progressAttributes} />
    </div>
  )
}

export default ProgressBar
