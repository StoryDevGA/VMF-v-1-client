/**
 * ValidationKeySearchSelect Component
 *
 * Searchable multi-select for choosing validation keys from the Validation Registry.
 *
 * - Debounced typeahead (300ms) against the validation-registry API.
 * - Filters results by selected framework keys and policy-usable ACTIVE rows.
 * - Selected validations are shown as removable chips.
 * - Existing legacy selections (missing from registry) remain visible as "LEGACY".
 */

import { useCallback, useEffect, useMemo } from 'react'
import { Badge } from '../Badge'
import { Button } from '../Button'
import { Input } from '../Input'
import { Spinner } from '../Spinner'
import { useComboboxSearch } from '../../hooks/useComboboxSearch.js'
import { useLazyListValidationRegistryQuery } from '../../store/api/runtimeControlApi.js'
import './ValidationKeySearchSelect.css'

const normalizeKey = (value) => String(value ?? '').trim().toLowerCase()
const normalizeKeys = (values) =>
  [...new Set((Array.isArray(values) ? values : [])
    .map(normalizeKey)
    .filter(Boolean))]

const buildStatusVariant = (status) => {
  const normalized = String(status ?? '').trim().toUpperCase()
  if (normalized === 'ACTIVE') return 'success'
  if (normalized === 'INACTIVE') return 'warning'
  if (normalized === 'DEPRECATED') return 'danger'
  return 'neutral'
}

