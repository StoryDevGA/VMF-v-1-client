/**
 * Navigation Component
 *
 * Responsive navigation bar with active link highlighting.
 * Shows public links (Home, Help) for all visitors and
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

import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectCurrentUser, selectIsAuthenticated } from '../../store/slices/authSlice.js'
import { isSuperAdmin as checkIsSuperAdmin } from '../../utils/authorization.js'
import './Navigation.css'

function Navigation({ isOpen = false, onLinkClick = () => {} }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectCurrentUser)

  const isSuperAdmin = checkIsSuperAdmin(user)
  const hasAdminAccess = isSuperAdmin || (user?.memberships ?? []).some(
    (m) => m.customerId && m.roles?.includes('CUSTOMER_ADMIN'),
  )

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
        <ul className="nav__links">
          <li className="nav__item--mobile-only">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? 'nav__link nav__link--active' : 'nav__link'
              }
              onClick={onLinkClick}
            >
              <span className="nav__text">Home</span>
            </NavLink>
          </li>
          {/* ---- Dashboard (all authenticated users) ---- */}
          {isAuthenticated && (
            <li>
              <NavLink
                to="/app/dashboard"
                className={({ isActive }) =>
                  isActive ? 'nav__link nav__link--active' : 'nav__link'
                }
                onClick={onLinkClick}
              >
                <span className="nav__text">Dashboard</span>
              </NavLink>
            </li>
          )}

          <li>
            <NavLink
              to="/help"
              className={({ isActive }) =>
                isActive ? 'nav__link nav__link--active' : 'nav__link'
              }
              onClick={onLinkClick}
            >
              <span className="nav__text">Help</span>
            </NavLink>
          </li>

          {/* ---- Administration links (authenticated admins only) ---- */}
          {isAuthenticated && hasAdminAccess && (
            <>
              <li className="nav__separator" aria-hidden="true" />
              <li>
                <NavLink
                  to="/app/administration/edit-users"
                  className={({ isActive }) =>
                    isActive ? 'nav__link nav__link--active' : 'nav__link'
                  }
                  onClick={onLinkClick}
                >
                  <span className="nav__text">Users</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/app/administration/maintain-tenants"
                  className={({ isActive }) =>
                    isActive ? 'nav__link nav__link--active' : 'nav__link'
                  }
                  onClick={onLinkClick}
                >
                  <span className="nav__text">Tenants</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/app/administration/system-monitoring"
                  className={({ isActive }) =>
                    isActive ? 'nav__link nav__link--active' : 'nav__link'
                  }
                  onClick={onLinkClick}
                >
                  <span className="nav__text">Monitoring</span>
                </NavLink>
              </li>
            </>
          )}


        </ul>
      </div>
    </nav>
  )
}

export default Navigation
