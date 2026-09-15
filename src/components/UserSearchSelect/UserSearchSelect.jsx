/**
 * UserSearchSelect Component
 *
 * Searchable multi-select for choosing users from the customer's user list.
 * Used for tenant admin assignment during tenant creation and editing.
 *
 * Features:
 * - Debounced typeahead search (300ms) against the users API
 * - Displays user name, email, and roles in dropdown results
 * - Selected users shown as removable chips
 * - Minimum selection enforcement (e.g. min 1 tenant admin)
 * - Last-admin removal protection with clear messaging
 * - Keyboard navigation (ArrowDown/ArrowUp/Enter/Escape)
 *
 * @param {Object}  props
 * @param {string}  props.customerId        — customer scope for user lookup
 * @param {Array<string>} props.selectedIds — currently selected user IDs
 * @param {Function} props.onChange         — called with updated ID array
 * @param {string}  [props.label]          — field label
 * @param {string}  [props.error]          — error message
 * @param {number}  [props.minRequired=1]  — minimum required selections
 * @param {boolean} [props.disabled=false] — disable the component
 * @param {string}  [props.className='']   — additional CSS classes
 * @param {Array<string>} [props.originalIds=[]] — original admin IDs for recovery detection
 * @param {Record<string, {name?: string, email?: string, roles?: Array<string>, isActive?: boolean}>} [props.selectedUsers={}] — preloaded selected-user display data
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useLazyListUsersQuery } from '../../store/api/userApi.js'
import { useComboboxSearch } from '../../hooks/useComboboxSearch.js'
import { Spinner } from '../Spinner'
import './UserSearchSelect.css'

const getUserId = (user) => String(user?._id ?? user?.id ?? '').trim()
const getUserRoles = (user) => user?.memberships?.[0]?.roles ?? []

/**
 * UserSearchSelect Component
 */
