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
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useLazyListUsersQuery } from '../../store/api/userApi.js'
import { Spinner } from '../Spinner'
import './UserSearchSelect.css'

/** Debounce delay for search input (ms) */
const SEARCH_DEBOUNCE = 300

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
  disabled = false,
  className = '',
  originalIds = [],
}) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [removalBlocked, setRemovalBlocked] = useState(null)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  /* ---- RTK Query lazy trigger ---- */
  const [triggerSearch, { data: searchData, isFetching: isSearching }] =
    useLazyListUsersQuery()

  /* ---- Debounced search ---- */
  useEffect(() => {
    if (!query.trim() || !customerId) return

    const timer = setTimeout(() => {
      triggerSearch({
        customerId,
        q: query.trim(),
        page: 1,
        pageSize: 20,
      })
    }, SEARCH_DEBOUNCE)

    return () => clearTimeout(timer)
  }, [query, customerId, triggerSearch])

  /* ---- Parse search results ---- */
  const searchResults = useMemo(() => {
    const users = searchData?.data?.users ?? []
    // Filter out already-selected users
    return users.filter((u) => !selectedIds.includes(u._id))
  }, [searchData, selectedIds])

  /* ---- Close dropdown on outside click ---- */
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /* ---- Selected user details cache ---- */
  const [selectedUsersCache, setSelectedUsersCache] = useState({})

  // Update cache when search results come in (so we have name/email for selected users)
  useEffect(() => {
    const users = searchData?.data?.users ?? []
    if (users.length === 0) return
    setSelectedUsersCache((prev) => {
      const next = { ...prev }
      for (const u of users) {
        next[u._id] = { name: u.name, email: u.email, roles: u.memberships?.[0]?.roles ?? [], isActive: u.isActive }
      }
      return next
    })
  }, [searchData])

  /* ---- Handlers ---- */

  const handleInputChange = useCallback((e) => {
    setQuery(e.target.value)
    setIsOpen(true)
    setRemovalBlocked(null)
  }, [])

  const handleInputFocus = useCallback(() => {
    if (query.trim()) {
      setIsOpen(true)
    }
  }, [query])

  const handleSelectUser = useCallback(
    (user) => {
      const newIds = [...selectedIds, user._id]
      // Cache the user details
      setSelectedUsersCache((prev) => ({
        ...prev,
        [user._id]: { name: user.name, email: user.email, roles: user.memberships?.[0]?.roles ?? [], isActive: user.isActive },
      }))
      onChange(newIds)
      setQuery('')
      setIsOpen(false)
      inputRef.current?.focus()
    },
    [selectedIds, onChange],
  )

  const handleRemoveUser = useCallback(
    (userId) => {
      // Block removal if it would drop below minimum
      if (selectedIds.length <= minRequired) {
        setRemovalBlocked(userId)
        return
      }
      setRemovalBlocked(null)
      onChange(selectedIds.filter((id) => id !== userId))
    },
    [selectedIds, minRequired, onChange],
  )

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setQuery('')
      }
    },
    [],
  )

  /* ---- Compute display name for selected IDs ---- */
  const getDisplayName = useCallback(
    (userId) => {
      const cached = selectedUsersCache[userId]
      if (cached) return cached.name || cached.email
      // Fallback — truncated ID
      return `${userId.slice(0, 8)}…`
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
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses} ref={containerRef}>
      {label && (
        <label className="user-search-select__label" htmlFor="user-search-input">
          {label}
        </label>
      )}

      {/* Selected users chips */}
      {selectedIds.length > 0 && (
        <ul className="user-search-select__selected" aria-label="Selected admins">
          {selectedIds.map((uid) => (
            <li key={uid} className="user-search-select__chip">
              <span className="user-search-select__chip-name">
                {getDisplayName(uid)}
              </span>
              {getDisplayEmail(uid) && (
                <span className="user-search-select__chip-email">
                  {getDisplayEmail(uid)}
                </span>
              )}
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
          id="user-search-input"
          type="text"
          className="user-search-select__input"
          placeholder="Search by name or email…"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="user-search-results"
        />
        {isSearching && (
          <span className="user-search-select__spinner" aria-hidden="true">
            <Spinner size="sm" />
          </span>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && query.trim() && (
        <ul
          id="user-search-results"
          className="user-search-select__dropdown"
          role="listbox"
          aria-label="User search results"
        >
          {isSearching && searchResults.length === 0 && (
            <li className="user-search-select__dropdown-item user-search-select__dropdown-item--loading">
              Searching…
            </li>
          )}

          {!isSearching && searchResults.length === 0 && (
            <li className="user-search-select__dropdown-item user-search-select__dropdown-item--empty">
              No users found matching "{query}"
            </li>
          )}

          {searchResults.map((user) => (
            <li
              key={user._id}
              className={[
                'user-search-select__dropdown-item',
                !user.isActive && 'user-search-select__dropdown-item--inactive',
              ]
                .filter(Boolean)
                .join(' ')}
              role="option"
              aria-selected="false"
              onClick={() => handleSelectUser(user)}
            >
              <span className="user-search-select__result-name">
                {user.name}
              </span>
              <span className="user-search-select__result-email">
                {user.email}
              </span>
              {user.memberships?.[0]?.roles?.length > 0 && (
                <span className="user-search-select__result-roles">
                  {user.memberships[0].roles.join(', ')}
                </span>
              )}
              {!user.isActive && (
                <span className="user-search-select__result-badge">Inactive</span>
              )}
            </li>
          ))}
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
