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

import './Status.css'

export function Status({
  children,
  variant = 'neutral',
  size = 'md',
  pulse = false,
  className = '',
  ...props
}) {
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
      role="status"
      aria-label={children ? `Status: ${children}` : `Status: ${variant}`}
      {...props}
    >
      <span className="status__indicator" aria-hidden="true"></span>
      {children && <span className="status__text">{children}</span>}
    </span>
  )
}

// Export for convenience
export default Status
