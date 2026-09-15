import { useCallback, useEffect, useId, useRef, useState } from 'react'

const DEFAULT_SEARCH_DELAY = 300
const DEFAULT_BLUR_DELAY = 200

function resolveOptionId(listboxId, index) {
  return `${listboxId}-option-${index}`
}

/**
 * Shared interaction lifecycle for async search comboboxes.
 *
 * Domain components retain their own query adapters, result normalization,
 * selection rules, and option markup. This hook owns only the mechanics that
 * were previously repeated: debounce, focus/blur, outside-click dismissal,
 * keyboard navigation, and stable ARIA ids.
 */
export function useComboboxSearch({
  id,
  disabled = false,
  resultCount = 0,
  onSearch,
  searchEnabled = true,
  searchDelay = DEFAULT_SEARCH_DELAY,
  closeOnBlur = true,
  blurDelay = DEFAULT_BLUR_DELAY,
  clearQueryOnEscape = false,
  wrapNavigation = false,
  openOnFocus = true,
  onInputChange,
  onSelectActive,
}) {
  const instanceId = useId()
  const baseId = id || instanceId
  const inputId = id || `${instanceId}-search-input`
  const listboxId = `${baseId}-search-results`
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const closeTimeoutRef = useRef(null)
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

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

  const resetSearch = useCallback(() => {
    closeDropdown()
    setQuery('')
  }, [closeDropdown])

  useEffect(() => {
    if (disabled || !isOpen || !onSearch) return undefined

    const enabled = typeof searchEnabled === 'function'
      ? searchEnabled(query)
      : searchEnabled
    if (!enabled) return undefined

    const handle = setTimeout(() => {
      void onSearch(query)
    }, searchDelay)

    return () => clearTimeout(handle)
  }, [disabled, isOpen, onSearch, query, searchDelay, searchEnabled])

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

  const handleBlur = useCallback(() => {
    if (!closeOnBlur) return
    clearCloseTimeout()
    closeTimeoutRef.current = setTimeout(() => {
      closeDropdown()
      closeTimeoutRef.current = null
    }, blurDelay)
  }, [blurDelay, clearCloseTimeout, closeDropdown, closeOnBlur])

  const handleInputChange = useCallback((event) => {
    if (disabled) return
    setQuery(event.target.value)
    setIsOpen(true)
    setActiveIndex(-1)
    onInputChange?.(event)
  }, [disabled, onInputChange])

  const handleInputFocus = useCallback(() => {
    if (disabled) return
    clearCloseTimeout()
    const shouldOpen = typeof openOnFocus === 'function'
      ? openOnFocus(query)
      : openOnFocus
    if (shouldOpen) setIsOpen(true)
  }, [clearCloseTimeout, disabled, openOnFocus, query])

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (clearQueryOnEscape) resetSearch()
      else closeDropdown()
      return
    }

    if (!isOpen || resultCount <= 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => {
        if (wrapNavigation) return current < resultCount - 1 ? current + 1 : 0
        return Math.min(current + 1, resultCount - 1)
      })
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => {
        if (wrapNavigation) return current > 0 ? current - 1 : resultCount - 1
        return Math.max(current - 1, 0)
      })
    } else if (event.key === 'Enter' && activeIndex >= 0 && activeIndex < resultCount) {
      event.preventDefault()
      onSelectActive?.(activeIndex)
    }
  }, [activeIndex, clearQueryOnEscape, closeDropdown, isOpen, onSelectActive, resetSearch, resultCount, wrapNavigation])

  const activeOptionId = activeIndex >= 0 && activeIndex < resultCount
    ? resolveOptionId(listboxId, activeIndex)
    : undefined

  return {
    activeIndex,
    activeOptionId,
    clearCloseTimeout,
    closeDropdown,
    containerRef,
    handleBlur,
    handleInputChange,
    handleInputFocus,
    handleKeyDown,
    inputId,
    inputRef,
    isOpen,
    listboxId,
    query,
    resetSearch,
    setQuery,
  }
}

export default useComboboxSearch
