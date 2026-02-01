/**
 * Card Component
 *
 * A flexible, professional card component for displaying content
 *
 * Features:
 * - Multiple variants (default, outlined, elevated, filled)
 * - Rounded or square corners
 * - Optional image/media
 * - Header, body, and footer sections
 * - Responsive layouts (vertical, horizontal)
 * - Hover effects and interactive states
 * - Full accessibility support
 *
 * @example
 * <Card>
 *   <Card.Header>Card Title</Card.Header>
 *   <Card.Body>Card content goes here</Card.Body>
 * </Card>
 *
 * @example
 * <Card variant="elevated" rounded>
 *   <Card.Image src="/image.jpg" alt="Card image" />
 *   <Card.Header>Featured Post</Card.Header>
 *   <Card.Body>Lorem ipsum dolor sit amet...</Card.Body>
 *   <Card.Footer>
 *     <Button>Read More</Button>
 *   </Card.Footer>
 * </Card>
 */

import './Card.css'

export function Card({
  children,
  variant = 'default',
  rounded = true,
  hoverable = false,
  clickable = false,
  bordered = true,
  backgroundColor,
  className = '',
  onClick,
  style,
  ...props
}) {
  const cardClasses = [
    'card',
    `card--${variant}`,
    rounded ? 'card--rounded' : 'card--square',
    !bordered && 'card--borderless',
    hoverable && 'card--hoverable',
    clickable && 'card--clickable',
    className
  ]
    .filter(Boolean)
    .join(' ')

  const handleClick = onClick && !clickable ? undefined : onClick
  const role = clickable ? 'button' : undefined
  const tabIndex = clickable ? 0 : undefined
  const cardStyles = backgroundColor
    ? { ...(style || {}), backgroundColor }
    : style

  return (
    <div
      className={cardClasses}
      onClick={handleClick}
      role={role}
      tabIndex={tabIndex}
      style={cardStyles}
      {...props}
    >
      {children}
    </div>
  )
}

// Card.Image - For media/images at the top of the card
Card.Image = function CardImage({ src, alt, className = '', ...props }) {
  return (
    <div className={`card__image ${className}`} {...props}>
      <img src={src} alt={alt} />
    </div>
  )
}

// Card.Header - For titles and headers
Card.Header = function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`card__header ${className}`} {...props}>
      {children}
    </div>
  )
}

// Card.Body - Main content area
Card.Body = function CardBody({ children, className = '', ...props }) {
  return (
    <div className={`card__body ${className}`} {...props}>
      {children}
    </div>
  )
}

// Card.Footer - Actions and footer content
Card.Footer = function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={`card__footer ${className}`} {...props}>
      {children}
    </div>
  )
}

export default Card
