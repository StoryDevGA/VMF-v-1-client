/**
 * Sidebar Component
 *
 * Responsive application sidebar with compound sections and navigation helpers.
 */

import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useState,
} from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  MdChevronLeft,
  MdChevronRight,
  MdClose,
  MdExpandMore,
} from 'react-icons/md'
import { Link } from '../Link'
import { Logo } from '../Logo'
import './Sidebar.css'

const EXTERNAL_LINK_PATTERN = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i
const MOBILE_MEDIA_QUERY = '(max-width: 767px)'
const SidebarContext = createContext(null)

function useControllableState(controlledValue, defaultValue, onChange) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : uncontrolledValue

  const setValue = (nextValue) => {
    const resolvedValue = typeof nextValue === 'function'
      ? nextValue(value)
      : nextValue

    if (!isControlled) {
      setUncontrolledValue(resolvedValue)
    }

    onChange?.(resolvedValue)
  }

  return [value, setValue]
}

function useMobileSidebar() {
  const getMatches = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }

    return window.matchMedia(MOBILE_MEDIA_QUERY).matches
  }

  const [isMobile, setIsMobile] = useState(getMatches)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY)
    const handleChange = (event) => {
      setIsMobile(event.matches)
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  return isMobile
}

function useSidebarContext(componentName) {
  const context = useContext(SidebarContext)

  if (!context) {
    throw new Error(`${componentName} must be used within Sidebar`)
  }

  return context
}

function isRouteActive(destination, pathname) {
  if (!destination || EXTERNAL_LINK_PATTERN.test(destination)) return false
  return pathname === destination || pathname.startsWith(`${destination}/`)
}

function hasActiveChildDestination(children, pathname) {
  return Children.toArray(children).some((child) => {
    if (!isValidElement(child)) return false

    if (isRouteActive(child.props?.to, pathname)) {
      return true
    }

    return hasActiveChildDestination(child.props?.children, pathname)
  })
}

