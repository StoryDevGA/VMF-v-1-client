import './CoverageHeatGrid.css'

const STATE_CLASS_NAMES = new Set(['strong', 'adequate', 'weak', 'missing', 'unknown'])

const clampPercent = (value) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0
  return Math.max(0, Math.min(100, Math.round(numericValue)))
}

const getIntensityClassName = (value) => {
  const normalizedValue = clampPercent(value)
  if (normalizedValue >= 75) return 'coverage-heat-grid__tile--intensity-high'
  if (normalizedValue >= 45) return 'coverage-heat-grid__tile--intensity-medium'
  if (normalizedValue > 0) return 'coverage-heat-grid__tile--intensity-low'
  return 'coverage-heat-grid__tile--intensity-empty'
}

const normalizeStateClassName = (stateClassName) => {
  const normalizedState = String(stateClassName || '').trim().toLowerCase()
  return STATE_CLASS_NAMES.has(normalizedState) ? normalizedState : 'unknown'
}

const resolveRowId = (row, index) =>
  row?.id || row?.key || row?.areaLabel || row?.label || `coverage-row-${index}`

export function CoverageHeatGrid({
  ariaLabel = 'Coverage heat grid',
  className = '',
  description = '',
  emptyMessage = 'No coverage rows are projected yet.',
  rows = [],
  statusLabel = 'coverage',
}) {
  const normalizedRows = Array.isArray(rows)
    ? rows
        .map((row, index) => ({
          id: resolveRowId(row, index),
          label: String(row?.areaLabel || row?.label || '').trim(),
          stateClassName: normalizeStateClassName(row?.stateClassName || row?.stateMeta?.className || row?.state),
          stateLabel: String(row?.stateLabel || row?.stateMeta?.label || row?.state || 'Unknown').trim(),
          stateDescription: String(row?.stateDescription || row?.stateMeta?.description || '').trim(),
          value: clampPercent(row?.progressValue ?? row?.value),
          valueText: String(row?.progressText || row?.valueText || '').trim(),
        }))
        .filter((row) => row.label)
    : []

  const rootClassName = [
    'coverage-heat-grid',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={rootClassName} role="region" aria-label={ariaLabel}>
      {description ? <p className="coverage-heat-grid__description">{description}</p> : null}
      {normalizedRows.length > 0 ? (
        <>
          <ul className="coverage-heat-grid__list" aria-label={`${ariaLabel} rows`}>
            {normalizedRows.map((row) => {
              const tileClassName = [
                'coverage-heat-grid__tile',
                `coverage-heat-grid__tile--${row.stateClassName}`,
                getIntensityClassName(row.value),
              ].join(' ')
              const statusText = [
                `${row.label} ${statusLabel} status: ${row.stateDescription || row.stateLabel}.`,
                row.valueText,
              ].filter(Boolean).join(' ')

              return (
                <li className="coverage-heat-grid__row" key={row.id}>
                  <span className={tileClassName} aria-hidden="true">
                    <span className="coverage-heat-grid__tile-value">{row.value}%</span>
                  </span>
                  <span className="coverage-heat-grid__copy">
                    <span className="coverage-heat-grid__label">{row.label}</span>
                    <span className="coverage-heat-grid__meta">{row.valueText || `${row.value}% coverage`}</span>
                  </span>
                  <span
                    className={`coverage-heat-grid__state coverage-heat-grid__state--${row.stateClassName}`}
                    aria-label={statusText}
                    title={statusText}
                  >
                    {row.stateLabel}
                  </span>
                </li>
              )
            })}
          </ul>
          <ul className="coverage-heat-grid__legend" aria-label={`${ariaLabel} legend`}>
            <li><span className="coverage-heat-grid__legend-swatch coverage-heat-grid__legend-swatch--high" />High</li>
            <li><span className="coverage-heat-grid__legend-swatch coverage-heat-grid__legend-swatch--medium" />Medium</li>
            <li><span className="coverage-heat-grid__legend-swatch coverage-heat-grid__legend-swatch--low" />Low</li>
            <li><span className="coverage-heat-grid__legend-swatch coverage-heat-grid__legend-swatch--empty" />None</li>
          </ul>
        </>
      ) : (
        <p className="coverage-heat-grid__empty">{emptyMessage}</p>
      )}
    </div>
  )
}

export default CoverageHeatGrid
