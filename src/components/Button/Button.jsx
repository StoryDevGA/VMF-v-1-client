/**
 * Button Component
 *
 * A fully accessible, responsive button component with multiple variants and states.
 *
 * Features:
 * - Multiple variants (primary, secondary, outline, ghost, danger, warning)
 * - Three sizes (sm, md, lg)
 * - Double outline option for enhanced emphasis
 * - Loading state with spinner
 * - Disabled state
 * - Full keyboard accessibility
 * - Touch-friendly (minimum 44px touch target)
 * - Responsive design
 *
 * @example
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click Me
 * </Button>
 *
 * @example
 * <Button variant="outline" doubleOutline>
 *   Double Outline
 * </Button>
 */

import './Button.css'

export function Button({
  children,
  leftIcon,
  rightIcon,
  iconOnly = false,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  doubleOutline = false,
  square = false,
  type = 'button',
  onClick,
  className = '',
  ...props
}) {
  // Build class names
  const classNames = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth && 'btn--full-width',
    loading && 'btn--loading',
    doubleOutline && 'btn--double-outline',
    square && 'btn--square',
    iconOnly && 'btn--icon-only',
    className
  ]
    .filter(Boolean)
    .join(' ')

  // Handle click - prevent if disabled or loading
  const handleClick = (event) => {
    if (disabled || loading) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }

  return (
    <button
      type={type}
      className={classNames}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="btn__spinner" aria-hidden="true">
          <span className="btn__spinner-circle"></span>
        </span>
      )}
      <span className={loading ? 'btn__content--hidden' : 'btn__content'}>
        {leftIcon && <span className="btn__icon btn__icon--left">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="btn__icon btn__icon--right">{rightIcon}</span>}
      </span>
    </button>
  )
}

// Export for convenience
export default Button
