/**
 * Accordion Component
 *
 * Professional, accessible accordion component with smooth animations
 * and keyboard navigation support.
 */

import { useState, createContext, useContext } from 'react'
import './Accordion.css'

// Context for sharing accordion state
const AccordionContext = createContext()

/**
 * Main Accordion Container
 */
export function Accordion({
  children,
  variant = 'default',
  rounded = true,
  allowMultiple = false,
  defaultOpenItems = [],
  className = '',
  ...props
}) {
  const [openItems, setOpenItems] = useState(defaultOpenItems)

  const toggleItem = (itemId) => {
    if (allowMultiple) {
      setOpenItems((prev) =>
        prev.includes(itemId)
          ? prev.filter((id) => id !== itemId)
          : [...prev, itemId]
      )
    } else {
      setOpenItems((prev) => (prev.includes(itemId) ? [] : [itemId]))
    }
  }

  const isItemOpen = (itemId) => openItems.includes(itemId)

  const accordionClasses = [
    'accordion',
    `accordion--${variant}`,
    rounded ? 'accordion--rounded' : 'accordion--square',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <AccordionContext.Provider value={{ isItemOpen, toggleItem, variant }}>
      <div className={accordionClasses} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

/**
 * Accordion Item
 */
Accordion.Item = function AccordionItem({ id, children, className = '', ...props }) {
  const context = useContext(AccordionContext)
  if (!context) {
    throw new Error('Accordion.Item must be used within Accordion')
  }

  const { isItemOpen } = context
  const isOpen = isItemOpen(id)

  const itemClasses = ['accordion__item', isOpen && 'accordion__item--open', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={itemClasses} {...props}>
      {children}
    </div>
  )
}

/**
 * Accordion Header (Trigger)
 */
Accordion.Header = function AccordionHeader({ itemId, children, className = '', ...props }) {
  const context = useContext(AccordionContext)
  if (!context) {
    throw new Error('Accordion.Header must be used within Accordion')
  }

  const { isItemOpen, toggleItem } = context
  const isOpen = isItemOpen(itemId)

  const handleClick = () => {
    toggleItem(itemId)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleItem(itemId)
    }
  }

  const headerClasses = ['accordion__header', className].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      className={headerClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-expanded={isOpen}
      aria-controls={`accordion-content-${itemId}`}
      {...props}
    >
      <span className="accordion__header-text">{children}</span>
      <svg
        className={`accordion__icon ${isOpen ? 'accordion__icon--open' : ''}`}
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M5 7.5L10 12.5L15 7.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

/**
 * Accordion Content (Panel)
 */
Accordion.Content = function AccordionContent({ itemId, children, className = '', ...props }) {
  const context = useContext(AccordionContext)
  if (!context) {
    throw new Error('Accordion.Content must be used within Accordion')
  }

  const { isItemOpen } = context
  const isOpen = isItemOpen(itemId)

  const contentClasses = ['accordion__content', className].filter(Boolean).join(' ')

  return (
    <div
      id={`accordion-content-${itemId}`}
      className={contentClasses}
      role="region"
      aria-hidden={!isOpen}
      {...props}
    >
      <div className="accordion__content-inner">{children}</div>
    </div>
  )
}

export default Accordion
