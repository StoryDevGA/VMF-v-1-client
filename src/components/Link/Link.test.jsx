/**
 * Link Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { Link } from './Link'

// Wrapper for React Router context
const RouterWrapper = ({ children }) => <BrowserRouter>{children}</BrowserRouter>

describe('Link Component', () => {
  // ===========================
  // BASIC RENDERING
  // ===========================

  describe('Basic Rendering', () => {
    it('should render internal link with React Router', () => {
      render(
        <RouterWrapper>
          <Link to="/about">About</Link>
        </RouterWrapper>
      )
      const link = screen.getByText('About')
      expect(link).toBeInTheDocument()
      expect(link.tagName).toBe('A')
    })

    it('should render external link with href', () => {
      render(<Link href="https://example.com">External</Link>)
      const link = screen.getByText('External')
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', 'https://example.com')
    })

    it('should render children correctly', () => {
      render(
        <RouterWrapper>
          <Link to="/test">
            <span>Custom Content</span>
          </Link>
        </RouterWrapper>
      )
      expect(screen.getByText('Custom Content')).toBeInTheDocument()
    })
  })

  // ===========================
  // VARIANTS
  // ===========================

  describe('Variants', () => {
    it('should apply primary variant by default', () => {
      render(
        <RouterWrapper>
          <Link to="/test">Primary</Link>
        </RouterWrapper>
      )
      const link = screen.getByText('Primary')
      expect(link).toHaveClass('link--primary')
    })

    it('should apply secondary variant', () => {
      render(
        <RouterWrapper>
          <Link to="/test" variant="secondary">
            Secondary
          </Link>
        </RouterWrapper>
      )
      const link = screen.getByText('Secondary')
      expect(link).toHaveClass('link--secondary')
    })

    it('should apply subtle variant', () => {
      render(
        <RouterWrapper>
          <Link to="/test" variant="subtle">
            Subtle
          </Link>
        </RouterWrapper>
      )
      const link = screen.getByText('Subtle')
      expect(link).toHaveClass('link--subtle')
    })

    it('should apply danger variant', () => {
      render(
        <RouterWrapper>
          <Link to="/test" variant="danger">
            Danger
          </Link>
        </RouterWrapper>
      )
      const link = screen.getByText('Danger')
      expect(link).toHaveClass('link--danger')
    })
  })

  // ===========================
  // UNDERLINE OPTIONS
  // ===========================

  describe('Underline Options', () => {
    it('should apply hover underline by default', () => {
      render(
        <RouterWrapper>
          <Link to="/test">Hover</Link>
        </RouterWrapper>
      )
      const link = screen.getByText('Hover')
      expect(link).toHaveClass('link--underline-hover')
    })

    it('should apply no underline', () => {
      render(
        <RouterWrapper>
          <Link to="/test" underline="none">
            None
          </Link>
        </RouterWrapper>
      )
      const link = screen.getByText('None')
      expect(link).toHaveClass('link--underline-none')
    })

    it('should apply always underline', () => {
      render(
        <RouterWrapper>
          <Link to="/test" underline="always">
            Always
          </Link>
        </RouterWrapper>
      )
      const link = screen.getByText('Always')
      expect(link).toHaveClass('link--underline-always')
    })
  })

  // ===========================
  // EXTERNAL LINKS
  // ===========================

  describe('External Links', () => {
    it('should detect http:// URLs as external', () => {
      render(
        <RouterWrapper>
          <Link to="http://example.com">External</Link>
        </RouterWrapper>
      )
      const link = screen.getByText('External')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should detect https:// URLs as external', () => {
      render(
        <RouterWrapper>
          <Link to="https://example.com">External</Link>
        </RouterWrapper>
      )
      const link = screen.getByText('External')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should detect // URLs as external', () => {
      render(
        <RouterWrapper>
          <Link to="//example.com">External</Link>
        </RouterWrapper>
      )
      const link = screen.getByText('External')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should use href prop for external links', () => {
      render(<Link href="https://example.com">External</Link>)
      const link = screen.getByText('External')
      expect(link).toHaveAttribute('href', 'https://example.com')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should mark link as external with external prop', () => {
      render(
        <RouterWrapper>
          <Link to="/path" external>
            External
          </Link>
        </RouterWrapper>
      )
      const link = screen.getByText('External')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should open in new tab when openInNewTab is true', () => {
      render(
        <Link href="https://example.com" openInNewTab>
          New Tab
        </Link>
      )
      const link = screen.getByText(/New Tab/)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should show external icon when opening in new tab', () => {
      render(
        <Link href="https://example.com" openInNewTab>
          External
        </Link>
      )
      const icon = screen.getByLabelText('(opens in new tab)')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveTextContent('↗')
    })

    it('should not show external icon when not opening in new tab', () => {
      render(<Link href="https://example.com">External</Link>)
      const icon = screen.queryByLabelText('(opens in new tab)')
      expect(icon).not.toBeInTheDocument()
    })
  })

  // ===========================
  // DISABLED STATE
  // ===========================

  describe('Disabled State', () => {
    it('should apply disabled class when disabled', () => {
      render(
        <RouterWrapper>
          <Link to="/test" disabled>
            Disabled
          </Link>
        </RouterWrapper>
      )
      const link = screen.getByText('Disabled')
      expect(link).toHaveClass('link--disabled')
    })

    it('should set aria-disabled when disabled', () => {
      render(
        <RouterWrapper>
          <Link to="/test" disabled>
            Disabled
          </Link>
        </RouterWrapper>
      )
      const link = screen.getByText('Disabled')
      expect(link).toHaveAttribute('aria-disabled', 'true')
    })

    it('should set tabindex to -1 when disabled', () => {
      render(
        <RouterWrapper>
          <Link to="/test" disabled>
            Disabled
          </Link>
        </RouterWrapper>
      )
      const link = screen.getByText('Disabled')
      expect(link).toHaveAttribute('tabindex', '-1')
    })

    it('should prevent navigation when disabled', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(
        <RouterWrapper>
          <Link to="/test" disabled onClick={handleClick}>
            Disabled
          </Link>
        </RouterWrapper>
      )

      const link = screen.getByText('Disabled')
      await user.click(link)

      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should not show external icon when disabled', () => {
      render(
        <Link href="https://example.com" disabled openInNewTab>
          Disabled
        </Link>
      )
      const icon = screen.queryByLabelText('(opens in new tab)')
      expect(icon).not.toBeInTheDocument()
    })

    it('should not have rel attribute when disabled external link', () => {
      render(
        <Link href="https://example.com" disabled>
          Disabled
        </Link>
      )
      const link = screen.getByText('Disabled')
      expect(link).not.toHaveAttribute('rel')
    })
  })

  // ===========================
  // INTERACTION
  // ===========================

  describe('Interaction', () => {
    it('should call onClick handler when clicked', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(
        <RouterWrapper>
          <Link to="/test" onClick={handleClick}>
            Click Me
          </Link>
        </RouterWrapper>
      )

      const link = screen.getByText('Click Me')
      await user.click(link)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not call onClick when disabled', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(
        <RouterWrapper>
          <Link to="/test" disabled onClick={handleClick}>
            Disabled
          </Link>
        </RouterWrapper>
      )

      const link = screen.getByText('Disabled')
      await user.click(link)

      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  // ===========================
  // CUSTOM CLASSES
  // ===========================

  describe('Custom Classes', () => {
    it('should apply custom className', () => {
      render(
        <RouterWrapper>
          <Link to="/test" className="custom-class">
            Custom
          </Link>
        </RouterWrapper>
      )
      const link = screen.getByText('Custom')
      expect(link).toHaveClass('custom-class')
      expect(link).toHaveClass('link')
    })
  })

  // ===========================
  // ACCESSIBILITY
  // ===========================

  describe('Accessibility', () => {
    it('should support aria-label', () => {
      render(
        <RouterWrapper>
          <Link to="/test" aria-label="Go to test page">
            Test
          </Link>
        </RouterWrapper>
      )
      const link = screen.getByLabelText('Go to test page')
      expect(link).toBeInTheDocument()
    })

    it('should support aria-describedby', () => {
      render(
        <RouterWrapper>
          <Link to="/test" aria-describedby="test-description">
            Test
          </Link>
        </RouterWrapper>
      )
      const link = screen.getByText('Test')
      expect(link).toHaveAttribute('aria-describedby', 'test-description')
    })

    it('should be keyboard accessible', () => {
      render(
        <RouterWrapper>
          <Link to="/test">Keyboard</Link>
        </RouterWrapper>
      )
      const link = screen.getByText('Keyboard')
      expect(link).not.toHaveAttribute('tabindex')
    })
  })
})
