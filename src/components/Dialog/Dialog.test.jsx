/**
 * Dialog Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog } from './Dialog'

// Mock HTMLDialogElement methods
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function () {
    this.open = false
  })
})

describe('Dialog Component', () => {
  // ===========================
  // BASIC RENDERING
  // ===========================

  describe('Basic Rendering', () => {
    it('should render dialog element', () => {
      const { container } = render(
        <Dialog open={false}>
          <Dialog.Header>Title</Dialog.Header>
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      const dialog = container.querySelector('dialog')
      expect(dialog).toBeInTheDocument()
      expect(dialog).toHaveClass('dialog')
    })

    it('should render with children', () => {
      render(
        <Dialog open={false}>
          <Dialog.Header>Dialog Title</Dialog.Header>
          <Dialog.Body>Dialog content goes here</Dialog.Body>
        </Dialog>
      )

      expect(screen.getByText('Dialog Title')).toBeInTheDocument()
      expect(screen.getByText('Dialog content goes here')).toBeInTheDocument()
    })

    it('should have default classes', () => {
      const { container } = render(
        <Dialog open={false}>
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      const dialog = container.querySelector('dialog')
      expect(dialog).toHaveClass('dialog--md')
      expect(dialog).toHaveClass('dialog--default')
    })

    it('should apply custom className', () => {
      const { container } = render(
        <Dialog open={false} className="custom-dialog">
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      expect(container.querySelector('dialog')).toHaveClass('custom-dialog')
    })
  })

  // ===========================
  // SIZES
  // ===========================

  describe('Sizes', () => {
    it('should apply small size', () => {
      const { container } = render(
        <Dialog open={false} size="sm">
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      expect(container.querySelector('dialog')).toHaveClass('dialog--sm')
    })

    it('should apply medium size (default)', () => {
      const { container } = render(
        <Dialog open={false}>
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      expect(container.querySelector('dialog')).toHaveClass('dialog--md')
    })

    it('should apply large size', () => {
      const { container } = render(
        <Dialog open={false} size="lg">
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      expect(container.querySelector('dialog')).toHaveClass('dialog--lg')
    })

    it('should apply extra large size', () => {
      const { container } = render(
        <Dialog open={false} size="xl">
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      expect(container.querySelector('dialog')).toHaveClass('dialog--xl')
    })

    it('should apply full size', () => {
      const { container } = render(
        <Dialog open={false} size="full">
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      expect(container.querySelector('dialog')).toHaveClass('dialog--full')
    })
  })

  // ===========================
  // VARIANTS
  // ===========================

  describe('Variants', () => {
    it('should apply default variant', () => {
      const { container } = render(
        <Dialog open={false}>
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      expect(container.querySelector('dialog')).toHaveClass('dialog--default')
    })

    it('should apply centered variant', () => {
      const { container } = render(
        <Dialog open={false} variant="centered">
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      expect(container.querySelector('dialog')).toHaveClass('dialog--centered')
    })
  })

  // ===========================
  // OPEN/CLOSE BEHAVIOR
  // ===========================

  describe('Open/Close Behavior', () => {
    it('should not call showModal when open is false', () => {
      const { container } = render(
        <Dialog open={false}>
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      const dialog = container.querySelector('dialog')
      expect(dialog.showModal).not.toHaveBeenCalled()
    })

    it('should call showModal when open is true', async () => {
      const { container } = render(
        <Dialog open={true}>
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      const dialog = container.querySelector('dialog')
      await waitFor(() => {
        expect(dialog.showModal).toHaveBeenCalled()
      })
    })

    it('should call showModal when open changes from false to true', async () => {
      const { container, rerender } = render(
        <Dialog open={false}>
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      const dialog = container.querySelector('dialog')
      expect(dialog.showModal).not.toHaveBeenCalled()

      rerender(
        <Dialog open={true}>
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      await waitFor(() => {
        expect(dialog.showModal).toHaveBeenCalled()
      })
    })

    it('should call close when open changes from true to false', async () => {
      const { container, rerender } = render(
        <Dialog open={true}>
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      const dialog = container.querySelector('dialog')

      rerender(
        <Dialog open={false}>
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      await waitFor(() => {
        expect(dialog.close).toHaveBeenCalled()
      })
    })
  })

  // ===========================
  // CLOSE BUTTON
  // ===========================

  describe('Close Button', () => {
    it('should show close button by default', () => {
      render(
        <Dialog open={false}>
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      const closeButton = screen.getByLabelText('Close dialog')
      expect(closeButton).toBeInTheDocument()
    })

    it('should hide close button when showCloseButton is false', () => {
      render(
        <Dialog open={false} showCloseButton={false}>
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      const closeButton = screen.queryByLabelText('Close dialog')
      expect(closeButton).not.toBeInTheDocument()
    })

    it('should call onClose when close button is clicked', async () => {
      const handleClose = vi.fn()
      const user = userEvent.setup()

      render(
        <Dialog open={true} onClose={handleClose}>
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      const closeButton = screen.getByLabelText('Close dialog')
      await user.click(closeButton)

      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('should have proper ARIA label on close button', () => {
      render(
        <Dialog open={false}>
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      const closeButton = screen.getByLabelText('Close dialog')
      expect(closeButton).toHaveAttribute('aria-label', 'Close dialog')
    })
  })

  // ===========================
  // BACKDROP CLICK
  // ===========================

  describe('Backdrop Click', () => {
    it('should support closeOnBackdropClick prop', () => {
      const handleClose = vi.fn()
      const { container } = render(
        <Dialog open={true} onClose={handleClose}>
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      const dialog = container.querySelector('dialog')

      // Simulate backdrop click with proper coordinates
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        clientX: 0,
        clientY: 0,
      })

      // Mock getBoundingClientRect to simulate click outside dialog
      dialog.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        left: 100,
        bottom: 400,
        right: 400,
        width: 300,
        height: 300,
      }))

      dialog.dispatchEvent(clickEvent)
      expect(handleClose).toHaveBeenCalled()
    })

    it('should not call onClose when clicking inside dialog content', () => {
      const handleClose = vi.fn()
      render(
        <Dialog open={true} onClose={handleClose}>
          <Dialog.Body>
            <button type="button">Inside Action</button>
          </Dialog.Body>
        </Dialog>,
      )

      const insideButton = screen.getByRole('button', { name: /inside action/i })
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        clientX: -999,
        clientY: -999,
      })

      insideButton.dispatchEvent(clickEvent)
      expect(handleClose).not.toHaveBeenCalled()
    })

    it('should not call onClose on backdrop click when closeOnBackdropClick is false', () => {
      const handleClose = vi.fn()
      const { container } = render(
        <Dialog open={true} onClose={handleClose} closeOnBackdropClick={false}>
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      const dialog = container.querySelector('dialog')

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        clientX: 0,
        clientY: 0,
      })

      dialog.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        left: 100,
        bottom: 400,
        right: 400,
        width: 300,
        height: 300,
      }))

      dialog.dispatchEvent(clickEvent)
      expect(handleClose).not.toHaveBeenCalled()
    })
  })

  // ===========================
  // ESCAPE KEY
  // ===========================

  describe('Escape Key', () => {
    it('should call onClose on ESC key by default', () => {
      const handleClose = vi.fn()
      const { container } = render(
        <Dialog open={true} onClose={handleClose}>
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      const dialog = container.querySelector('dialog')

      // Simulate cancel event (triggered by ESC key on native dialog)
      const cancelEvent = new Event('cancel', { bubbles: true, cancelable: true })
      dialog.dispatchEvent(cancelEvent)

      expect(handleClose).toHaveBeenCalled()
    })

    it('should prevent close on ESC when closeOnEscape is false', () => {
      const handleClose = vi.fn()
      const { container } = render(
        <Dialog open={true} onClose={handleClose} closeOnEscape={false}>
          <Dialog.Body>Content</Dialog.Body>
        </Dialog>
      )

      const dialog = container.querySelector('dialog')

      const cancelEvent = new Event('cancel', { bubbles: true, cancelable: true })
      dialog.dispatchEvent(cancelEvent)

      expect(handleClose).not.toHaveBeenCalled()
      expect(cancelEvent.defaultPrevented).toBe(true)
    })
  })

  // ===========================
  // DIALOG SECTIONS
  // ===========================

  describe('Dialog Sections', () => {
    it('should render Dialog.Header', () => {
      const { container } = render(
        <Dialog open={false}>
          <Dialog.Header>Dialog Title</Dialog.Header>
        </Dialog>
      )

      expect(screen.getByText('Dialog Title')).toBeInTheDocument()
      const header = container.querySelector('.dialog__header')
      expect(header).toBeInTheDocument()
    })

    it('should render Dialog.Body', () => {
      const { container } = render(
        <Dialog open={false}>
          <Dialog.Body>Dialog content</Dialog.Body>
        </Dialog>
      )

      expect(screen.getByText('Dialog content')).toBeInTheDocument()
      const body = container.querySelector('.dialog__body')
      expect(body).toBeInTheDocument()
    })

    it('should render Dialog.Footer', () => {
      const { container } = render(
        <Dialog open={false}>
          <Dialog.Footer>Footer content</Dialog.Footer>
        </Dialog>
      )

      expect(screen.getByText('Footer content')).toBeInTheDocument()
      const footer = container.querySelector('.dialog__footer')
      expect(footer).toBeInTheDocument()
    })

    it('should render all sections together', () => {
      render(
        <Dialog open={false}>
          <Dialog.Header>Title</Dialog.Header>
          <Dialog.Body>Content</Dialog.Body>
          <Dialog.Footer>Footer</Dialog.Footer>
        </Dialog>
      )

      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Content')).toBeInTheDocument()
      expect(screen.getByText('Footer')).toBeInTheDocument()
    })
  })

  // ===========================
  // CUSTOM CLASSES
  // ===========================

  describe('Custom Classes', () => {
    it('should apply custom className to Header', () => {
      const { container } = render(
        <Dialog open={false}>
          <Dialog.Header className="custom-header">Title</Dialog.Header>
        </Dialog>
      )

      const header = container.querySelector('.dialog__header')
      expect(header).toHaveClass('custom-header')
    })

    it('should apply custom className to Body', () => {
      const { container } = render(
        <Dialog open={false}>
          <Dialog.Body className="custom-body">Content</Dialog.Body>
        </Dialog>
      )

      const body = container.querySelector('.dialog__body')
      expect(body).toHaveClass('custom-body')
    })

    it('should apply custom className to Footer', () => {
      const { container } = render(
        <Dialog open={false}>
          <Dialog.Footer className="custom-footer">Footer</Dialog.Footer>
        </Dialog>
      )

      const footer = container.querySelector('.dialog__footer')
      expect(footer).toHaveClass('custom-footer')
    })
  })

  // ===========================
  // COMBINED FEATURES
  // ===========================

  describe('Combined Features', () => {
    it('should handle all props together', async () => {
      const handleClose = vi.fn()
      const { container } = render(
        <Dialog
          open={true}
          onClose={handleClose}
          size="lg"
          variant="centered"
          closeOnBackdropClick={false}
          closeOnEscape={false}
          showCloseButton={false}
          className="custom-dialog"
        >
          <Dialog.Header>Title</Dialog.Header>
          <Dialog.Body>Content</Dialog.Body>
          <Dialog.Footer>Footer</Dialog.Footer>
        </Dialog>
      )

      const dialog = container.querySelector('dialog')
      expect(dialog).toHaveClass('dialog--lg')
      expect(dialog).toHaveClass('dialog--centered')
      expect(dialog).toHaveClass('custom-dialog')

      // Should not have close button
      const closeButton = screen.queryByLabelText('Close dialog')
      expect(closeButton).not.toBeInTheDocument()

      await waitFor(() => {
        expect(dialog.showModal).toHaveBeenCalled()
      })
    })
  })
})
