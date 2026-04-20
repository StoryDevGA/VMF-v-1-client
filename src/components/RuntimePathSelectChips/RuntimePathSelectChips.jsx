import { useMemo } from 'react'
import { Badge } from '../Badge'
import { Button } from '../Button'
import { Select } from '../Select'
import { useListRuntimePathsQuery } from '../../store/api/runtimeControlApi.js'
import './RuntimePathSelectChips.css'

const normalizeKey = (value) => String(value ?? '').trim()
const normalizeKeys = (values) =>
  [...new Set((Array.isArray(values) ? values : [])
    .map(normalizeKey)
    .filter(Boolean))]

function RuntimePathSelectChips({
  id,
  frameworkKeys = [],
  operation = 'READ',
  isProtectedOnly = false,
  selectedKeys = [],
  onChange,
  placeholder = 'Select a runtime path',
  disabled = false,
  error,
  className = '',
  ...selectProps
}) {
  const normalizedSelected = useMemo(() => normalizeKeys(selectedKeys), [selectedKeys])
  const normalizedFrameworkKeys = useMemo(
    () => normalizeKeys(frameworkKeys).map((value) => value.toUpperCase()),
    [frameworkKeys],
  )
  const normalizedOperation =
    operation === null ? null : String(operation ?? 'READ').trim().toUpperCase()

  const {
    data: runtimePathsResponse,
    isFetching: isLoadingPaths,
  } = useListRuntimePathsQuery(
    {
      page: 1,
      pageSize: 100,
      ...(normalizedFrameworkKeys.length > 0
        ? { frameworkKeys: normalizedFrameworkKeys.join(',') }
        : {}),
      ...(normalizedOperation ? { operation: normalizedOperation } : {}),
      ...(isProtectedOnly ? { isProtected: 'true' } : {}),
      ...(normalizedOperation === 'WRITE' ? { isProtected: 'false' } : {}),
      status: 'ACTIVE',
    },
    {
      skip: disabled,
    },
  )

  const runtimePathRows = Array.isArray(runtimePathsResponse?.data)
    ? runtimePathsResponse.data
    : []

  const selectableOptions = useMemo(() => {
    const selected = new Set(normalizedSelected)

    return runtimePathRows
      .filter((row) => row?.pathKey && !selected.has(String(row.pathKey)))
      .map((row) => ({
        value: String(row.pathKey),
        label: row.label
          ? `${row.pathKey} (${row.label})`
          : String(row.pathKey),
      }))
  }, [normalizedSelected, runtimePathRows])

  const handleRemove = (pathKey) => {
    const normalized = normalizeKey(pathKey)
    onChange?.(normalizedSelected.filter((value) => value !== normalized))
  }

  const isSelectDisabled = disabled || isLoadingPaths || selectableOptions.length === 0
  const selectPlaceholder = isLoadingPaths
    ? 'Loading runtime paths...'
    : selectableOptions.length > 0
      ? placeholder
      : 'No runtime paths available'

  return (
    <div className={`runtime-path-select-chips ${className}`.trim()}>
      <Select
        id={id}
        value=""
        onChange={(event) => {
          const selectedValue = normalizeKey(event.target.value)
          if (!selectedValue) return
          onChange?.(normalizeKeys([...normalizedSelected, selectedValue]))
        }}
        options={selectableOptions}
        placeholder={selectPlaceholder}
        disabled={isSelectDisabled}
        error={error}
        size="sm"
        className="runtime-path-select-chips__select"
        {...selectProps}
      />

      {normalizedSelected.length > 0 ? (
        <ul className="runtime-path-select-chips__chips" aria-label="Selected runtime paths">
          {normalizedSelected.map((pathKey) => (
            <li key={pathKey} className="runtime-path-select-chips__chip">
              <Badge
                variant="neutral"
                size="sm"
                pill
                className="runtime-path-select-chips__badge"
                title={pathKey}
              >
                {pathKey}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(pathKey)}
                disabled={disabled}
                aria-label={`Remove ${pathKey}`}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export default RuntimePathSelectChips
