/**
 * Status Component
 *
 * A flexible status indicator component with circle indicator and optional inline text.
 *
 * Features:
 * - Multiple variants (success, warning, error, info, neutral)
 * - Three sizes (sm, md, lg)
 * - Optional text label
 * - Animated pulse option
 * - Full keyboard accessibility
 * - Responsive design
 *
 * @example
 * <Status variant="success" size="md">
 *   Active
 * </Status>
 *
 * @example
 * <Status variant="error" pulse />
 *
 * @example
 * <Status variant="warning" size="lg">
 *   Pending Approval
 * </Status>
 */

import { MdCheckCircle, MdError, MdInfo, MdOutlineWarningAmber } from 'react-icons/md'
import './Status.css'

export function Status({
  children,
  variant = 'neutral',
  size = 'md',
  pulse = false,
  showIcon = false,
  announce = true,
  className = '',
  ...props
}) {
  const iconMap = {
    success: MdCheckCircle,
    warning: MdOutlineWarningAmber,
    error: MdError,
    info: MdInfo,
    neutral: null,
  }

  const IconComponent = showIcon ? iconMap[variant] ?? null : null

  // Build class names
  const classNames = [
    'status',
    `status--${variant}`,
    `status--${size}`,
    pulse && 'status--pulse',
    className
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span
      className={classNames}
      role={announce ? 'status' : undefined}
      aria-label={announce ? (children ? `Status: ${children}` : `Status: ${variant}`) : undefined}
      {...props}
    >
      {IconComponent ? (
        <IconComponent className="status__icon" aria-hidden="true" focusable="false" />
      ) : (
        <span className="status__indicator" aria-hidden="true"></span>
      )}
      {children && <span className="status__text">{children}</span>}
    </span>
  )
}

// Export for convenience
export default Status
