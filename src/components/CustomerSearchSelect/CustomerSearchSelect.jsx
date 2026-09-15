/**
 * Searchable multi-select for assigning framework packages to customers.
 */

import { useCallback, useMemo, useState } from 'react'
import { Badge } from '../Badge'
import { Button } from '../Button'
import { Input } from '../Input'
import { Spinner } from '../Spinner'
import { useComboboxSearch } from '../../hooks/useComboboxSearch.js'
import { useLazyListCustomersQuery } from '../../store/api/customerApi.js'
import './CustomerSearchSelect.css'

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
    onSearch: triggerCustomerSearch,
    searchEnabled: (nextQuery) => Boolean(nextQuery.trim()),
    onSelectActive: (index) => handleAdd(availableResults[index]),
  })

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
        onChange={handleInputChange}
        onFocus={handleInputFocus}
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
