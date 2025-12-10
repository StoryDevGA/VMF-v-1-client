/**
 * VMFNavbar Component
 *
 * Navigation bar for VMF (Virtual Management Framework) pages
 *
 * Features:
 * - Active route highlighting with NavLink
 * - Progressive navigation (unlock pages sequentially by clicking)
 * - Responsive design with mobile-friendly layout
 * - Accessible navigation with proper ARIA labels
 * - Theme-aware styling
 *
 * @example
 * <VMFNavbar />
 */

import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Fieldset } from '../Fieldset/Fieldset'
import { MdLock, MdArrowBack, MdArrowForward } from 'react-icons/md'
import './VMFNavbar.css'

export function VMFNavbar() {
  // Define all VMF pages in order
  const pages = [
    { to: '/vmf', label: 'Dashboard', end: true },
    { to: '/vmf/a', label: '[a]' },
    { to: '/vmf/b', label: '[b]' },
    { to: '/vmf/c', label: '[c]' },
    { to: '/vmf/d', label: '[d]' },
    { to: '/vmf/e', label: '[e]' },
    { to: '/vmf/f', label: '[f]' },
    { to: '/vmf/g', label: '[g]' },
  ]

  const location = useLocation()
  const currentIndex = useMemo(() => {
    const match = pages.findIndex((page) => page.to === location.pathname)
    return match >= 0 ? match : 0
  }, [location.pathname, pages])

  // Track the highest unlocked page index; start locked to Dashboard
  const [unlockedIndex, setUnlockedIndex] = useState(0)

  // Allow deep links on VMF pages to start unlocked at the current page
  useEffect(() => {
    if (location.pathname.startsWith('/vmf') && currentIndex > unlockedIndex) {
      setUnlockedIndex(currentIndex)
    }
  }, [currentIndex, location.pathname, unlockedIndex])

  // Handle link clicks - unlock next page when frontier is clicked
  const handleLinkClick = (index) => {
    if (index > unlockedIndex) return
    setUnlockedIndex((prev) => Math.max(prev, index + 1, currentIndex))
  }

  return (
    <Fieldset>
      <Fieldset.Legend>vmf-navigation</Fieldset.Legend>
      <Fieldset.Content>
        <nav className="vmf-navbar" role="navigation" aria-label="VMF navigation">
          <ul className="vmf-navbar__links">
            {pages.map((page, index) => {
              const isAccessible = index <= unlockedIndex

              return (
                <li key={page.to}>
                  <NavLink
                    to={page.to}
                    end={page.end}
                    className={({ isActive }) => {
                      const classes = ['vmf-navbar__link']
                      if (!isAccessible) classes.push('btn', 'btn--outline', 'btn--sm')
                      if (isActive) classes.push('vmf-navbar__link--active')
                      if (!isAccessible) classes.push('vmf-navbar__link--disabled')
                      return classes.join(' ')
                    }}
                    onClick={(e) => {
                      if (!isAccessible) {
                        e.preventDefault()
                        return
                      }
                      handleLinkClick(index)
                    }}
                    aria-disabled={!isAccessible}
                    aria-label={page.label}
                  >
                    {!isAccessible && (
                      <span className="vmf-navbar__link-icon" aria-hidden="true">
                        <MdLock aria-hidden="true" focusable="false" />
                      </span>
                    )}
                    {isAccessible && index > 0 && (
                      <span className="vmf-navbar__link-icon" aria-hidden="true">
                        <MdArrowBack />
                      </span>
                    )}
                    <span>{page.label}</span>
                    {isAccessible && index < pages.length - 1 && (
                      <span className="vmf-navbar__link-icon" aria-hidden="true">
                        <MdArrowForward aria-hidden="true" focusable="false" />
                      </span>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </Fieldset.Content>
    </Fieldset>
  )
}

export default VMFNavbar