function UserSearchSelect({
  customerId,
  selectedIds = [],
  onChange,
  label = 'Search Users',
  error,
  minRequired = 1,
  maxSelections = Infinity,
  lockSelectionUntilRemoval = false,
  allowTemporaryEmptySelection = false,
  expandDropdown = false,
  disabled = false,
  className = '',
  originalIds = [],
  selectedUsers = {},
  showSelectedUsers = true,
}) {
  const [removalBlocked, setRemovalBlocked] = useState(null)
  const normalizedMaxSelections =
    Number.isFinite(maxSelections) && maxSelections > 0 ? maxSelections : Number.POSITIVE_INFINITY
  const isSelectionLocked =
    lockSelectionUntilRemoval
    && normalizedMaxSelections !== Number.POSITIVE_INFINITY
    && selectedIds.length >= normalizedMaxSelections

  /* ---- RTK Query lazy trigger ---- */
  const [triggerSearch, { data: searchData, isFetching: isSearching }] =
    useLazyListUsersQuery()

  /* ---- Parse search results ---- */
  const searchResults = useMemo(() => {
    const users = searchData?.data?.users ?? []
    return users.filter((user) => {
      const userId = getUserId(user)
      return userId && !selectedIds.includes(userId)
    })
  }, [searchData, selectedIds])

  const triggerUserSearch = useCallback((nextQuery) => {
    if (!customerId) return undefined
    return triggerSearch({
      customerId,
      q: String(nextQuery ?? '').trim(),
      page: 1,
      pageSize: 20,
    })
  }, [customerId, triggerSearch])

  const shouldSearch = useCallback(
    (nextQuery) => Boolean(nextQuery.trim() && customerId),
    [customerId],
  )

  const {
    activeIndex,
    activeOptionId,
    closeDropdown,
    containerRef,
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
  } = useComboboxSearch({
    disabled: disabled || isSelectionLocked,
    resultCount: searchResults.length,
    onSearch: triggerUserSearch,
    searchEnabled: shouldSearch,
    closeOnBlur: false,
    clearQueryOnEscape: true,
    wrapNavigation: true,
    openOnFocus: (nextQuery) => Boolean(nextQuery.trim()),
    onInputChange: () => setRemovalBlocked(null),
    onSelectActive: (index) => handleSelectUser(searchResults[index]),
  })

  useEffect(() => {
    if (!isSelectionLocked) return
    resetSearch()
  }, [isSelectionLocked, resetSearch])

  /* ---- Auto-clear removalBlocked when conditions change ---- */
  useEffect(() => {
    if (removalBlocked && selectedIds.length > minRequired) {
      setRemovalBlocked(null)
    }
  }, [removalBlocked, selectedIds, minRequired])

  /* ---- Selected user details cache ---- */
  const [selectedUsersCache, setSelectedUsersCache] = useState({})

  useEffect(() => {
    const entries = Object.entries(selectedUsers ?? {}).filter(([userId]) => Boolean(userId))
    if (entries.length === 0) return

    setSelectedUsersCache((prev) => {
      const next = { ...prev }
      for (const [userId, user] of entries) {
        next[userId] = {
          name: user?.name ?? '',
          email: user?.email ?? '',
          roles: Array.isArray(user?.roles) ? user.roles : [],
          isActive: user?.isActive,
        }
      }
      return next
    })
  }, [selectedUsers])

  // Update cache when search results come in (so we have name/email for selected users)
  useEffect(() => {
    const users = searchData?.data?.users ?? []
    if (users.length === 0) return
    setSelectedUsersCache((prev) => {
      const next = { ...prev }
      for (const u of users) {
        const userId = getUserId(u)
        if (!userId) continue
        next[userId] = {
          name: u.name,
          email: u.email,
          roles: getUserRoles(u),
          isActive: u.isActive,
        }
      }
      return next
    })
  }, [searchData])

  /* ---- Handlers ---- */

  function handleSelectUser(user) {
      const userId = getUserId(user)
      if (!userId) return
      if (selectedIds.includes(userId)) return

      const newIds = normalizedMaxSelections === 1
        ? [userId]
        : [...selectedIds, userId].slice(-normalizedMaxSelections)
      // Cache the user details
      setSelectedUsersCache((prev) => ({
        ...prev,
        [userId]: {
          name: user.name,
          email: user.email,
          roles: getUserRoles(user),
          isActive: user.isActive,
        },
      }))
      onChange(newIds, {
        [userId]: {
          name: user.name,
          email: user.email,
          roles: getUserRoles(user),
          isActive: user.isActive,
        },
      })
      setQuery('')
      closeDropdown()
      inputRef.current?.focus()
  }

  const handleRemoveUser = useCallback(
    (userId) => {
      // Block removal if it would drop below minimum
      if (!allowTemporaryEmptySelection && selectedIds.length <= minRequired) {
        setRemovalBlocked(userId)
        return
      }
      setRemovalBlocked(null)
      onChange(selectedIds.filter((id) => id !== userId))
    },
    [allowTemporaryEmptySelection, selectedIds, minRequired, onChange],
  )

  /* ---- Compute display name for selected IDs ---- */
  const getDisplayName = useCallback(
    (userId) => {
      const cached = selectedUsersCache[userId]
      if (cached) return cached.name || cached.email
      // Fallback — truncated ID
      return `${userId.slice(0, 8)}...`
    },
    [selectedUsersCache],
  )

  const getDisplayEmail = useCallback(
    (userId) => {
      const cached = selectedUsersCache[userId]
      return cached?.email ?? ''
    },
    [selectedUsersCache],
  )

  /* ---- Recovery detection ---- */
  const showRecoveryHint = useMemo(() => {
    if (!removalBlocked) return false
    return selectedIds.length <= minRequired
  }, [removalBlocked, selectedIds, minRequired])

  const containerClasses = [
    'user-search-select',
    disabled && 'user-search-select--disabled',
    error && 'user-search-select--error',
    expandDropdown && 'user-search-select--expanded-dropdown',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const showDropdown = isOpen && query.trim() && !isSelectionLocked
  const hasResults = searchResults.length > 0
  const showStatusMessage = showDropdown && !hasResults

  return (
    <div className={containerClasses} ref={containerRef}>
      {label && (
        <label className="user-search-select__label" htmlFor={inputId}>
          {label}
        </label>
      )}

      {/* Selected users chips */}
      {showSelectedUsers && selectedIds.length > 0 && (
        <ul className="user-search-select__selected" aria-label="Selected admins">
          {selectedIds.map((uid) => (
            <li key={uid} className="user-search-select__chip">
              <div className="user-search-select__chip-copy">
                <span className="user-search-select__chip-name">
                  {getDisplayName(uid)}
                </span>
                {getDisplayEmail(uid) && (
                  <span className="user-search-select__chip-email">
                    {getDisplayEmail(uid)}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="user-search-select__chip-remove"
                onClick={() => handleRemoveUser(uid)}
                disabled={disabled}
                aria-label={`Remove ${getDisplayName(uid)}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Minimum admin warning */}
      {showRecoveryHint && (
        <div className="user-search-select__recovery" role="alert">
          <p className="user-search-select__recovery-text">
            <strong>Cannot remove:</strong> At least {minRequired} tenant admin{minRequired > 1 ? 's' : ''} must
            be assigned. Add a replacement admin before removing this one.
          </p>
          {originalIds.length > 0 && (
            <p className="user-search-select__recovery-hint">
              If all current admins are inactive, contact a Super Admin to reassign tenant administration.
            </p>
          )}
        </div>
      )}

      {/* Search input */}
      <div className="user-search-select__input-wrapper">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className="user-search-select__input"
          placeholder="Search by name or email…"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled || isSelectionLocked}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
        />
        {isSearching && (
          <span className="user-search-select__spinner" aria-hidden="true">
            <Spinner size="sm" />
          </span>
        )}
      </div>

      {/* Status messages (outside listbox for valid ARIA) */}
      {showStatusMessage && (
        <div
          className="user-search-select__dropdown user-search-select__dropdown--status"
          role="status"
          aria-live="polite"
        >
          {isSearching
            ? 'Searching\u2026'
            : `No users found matching \u201c${query}\u201d`}
        </div>
      )}

      {/* Dropdown results */}
      {showDropdown && hasResults && (
        <ul
          id={listboxId}
          className="user-search-select__dropdown"
          role="listbox"
          aria-label="User search results"
        >
          {searchResults.map((user, index) => {
            const optionId = `${listboxId}-option-${index}`
            const isFocused = index === activeIndex
            return (
              <li
                key={user._id}
                id={optionId}
                className={[
                  'user-search-select__dropdown-item',
                  !user.isActive && 'user-search-select__dropdown-item--inactive',
                  isFocused && 'user-search-select__dropdown-item--focused',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="option"
                aria-selected={isFocused}
                onClick={() => handleSelectUser(user)}
              >
                <div className="user-search-select__result-copy">
                  <span className="user-search-select__result-name">
                    {user.name}
                  </span>
                  <span className="user-search-select__result-email">
                    {user.email}
                  </span>
                </div>
                {!user.isActive && (
                  <span className="user-search-select__result-badge">Inactive</span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Error message */}
      {error && (
        <span className="user-search-select__error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

export { UserSearchSelect }
export default UserSearchSelect
