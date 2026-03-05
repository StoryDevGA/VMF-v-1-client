/**
 * Dialog Component
 *
 * Professional, accessible dialog component built on native HTML <dialog> element
 * with animations, focus management, and responsive design.
 */

import { useRef, useEffect } from 'react'
import { MdClose } from 'react-icons/md'
import './Dialog.css'

/**
 * Main Dialog Component
 */
export function Dialog({
  children,
  open = false,
  onClose,
  size = 'md',
  variant = 'default',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
  ...props
}) {
  const dialogRef = useRef(null)

  // Open/close the dialog when `open` prop changes
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [open])

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (!closeOnBackdropClick) return

    const dialog = dialogRef.current
    if (!dialog) return

    // Native dialog backdrop clicks target the <dialog> element itself.
    // This is more reliable than coordinate checks in Safari.
    if (e.target === dialog) {
      onClose?.()
    }
  }

  // Handle ESC key
  const handleCancel = (e) => {
    if (!closeOnEscape) {
      e.preventDefault()
      return
    }
    onClose?.()
  }

  // Handle close button
  const handleCloseClick = () => {
    onClose?.()
  }

  const dialogClasses = [
    'dialog',
    `dialog--${size}`,
    `dialog--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <dialog
      ref={dialogRef}
      className={dialogClasses}
      onClick={handleBackdropClick}
      onCancel={handleCancel}
      {...props}
    >
      <div className="dialog__container">
        {showCloseButton && (
          <button
            type="button"
          className="dialog__close"
          onClick={handleCloseClick}
          aria-label="Close dialog"
        >
          <MdClose size={24} aria-hidden="true" focusable="false" />
          </button>
        )}
        {children}
      </div>
    </dialog>
  )
}

/**
 * Dialog Header
 */
Dialog.Header = function DialogHeader({ children, className = '', ...props }) {
  const headerClasses = ['dialog__header', className].filter(Boolean).join(' ')

  return (
    <div className={headerClasses} {...props}>
      {children}
    </div>
  )
}

/**
 * Dialog Body
 */
Dialog.Body = function DialogBody({ children, className = '', ...props }) {
  const bodyClasses = ['dialog__body', className].filter(Boolean).join(' ')

  return (
    <div className={bodyClasses} {...props}>
      {children}
    </div>
  )
}

/**
 * Dialog Footer
 */
Dialog.Footer = function DialogFooter({ children, className = '', ...props }) {
  const footerClasses = ['dialog__footer', className].filter(Boolean).join(' ')

  return (
    <div className={footerClasses} {...props}>
      {children}
    </div>
  )
}

export default Dialog
