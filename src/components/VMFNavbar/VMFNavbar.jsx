/**
 * VMFNavbar Component
 *
 * Navigation bar for VMF (Virtual Management Framework) pages
 *
 * Features:
 * - Active route highlighting with NavLink
 * - Responsive design with mobile-friendly layout
 * - Accessible navigation with proper ARIA labels
 * - Theme-aware styling
 *
 * @example
 * <VMFNavbar />
 */

import { NavLink } from 'react-router-dom'
import { Fieldset } from '../Fieldset/Fieldset'
import './VMFNavbar.css'

export function VMFNavbar() {
  return (
    <Fieldset>
      <Fieldset.Legend>vmf-navigation</Fieldset.Legend>
      <Fieldset.Content>
        <nav className="vmf-navbar" role="navigation" aria-label="VMF navigation">
          <ul className="vmf-navbar__links">
            <li>
              <NavLink
                to="/vmf"
                end
                className={({ isActive }) =>
                  isActive ? 'vmf-navbar__link vmf-navbar__link--active' : 'vmf-navbar__link'
                }
              >
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/vmf/a"
                className={({ isActive }) =>
                  isActive ? 'vmf-navbar__link vmf-navbar__link--active' : 'vmf-navbar__link'
                }
              >
                VMF-A
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/vmf/b"
                className={({ isActive }) =>
                  isActive ? 'vmf-navbar__link vmf-navbar__link--active' : 'vmf-navbar__link'
                }
              >
                VMF-B
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/vmf/c"
                className={({ isActive }) =>
                  isActive ? 'vmf-navbar__link vmf-navbar__link--active' : 'vmf-navbar__link'
                }
              >
                VMF-C
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/vmf/d"
                className={({ isActive }) =>
                  isActive ? 'vmf-navbar__link vmf-navbar__link--active' : 'vmf-navbar__link'
                }
              >
                VMF-D
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/vmf/e"
                className={({ isActive }) =>
                  isActive ? 'vmf-navbar__link vmf-navbar__link--active' : 'vmf-navbar__link'
                }
              >
                VMF-E
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/vmf/f"
                className={({ isActive }) =>
                  isActive ? 'vmf-navbar__link vmf-navbar__link--active' : 'vmf-navbar__link'
                }
              >
                VMF-F
              </NavLink>
            </li>
          </ul>
        </nav>
      </Fieldset.Content>
    </Fieldset>
  )
}

export default VMFNavbar