function ValidationKeySearchSelect({
  id,
  frameworkKeys = [],
  selectedKeys = [],
  onChange,
  label,
  helperText,
  placeholder = 'Search validation registry',
  disabled = false,
  error,
  className = '',
}) {
  const normalizedSelected = useMemo(() => normalizeKeys(selectedKeys), [selectedKeys])
  const normalizedFrameworkKeys = useMemo(
    () => [...new Set((Array.isArray(frameworkKeys) ? frameworkKeys : [])
      .map((value) => String(value ?? '').trim().toUpperCase())
      .filter(Boolean))],
    [frameworkKeys],
  )

  const [triggerSearch, { data: searchData, isFetching: isSearching }] =
    useLazyListValidationRegistryQuery()
  const results = useMemo(() => {
    if (Array.isArray(searchData?.data?.data)) return searchData.data.data
    if (Array.isArray(searchData?.data)) return searchData.data
    return []
  }, [searchData])

  const resolvedByKey = useMemo(() => {
    const map = new Map()
    for (const row of results) {
      const key = normalizeKey(row?.key)
      if (!key) continue
      map.set(key, row)
    }
    return map
  }, [results])

  const [triggerResolve, { data: resolveData, isFetching: isResolving }] =
    useLazyListValidationRegistryQuery()

  const resolvedSelectedByKey = useMemo(() => {
    const rows = Array.isArray(resolveData?.data?.data)
      ? resolveData.data.data
      : Array.isArray(resolveData?.data)
        ? resolveData.data
        : []
    const map = new Map()
    for (const row of rows) {
      const key = normalizeKey(row?.key)
      if (!key) continue
      map.set(key, row)
    }
    return map
  }, [resolveData])

  const availableResults = useMemo(() => {
    const selected = new Set(normalizedSelected)
    return results
      .filter((row) => row?.key && !selected.has(normalizeKey(row.key)))
      .slice(0, 50)
  }, [normalizedSelected, results])

  const triggerValidationSearch = useCallback(async (nextQuery) => {
    await triggerSearch({
      page: 1,
      pageSize: 50,
      q: nextQuery,
      ...(normalizedFrameworkKeys.length > 0
        ? { frameworkKeys: normalizedFrameworkKeys.join(',') }
        : {}),
      policyUsable: 'true',
      status: 'ACTIVE',
    })
  }, [normalizedFrameworkKeys, triggerSearch])

  useEffect(() => {
    if (disabled) return
    if (normalizedSelected.length === 0) return

    triggerResolve({
      page: 1,
      pageSize: Math.min(100, Math.max(20, normalizedSelected.length)),
      keys: normalizedSelected.join(','),
    })
  }, [disabled, normalizedSelected, triggerResolve])

  const handleAdd = (validationKey) => {
    const normalized = normalizeKey(validationKey)
    if (!normalized) return
    const next = normalizeKeys([...normalizedSelected, normalized])
    onChange?.(next)
    setQuery('')
    closeDropdown()
    requestAnimationFrame(() => {
      inputRef.current?.focus?.()
    })
  }

  const handleRemove = (validationKey) => {
    const normalized = normalizeKey(validationKey)
    const next = normalizedSelected.filter((value) => value !== normalized)
    onChange?.(next)
  }

  const {
    activeIndex,
    activeOptionId,
    closeDropdown,
    containerRef,
    handleBlur,
    handleInputChange,
    handleInputFocus,
    handleKeyDown,
    inputRef,
    isOpen,
    listboxId,
    query,
    setQuery,
  } = useComboboxSearch({
    id,
    disabled,
    resultCount: availableResults.length,
    onSearch: triggerValidationSearch,
    onSelectActive: (index) => handleAdd(availableResults[index]?.key),
  })

  const resolvedHelperText = helperText ?? 'Search and select governed validation keys (filtered to ACTIVE policy-usable rows).'
  const showDropdown = Boolean(isOpen && !disabled && (query.trim() || availableResults.length > 0))

  return (
    <div ref={containerRef} className={`validation-key-search-select ${className}`.trim()}>
      <Input
        id={id}
        ref={inputRef}
        label={label}
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
        helperText={resolvedHelperText}
        rightIcon={isSearching ? <Spinner size="sm" /> : null}
        fullWidth
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={Boolean(isOpen && !disabled)}
        aria-activedescendant={activeOptionId}
        aria-haspopup="listbox"
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />

      {normalizedSelected.length > 0 ? (
        <ul
          className="validation-key-search-select__chips"
          aria-label={`${label || 'Selected validations'}`}
        >
          {normalizedSelected.map((validationKey) => {
            const row = resolvedSelectedByKey.get(validationKey) || resolvedByKey.get(validationKey) || null
            const status = row?.status ? String(row.status).trim().toUpperCase() : 'LEGACY'
            const statusLabel = status === 'LEGACY' ? 'LEGACY' : status

            return (
              <li key={validationKey} className="validation-key-search-select__chip">
                <Badge
                  variant={status === 'LEGACY' ? 'warning' : buildStatusVariant(status)}
                  size="sm"
                  pill
                  className="validation-key-search-select__chip-badge"
                >
                  <span className="validation-key-search-select__chip-label">
                    {row?.label ? String(row.label).trim() : validationKey}
                  </span>
                  <span className="validation-key-search-select__chip-key">
                    {validationKey}
                  </span>
                  <span className="validation-key-search-select__chip-status">
                    {statusLabel}
                  </span>
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="validation-key-search-select__chip-remove"
                  onClick={() => handleRemove(validationKey)}
                  aria-label={`Remove ${validationKey}`}
                  disabled={disabled}
                >
                  Remove
                </Button>
              </li>
            )
          })}
          {isResolving ? (
            <li className="validation-key-search-select__chip-loading" aria-label="Resolving validation status">
              <Spinner size="sm" />
            </li>
          ) : null}
        </ul>
      ) : null}

      {showDropdown ? (
        <ul id={listboxId} className="validation-key-search-select__list" role="listbox" aria-label="Validation results">
          {availableResults.length === 0 && (query.trim() || isSearching) ? (
            <li className="validation-key-search-select__empty" role="option" aria-disabled="true">
              {isSearching ? 'Searching...' : 'No matches.'}
            </li>
          ) : null}

          {availableResults.map((row, index) => {
            const optionId = `${listboxId}-option-${index}`
            const isActive = index === activeIndex
            const key = normalizeKey(row?.key)

            return (
              <li
                key={row.id || row.key || optionId}
                id={optionId}
                className={`validation-key-search-select__option ${isActive ? 'validation-key-search-select__option--active' : ''}`.trim()}
                role="option"
                aria-selected={isActive}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleAdd(key)}
              >
                <div className="validation-key-search-select__option-main">
                  <span className="validation-key-search-select__option-label">{row.label || key}</span>
                  <span className="validation-key-search-select__option-key">{key}</span>
                </div>
                <Badge variant="neutral" size="sm" pill className="validation-key-search-select__option-pill">
                  {String(row.category ?? '').trim().toUpperCase() || 'UNCATEGORIZED'}
                </Badge>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

export default ValidationKeySearchSelect

