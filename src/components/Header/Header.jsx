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
import { Link } from '../Link'
import { Logo } from '../Logo'
import Navigation from '../Navigation'
import './Header.css'

export function Header({
  logo = <Logo size="large" />,
  logoLink = '/',
  showNavigation = true,
  sticky = true,
  className = '',
  children,
  ...props
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
          {logoLink ? (
            <Link
              to={logoLink}
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

        {showNavigation && (
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
