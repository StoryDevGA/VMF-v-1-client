/**
 * Status Component Tests
 *
 * Tests cover:
 * - Rendering and content
 * - Variants and sizes
 * - Pulse animation
 * - Accessibility
 * - Edge cases
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Status } from './Status'

describe('Status Component', () => {
  describe('Rendering', () => {
    it('should render with children text', () => {
      render(<Status>Active</Status>)
      expect(screen.getByRole('status', { name: /status: active/i })).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('should render without children (indicator only)', () => {
      render(<Status variant="success" />)
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.queryByText('Active')).not.toBeInTheDocument()
    })

    it('should render with custom className', () => {
      render(<Status className="custom-class">Status</Status>)
      const status = screen.getByRole('status')
      expect(status).toHaveClass('custom-class')
    })

    it('should have proper aria-label when text is present', () => {
      render(<Status>Online</Status>)
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Status: Online')
    })

    it('should have variant as aria-label when no text', () => {
      render(<Status variant="warning" />)
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Status: warning')
    })
  })

  describe('Variants', () => {
    it('should apply neutral variant by default', () => {
      render(<Status>Neutral</Status>)
      expect(screen.getByRole('status')).toHaveClass('status--neutral')
    })

    it('should apply success variant', () => {
      render(<Status variant="success">Success</Status>)
      expect(screen.getByRole('status')).toHaveClass('status--success')
    })

    it('should apply warning variant', () => {
      render(<Status variant="warning">Warning</Status>)
      expect(screen.getByRole('status')).toHaveClass('status--warning')
    })

    it('should apply error variant', () => {
      render(<Status variant="error">Error</Status>)
      expect(screen.getByRole('status')).toHaveClass('status--error')
    })

    it('should apply info variant', () => {
      render(<Status variant="info">Info</Status>)
      expect(screen.getByRole('status')).toHaveClass('status--info')
    })
  })

  describe('Sizes', () => {
    it('should apply medium size by default', () => {
      render(<Status>Medium</Status>)
      expect(screen.getByRole('status')).toHaveClass('status--md')
    })

    it('should apply small size', () => {
      render(<Status size="sm">Small</Status>)
      expect(screen.getByRole('status')).toHaveClass('status--sm')
    })

    it('should apply large size', () => {
      render(<Status size="lg">Large</Status>)
      expect(screen.getByRole('status')).toHaveClass('status--lg')
    })
  })

  describe('Pulse Animation', () => {
    it('should not have pulse class by default', () => {
      render(<Status>No Pulse</Status>)
      expect(screen.getByRole('status')).not.toHaveClass('status--pulse')
    })

    it('should apply pulse class when enabled', () => {
      render(<Status pulse>Pulsing</Status>)
      expect(screen.getByRole('status')).toHaveClass('status--pulse')
    })
  })

  describe('Combined Props', () => {
    it('should combine variant, size, and pulse', () => {
      render(
        <Status variant="success" size="lg" pulse>
          Combined
        </Status>
      )
      const status = screen.getByRole('status')
      expect(status).toHaveClass('status--success')
      expect(status).toHaveClass('status--lg')
      expect(status).toHaveClass('status--pulse')
    })

    it('should combine all props with custom className', () => {
      render(
        <Status variant="error" size="sm" pulse className="custom">
          All Props
        </Status>
      )
      const status = screen.getByRole('status')
      expect(status).toHaveClass('status--error')
      expect(status).toHaveClass('status--sm')
      expect(status).toHaveClass('status--pulse')
      expect(status).toHaveClass('custom')
    })
  })

  describe('Accessibility', () => {
    it('should have role="status"', () => {
      render(<Status>Accessible</Status>)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should have indicator marked as aria-hidden', () => {
      const { container } = render(<Status>Status</Status>)
      const indicator = container.querySelector('.status__indicator')
      expect(indicator).toHaveAttribute('aria-hidden', 'true')
    })

    it('should accept custom aria attributes', () => {
      render(<Status aria-live="polite">Live Status</Status>)
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string as children', () => {
      render(<Status>{''}</Status>)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should handle numeric children', () => {
      render(<Status>{42}</Status>)
      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('should pass through additional props', () => {
      render(<Status data-testid="custom-status">Status</Status>)
      expect(screen.getByTestId('custom-status')).toBeInTheDocument()
    })
  })

  describe('CSS Classes', () => {
    it('should always include base "status" class', () => {
      render(<Status>Base</Status>)
      expect(screen.getByRole('status')).toHaveClass('status')
    })

    it('should include indicator element', () => {
      const { container } = render(<Status>Indicator</Status>)
      expect(container.querySelector('.status__indicator')).toBeInTheDocument()
    })

    it('should include text element when children present', () => {
      const { container } = render(<Status>Text</Status>)
      expect(container.querySelector('.status__text')).toBeInTheDocument()
    })

    it('should not include text element when no children', () => {
      const { container } = render(<Status />)
      expect(container.querySelector('.status__text')).not.toBeInTheDocument()
    })
  })
})
