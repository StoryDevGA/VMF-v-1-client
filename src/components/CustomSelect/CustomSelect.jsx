/**
 * CustomSelect Component
 *
 * A reusable, accessible combobox-pattern dropdown that provides
 * fully styled option panels matching the SLOS design system.
 * Replaces native <select> in toolbar / context-switching scenarios
 * where full visual control over the dropdown is needed.
 *
 * Accessibility (WAI-ARIA select-only combobox):
 * - role="combobox" trigger with aria-controls → listbox id
 * - aria-activedescendant tracks the keyboard-focused option
 * - Arrow Up/Down, Home, End for option navigation
 * - Enter/Space to select, Escape to close
 * - Click-outside dismissal
 * - Reduced-motion and high-contrast media query support
 *
 * @module components/CustomSelect
 */

import { useState, useCallback, useEffect, useRef, useId } from 'react'
import { MdExpandMore, MdExpandLess } from 'react-icons/md'
import { Spinner } from '../Spinner'
import './CustomSelect.css'

/**
 * @param {Object}     props
 * @param {*}          props.value            — currently selected value
 * @param {Function}   props.onChange          — callback(value) on selection
 * @param {Array}      [props.options=[]]      — { value, label } selectable items
 * @param {Array}      [props.actions=[]]      — { value, label } action items (rendered after separator)
 * @param {string}     [props.placeholder]     — text when nothing is selected
 * @param {ReactNode}  [props.icon]            — leading icon element
 * @param {string}     props.ariaLabel         — accessible label for the combobox
 * @param {boolean}    [props.disabled=false]  — disables interaction
 * @param {boolean}    [props.loading=false]   — shows Spinner instead of trigger
 * @param {string}     [props.className='']    — additional CSS class(es)
 */
export function CustomSelect({
  value,
  onChange,
  options = [],
  actions = [],
  placeholder = 'Select…',
  icon = null,
  ariaLabel,
  disabled = false,
  loading = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef(null)
  const listboxId = useId()
  const baseOptionId = useId()

  // Merge options + actions for unified keyboard navigation
  const allItems = [...options, ...actions]

  // Resolve display label
  const selectedOption = options.find((o) => o.value === value)
  const displayLabel = selectedOption?.label ?? placeholder

  /* ---- Click outside ---- */
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  /* ---- Scroll active option into view ---- */
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return
    const optionEl = document.getElementById(`${baseOptionId}-${activeIndex}`)
    if (typeof optionEl?.scrollIntoView === 'function') {
      optionEl.scrollIntoView({ block: 'nearest' })
    }
  }, [isOpen, activeIndex, baseOptionId])

  /* ---- Helpers ---- */
  const open = useCallback(() => {
    if (disabled || loading) return
    setIsOpen(true)
    const idx = allItems.findIndex((item) => item.value === value)
    setActiveIndex(idx >= 0 ? idx : 0)
  }, [disabled, loading, allItems, value])

  const close = useCallback(() => {
    setIsOpen(false)
    setActiveIndex(-1)
  }, [])

  const selectItem = useCallback(
    (itemValue) => {
      close()
      onChange(itemValue)
    },
    [close, onChange],
  )

  /* ---- Keyboard ---- */
  const handleKeyDown = useCallback(
    (e) => {
      if (disabled || loading) return

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (isOpen && activeIndex >= 0 && activeIndex < allItems.length) {
            selectItem(allItems[activeIndex].value)
          } else {
            isOpen ? close() : open()
          }
          break

        case 'Escape':
          if (isOpen) {
            e.preventDefault()
            close()
          }
          break

        case 'ArrowDown':
          e.preventDefault()
          if (!isOpen) {
            open()
          } else {
            setActiveIndex((prev) =>
              prev < allItems.length - 1 ? prev + 1 : prev,
            )
          }
          break

        case 'ArrowUp':
          e.preventDefault()
          if (!isOpen) {
            open()
          } else {
            setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev))
          }
          break

        case 'Home':
          if (isOpen) {
            e.preventDefault()
            setActiveIndex(0)
          }
          break

        case 'End':
          if (isOpen) {
            e.preventDefault()
            setActiveIndex(allItems.length - 1)
          }
          break

        default:
          break
      }
    },
    [disabled, loading, isOpen, activeIndex, allItems, selectItem, close, open],
  )

  const handleTriggerClick = useCallback(() => {
    if (disabled || loading) return
    isOpen ? close() : open()
  }, [disabled, loading, isOpen, close, open])

  /* ---- Derived ARIA ids ---- */
  const activeDescendantId =
    isOpen && activeIndex >= 0 ? `${baseOptionId}-${activeIndex}` : undefined

  const containerClasses = [
    'custom-select',
    disabled && 'custom-select--disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses} ref={containerRef}>
      {icon && (
        <span className="custom-select__icon" aria-hidden="true">
          {icon}
        </span>
      )}

      {loading ? (
        <div className="custom-select__loading">
          <Spinner size="small" />
        </div>
      ) : (
        <>
          <div
            className="custom-select__trigger"
            role="combobox"
            tabIndex={disabled ? -1 : 0}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={listboxId}
            aria-activedescendant={activeDescendantId}
            aria-label={ariaLabel}
            aria-disabled={disabled || undefined}
            onClick={handleTriggerClick}
            onKeyDown={handleKeyDown}
          >
            <span className="custom-select__value">{displayLabel}</span>
            <span className="custom-select__arrow" aria-hidden="true">
              {isOpen ? (
                <MdExpandLess size={16} />
              ) : (
                <MdExpandMore size={16} />
              )}
            </span>
          </div>

          {isOpen && (
            <ul
              id={listboxId}
              className="custom-select__dropdown"
              role="listbox"
              aria-label={ariaLabel}
            >
              {options.map((option, index) => (
                <li
                  key={option.value}
                  id={`${baseOptionId}-${index}`}
                  role="option"
                  className={[
                    'custom-select__option',
                    option.value === value &&
                      'custom-select__option--selected',
                    index === activeIndex &&
                      'custom-select__option--focused',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-selected={option.value === value}
                  onClick={() => selectItem(option.value)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  {option.label}
                </li>
              ))}

              {actions.map((action, i) => {
                const index = options.length + i
                return (
                  <li
                    key={action.value}
                    id={`${baseOptionId}-${index}`}
                    role="option"
                    className={[
                      'custom-select__option',
                      'custom-select__option--action',
                      index === activeIndex &&
                        'custom-select__option--focused',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-selected={false}
                    onClick={() => selectItem(action.value)}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    {action.label}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
