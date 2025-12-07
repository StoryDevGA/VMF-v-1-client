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

function Navigation() {
  return (
    <nav className="nav" role="navigation" aria-label="Main navigation">
      <div className="nav__container container">
        <div className="nav__brand">
          <NavLink to="/" className="nav__logo">
            StoryLineOS
          </NavLink>
        </div>

        <ul className="nav__links" role="menubar">
          <li role="none">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? 'nav__link nav__link--active' : 'nav__link'
              }
              role="menuitem"
              end
            >
              Home
            </NavLink>
          </li>
          <li role="none">
            <NavLink
              to="/components"
              className={({ isActive }) =>
                isActive ? 'nav__link nav__link--active' : 'nav__link'
              }
              role="menuitem"
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
