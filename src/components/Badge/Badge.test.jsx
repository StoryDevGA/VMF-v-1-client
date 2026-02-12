/**
 * Badge Component Tests
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge Component', () => {
  describe('Rendering', () => {
    it('renders badge text content', () => {
      render(<Badge>Beta</Badge>)
      expect(screen.getByText('Beta')).toBeInTheDocument()
    })

    it('renders with custom className', () => {
      render(<Badge className="custom-badge">Custom</Badge>)
      const badge = screen.getByText('Custom').closest('.badge')
      expect(badge).toHaveClass('custom-badge')
    })

    it('passes through additional props', () => {
      render(<Badge data-testid="badge-prop">With Prop</Badge>)
      expect(screen.getByTestId('badge-prop')).toBeInTheDocument()
    })
  })

  describe('Variants', () => {
    it('applies neutral variant by default', () => {
      render(<Badge>Neutral</Badge>)
      const badge = screen.getByText('Neutral').closest('.badge')
      expect(badge).toHaveClass('badge--neutral')
    })

    it('applies primary variant', () => {
      render(<Badge variant="primary">Primary</Badge>)
      const badge = screen.getByText('Primary').closest('.badge')
      expect(badge).toHaveClass('badge--primary')
    })

    it('applies success variant', () => {
      render(<Badge variant="success">Success</Badge>)
      const badge = screen.getByText('Success').closest('.badge')
      expect(badge).toHaveClass('badge--success')
    })

    it('applies warning variant', () => {
      render(<Badge variant="warning">Warning</Badge>)
      const badge = screen.getByText('Warning').closest('.badge')
      expect(badge).toHaveClass('badge--warning')
    })

    it('applies danger variant', () => {
      render(<Badge variant="danger">Danger</Badge>)
      const badge = screen.getByText('Danger').closest('.badge')
      expect(badge).toHaveClass('badge--danger')
    })

    it('applies info variant', () => {
      render(<Badge variant="info">Info</Badge>)
      const badge = screen.getByText('Info').closest('.badge')
      expect(badge).toHaveClass('badge--info')
    })
  })

  describe('Sizes', () => {
    it('applies medium size by default', () => {
      render(<Badge>Medium</Badge>)
      const badge = screen.getByText('Medium').closest('.badge')
      expect(badge).toHaveClass('badge--md')
    })

    it('applies small size', () => {
      render(<Badge size="sm">Small</Badge>)
      const badge = screen.getByText('Small').closest('.badge')
      expect(badge).toHaveClass('badge--sm')
    })

    it('applies large size', () => {
      render(<Badge size="lg">Large</Badge>)
      const badge = screen.getByText('Large').closest('.badge')
      expect(badge).toHaveClass('badge--lg')
    })
  })

  describe('Modifiers', () => {
    it('applies pill modifier', () => {
      render(<Badge pill>Pill</Badge>)
      const badge = screen.getByText('Pill').closest('.badge')
      expect(badge).toHaveClass('badge--pill')
    })

    it('applies outline modifier', () => {
      render(<Badge outline>Outline</Badge>)
      const badge = screen.getByText('Outline').closest('.badge')
      expect(badge).toHaveClass('badge--outline')
    })
  })

  describe('Icon', () => {
    it('renders leading icon when provided', () => {
      render(
        <Badge icon={<span data-testid="badge-icon">*</span>}>
          New
        </Badge>,
      )

      const badge = screen.getByText('New').closest('.badge')
      expect(badge).toHaveClass('badge--with-icon')
      expect(screen.getByTestId('badge-icon')).toBeInTheDocument()
    })
  })
})
