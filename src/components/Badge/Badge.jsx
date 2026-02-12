/**
 * Badge Component
 *
 * Compact inline label for statuses, categories, and metadata.
 *
 * Features:
 * - Multiple variants (neutral, primary, success, warning, danger, info)
 * - Three sizes (sm, md, lg)
 * - Optional pill shape
 * - Optional outline style
 * - Optional leading icon
 * - Responsive sizing
 *
 * @example
 * <Badge variant="success">Active</Badge>
 *
 * @example
 * <Badge variant="warning" size="sm" pill>
 *   Pending
 * </Badge>
 *
 * @example
 * <Badge variant="primary" icon={<SomeIcon />}>
 *   Beta
 * </Badge>
 */

import './Badge.css'

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  pill = false,
  outline = false,
  icon = null,
  className = '',
  ...props
}) {
  const classNames = [
    'badge',
    `badge--${variant}`,
    `badge--${size}`,
    pill && 'badge--pill',
    outline && 'badge--outline',
    icon && 'badge--with-icon',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classNames} {...props}>
      {icon ? (
        <span className="badge__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children !== null && children !== undefined && children !== '' ? (
        <span className="badge__label">{children}</span>
      ) : null}
    </span>
  )
}

export default Badge
