/**
 * Navigation Component
 *
 * Responsive navigation bar with active link highlighting
 *
 * Features:
 * - Responsive design (mobile hamburger menu)
 * - Active route highlighting
 * - Accessible keyboard navigation
 * - Theme-aware styling
 */

import { NavLink } from 'react-router-dom'
import './Navigation.css'

function Navigation({ isOpen = false, onLinkClick = () => {} }) {
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
          <li role="none">
            <NavLink
              to="/components"
              className={({ isActive }) =>
                isActive ? 'nav__link nav__link--active' : 'nav__link'
              }
              role="menuitem"
              onClick={onLinkClick}
            >
              Components
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
              About
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  )
}

export default Navigation
