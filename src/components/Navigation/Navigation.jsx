/**
 * Navigation Component
 *
 * Responsive navigation bar with active link highlighting.
 * Shows public links (Home, About) for all visitors and
 * administration links (Edit Users, Maintain Tenants) when the
 * user is authenticated with appropriate roles.
 *
 * Features:
 * - Responsive design (mobile hamburger menu)
 * - Active route highlighting
 * - Role-aware admin section (CUSTOMER_ADMIN / SUPER_ADMIN)
 * - Accessible keyboard navigation
 * - Theme-aware styling
 */

import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  MdHome,
  MdInfo,
  MdPeople,
  MdBusiness,
  MdMonitorHeart,
  MdLogout,
} from 'react-icons/md'
import { selectCurrentUser, selectIsAuthenticated } from '../../store/slices/authSlice.js'
import { isSuperAdmin as checkIsSuperAdmin } from '../../utils/authorization.js'
import { useAuth } from '../../hooks/useAuth.js'
import './Navigation.css'

function Navigation({ isOpen = false, onLinkClick = () => {} }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectCurrentUser)
  const { logout, logoutResult } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isSuperAdmin = checkIsSuperAdmin(user)
  const hasAdminAccess = isSuperAdmin || (user?.memberships ?? []).some(
    (m) => m.customerId && m.roles?.includes('CUSTOMER_ADMIN'),
  )

  const handleLogout = async () => {
    if (logoutResult.isLoading) return
    const redirectTo = location.pathname.startsWith('/super-admin')
      ? '/super-admin/login'
      : '/app/login'

    onLinkClick()
    await logout()
    navigate(redirectTo, { replace: true })
  }

  const navClasses = [
    'nav',
    isOpen && 'nav--open'
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <nav
      className={navClasses}
      role="navigation"
      aria-label="Main navigation"
      id="mobile-navigation"
    >
      <div className="nav__container">
        <ul className="nav__links" role="menubar">
          <li role="none" className="nav__item--mobile-only">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? 'nav__link nav__link--active' : 'nav__link'
              }
              role="menuitem"
              onClick={onLinkClick}
            >
              <span className="nav__icon" aria-hidden="true">
                <MdHome />
              </span>
              <span className="nav__text">Home</span>
            </NavLink>
          </li>
          <li role="none">
            <NavLink
              to="/about"
              className={({ isActive }) =>
                isActive ? 'nav__link nav__link--active' : 'nav__link'
              }
              role="menuitem"
              onClick={onLinkClick}
            >
              <span className="nav__icon" aria-hidden="true">
                <MdInfo />
              </span>
              <span className="nav__text">About</span>
            </NavLink>
          </li>

          {/* ---- Administration links (authenticated admins only) ---- */}
          {isAuthenticated && hasAdminAccess && (
            <>
              <li role="none" className="nav__separator" aria-hidden="true" />
              <li role="none">
                <NavLink
                  to="/app/administration/edit-users"
                  className={({ isActive }) =>
                    isActive ? 'nav__link nav__link--active' : 'nav__link'
                  }
                  role="menuitem"
                  onClick={onLinkClick}
                >
                  <span className="nav__icon" aria-hidden="true">
                    <MdPeople />
                  </span>
                  <span className="nav__text">Users</span>
                </NavLink>
              </li>
              <li role="none">
                <NavLink
                  to="/app/administration/maintain-tenants"
                  className={({ isActive }) =>
                    isActive ? 'nav__link nav__link--active' : 'nav__link'
                  }
                  role="menuitem"
                  onClick={onLinkClick}
                >
                  <span className="nav__icon" aria-hidden="true">
                    <MdBusiness />
                  </span>
                  <span className="nav__text">Tenants</span>
                </NavLink>
              </li>
              <li role="none">
                <NavLink
                  to="/app/administration/system-monitoring"
                  className={({ isActive }) =>
                    isActive ? 'nav__link nav__link--active' : 'nav__link'
                  }
                  role="menuitem"
                  onClick={onLinkClick}
                >
                  <span className="nav__icon" aria-hidden="true">
                    <MdMonitorHeart />
                  </span>
                  <span className="nav__text">Monitoring</span>
                </NavLink>
              </li>
            </>
          )}

          {/* ---- Logout ---- */}
          {isAuthenticated && (
            <>
              <li role="none" className="nav__separator" aria-hidden="true" />
              <li role="none">
                <button
                  type="button"
                  className="nav__link nav__button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={logoutResult.isLoading}
                  aria-busy={logoutResult.isLoading || undefined}
                >
                  <span className="nav__icon" aria-hidden="true">
                    <MdLogout />
                  </span>
                  <span className="nav__text">
                    {logoutResult.isLoading ? 'Logging out...' : 'Logout'}
                  </span>
                </button>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  )
}

export default Navigation
