/**
 * Searchable multi-select for assigning framework packages to customers.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '../Badge'
import { Button } from '../Button'
import { Input } from '../Input'
import { Spinner } from '../Spinner'
import { useLazyListCustomersQuery } from '../../store/api/customerApi.js'
import './CustomerSearchSelect.css'

const SEARCH_DEBOUNCE = 300

const normalizeCustomerId = (value) => String(value ?? '').trim()
const normalizeCustomerIds = (values) =>
  [...new Set((Array.isArray(values) ? values : [])
    .map(normalizeCustomerId)
    .filter(Boolean))]

const getCustomerId = (customer) =>
  normalizeCustomerId(customer?._id ?? customer?.id ?? customer?.customerId)

const getCustomerName = (customer) =>
  String(customer?.name ?? customer?.companyName ?? customer?.customerName ?? '').trim()

const getCustomerStatus = (customer) =>
  String(customer?.status ?? '').trim().toUpperCase()

function CustomerSearchSelect({
  id,
  selectedIds = [],
  onChange,
  label = 'Assigned Customers',
  helperText,
  placeholder = 'Search customers',
  status = 'ACTIVE',
  disabled = false,
  error,
  className = '',
}) {
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const closeTimeoutRef = useRef(null)
  const listboxId = `${id}-search-results`
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [selectedCustomerCache, setSelectedCustomerCache] = useState({})

  const normalizedSelected = useMemo(() => normalizeCustomerIds(selectedIds), [selectedIds])
  const normalizedStatus = String(status ?? '').trim().toUpperCase()

  const [triggerSearch, { data: searchData, isFetching: isSearching }] =
    useLazyListCustomersQuery()

  const rows = useMemo(() => {
    if (Array.isArray(searchData?.data)) return searchData.data
    if (Array.isArray(searchData?.data?.customers)) return searchData.data.customers
    return []
  }, [searchData])

  const customerLookup = useMemo(() => {
    const next = { ...selectedCustomerCache }
    for (const row of rows) {
      const customerId = getCustomerId(row)
      if (!customerId) continue
      next[customerId] = row
    }
    return next
  }, [rows, selectedCustomerCache])

  const availableResults = useMemo(() => {
    const selected = new Set(normalizedSelected)
    return rows
      .filter((row) => {
        const customerId = getCustomerId(row)
        if (!customerId || selected.has(customerId)) return false
        if (normalizedStatus && getCustomerStatus(row) !== normalizedStatus) return false
        return true
      })
      .slice(0, 50)
  }, [normalizedSelected, normalizedStatus, rows])

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

  const triggerCustomerSearch = useCallback(
    async (nextQuery) => {
      await triggerSearch({
        page: 1,
        pageSize: 50,
        q: String(nextQuery ?? '').trim(),
        ...(normalizedStatus ? { status: normalizedStatus } : {}),
      })
    },
    [normalizedStatus, triggerSearch],
  )

  useEffect(() => {
    if (!isOpen || disabled) return undefined

    const handle = setTimeout(() => {
      triggerCustomerSearch(query)
    }, SEARCH_DEBOUNCE)

    return () => clearTimeout(handle)
  }, [disabled, isOpen, query, triggerCustomerSearch])

  useEffect(() => () => {
    clearCloseTimeout()
  }, [clearCloseTimeout])

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      const container = containerRef.current
      if (!container || container.contains(event.target)) return
      closeDropdown()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [closeDropdown, isOpen])

  const activeOptionId =
    isOpen && activeIndex >= 0 && availableResults[activeIndex]
      ? `${listboxId}-option-${activeIndex}`
      : undefined

  const handleBlur = () => {
    clearCloseTimeout()
    closeTimeoutRef.current = setTimeout(() => {
      closeDropdown()
      closeTimeoutRef.current = null
    }, 200)
  }

  const handleAdd = (customer) => {
    const customerId = getCustomerId(customer)
    if (!customerId || normalizedSelected.includes(customerId)) return
    onChange?.(normalizeCustomerIds([...normalizedSelected, customerId]))
    setSelectedCustomerCache((current) => ({ ...current, [customerId]: customer }))
    setQuery('')
    closeDropdown()
    requestAnimationFrame(() => {
      inputRef.current?.focus?.()
    })
  }

  const handleRemove = (customerId) => {
    onChange?.(normalizedSelected.filter((value) => value !== customerId))
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
        handleAdd(availableResults[activeIndex])
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      closeDropdown()
    }
  }

  const getSelectedLabel = (customerId) => {
    const customer = customerLookup[customerId]
    return getCustomerName(customer) || customerId
  }

  const resolvedHelperText = helperText
    ?? 'Search and select active customers from the Customer table.'

  return (
    <div
      ref={containerRef}
      className={['customer-search-select', className].filter(Boolean).join(' ')}
    >
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
        <ul className="customer-search-select__chips" aria-label="Selected customers">
          {normalizedSelected.map((customerId) => (
            <li key={customerId} className="customer-search-select__chip">
              <Badge
                variant="neutral"
                size="sm"
                pill
                className="customer-search-select__badge"
                title={customerId}
              >
                {getSelectedLabel(customerId)}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(customerId)}
                disabled={disabled}
                aria-label={`Remove ${getSelectedLabel(customerId)}`}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {isOpen && !disabled ? (
        <div
          className="customer-search-select__dropdown"
          role="listbox"
          id={listboxId}
          aria-label={`${label} results`}
        >
          {availableResults.length === 0 && !isSearching ? (
            <p className="customer-search-select__empty">No matching active customers.</p>
          ) : null}
          {availableResults.map((customer, index) => {
            const customerId = getCustomerId(customer)
            const customerName = getCustomerName(customer) || customerId
            return (
              <button
                key={customerId}
                type="button"
                className={`customer-search-select__option ${index === activeIndex ? 'customer-search-select__option--active' : ''}`.trim()}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleAdd(customer)}
                role="option"
                id={`${listboxId}-option-${index}`}
                aria-selected={index === activeIndex}
              >
                <span className="customer-search-select__option-name">{customerName}</span>
                <span className="customer-search-select__option-meta">{customerId}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export { CustomerSearchSelect }
export default CustomerSearchSelect
