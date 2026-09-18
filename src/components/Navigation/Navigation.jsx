/**
 * Navigation Component
 *
 * Role-aware grouped navigation with accessible submenus.
 * Dashboard is the application home and is reached via the logo.
 */

import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { MdExpandMore } from 'react-icons/md'
import { Avatar } from '../Avatar'
import { useAuth } from '../../hooks/useAuth.js'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { selectCurrentUser, selectIsAuthenticated, selectResolvedPermissions } from '../../store/slices/authSlice.js'
import {
  hasAnyCustomerRole,
  hasCustomerRole,
  hasAnyTenantRole,
  hasAnyMultiTenantCustomerAdminScope,
  isSuperAdmin as checkIsSuperAdmin,
  hasAnyPermission,
  hasPlatformPermission,
  hasCustomerPermission,
} from '../../utils/authorization.js'
import { getPhase1aSuperAdminNavigationEntries } from '../../constants/superAdminNavigation.js'
import { useGetCustomerCreditsQuery } from '../../store/api/customerApi.js'
import { CUSTOMER_EXPERIENCE, resolveCustomerExperience } from '../../utils/customerExperience.js'
import { getCreditValue } from '../../pages/Dashboard/creditUtils.js'
import './Navigation.css'

function Navigation({ isOpen = false, onLinkClick = () => {} }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectCurrentUser)
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, logoutResult } = useAuth()
  const { getCustomerScope, hasFeatureEntitlement } = useAuthorization()
  const {
    customerId: selectedCustomerId,
    tenantId: selectedTenantId,
    customerName,
    resolvedTenantName,
    selectableTenants,
    setTenantId,
    selectedCustomerTopology,
    supportsTenantManagement: selectedCustomerSupportsTenantManagement,
  } = useTenantContext()

  const isSuperAdmin = checkIsSuperAdmin(user)
  const resolvedPermissions = useSelector(selectResolvedPermissions)
  const hasCustomerAdminAccess = hasAnyCustomerRole(user, 'CUSTOMER_ADMIN')
  const hasTenantAdminAccess =
    hasAnyTenantRole(user, 'TENANT_ADMIN') || hasAnyCustomerRole(user, 'TENANT_ADMIN')
  const hasSelectedCustomerTenantAdminAccess = useMemo(() => {
    if (!hasTenantAdminAccess) return false
    if (!selectedCustomerId) return true

    if (hasCustomerRole(user, selectedCustomerId, 'TENANT_ADMIN')) {
      return true
    }

    return Array.isArray(user?.tenantMemberships)
      && user.tenantMemberships.some(
        (tm) =>
          tm?.customerId?.toString() === selectedCustomerId.toString()
          && (tm.roles ?? []).includes('TENANT_ADMIN'),
      )
  }, [hasTenantAdminAccess, selectedCustomerId, user])
  const supportsTenantManagement = useMemo(() => {
    if (!hasCustomerAdminAccess) return false
    if (selectedCustomerId) return selectedCustomerSupportsTenantManagement
    return hasAnyMultiTenantCustomerAdminScope(user)
  }, [hasCustomerAdminAccess, selectedCustomerId, selectedCustomerSupportsTenantManagement, user])
  const hasSelectedCustomerTenantViewPermission = useMemo(() => {
    if (!selectedCustomerId) return false
    if (hasCustomerPermission(resolvedPermissions, selectedCustomerId, 'TENANT_VIEW')) return true

    return Array.isArray(resolvedPermissions?.tenants) && resolvedPermissions.tenants.some(
      (tenantScope) =>
        String(tenantScope?.customerId ?? '') === String(selectedCustomerId)
        && Array.isArray(tenantScope?.permissions)
        && tenantScope.permissions.includes('TENANT_VIEW'),
    )
  }, [resolvedPermissions, selectedCustomerId])
  const canAccessTenantMaintenance = hasCustomerAdminAccess
    ? supportsTenantManagement || hasSelectedCustomerTenantAdminAccess
    : hasSelectedCustomerTenantAdminAccess

  const canManageUsers = hasAnyPermission(resolvedPermissions, 'USER_VIEW') || hasCustomerAdminAccess
  const canManageTenants = useMemo(() => {
    if (
      selectedCustomerId
      && selectedCustomerTopology === 'SINGLE_TENANT'
      && !hasSelectedCustomerTenantAdminAccess
    ) {
      return false
    }

    if (selectedCustomerId) {
      return hasSelectedCustomerTenantViewPermission || canAccessTenantMaintenance
    }

    return hasAnyPermission(resolvedPermissions, 'TENANT_VIEW') || canAccessTenantMaintenance
  }, [
    canAccessTenantMaintenance,
    hasSelectedCustomerTenantAdminAccess,
    hasSelectedCustomerTenantViewPermission,
    resolvedPermissions,
    selectedCustomerId,
    selectedCustomerTopology,
  ])
  const canViewSystemHealth = hasPlatformPermission(resolvedPermissions, 'SYSTEM_HEALTH_VIEW') || hasCustomerAdminAccess
  const customerExperience = resolveCustomerExperience(
    selectedCustomerId ? getCustomerScope(selectedCustomerId) : null,
  )
  const {
    data: customerCreditsResponse,
    isLoading: isLoadingCustomerCredits,
    isFetching: isFetchingCustomerCredits,
    error: customerCreditsError,
  } = useGetCustomerCreditsQuery(selectedCustomerId, {
    skip: !selectedCustomerId || isSuperAdmin || customerExperience !== CUSTOMER_EXPERIENCE.SIGNAL,
  })
  const customerCreditBalances = customerCreditsResponse?.data?.balances
  const customerCreditsPending = isLoadingCustomerCredits || isFetchingCustomerCredits
  const hasWebsiteEntitlement = Boolean(
    selectedCustomerId
    && hasFeatureEntitlement(selectedCustomerId, 'WEBSITE', { fallbackWhenScopeMissing: false }),
  )
  const hasDocumentsEntitlement = Boolean(
    selectedCustomerId
    && hasFeatureEntitlement(selectedCustomerId, 'DOCUMENTS', { fallbackWhenScopeMissing: false }),
  )
  const userDisplayName = useMemo(() => {
    const preferredName = typeof user?.name === 'string' ? user.name.trim() : ''
    if (preferredName) return preferredName

    const email = typeof user?.email === 'string' ? user.email.trim() : ''
    if (email) return email

    return 'Account'
  }, [user])
  const userEmail = useMemo(() => {
    const email = typeof user?.email === 'string' ? user.email.trim() : ''
    if (!email || email === userDisplayName) return null
    return email
  }, [user, userDisplayName])

  const menuEntries = useMemo(() => {
    if (!isAuthenticated) return []

    const entries = []

    if (!isSuperAdmin && customerExperience === CUSTOMER_EXPERIENCE.SIGNAL) {
      entries.push(
        { type: 'link', key: 'signal-home', label: 'Signal Home', to: '/app/dashboard' },
        ...(hasWebsiteEntitlement
          ? [{ type: 'link', key: 'website-analysis', label: 'Website Analysis', to: '/app/website-analysis' }]
          : []),
        ...(hasDocumentsEntitlement
          ? [{ type: 'link', key: 'document-improvement', label: 'Document Improvement', to: '/app/document-improvement' }]
          : []),
        { type: 'link', key: 'credits', label: 'Credits', to: '/app/credits' },
        { type: 'credit-summary', key: 'signal-credit-summary', to: '/app/credits' },
      )
    }

    if (!isSuperAdmin && customerExperience === CUSTOMER_EXPERIENCE.CORE) {
      entries.push(
        {
          type: 'context',
          key: 'customer-context',
          label: 'Customer',
          secondaryLabel: customerName || 'Customer workspace',
        },
        { type: 'link', key: 'customer-home', label: 'Customer Home', to: '/app/dashboard' },
        { type: 'link', key: 'project-workspaces', label: 'Project Workspaces', to: '/app/workspaces/vmf' },
        { type: 'link', key: 'intelligence-hub', label: 'Intelligence Hub', to: '/app/intelligence' },
        { type: 'link', key: 'intelligence-quality', label: 'Intelligence Quality', to: '/app/intelligence/quality' },
        { type: 'link', key: 'workspace-structure', label: 'Workspace Structure', to: '/app/workspace-structure' },
        { type: 'link', key: 'outcome-studio', label: 'Outcome Studio', to: '/app/outcome-studio' },
        { type: 'link', key: 'assets', label: 'Assets', to: '/app/assets' },
        { type: 'link', key: 'review-evidence', label: 'Review & evidence', to: '/app/review-evidence' },
        { type: 'link', key: 'credits', label: 'Credits', to: '/app/credits' },
        {
          type: 'group',
          key: 'tenant',
          label: 'Tenant',
          secondaryLabel: resolvedTenantName || 'Select tenant',
          links: (selectableTenants ?? []).map((tenant) => ({
            key: `tenant-${String(tenant?._id ?? tenant?.id ?? tenant?.name ?? '').trim()}`,
            label: tenant?.name || 'Unnamed tenant',
            tenantId: tenant?._id ?? tenant?.id,
            tenantName: tenant?.name ?? null,
            isSelected: String(tenant?._id ?? tenant?.id ?? '') === String(selectedTenantId ?? ''),
          })),
        },
      )
    }

    if (isSuperAdmin) {
      entries.push(...getPhase1aSuperAdminNavigationEntries())
    }

    {
      const adminLinks = [
        ...(canManageUsers
          ? [
              {
                key: 'manage-users',
                label: 'Manage Users',
                to: '/app/administration/edit-users',
              },
            ]
          : []),
        ...(canManageTenants
          ? [
              {
                key: 'manage-tenants',
                label: 'Manage Tenants',
                to: '/app/administration/maintain-tenants',
              },
            ]
          : []),
      ]

      if (adminLinks.length > 0) {
        entries.push({
          type: 'group',
          key: 'admin',
          label: 'Admin',
          secondaryLabel: 'Administration',
          links: adminLinks,
        })
      }
    }

    if (!isSuperAdmin && canViewSystemHealth) {
      entries.push({
        type: 'group',
        key: 'system-health',
        label: 'System',
        ariaLabel: 'System Health',
        secondaryLabel: 'Health',
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

    if (!isSuperAdmin) {
      entries.push({
        type: 'group',
        key: 'help',
        label: 'Help',
        secondaryLabel: 'Support',
        links: [{ key: 'help', label: 'Help centre', to: '/help' }],
      })
    }

    entries.push({
      type: 'user-menu',
      key: 'account',
      label: userDisplayName,
      secondaryLabel: userEmail,
      links: [
        {
          key: 'account',
          label: 'Account',
          to: '/app/account',
        },
        {
          key: 'help',
          label: 'Help',
          to: '/help',
        },
      ],
      actions: [
        {
          key: 'sign-out',
          label: 'Sign Out',
        },
      ],
    })

    return entries
  }, [
    canManageTenants,
    canManageUsers,
    canViewSystemHealth,
    customerExperience,
    customerName,
    hasDocumentsEntitlement,
    hasWebsiteEntitlement,
    isAuthenticated,
    isSuperAdmin,
    resolvedTenantName,
    selectableTenants,
    selectedTenantId,
    userDisplayName,
    userEmail,
  ])

  const [openMenuKey, setOpenMenuKey] = useState(null)

  useEffect(() => {
    if (isOpen) return undefined

    const timeoutId = window.setTimeout(() => {
      setOpenMenuKey(null)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [isOpen])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setOpenMenuKey(null)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [location.pathname])

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpenMenuKey(null)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  if (menuEntries.length === 0) return null

  const navClasses = [
    'nav',
    customerExperience === CUSTOMER_EXPERIENCE.SIGNAL && 'nav--signal',
    customerExperience === CUSTOMER_EXPERIENCE.CORE && 'nav--core',
    isOpen && 'nav--open',
  ].filter(Boolean).join(' ')

  const toggleMenuGroup = (groupKey) => {
    setOpenMenuKey((previous) => (previous === groupKey ? null : groupKey))
  }

  const handleSubmenuLinkClick = () => {
    setOpenMenuKey(null)
    onLinkClick()
  }

  const handleTenantChange = (link) => {
    if (!link?.tenantId) return
    setTenantId(link.tenantId, link.tenantName)
    setOpenMenuKey(null)
    onLinkClick()
  }

  const handleActionClick = async (entry) => {
    if (entry.key !== 'sign-out' || logoutResult.isLoading) return

    setOpenMenuKey(null)
    onLinkClick()
    await logout()
    navigate(isSuperAdmin ? '/super-admin/login' : '/app/login', {
      replace: true,
    })
  }

  const isGroupActive = (links) =>
    links.some(
      (link) => link.to && (location.pathname === link.to || location.pathname.startsWith(`${link.to}/`)),
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

            if (entry.type === 'action') {
              return (
                <li key={entry.key} className="nav__item nav__item--action">
                  <button
                    type="button"
                    className="nav__action"
                    onClick={() => handleActionClick(entry)}
                    disabled={logoutResult.isLoading}
                  >
                    <span className="nav__text">{entry.label}</span>
                  </button>
                </li>
              )
            }

            if (entry.type === 'context') {
              return (
                <li key={entry.key} className="nav__item nav__item--context">
                  <span className="nav__context-label">{entry.label}</span>
                  <strong className="nav__context-value">{entry.secondaryLabel}</strong>
                </li>
              )
            }

            if (entry.type === 'credit-summary') {
              return (
                <li key={entry.key} className="nav__item nav__item--credit-summary">
                  <NavLink
                    to={entry.to}
                    className="nav__credit-summary"
                    aria-label={`View Signal credit balances: ${getCreditValue(customerCreditBalances?.documentImprovement, { isLoading: customerCreditsPending, hasError: Boolean(customerCreditsError) })} Document, ${getCreditValue(customerCreditBalances?.websiteAnalysis, { isLoading: customerCreditsPending, hasError: Boolean(customerCreditsError) })} Website`}
                    onClick={handleSubmenuLinkClick}
                  >
                    <span><strong>{getCreditValue(customerCreditBalances?.documentImprovement, { isLoading: customerCreditsPending, hasError: Boolean(customerCreditsError) })}</strong><small>Document</small></span>
                    <span><strong>{getCreditValue(customerCreditBalances?.websiteAnalysis, { isLoading: customerCreditsPending, hasError: Boolean(customerCreditsError) })}</strong><small>Website</small></span>
                  </NavLink>
                </li>
              )
            }

            if (entry.type === 'user-menu') {
              const isOpenGroup = openMenuKey === entry.key
              const activeGroup = isGroupActive(entry.links)
              const submenuId = `nav-submenu-${entry.key}`
              const accountMenuLabel = entry.label === 'Account'
                ? 'Account menu'
                : `${entry.label} account menu`

              const groupClasses = ['nav__item', 'nav__item--group', `nav__item--${entry.key}`, 'nav__item--user', activeGroup && 'nav__item--active']
                .filter(Boolean)
                .join(' ')

              return (
                <li
                  key={entry.key}
                  className={groupClasses}
                >
                  <button
                    type="button"
                    className="nav__group-toggle nav__user-toggle"
                    onClick={() => toggleMenuGroup(entry.key)}
                    aria-expanded={isOpenGroup}
                    aria-controls={submenuId}
                    aria-label={accountMenuLabel}
                  >
                    <span className="nav__user-summary">
                      <span className="nav__user-identity">
                        <Avatar
                          name={entry.label}
                          size="sm"
                          className="nav__user-avatar"
                          aria-hidden="true"
                        />
                        <span className="nav__user-details">
                          <span className="nav__user-name">{entry.label}</span>
                          {entry.secondaryLabel ? (
                            <span className="nav__user-email">{entry.secondaryLabel}</span>
                          ) : null}
                        </span>
                      </span>
                    </span>
                    <MdExpandMore
                      className={`nav__group-icon ${isOpenGroup ? 'nav__group-icon--open' : ''}`}
                      aria-hidden="true"
                      focusable="false"
                    />
                  </button>

                  <div
                    id={submenuId}
                    className="nav__submenu-panel nav__submenu-panel--user"
                    hidden={!isOpenGroup}
                  >
                    <div className="nav__submenu-header">
                      <Avatar
                        name={entry.label}
                        size="md"
                        className="nav__submenu-avatar"
                        aria-hidden="true"
                      />
                      <div className="nav__submenu-identity">
                        <p className="nav__submenu-heading">{entry.label}</p>
                        {entry.secondaryLabel ? (
                          <p className="nav__submenu-meta">{entry.secondaryLabel}</p>
                        ) : null}
                      </div>
                    </div>

                    <ul className="nav__submenu">
                      {entry.links.map((link) => (
                        <li key={link.key} className="nav__submenu-item">
                          {link.tenantId ? (
                            <button
                              type="button"
                              className={`nav__submenu-link nav__submenu-link--button${link.isSelected ? ' nav__submenu-link--active' : ''}`}
                              aria-current={link.isSelected ? 'page' : undefined}
                              onClick={() => handleTenantChange(link)}
                            >
                              <span className="nav__text">{link.label}</span>
                            </button>
                          ) : (
                            <NavLink
                              to={link.to}
                              className={({ isActive }) =>
                                isActive ? 'nav__submenu-link nav__submenu-link--active' : 'nav__submenu-link'
                              }
                              onClick={handleSubmenuLinkClick}
                            >
                              <span className="nav__text">{link.label}</span>
                            </NavLink>
                          )}
                        </li>
                      ))}
                      {entry.actions.map((action) => (
                        <li key={action.key} className="nav__submenu-item">
                          <button
                            type="button"
                            className="nav__submenu-action"
                            onClick={() => handleActionClick(action)}
                            disabled={logoutResult.isLoading}
                          >
                            <span className="nav__text">{action.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              )
            }

            const isOpenGroup = openMenuKey === entry.key
            const activeGroup = isGroupActive(entry.links)
            const submenuId = `nav-submenu-${entry.key}`

            const groupClasses = ['nav__item', 'nav__item--group', `nav__item--${entry.key}`, activeGroup && 'nav__item--active']
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
                  aria-label={entry.ariaLabel ?? entry.label}
                  >
                  {entry.secondaryLabel ? (
                    <span className="nav__group-summary">
                      <span className="nav__text">{entry.label}</span>
                      <strong>{entry.secondaryLabel}</strong>
                    </span>
                  ) : (
                    <span className="nav__text">{entry.label}</span>
                  )}
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
