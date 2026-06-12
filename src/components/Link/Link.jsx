/**
 * Link Component
 *
 * A fully accessible link component that handles both internal and external links.
 *
 * Features:
 * - Automatic routing for internal links (React Router)
 * - Security attributes for external links (rel="noopener noreferrer")
 * - Multiple variants (primary, secondary, subtle, danger)
 * - Underline options (none, hover, always)
 * - Disabled state
 * - Full keyboard accessibility
 * - Theme-aware
 *
 * @example
 * <Link to="/about">About Us</Link>
 *
 * @example
 * <Link href="https://example.com" variant="primary">
 *   External Link
 * </Link>
 *
 * @example
 * <Link to="/about" underline="always" variant="secondary">
 *   Learn More
 * </Link>
 */

import { Link as RouterLink } from 'react-router-dom'
import { MdOpenInNew } from 'react-icons/md'
import './Link.css'

const EXTERNAL_LINK_PATTERN = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i

export function Link({
  children,
  to,
  href,
  variant = 'primary',
  underline = 'hover',
  disabled = false,
  external = false,
  openInNewTab = false,
  className = '',
  ...props
}) {
  const { state: explicitState, ...linkProps } = props
  const toHasEmbeddedState = to
    && typeof to === 'object'
    && Object.prototype.hasOwnProperty.call(to, 'state')
  const normalizedTo = toHasEmbeddedState
    ? Object.fromEntries(Object.entries(to).filter(([key]) => key !== 'state'))
    : to
  const routerState = toHasEmbeddedState ? to.state : explicitState

  // Determine if this is an external link
  const isExternalDestination = typeof normalizedTo === 'string' && EXTERNAL_LINK_PATTERN.test(normalizedTo)
  const isExternal = external || Boolean(href) || isExternalDestination
  const destination = href || normalizedTo

  // Build class names
  const classNames = [
    'link',
    `link--${variant}`,
    `link--underline-${underline}`,
    disabled && 'link--disabled',
    className
  ]
    .filter(Boolean)
    .join(' ')

  // Security attributes for external links
  const externalProps = isExternal && !disabled
    ? {
        rel: 'noopener noreferrer',
        ...(openInNewTab && { target: '_blank' })
      }
    : {}

  // Handle click - prevent if disabled
  const handleClick = (event) => {
    if (disabled) {
      event.preventDefault()
      return
    }
    linkProps.onClick?.(event)
  }

  // Render external link
  if (isExternal) {
    return (
      <a
        {...linkProps}
        href={destination}
        className={classNames}
        onClick={handleClick}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
        {...externalProps}
      >
        {children}
        {openInNewTab && !disabled && (
          <span className="link__external-icon" aria-label="(opens in new tab)">
            <MdOpenInNew aria-hidden="true" focusable="false" />
          </span>
        )}
      </a>
    )
  }

  // Render internal link (React Router)
  return (
    <RouterLink
      {...linkProps}
      to={disabled ? '#' : destination}
      state={routerState}
      className={classNames}
      onClick={handleClick}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
    >
      {children}
    </RouterLink>
  )
}

export default Link
