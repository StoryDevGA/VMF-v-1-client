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
 * Opens a dialog element, falling back to the open attribute when
 * the native showModal API is unavailable (Safari <= 15.3).
 */
function openDialog(dialog) {
  if (!dialog) return

  // Safari <= 15.3 does not support the modal API.
  if (typeof dialog.showModal !== 'function') {
    dialog.dataset.fallbackModal = 'true'
    dialog.setAttribute('open', '')
    return
  }

  if (dialog.open) return

  try {
    delete dialog.dataset.fallbackModal
    dialog.showModal()
  } catch {
    // Guard against transient InvalidStateError from imperative API timing.
    dialog.dataset.fallbackModal = 'true'
    dialog.setAttribute('open', '')
  }
}

/**
 * Closes a dialog element, falling back to removeAttribute when
 * the native close API is unavailable (Safari <= 15.3).
 */
function closeDialog(dialog, backdropPointerDownRef) {
  if (!dialog) return
  if (backdropPointerDownRef) backdropPointerDownRef.current = false

  // Safari <= 15.3 fallback path.
  if (typeof dialog.close !== 'function') {
    delete dialog.dataset.fallbackModal
    dialog.removeAttribute('open')
    return
  }

  if (!dialog.open && !dialog.hasAttribute('open')) return

  try {
    dialog.close()
  } catch {
    dialog.removeAttribute('open')
  } finally {
    delete dialog.dataset.fallbackModal
  }
}

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
  const backdropPointerDownRef = useRef(false)

  // Open/close the dialog when `open` prop changes
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      openDialog(dialog)
    } else {
      closeDialog(dialog, backdropPointerDownRef)
    }
  }, [open])

  const handleBackdropPointerDownCapture = (e) => {
    const dialog = dialogRef.current
    if (!dialog) {
      backdropPointerDownRef.current = false
      return
    }

    // Safari can occasionally retarget click events during dialog interactions.
    // Only allow backdrop-close when the pointer-down also began on the backdrop.
    backdropPointerDownRef.current = e.target === dialog
  }

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    const dialog = dialogRef.current
    if (!dialog) {
      backdropPointerDownRef.current = false
      return
    }

    if (!closeOnBackdropClick) {
      backdropPointerDownRef.current = false
      return
    }

    const wasBackdropPointerDown = backdropPointerDownRef.current
    backdropPointerDownRef.current = false

    // Native dialog backdrop clicks target the <dialog> element itself.
    // Require pointer-down to also start on backdrop to avoid Safari false positives.
    if (e.target === dialog && wasBackdropPointerDown) {
      onClose?.()
    }
  }

  // Handle ESC key — always prevent the browser's native close so React
  // controls the dialog lifecycle via the `open` prop (avoids double-close).
  const handleCancel = (e) => {
    e.preventDefault()
    if (!closeOnEscape) return
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

  // mousedown is a fallback for environments without PointerEvent support
  return (
    <dialog
      ref={dialogRef}
      className={dialogClasses}
      role="dialog"
      aria-modal="true"
      onMouseDownCapture={handleBackdropPointerDownCapture}
      onPointerDownCapture={handleBackdropPointerDownCapture}
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
