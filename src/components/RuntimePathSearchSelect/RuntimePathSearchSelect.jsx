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

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Badge } from '../Badge'
import { Button } from '../Button'
import { Input } from '../Input'
import { Spinner } from '../Spinner'
import { useLazyListRuntimePathsQuery } from '../../store/api/runtimeControlApi.js'
import './RuntimePathSearchSelect.css'

const SEARCH_DEBOUNCE = 300

const normalizeKey = (value) => String(value ?? '').trim()
const normalizeKeys = (values) =>
  [...new Set((Array.isArray(values) ? values : [])
    .map(normalizeKey)
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
  operation = 'READ',
  isProtectedOnly = false,
  selectedKeys = [],
  onChange,
  label,
  helperText,
  placeholder = 'Search runtime paths',
  disabled = false,
  error,
  className = '',
}) {
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listboxId = `${id}-search-results`
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const closeTimeoutRef = useRef(null)

  const clearCloseTimeout = useCallback(() => {
    if (!closeTimeoutRef.current) return
    clearTimeout(closeTimeoutRef.current)
    closeTimeoutRef.current = null
  }, [])

  const closeDropdown = useCallback(() => {
    clearCloseTimeout()
    setIsOpen(false)
    setActiveIndex(-1)
  }, [clearCloseTimeout])

  const normalizedSelected = useMemo(() => normalizeKeys(selectedKeys), [selectedKeys])
  const normalizedFrameworkKeys = useMemo(
    () => normalizeKeys(frameworkKeys).map((value) => value.toUpperCase()),
    [frameworkKeys],
  )
  const normalizedScope = String(scope ?? '').trim().toUpperCase()
  const normalizedOperation =
    operation === null ? null : String(operation ?? 'READ').trim().toUpperCase()

  const [triggerSearch, { data: searchData, isFetching: isSearching }] =
    useLazyListRuntimePathsQuery()
  const results = Array.isArray(searchData?.data?.data)
    ? searchData.data.data
    : Array.isArray(searchData?.data)
      ? searchData.data
      : []

  const availableResults = useMemo(() => {
    const selected = new Set(normalizedSelected)
    return results
      .filter((row) => row?.pathKey && !selected.has(String(row.pathKey)))
      .slice(0, 50)
  }, [normalizedSelected, results])

  const triggerRuntimeSearch = useCallback(async (nextQuery) => {
    await triggerSearch({
      page: 1,
      pageSize: 50,
      q: nextQuery,
      ...(normalizedFrameworkKeys.length > 0
        ? { frameworkKeys: normalizedFrameworkKeys.join(',') }
        : {}),
      ...(normalizedScope ? { scope: normalizedScope } : {}),
      ...(normalizedOperation ? { operation: normalizedOperation } : {}),
      ...(isProtectedOnly ? { isProtected: 'true' } : {}),
      status: 'ACTIVE',
    })
  }, [isProtectedOnly, normalizedFrameworkKeys, normalizedOperation, normalizedScope, triggerSearch])

  useEffect(() => {
    if (!isOpen || disabled) return undefined

    const handle = setTimeout(() => {
      triggerRuntimeSearch(query)
    }, SEARCH_DEBOUNCE)

    return () => clearTimeout(handle)
  }, [disabled, isOpen, query, triggerRuntimeSearch])

  useEffect(() => () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      const container = containerRef.current
      if (!container) return
      if (container.contains(event.target)) return
      closeDropdown()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [closeDropdown, isOpen])

  const handleBlur = () => {
    clearCloseTimeout()
    closeTimeoutRef.current = setTimeout(() => {
      closeDropdown()
      closeTimeoutRef.current = null
    }, 200)
  }

  const activeOptionId =
    isOpen && activeIndex >= 0 && availableResults[activeIndex]
      ? `${listboxId}-option-${activeIndex}`
      : undefined

  const handleAdd = (pathKey) => {
    const normalized = normalizeKey(pathKey)
    if (!normalized) return
    const next = normalizeKeys([...normalizedSelected, normalized])
    onChange?.(next)
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

  const handleKeyDown = (event) => {
    if (!isOpen) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) =>
        Math.min(current + 1, Math.max(0, availableResults.length - 1)),
      )
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter') {
      if (activeIndex >= 0 && availableResults[activeIndex]) {
        event.preventDefault()
        handleAdd(availableResults[activeIndex].pathKey)
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      closeDropdown()
    }
  }

  const hasFrameworkFilter = normalizedFrameworkKeys.length > 0
  const resolvedHelperText = helperText
    ?? (!hasFrameworkFilter
      ? 'Search and select approved runtime paths (no framework filter applied).'
      : `Search and select approved runtime paths (filtered by ${normalizedOperation || 'ANY'}).`)

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
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
        }}
        onFocus={() => {
          clearCloseTimeout()
          setIsOpen(true)
        }}
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
