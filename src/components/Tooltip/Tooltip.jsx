/**
 * Tooltip Component
 *
 * An accessible tooltip that supports hover/focus triggers, directional placement,
 * and alignment controls. Uses design system tokens for spacing, colors, and motion.
 *
 * @example
 * <Tooltip content="Helpful information">
 *   <Button>Hover me</Button>
 * </Tooltip>
 *
 * @example
 * <Tooltip content="Aligned left" position="bottom" align="start">
 *   <span>Label</span>
 * </Tooltip>
 */

import { Children, cloneElement, useEffect, useId, useRef, useState } from 'react'
import './Tooltip.css'

export function Tooltip({
  children,
  content,
  position = 'top',
  align = 'center',
  open,
  defaultOpen = false,
  openDelay = 80,
  closeDelay = 80,
  className = '',
  id
}) {
  const tooltipId = id || useId()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : uncontrolledOpen

  const openTimer = useRef(null)
  const closeTimer = useRef(null)

  useEffect(() => {
    return () => {
      window.clearTimeout(openTimer.current)
      window.clearTimeout(closeTimer.current)
    }
  }, [])

  const show = () => {
    if (isControlled) return
    window.clearTimeout(closeTimer.current)
    openTimer.current = window.setTimeout(() => setUncontrolledOpen(true), openDelay)
  }

  const hide = () => {
    if (isControlled) return
    window.clearTimeout(openTimer.current)
    closeTimer.current = window.setTimeout(() => setUncontrolledOpen(false), closeDelay)
  }

  const child = Children.only(children)

  const enhancedChild = cloneElement(child, {
    'aria-describedby': content ? tooltipId : undefined,
    onMouseEnter: (event) => {
      child.props.onMouseEnter?.(event)
      show()
    },
    onMouseLeave: (event) => {
      child.props.onMouseLeave?.(event)
      hide()
    },
    onFocus: (event) => {
      child.props.onFocus?.(event)
      show()
    },
    onBlur: (event) => {
      child.props.onBlur?.(event)
      hide()
    }
  })

  return (
    <span
      className={['tooltip', `tooltip--${position}`, `tooltip--align-${align}`, className]
        .filter(Boolean)
        .join(' ')}
      data-open={isOpen ? 'true' : 'false'}
    >
      {enhancedChild}
      <span
        role="tooltip"
        id={tooltipId}
        className="tooltip__bubble"
        aria-hidden={!isOpen}
        data-position={position}
        data-align={align}
      >
        <span className="tooltip__content">{content}</span>
        <span className="tooltip__arrow" aria-hidden="true" />
      </span>
    </span>
  )
}

export default Tooltip
