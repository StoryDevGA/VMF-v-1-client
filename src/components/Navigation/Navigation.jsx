/**
 * Navigation Component
 *
 * Role-aware grouped navigation with accessible submenus.
 * Dashboard is the application home and is reached via the logo.
 */

import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { MdExpandMore } from 'react-icons/md'
import { selectCurrentUser, selectIsAuthenticated } from '../../store/slices/authSlice.js'
import { isSuperAdmin as checkIsSuperAdmin } from '../../utils/authorization.js'
import './Navigation.css'

function Navigation({ isOpen = false, onLinkClick = () => {} }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectCurrentUser)
  const location = useLocation()

  const isSuperAdmin = checkIsSuperAdmin(user)
  const hasCustomerAdminAccess = (user?.memberships ?? []).some(
    (membership) => membership.customerId && membership.roles?.includes('CUSTOMER_ADMIN'),
  )

  const menuEntries = useMemo(() => {
    if (!isAuthenticated) return []

    const entries = []

    if (isSuperAdmin) {
      entries.push({
        type: 'group',
        key: 'system-admin',
        label: 'System Admin',
        links: [
          { key: 'versioning', label: 'Versioning', to: '/super-admin/system-versioning' },
          {
            key: 'licence-maintenance',
            label: 'Licence Maintenance',
            to: '/super-admin/license-levels',
          },
        ],
      })

      entries.push({
        type: 'link',
        key: 'customer-admin',
        label: 'Customer Admin',
        to: '/super-admin/customers',
      })
    }

    if (isSuperAdmin || hasCustomerAdminAccess) {
      entries.push({
        type: 'group',
        key: 'system-health',
        label: 'System Health',
        links: [
          {
            key: 'monitoring',
            label: 'Monitoring',
            to: isSuperAdmin
              ? '/super-admin/system-monitoring'
              : '/app/administration/system-monitoring',
          },
          ...(isSuperAdmin
            ? [
                { key: 'audit-logs', label: 'Audit Logs', to: '/super-admin/audit-logs' },
                {
                  key: 'denied-access',
                  label: 'Denied Access',
                  to: '/super-admin/denied-access-logs',
                },
              ]
            : []),
        ],
      })
    }

    entries.push({
      type: 'link',
      key: 'help',
      label: 'Help',
      to: '/help',
    })

    return entries
  }, [hasCustomerAdminAccess, isAuthenticated, isSuperAdmin])

  const [openMenuKey, setOpenMenuKey] = useState(null)

  useEffect(() => {
    if (!isOpen) setOpenMenuKey(null)
  }, [isOpen])

  useEffect(() => {
    setOpenMenuKey(null)
  }, [location.pathname])

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpenMenuKey(null)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  if (menuEntries.length === 0) return null

  const navClasses = ['nav', isOpen && 'nav--open'].filter(Boolean).join(' ')

  const toggleMenuGroup = (groupKey) => {
    setOpenMenuKey((previous) => (previous === groupKey ? null : groupKey))
  }

  const handleSubmenuLinkClick = () => {
    setOpenMenuKey(null)
    onLinkClick()
  }

  const isGroupActive = (links) =>
    links.some(
      (link) => location.pathname === link.to || location.pathname.startsWith(`${link.to}/`),
    )

  return (
    <nav
      className={navClasses}
      role="navigation"
      aria-label="Main navigation"
      id="mobile-navigation"
    >
      <div className="nav__container">
        <ul className="nav__links" aria-label="Primary menu">
          {menuEntries.map((entry) => {
            if (entry.type === 'link') {
              return (
                <li key={entry.key} className="nav__item nav__item--link">
                  <NavLink
                    to={entry.to}
                    className={({ isActive }) =>
                      isActive ? 'nav__link nav__link--active' : 'nav__link'
                    }
                    onClick={handleSubmenuLinkClick}
                  >
                    <span className="nav__text">{entry.label}</span>
                  </NavLink>
                </li>
              )
            }

            const isOpenGroup = openMenuKey === entry.key
            const activeGroup = isGroupActive(entry.links)
            const submenuId = `nav-submenu-${entry.key}`

            const groupClasses = ['nav__item', 'nav__item--group', activeGroup && 'nav__item--active']
              .filter(Boolean)
              .join(' ')

            return (
              <li
                key={entry.key}
                className={groupClasses}
              >
                <button
                  type="button"
                  className="nav__group-toggle"
                  onClick={() => toggleMenuGroup(entry.key)}
                  aria-expanded={isOpenGroup}
                  aria-controls={submenuId}
                >
                  <span className="nav__text">{entry.label}</span>
                  <MdExpandMore
                    className={`nav__group-icon ${isOpenGroup ? 'nav__group-icon--open' : ''}`}
                    aria-hidden="true"
                    focusable="false"
                  />
                </button>

                <div
                  id={submenuId}
                  className="nav__submenu-panel"
                  hidden={!isOpenGroup}
                >
                  <ul className="nav__submenu">
                    {entry.links.map((link) => (
                      <li key={link.key} className="nav__submenu-item">
                        <NavLink
                          to={link.to}
                          className={({ isActive }) =>
                            isActive ? 'nav__submenu-link nav__submenu-link--active' : 'nav__submenu-link'
                          }
                          onClick={handleSubmenuLinkClick}
                        >
                          <span className="nav__text">{link.label}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}

export default Navigation
