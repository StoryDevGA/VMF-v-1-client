/**
 * HorizontalScroll Component
 *
 * Provides a full-width horizontally scrollable container with optional snap alignment.
 * Optimized for mobile devices with touch-friendly interactions and responsive behavior.
 */

import { useMemo } from 'react'
import './HorizontalScroll.css'

const gapMap = {
  xs: 'var(--spacing-xs)',
  sm: 'var(--spacing-sm)',
  md: 'var(--spacing-md)',
  lg: 'var(--spacing-lg)',
  xl: 'var(--spacing-xl)',
}

export function HorizontalScroll({
  children,
  gap = 'md',
  snap = false,
  hideScrollbar = false,
  ariaLabel = 'Horizontal content',
  className = '',
  ...props
}) {
  const gapValue = useMemo(() => gapMap[gap] || gapMap.md, [gap])

  const trackClasses = [
    'h-scroll__track',
    snap && 'h-scroll__track--snap',
    hideScrollbar && 'h-scroll__track--hide-scrollbar',
  ].filter(Boolean).join(' ')

  return (
    <div className={['h-scroll', className].filter(Boolean).join(' ')} {...props}>
      <div
        className={trackClasses}
        style={{ gap: gapValue }}
        aria-label={ariaLabel}
        role="region"
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  )
}

export default HorizontalScroll
