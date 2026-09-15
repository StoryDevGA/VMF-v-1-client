import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useComboboxSearch } from './useComboboxSearch.js'

afterEach(() => {
  vi.useRealTimers()
})

describe('useComboboxSearch', () => {
  it('debounces searches and exposes stable ids and active descendants', () => {
    vi.useFakeTimers()
    const onSearch = vi.fn()
    const { result } = renderHook(() => useComboboxSearch({
      id: 'customer-search',
      resultCount: 2,
      onSearch,
    }))

    act(() => {
      result.current.handleInputChange({ target: { value: 'acme' } })
    })

    expect(result.current.inputId).toBe('customer-search')
    expect(result.current.listboxId).toBe('customer-search-search-results')
    expect(result.current.query).toBe('acme')
    expect(result.current.isOpen).toBe(true)

    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(onSearch).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onSearch).toHaveBeenCalledWith('acme')

    act(() => {
      result.current.handleKeyDown({ key: 'ArrowDown', preventDefault: vi.fn() })
    })
    expect(result.current.activeIndex).toBe(0)
    expect(result.current.activeOptionId).toBe('customer-search-search-results-option-0')

  })

  it('supports domain-specific selection and escape behavior', () => {
    const onSelectActive = vi.fn()
    const { result } = renderHook(() => useComboboxSearch({
      resultCount: 2,
      onSelectActive,
      wrapNavigation: true,
      clearQueryOnEscape: true,
    }))

    act(() => {
      result.current.handleInputChange({ target: { value: 'query' } })
    })

    act(() => {
      result.current.handleKeyDown({ key: 'ArrowDown', preventDefault: vi.fn() })
      result.current.handleKeyDown({ key: 'ArrowDown', preventDefault: vi.fn() })
      result.current.handleKeyDown({ key: 'ArrowDown', preventDefault: vi.fn() })
    })

    expect(result.current.activeIndex).toBe(0)

    act(() => {
      result.current.handleKeyDown({ key: 'Enter', preventDefault: vi.fn() })
    })
    expect(onSelectActive).toHaveBeenCalledWith(0)

    act(() => {
      result.current.handleKeyDown({ key: 'Escape', preventDefault: vi.fn() })
    })
    expect(result.current.query).toBe('')
    expect(result.current.isOpen).toBe(false)
  })
})
