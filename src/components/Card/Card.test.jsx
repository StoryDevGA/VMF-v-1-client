/**
 * Card Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Card } from './Card'

describe('Card Component', () => {
  // ===========================
  // BASIC RENDERING
  // ===========================

  describe('Basic Rendering', () => {
    it('should render card with children', () => {
      render(<Card>Test Content</Card>)
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('should have default classes', () => {
      const { container } = render(<Card>Content</Card>)
      const card = container.firstChild
      expect(card).toHaveClass('card')
      expect(card).toHaveClass('card--default')
      expect(card).toHaveClass('card--rounded')
    })

    it('should apply custom className', () => {
      const { container } = render(<Card className="custom-card">Content</Card>)
      expect(container.firstChild).toHaveClass('custom-card')
    })

    it('should be bordered by default', () => {
      const { container } = render(<Card>Content</Card>)
      expect(container.firstChild).not.toHaveClass('card--borderless')
    })
  })

  // ===========================
  // VARIANTS
  // ===========================

  describe('Variants', () => {
    it('should apply default variant', () => {
      const { container } = render(<Card>Content</Card>)
      expect(container.firstChild).toHaveClass('card--default')
    })

    it('should apply outlined variant', () => {
      const { container } = render(<Card variant="outlined">Content</Card>)
      expect(container.firstChild).toHaveClass('card--outlined')
    })

    it('should apply elevated variant', () => {
      const { container } = render(<Card variant="elevated">Content</Card>)
      expect(container.firstChild).toHaveClass('card--elevated')
    })

    it('should apply filled variant', () => {
      const { container } = render(<Card variant="filled">Content</Card>)
      expect(container.firstChild).toHaveClass('card--filled')
    })
  })

  // ===========================
  // CORNER STYLES
  // ===========================

  describe('Corner Styles', () => {
    it('should be rounded by default', () => {
      const { container } = render(<Card>Content</Card>)
      expect(container.firstChild).toHaveClass('card--rounded')
    })

    it('should apply square corners when rounded is false', () => {
      const { container } = render(<Card rounded={false}>Content</Card>)
      expect(container.firstChild).toHaveClass('card--square')
      expect(container.firstChild).not.toHaveClass('card--rounded')
    })
  })

  // ===========================
  // BORDER
  // ===========================

  describe('Border', () => {
    it('should remove border when bordered is false', () => {
      const { container } = render(<Card bordered={false}>Content</Card>)
      expect(container.firstChild).toHaveClass('card--borderless')
    })
  })

  // ===========================
  // BACKGROUND COLOR
  // ===========================

  describe('Background Color', () => {
    it('should apply backgroundColor style', () => {
      const { container } = render(<Card backgroundColor="#ffffff">Content</Card>)
      expect(container.firstChild).toHaveStyle({ backgroundColor: '#ffffff' })
    })

    it('should allow transparent background', () => {
      const { container } = render(
        <Card backgroundColor="transparent">Content</Card>
      )
      expect(container.firstChild.style.backgroundColor).toBe('transparent')
    })

    it('should merge backgroundColor with custom styles', () => {
      const { container } = render(
        <Card backgroundColor="#f0f0f0" style={{ padding: '12px' }}>
          Content
        </Card>
      )
      expect(container.firstChild).toHaveStyle({
        backgroundColor: '#f0f0f0',
        padding: '12px',
      })
    })
  })

  // ===========================
  // INTERACTIVE STATES
  // ===========================

  describe('Interactive States', () => {
    it('should not be hoverable by default', () => {
      const { container } = render(<Card>Content</Card>)
      expect(container.firstChild).not.toHaveClass('card--hoverable')
    })

    it('should apply hoverable class', () => {
      const { container } = render(<Card hoverable>Content</Card>)
      expect(container.firstChild).toHaveClass('card--hoverable')
    })

    it('should not be clickable by default', () => {
      const { container } = render(<Card>Content</Card>)
      expect(container.firstChild).not.toHaveClass('card--clickable')
    })

    it('should apply clickable class and attributes', () => {
      const { container } = render(<Card clickable>Content</Card>)
      const card = container.firstChild
      expect(card).toHaveClass('card--clickable')
      expect(card).toHaveAttribute('role', 'button')
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    it('should call onClick when clickable', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()

      const { container } = render(
        <Card clickable onClick={handleClick}>
          Content
        </Card>
      )

      await user.click(container.firstChild)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  // ===========================
  // CARD SECTIONS
  // ===========================

  describe('Card Sections', () => {
    it('should render Card.Header', () => {
      const { container } = render(
        <Card>
          <Card.Header>Card Title</Card.Header>
        </Card>
      )
      expect(screen.getByText('Card Title')).toBeInTheDocument()
      const header = container.querySelector('.card__header')
      expect(header).toBeInTheDocument()
      expect(header).toHaveTextContent('Card Title')
    })

    it('should render Card.Body', () => {
      const { container } = render(
        <Card>
          <Card.Body>Card content</Card.Body>
        </Card>
      )
      expect(screen.getByText('Card content')).toBeInTheDocument()
      const body = container.querySelector('.card__body')
      expect(body).toBeInTheDocument()
      expect(body).toHaveTextContent('Card content')
    })

    it('should render Card.Footer', () => {
      const { container } = render(
        <Card>
          <Card.Footer>Footer content</Card.Footer>
        </Card>
      )
      expect(screen.getByText('Footer content')).toBeInTheDocument()
      const footer = container.querySelector('.card__footer')
      expect(footer).toBeInTheDocument()
      expect(footer).toHaveTextContent('Footer content')
    })

    it('should render Card.Image', () => {
      render(
        <Card>
          <Card.Image src="/test.jpg" alt="Test image" />
        </Card>
      )
      const img = screen.getByAltText('Test image')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', '/test.jpg')
    })

    it('should render all sections together', () => {
      render(
        <Card>
          <Card.Image src="/test.jpg" alt="Test" />
          <Card.Header>Title</Card.Header>
          <Card.Body>Content</Card.Body>
          <Card.Footer>Footer</Card.Footer>
        </Card>
      )

      expect(screen.getByAltText('Test')).toBeInTheDocument()
      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Content')).toBeInTheDocument()
      expect(screen.getByText('Footer')).toBeInTheDocument()
    })
  })

  // ===========================
  // SECTION CUSTOMIZATION
  // ===========================

  describe('Section Customization', () => {
    it('should apply custom className to Header', () => {
      const { container } = render(
        <Card>
          <Card.Header className="custom-header">Title</Card.Header>
        </Card>
      )
      const header = container.querySelector('.card__header')
      expect(header).toHaveClass('custom-header')
    })

    it('should apply custom className to Body', () => {
      const { container } = render(
        <Card>
          <Card.Body className="custom-body">Content</Card.Body>
        </Card>
      )
      const body = container.querySelector('.card__body')
      expect(body).toHaveClass('custom-body')
    })

    it('should apply custom className to Footer', () => {
      const { container } = render(
        <Card>
          <Card.Footer className="custom-footer">Footer</Card.Footer>
        </Card>
      )
      const footer = container.querySelector('.card__footer')
      expect(footer).toHaveClass('custom-footer')
    })

    it('should apply custom className to Image', () => {
      const { container } = render(
        <Card>
          <Card.Image src="/test.jpg" alt="Test" className="custom-image" />
        </Card>
      )
      const imageContainer = container.querySelector('.card__image')
      expect(imageContainer).toHaveClass('custom-image')
    })
  })

  // ===========================
  // COMBINED FEATURES
  // ===========================

  describe('Combined Features', () => {
    it('should handle all props together', () => {
      const handleClick = vi.fn()
      const { container } = render(
        <Card
          variant="elevated"
          rounded={false}
          hoverable
          clickable
          onClick={handleClick}
          className="custom"
        >
          <Card.Header>Title</Card.Header>
          <Card.Body>Content</Card.Body>
        </Card>
      )

      const card = container.firstChild
      expect(card).toHaveClass('card')
      expect(card).toHaveClass('card--elevated')
      expect(card).toHaveClass('card--square')
      expect(card).toHaveClass('card--hoverable')
      expect(card).toHaveClass('card--clickable')
      expect(card).toHaveClass('custom')
    })
  })

  // ===========================
  // ACCESSIBILITY
  // ===========================

  describe('Accessibility', () => {
    it('should support custom props', () => {
      render(<Card data-testid="test-card">Content</Card>)
      expect(screen.getByTestId('test-card')).toBeInTheDocument()
    })

    it('should have button role when clickable', () => {
      const { container } = render(<Card clickable>Content</Card>)
      expect(container.firstChild).toHaveAttribute('role', 'button')
    })

    it('should be keyboard accessible when clickable', () => {
      const { container } = render(<Card clickable>Content</Card>)
      expect(container.firstChild).toHaveAttribute('tabIndex', '0')
    })

    it('should have proper image alt text', () => {
      render(
        <Card>
          <Card.Image src="/test.jpg" alt="Descriptive text" />
        </Card>
      )
      const img = screen.getByAltText('Descriptive text')
      expect(img).toBeInTheDocument()
    })
  })
})
