/**
 * Header Component
 *
 * A responsive header component that combines logo and navigation.
 *
 * Features:
 * - Sticky positioning at top
 * - Flexible logo support (text, image, or custom component)
 * - Integrates with Navigation component
 * - Responsive layout
 * - Theme-aware styling
 * - Accessible markup
 *
 * @example
 * <Header logo="My App" />
 *
 * @example
 * <Header
 *   logo={<img src="/logo.svg" alt="Company" />}
 *   logoLink="/"
 * />
 */

import { useState, useEffect } from 'react'
import { MdMenu } from 'react-icons/md'
import { useSelector } from 'react-redux'
import { Link } from '../Link'
import { Logo } from '../Logo'
import Navigation from '../Navigation'
import { selectCurrentUser, selectIsAuthenticated } from '../../store/slices/authSlice.js'
import { isSuperAdmin as checkIsSuperAdmin } from '../../utils/authorization.js'
import './Header.css'

export function Header({
  logo = <Logo size="large" />,
  logoLink,
  showNavigation = true,
  sticky = true,
  className = '',
  children,
  ...props
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectCurrentUser)
  const isSuperAdmin = checkIsSuperAdmin(user)
  const hasCustomerAdminAccess = (user?.memberships ?? []).some(
    (membership) => membership.customerId && membership.roles?.includes('CUSTOMER_ADMIN'),
  )
  const canAccessNavigation = isSuperAdmin || hasCustomerAdminAccess
  const shouldShowNavigation = showNavigation && canAccessNavigation
  const resolvedLogoLink = logoLink === undefined
    ? (isAuthenticated
      ? (isSuperAdmin ? '/super-admin/dashboard' : '/app/dashboard')
      : '/app/login')
    : logoLink

  const headerClasses = [
    'header',
    sticky && 'header--sticky',
    className
  ]
    .filter(Boolean)
    .join(' ')

  // Determine if logo is a string (text) or React element
  const isTextLogo = typeof logo === 'string'

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && mobileMenuOpen) {
        closeMobileMenu()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [mobileMenuOpen])

  return (
    <header className={headerClasses} {...props}>
      <div className="header__container container">
        <div className="header__brand">
          {resolvedLogoLink ? (
            <Link
              to={resolvedLogoLink}
              className="header__logo-link"
              variant="subtle"
              underline="none"
              aria-label="Home"
              onClick={closeMobileMenu}
            >
              {isTextLogo ? (
                <span className="header__logo-text">{logo}</span>
              ) : (
                <div className="header__logo-custom">{logo}</div>
              )}
            </Link>
          ) : (
            <>
              {isTextLogo ? (
                <span className="header__logo-text">{logo}</span>
              ) : (
                <div className="header__logo-custom">{logo}</div>
              )}
            </>
          )}
        </div>

        {shouldShowNavigation && (
          <>
            <button
              className="header__hamburger"
              onClick={toggleMobileMenu}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              <MdMenu
                className="header__hamburger-icon"
                aria-hidden="true"
                focusable="false"
                size={24}
              />
            </button>

            <div className="header__nav">
              <Navigation
                isOpen={mobileMenuOpen}
                onLinkClick={closeMobileMenu}
              />
            </div>
          </>
        )}

        {children && <div className="header__content">{children}</div>}
      </div>
    </header>
  )
}

export default Header
