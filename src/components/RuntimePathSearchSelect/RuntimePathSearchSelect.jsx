/**
 * RuntimePathSearchSelect Component
 *
 * Searchable multi-select for choosing runtime path keys from the Runtime Path Registry.
 *
 * Features:
 * - Debounced typeahead search (300ms) against the runtime-paths API
 * - Selected paths shown as removable chips
 * - Filters results by selected framework keys + required operation (READ/WRITE)
 */

import { useCallback, useMemo } from 'react'
import { Badge } from '../Badge'
import { Button } from '../Button'
import { Input } from '../Input'
import { Spinner } from '../Spinner'
import { useComboboxSearch } from '../../hooks/useComboboxSearch.js'
import { useLazyListRuntimePathsQuery } from '../../store/api/runtimeControlApi.js'
import './RuntimePathSearchSelect.css'

const normalizeKey = (value) => String(value ?? '').trim()
const normalizeKeys = (values) =>
  [...new Set((Array.isArray(values) ? values : [])
    .map(normalizeKey)
    .filter(Boolean))]
const normalizeUpperToken = (value) => String(value ?? '').trim().toUpperCase()
const normalizeUpperTokens = (values) =>
  [...new Set((Array.isArray(values) ? values : [values])
    .map(normalizeUpperToken)
    .filter(Boolean))]

const deriveNamespace = (pathKey) => {
  const token = String(pathKey ?? '').trim()
  if (!token) return ''
  return token.split('.')[0] || ''
}

function RuntimePathSearchSelect({
  id,
  frameworkKeys = [],
  scope = '',
  category = '',
  operation = 'READ',
  allowedOperations = null,
  pathPrefix = '',
  isProtectedOnly = false,
  selectionMode = 'multiple',
  selectedKeys = [],
  onChange,
  onSelect,
  label,
  helperText,
  placeholder = 'Search runtime paths',
  disabled = false,
  error,
  className = '',
}) {
  const normalizedSelected = useMemo(() => normalizeKeys(selectedKeys), [selectedKeys])
  const normalizedFrameworkKeys = useMemo(
    () => normalizeKeys(frameworkKeys).map((value) => value.toUpperCase()),
    [frameworkKeys],
  )
  const normalizedScope = String(scope ?? '').trim().toUpperCase()
  const normalizedCategory = String(category ?? '').trim().toUpperCase()
  const normalizedOperations = useMemo(() => {
    if (allowedOperations !== null && allowedOperations !== undefined) {
      return normalizeUpperTokens(allowedOperations)
    }

    if (operation === null) return []
    return normalizeUpperTokens(operation ?? 'READ')
  }, [allowedOperations, operation])
  const queryOperation = normalizedOperations.length === 1 ? normalizedOperations[0] : null
  const normalizedPathPrefix = String(pathPrefix ?? '').trim()
  const isSingleSelection = selectionMode === 'single'

  const [triggerSearch, { data: searchData, isFetching: isSearching }] =
    useLazyListRuntimePathsQuery()
  const results = useMemo(() => {
    if (Array.isArray(searchData?.data?.data)) return searchData.data.data
    if (Array.isArray(searchData?.data)) return searchData.data
    return []
  }, [searchData])

  const availableResults = useMemo(() => {
    const selected = new Set(normalizedSelected)
    return results
      .filter((row) => {
        const pathKey = String(row?.pathKey ?? '').trim()
        if (!pathKey || selected.has(pathKey)) return false
        if (normalizedPathPrefix && !pathKey.startsWith(normalizedPathPrefix)) return false

        if (normalizedOperations.length > 0) {
          const rowOperations = Array.isArray(row?.allowedOperations)
            ? row.allowedOperations.map(normalizeUpperToken)
            : []
          if (!normalizedOperations.some((operationValue) => rowOperations.includes(operationValue))) {
            return false
          }
        }

        return true
      })
      .slice(0, 50)
  }, [normalizedOperations, normalizedPathPrefix, normalizedSelected, results])

  const triggerRuntimeSearch = useCallback(async (nextQuery) => {
    await triggerSearch({
      page: 1,
      pageSize: 50,
      q: nextQuery,
      ...(normalizedFrameworkKeys.length > 0
        ? { frameworkKeys: normalizedFrameworkKeys.join(',') }
        : {}),
      ...(normalizedScope ? { scope: normalizedScope } : {}),
      ...(normalizedCategory ? { category: normalizedCategory } : {}),
      ...(queryOperation ? { operation: queryOperation } : {}),
      ...(isProtectedOnly ? { isProtected: 'true' } : {}),
      status: 'ACTIVE',
    })
  }, [isProtectedOnly, normalizedCategory, normalizedFrameworkKeys, normalizedScope, queryOperation, triggerSearch])

  const handleAdd = (pathKey) => {
    const normalized = normalizeKey(pathKey)
    if (!normalized) return
    const next = isSingleSelection ? [normalized] : normalizeKeys([...normalizedSelected, normalized])
    onChange?.(next)
    onSelect?.(availableResults.find((row) => String(row?.pathKey ?? '').trim() === normalized) ?? null)
    setQuery('')
    closeDropdown()
    requestAnimationFrame(() => {
      inputRef.current?.focus?.()
    })
  }

  const handleRemove = (pathKey) => {
    const normalized = normalizeKey(pathKey)
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
    onSearch: triggerRuntimeSearch,
    onSelectActive: (index) => handleAdd(availableResults[index]?.pathKey),
  })

  const hasFrameworkFilter = normalizedFrameworkKeys.length > 0
  const resolvedHelperText = helperText
    ?? (!hasFrameworkFilter
      ? 'Search and select approved runtime paths (no framework filter applied).'
      : `Search and select approved runtime paths (filtered by ${queryOperation || 'ANY'}).`)

  return (
    <div ref={containerRef} className={`runtime-path-search-select ${className}`.trim()}>
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
          className="runtime-path-search-select__chips"
          aria-label={`${label || 'Selected runtime paths'}`}
        >
          {normalizedSelected.map((pathKey) => (
            <li key={pathKey} className="runtime-path-search-select__chip">
              <Badge
                variant="neutral"
                size="sm"
                pill
                className="runtime-path-search-select__badge"
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

      {isOpen && !disabled ? (
        <div
          className="runtime-path-search-select__dropdown"
          role="listbox"
          id={listboxId}
          aria-label={`${label || 'Runtime paths'} results`}
        >
          {availableResults.length === 0 && !isSearching ? (
            <p className="runtime-path-search-select__empty">No matching runtime paths.</p>
          ) : null}
          {availableResults.map((row, index) => {
            const namespace = deriveNamespace(row.pathKey)
            const showNamespace =
              index === 0
              || namespace !== deriveNamespace(availableResults[index - 1]?.pathKey)

            return (
              <div key={row.id ?? row.pathKey ?? index} role="presentation">
                {showNamespace ? (
                  <div className="runtime-path-search-select__group" role="presentation">
                    {namespace.toUpperCase()}
                  </div>
                ) : null}
                <button
                  type="button"
                  className={`runtime-path-search-select__option ${index === activeIndex ? 'runtime-path-search-select__option--active' : ''}`.trim()}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleAdd(row.pathKey)}
                  role="option"
                  id={`${listboxId}-option-${index}`}
                  aria-selected={index === activeIndex}
                >
                  <span className="runtime-path-search-select__option-key">{row.pathKey}</span>
                  {row.label ? (
                    <span className="runtime-path-search-select__option-label">{row.label}</span>
                  ) : null}
                </button>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default RuntimePathSearchSelect
