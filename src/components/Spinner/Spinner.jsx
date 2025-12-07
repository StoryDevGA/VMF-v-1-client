/**
 * Spinner Component
 *
 * A simple, accessible loading spinner.
 */

import './Spinner.css'

export function Spinner({
  size = 'md',
  color = 'primary',
  className = '',
  ...props
}) {
  const spinnerClasses = [
    'spinner',
    `spinner--${size}`,
    `spinner--${color}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      role="status"
      className={spinnerClasses}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export default Spinner
