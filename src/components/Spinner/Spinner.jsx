/**
 * Spinner Component
 *
 * A simple, accessible loading spinner with two variants:
 * - circle: A rotating border spinner with customizable colors
 * - pinwheel: A rotating SVG image spinner
 *
 * @param {Object} props - Component props
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Spinner size
 *   - sm: 20px
 *   - md: 32px (default)
 *   - lg: 48px
 * @param {'primary'|'secondary'|'success'|'danger'|'info'|'inherit'} [props.color='primary'] - Border color (applies only to circle type)
 * @param {'circle'|'pinwheel'} [props.type='circle'] - Spinner variant
 *   - circle: Border-based spinner with customizable color
 *   - pinwheel: SVG-based spinner (color prop is ignored)
 * @param {string} [props.backgroundColor] - Background color for the spinner container (applies to both circle and pinwheel types)
 *   - Accepts any valid CSS color value (hex, rgb, rgba, named colors, etc.)
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {Object} [props...rest] - Additional props passed to the container div
 * @returns {JSX.Element} Spinner component
 *
 * @example
 * // Default circle spinner
 * <Spinner />
 *
 * @example
 * // Large danger-colored circle spinner
 * <Spinner size="lg" color="danger" />
 *
 * @example
 * // Small pinwheel spinner
 * <Spinner type="pinwheel" size="sm" />
 *
 * @example
 * // Circle spinner with background color
 * <Spinner backgroundColor="rgba(0, 0, 0, 0.1)" />
 *
 * @example
 * // Pinwheel spinner with background color
 * <Spinner type="pinwheel" backgroundColor="#f0f0f0" size="lg" />
 */

import './Spinner.css'
import pinwheelIcon from '../../assets/images/icons/pinwheel.svg'

export function Spinner({
  size = 'md',
  color = 'primary',
  type = 'circle',
  backgroundColor,
  className = '',
  ...props
}) {
  const spinnerClasses = [
    'spinner',
    `spinner--${type}`,
    `spinner--${size}`,
    type === 'circle' && `spinner--${color}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const spinnerStyles = backgroundColor ? { backgroundColor } : {}

  return (
    <div
      role="status"
      className={spinnerClasses}
      style={spinnerStyles}
      {...props}
    >
      {type === 'pinwheel' && (
        <img
          src={pinwheelIcon}
          alt=""
          className="spinner__image"
          aria-hidden="true"
        />
      )}
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export default Spinner