export function Sidebar({
  children,
  visible,
  defaultVisible = true,
  narrow,
  defaultNarrow = false,
  unfoldable = false,
  colorScheme = 'light',
  placement = 'start',
  className = '',
  style,
  ariaLabel = 'Sidebar',
  onVisibleChange,
  onNarrowChange,
  ...props
}) {
  const [isVisible, setIsVisible] = useControllableState(visible, defaultVisible, onVisibleChange)
  const [isNarrow, setIsNarrow] = useControllableState(narrow, defaultNarrow, onNarrowChange)
  const isMobile = useMobileSidebar()

  useEffect(() => {
    if (!isVisible) return undefined

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsVisible(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isVisible, setIsVisible])

  useEffect(() => {
    if (typeof document === 'undefined' || !isMobile || !isVisible) {
      return undefined
    }

    const previousBodyOverflow = document.body.style.overflow
    const previousDocumentOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousDocumentOverflow
    }
  }, [isMobile, isVisible])

  const sidebarClasses = [
    'sidebar',
    `sidebar--${colorScheme}`,
    `sidebar--placement-${placement}`,
    isVisible ? 'sidebar--visible' : 'sidebar--hidden',
    isNarrow && 'sidebar--narrow',
    unfoldable && 'sidebar--unfoldable',
    isMobile && 'sidebar--mobile',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const contextValue = {
    isMobile,
    isVisible,
    isNarrow,
    placement,
    requestVisibleChange: setIsVisible,
    toggleNarrow: () => setIsNarrow((previousValue) => !previousValue),
  }

  return (
    <SidebarContext.Provider value={contextValue}>
      <div className={sidebarClasses} style={style}>
        <button
          type="button"
          className="sidebar__backdrop"
          onClick={() => setIsVisible(false)}
          aria-label="Close sidebar"
          tabIndex={isMobile && isVisible ? 0 : -1}
        />

        <aside
          className="sidebar__panel"
          aria-label={ariaLabel}
          aria-hidden={!isVisible}
          {...props}
        >
          <button
            type="button"
            className="sidebar__dismiss"
            onClick={() => setIsVisible(false)}
            aria-label="Close sidebar"
            tabIndex={isMobile && isVisible ? 0 : -1}
          >
            <MdClose aria-hidden="true" focusable="false" />
          </button>

          {children}
        </aside>
      </div>
    </SidebarContext.Provider>
  )
}

Sidebar.Header = function SidebarHeader({ children, className = '', ...props }) {
  const headerClasses = ['sidebar__header', className].filter(Boolean).join(' ')

  return (
    <div className={headerClasses} {...props}>
      {children}
    </div>
  )
}

Sidebar.Brand = function SidebarBrand({
  children,
  logo = <Logo size="medium" />,
  subtitle,
  to,
  href,
  className = '',
  ...props
}) {
  const brandClasses = ['sidebar__brand', className].filter(Boolean).join(' ')

  const content = (
    <>
      {logo ? <span className="sidebar__brand-mark">{logo}</span> : null}
      {children || subtitle ? (
        <span className="sidebar__brand-copy">
          {children ? <span className="sidebar__brand-title">{children}</span> : null}
          {subtitle ? <span className="sidebar__brand-subtitle">{subtitle}</span> : null}
        </span>
      ) : null}
    </>
  )

  if (to || href) {
    return (
      <Link
        to={to}
        href={href}
        className={brandClasses}
        variant="subtle"
        underline="none"
        {...props}
      >
        {content}
      </Link>
    )
  }

  return (
    <div className={brandClasses} {...props}>
      {content}
    </div>
  )
}

Sidebar.Nav = function SidebarNav({
  children,
  ariaLabel = 'Sidebar navigation',
  className = '',
  ...props
}) {
  const navClasses = ['sidebar__nav', className].filter(Boolean).join(' ')

  return (
    <nav className={navClasses} aria-label={ariaLabel} {...props}>
      <ul className="sidebar__nav-list">
        {children}
      </ul>
    </nav>
  )
}

Sidebar.Item = function SidebarItem({
  children,
  icon,
  badge,
  to,
  href,
  external = false,
  openInNewTab = false,
  active = false,
  disabled = false,
  onClick,
  className = '',
  ...props
}) {
  const { isMobile, requestVisibleChange } = useSidebarContext('Sidebar.Item')
  const isExternalLink = external || Boolean(href) || EXTERNAL_LINK_PATTERN.test(to || '')

  const itemClasses = [
    'sidebar__item',
    active && 'sidebar__item--active',
    disabled && 'sidebar__item--disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const handleActivation = (event) => {
    if (disabled) {
      event.preventDefault()
      return
    }

    onClick?.(event)

    if (!event.defaultPrevented && isMobile) {
      requestVisibleChange(false)
    }
  }

  const content = (
    <>
      {icon ? (
        <span className="sidebar__item-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="sidebar__item-label">{children}</span>
      {badge !== undefined && badge !== null ? (
        <span className="sidebar__item-badge">{badge}</span>
      ) : null}
    </>
  )

  if (to && !isExternalLink) {
    return (
      <li className="sidebar__nav-item">
        <NavLink
          to={disabled ? '#' : to}
          className={({ isActive }) => [
            itemClasses,
            isActive && 'sidebar__item--active',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={handleActivation}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : undefined}
          {...props}
        >
          {content}
        </NavLink>
      </li>
    )
  }

  if (isExternalLink) {
    const destination = href || to

    return (
      <li className="sidebar__nav-item">
        <a
          href={disabled ? undefined : destination}
          className={itemClasses}
          onClick={handleActivation}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : undefined}
          rel={openInNewTab ? 'noopener noreferrer' : undefined}
          target={openInNewTab ? '_blank' : undefined}
          {...props}
        >
          {content}
        </a>
      </li>
    )
  }

  return (
    <li className="sidebar__nav-item">
      <button
        type="button"
        className={itemClasses}
        onClick={handleActivation}
        disabled={disabled}
        {...props}
      >
        {content}
      </button>
    </li>
  )
}

Sidebar.Group = function SidebarGroup({
  label,
  icon,
  children,
  defaultOpen = false,
  className = '',
  ...props
}) {
  const location = useLocation()
  const groupId = useId()
  const hasActiveChild = hasActiveChildDestination(children, location.pathname)
  const [isOpen, setIsOpen] = useState(defaultOpen || hasActiveChild)

  useEffect(() => {
    if (hasActiveChild) {
      setIsOpen(true)
    }
  }, [hasActiveChild])

  const groupClasses = [
    'sidebar__group',
    (isOpen || hasActiveChild) && 'sidebar__group--active',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li className={groupClasses} {...props}>
      <button
        type="button"
        className="sidebar__group-toggle"
        onClick={() => setIsOpen((previousValue) => !previousValue)}
        aria-expanded={isOpen}
        aria-controls={groupId}
      >
        {icon ? (
          <span className="sidebar__item-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="sidebar__item-label">{label}</span>
        <MdExpandMore
          className={[
            'sidebar__group-chevron',
            isOpen && 'sidebar__group-chevron--open',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
          focusable="false"
        />
      </button>

      <div
        id={groupId}
        className="sidebar__group-panel"
        hidden={!isOpen}
      >
        <ul className="sidebar__group-list">
          {children}
        </ul>
      </div>
    </li>
  )
}

Sidebar.Footer = function SidebarFooter({ children, className = '', ...props }) {
  const footerClasses = ['sidebar__footer', className].filter(Boolean).join(' ')

  return (
    <div className={footerClasses} {...props}>
      {children}
    </div>
  )
}

Sidebar.Toggler = function SidebarToggler({ className = '', ...props }) {
  const {
    isNarrow,
    placement,
    toggleNarrow,
  } = useSidebarContext('Sidebar.Toggler')

  const label = isNarrow ? 'Expand sidebar' : 'Collapse sidebar'
  const icon = placement === 'end'
    ? (isNarrow ? <MdChevronLeft aria-hidden="true" focusable="false" /> : <MdChevronRight aria-hidden="true" focusable="false" />)
    : (isNarrow ? <MdChevronRight aria-hidden="true" focusable="false" /> : <MdChevronLeft aria-hidden="true" focusable="false" />)

  const togglerClasses = ['sidebar__toggler', className].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      className={togglerClasses}
      onClick={toggleNarrow}
      aria-label={label}
      title={label}
      {...props}
    >
      <span className="sidebar__toggler-icon">{icon}</span>
      <span className="sidebar__toggler-label">
        {isNarrow ? 'Expand' : 'Collapse'}
      </span>
    </button>
  )
}

export default Sidebar
